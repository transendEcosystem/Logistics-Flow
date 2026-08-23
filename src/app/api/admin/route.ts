import { NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import sgMail from '@sendgrid/mail';

function resolveCollection(requestUrl: string, bodyPayload?: any): string {
  try {
    const url = new URL(requestUrl);
    const nestedPayload = (bodyPayload?.payload && typeof bodyPayload.payload === 'object') ? bodyPayload.payload : {};
    const viewParam = (
      url.searchParams.get('view') ||
      bodyPayload?.view ||
      bodyPayload?.type ||
      bodyPayload?.collection ||
      nestedPayload?.view ||
      nestedPayload?.type ||
      nestedPayload?.collection ||
      ''
    ).toString().toLowerCase();
    
    if (viewParam.includes('supplier')) return 'suppliers';
    if (viewParam.includes('transporter')) return 'transporters';
    if (viewParam.includes('strategic') || viewParam.includes('partner') || viewParam.includes('marketing-partners')) return 'strategic_partners';
    if (viewParam.includes('isa') || viewParam.includes('marketing-isa')) return 'isa_agents';
    if (viewParam.includes('digital') || viewParam.includes('marketing-associates')) return 'digital_associates';
    if (viewParam.includes('investor') || viewParam.includes('marketing-investors')) return 'investors';
    if (viewParam.includes('finance') || viewParam.includes('marketing-finance')) return 'finance_co';
  } catch (e) {
    // Fallback if URL parsing fails
  }
  return 'leads';
}

// Only these fields may be written by AI research ingest, so a malformed paste cannot alter status or ownership fields.
const FORENSIC_SCALAR_FIELDS = [
  'companyName',
  'industrial_category',
  'website',
  'email',
  'phone',
  'address',
  'minedServiceWording',
  'primaryContactRole',
  'researchConfidence',
];

const FORENSIC_CONTACT_FIELDS = ['marketingManager', 'operationsManager', 'technicalManager', 'ceo'];

const RESEARCH_COLLECTIONS = [
  'leads',
  'partners',
  'suppliers',
  'transporters',
  'strategic_partners',
  'isa_agents',
  'digital_associates',
  'investors',
  'finance_co',
  'developers',
  'drivers',
  'debtors',
  'lending_clients',
  'companies',
];

// A research record can live in any registry, so the id is resolved across all of them.
async function findResearchRecord(adminDb: any, recordId: string, preferredCollection?: string) {
  const ordered = [String(preferredCollection || '').trim(), ...RESEARCH_COLLECTIONS].filter(Boolean);
  const seen = new Set<string>();
  for (const collection of ordered) {
    if (seen.has(collection)) continue;
    seen.add(collection);
    const ref = adminDb.collection(collection).doc(recordId);
    const snapshot = await ref.get();
    if (snapshot.exists) return { ref, collection, data: snapshot.data() || {} };
  }
  return null;
}

function normalizeRegistryType(rawType?: string): string {
  const value = (rawType || '').toString().toLowerCase();
  if (!value) return 'all';
  if (value.includes('supplier')) return 'supplier';
  if (value.includes('transporter') || value.includes('haulier')) return 'transporter';
  if (value.includes('finance') || value.includes('funder') || value.includes('lender')) return 'finance';
  if (value.includes('investor')) return 'investor';
  if (value.includes('isa')) return 'isa';
  if (value.includes('associate')) return 'associate';
  if (value.includes('developer')) return 'developer';
  if (value.includes('driver')) return 'driver';
  if (value.includes('partner')) return 'partner';
  return value;
}

function getMatchingTypeValues(typeName?: string): string[] {
  const normalized = normalizeRegistryType(typeName);
  const map: Record<string, string[]> = {
    supplier: ['supplier', 'suppliers', 'vendor', 'vendors'],
    transporter: ['transporter', 'transporters', 'haulier', 'hauliers'],
    finance: ['finance', 'finances', 'funder', 'funders', 'lender', 'lenders', 'bank', 'banks'],
    investor: ['investor', 'investors'],
    isa: ['isa', 'isa_agent', 'isa_agent'],
    associate: ['associate', 'associates'],
    developer: ['developer', 'developers'],
    driver: ['driver', 'drivers'],
    partner: ['partner', 'partners', 'strategic_partner', 'strategic partners'],
  };
  return map[normalized] || [];
}

function getCollectionCandidates(requestUrl: string, bodyPayload?: any): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (value?: string) => {
    const cleaned = String(value || '').trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    candidates.push(cleaned);
  };

  const requestType = normalizeRegistryType((bodyPayload?.type || bodyPayload?.collection || bodyPayload?.view || '').toString());
  if (requestType === 'supplier') {
    push('suppliers');
    push('partners');
    push('leads');
    push('companies');
  } else if (requestType === 'transporter') {
    push('transporters');
    push('partners');
    push('leads');
  } else if (requestType === 'finance') {
    push('finance_co');
    push('partners');
    push('leads');
  } else if (requestType === 'investor') {
    push('investors');
    push('partners');
    push('leads');
  } else if (requestType === 'isa') {
    push('isa_agents');
    push('partners');
    push('leads');
  } else if (requestType === 'associate') {
    push('digital_associates');
    push('partners');
    push('leads');
  } else if (requestType === 'partner') {
    push('strategic_partners');
    push('partners');
    push('leads');
  }

  push(resolveCollection(requestUrl, bodyPayload));

  if (candidates.length === 0) {
    push('leads');
  }

  return candidates;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
}

function matchesRegistryFilters(record: Record<string, any>, filters: Record<string, any>, typeValues: string[] = []) {
  const term = String(filters.term || '').trim().toLowerCase();
  const category = String(filters.category || filters.industrial_category || '').trim();
  const status = String(filters.status || '').trim();
  const tag = String(filters.tag || '').trim();
  const assigneeId = String(filters.assigneeId || '').trim();

  if (typeValues.length) {
    const recordTypeValue = String(record.type || record.role || record.declaredRole || record.category || record.industrial_category || '').toLowerCase();
    const normalizedTypes = [recordTypeValue, String(record.type || '').toLowerCase(), String(record.role || '').toLowerCase(), String(record.declaredRole || '').toLowerCase(), String(record.category || '').toLowerCase(), String(record.industrial_category || '').toLowerCase()];
    if (!normalizedTypes.some(value => typeValues.some(typeValue => value === typeValue.toLowerCase()))) {
      const legacyMatch = String(record.industrial_category || record.category || record.type || record.declaredRole || '').toLowerCase();
      if (!typeValues.some(typeValue => legacyMatch.includes(typeValue.toLowerCase()))) return false;
    }
  }

  if (term) {
    const haystack = [
      record.companyName,
      record.contactPerson,
      record.firstName,
      record.lastName,
      record.email,
      record.phone,
      record.mobile,
      record.website,
      record.address,
      record.industry,
      record.industrial_category,
      JSON.stringify(record)
    ].join(' ').toLowerCase();

    if (!haystack.includes(term)) return false;
  }

  if (category && category !== 'all') {
    const candidateCategories = [
      record.industrial_category,
      record.category,
      record.trade_category,
      record.industry,
      record.business_category,
      record.businessCategory,
      record.sector,
      ...(Array.isArray(record.industrial_categories) ? record.industrial_categories : []),
      ...(Array.isArray(record.categories) ? record.categories : []),
    ].filter(Boolean).map((item: any) => String(item).trim());

    if (!candidateCategories.some(item => item.toLowerCase() === category.toLowerCase())) return false;
  }

  if (status && status !== 'all') {
    if (String(record.status || '').toLowerCase() !== String(status).toLowerCase()) return false;
  }

  if (tag && tag !== 'all') {
    const tagValues = [
      ...(Array.isArray(record.industrial_tags) ? record.industrial_tags : []),
      ...(Array.isArray(record.tags) ? record.tags : []),
      ...(Array.isArray(record.registry_tags) ? record.registry_tags : []),
      ...(Array.isArray(record.trade_tags) ? record.trade_tags : []),
      String(record.industrial_tags || ''),
      String(record.tags || ''),
    ].filter(Boolean).map((item: any) => String(item).trim());

    if (!tagValues.some(item => item.toLowerCase() === tag.toLowerCase())) return false;
  }

  if (assigneeId && assigneeId !== 'all') {
    if (String(record.assigneeId || '') !== assigneeId) return false;
  }

  return true;
}

export async function GET(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const db = getFirestore(app);
    const collectionName = resolveCollection(request.url);
    const snapshot = await db.collection(collectionName).limit(100).get();
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      leads: records,
      data: records,
      items: records,
      records: records
    }, { status: 200 });
  } catch (error: any) {
    console.error('Admin API GET Error:', error);
    // Return empty arrays safely as valid JSON instead of throwing an error
    return NextResponse.json({
      success: true,
      leads: [],
      data: [],
      items: [],
      records: []
    }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const db = getFirestore(app);
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }

    const requestBody = (body || {}) as Record<string, any>;
    const { action, payload } = requestBody as any;
    const resolvedPayload = (payload || requestBody || {}) as Record<string, any>;
    const collectionName = resolveCollection(request.url, requestBody);

    if (action === 'approveWalletPayment') {
      const { db: adminDb, adminUid } = await verifyAdmin(request as any);
      const companyId = String(resolvedPayload.companyId || '').trim();
      const paymentId = String(resolvedPayload.paymentId || '').trim();
      if (!companyId || !paymentId) {
        return NextResponse.json({ success: false, error: 'companyId and paymentId are required.' }, { status: 400 });
      }

      const companyRef = adminDb.collection('companies').doc(companyId);
      const paymentRef = companyRef.collection('walletPayments').doc(paymentId);
      const transactionRef = companyRef.collection('transactions').doc();

      await adminDb.runTransaction(async transaction => {
        const [company, payment] = await Promise.all([transaction.get(companyRef), transaction.get(paymentRef)]);
        if (!company.exists) throw new Error('Member company was not found.');
        if (!payment.exists) throw new Error('Wallet payment was not found.');
        const paymentData = payment.data() || {};
        if (paymentData.status !== 'pending') throw new Error('This wallet payment has already been processed.');
        const amount = Number(paymentData.amount || 0);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Wallet payment amount is invalid.');

        transaction.update(paymentRef, {
          status: 'approved',
          approvedAt: FieldValue.serverTimestamp(),
          approvedBy: adminUid,
          reconciliationId: String(resolvedPayload.reconciliationId || '').trim(),
        });
        transaction.update(companyRef, {
          walletBalance: FieldValue.increment(amount),
          availableBalance: FieldValue.increment(amount),
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(transactionRef, {
          transactionId: transactionRef.id,
          companyId,
          type: 'credit',
          amount,
          date: FieldValue.serverTimestamp(),
          description: paymentData.description || 'Wallet top-up via EFT',
          status: 'allocated',
          sourcePaymentId: paymentId,
          reconciliationId: String(resolvedPayload.reconciliationId || '').trim(),
          postedBy: adminUid,
          postedAt: FieldValue.serverTimestamp(),
        });
      });

      return NextResponse.json({ success: true, message: 'Wallet payment approved and allocated.' });
    }

    if (action === 'getWalletPayments' || action === 'getWalletTransactions') {
      const { db: adminDb } = await verifyAdmin(request as any);
      const subcollection = action === 'getWalletPayments' ? 'walletPayments' : 'transactions';
      const snapshot = await adminDb.collectionGroup(subcollection).get();
      const data = snapshot.docs.map(entry => {
        const pathSegments = entry.ref.path.split('/');
        const companyIndex = pathSegments.indexOf('companies');
        const companyId = companyIndex >= 0 ? pathSegments[companyIndex + 1] : null;
        return { id: entry.id, companyId, ...entry.data() };
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'getNetworkCommissions') {
      const { db: adminDb } = await verifyAdmin(request as any);
      const snapshot = await adminDb.collectionGroup('commissionLedger').get();
      const data = snapshot.docs.map(entry => {
        const pathSegments = entry.ref.path.split('/');
        const companyIndex = pathSegments.indexOf('companies');
        return {
          id: entry.id,
          ownerCompanyId: companyIndex >= 0 ? pathSegments[companyIndex + 1] : null,
          ...entry.data(),
        };
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'saveServiceProfile') {
      const { db: adminDb, adminUid } = await verifyAdmin(request as any);
      const recordId = String(resolvedPayload.partnerId || resolvedPayload.recordId || '').trim();
      const profile = resolvedPayload.profile;

      if (!recordId || !profile || typeof profile !== 'object') {
        return NextResponse.json({ success: false, error: 'partnerId and profile are required.' }, { status: 400 });
      }

      const located = await findResearchRecord(adminDb, recordId, resolvedPayload.collection);
      if (!located) {
        return NextResponse.json({ success: false, error: `Record ${recordId} was not found.` }, { status: 404 });
      }

      const stringList = (value: any) =>
        Array.isArray(value) ? value.map((entry: any) => String(entry).trim()).filter(Boolean).slice(0, 60) : [];

      const serviceProfile = {
        serviceTags: stringList(profile.serviceTags).map((tag: string) => tag.toLowerCase()),
        capabilities: stringList(profile.capabilities),
        industriesServed: stringList(profile.industriesServed),
        geographicCoverage: stringList(profile.geographicCoverage),
        equipmentAssets: stringList(profile.equipmentAssets),
        certifications: stringList(profile.certifications),
        valueProps: stringList(profile.valueProps),
        contentQuality: ['rich', 'thin', 'placeholder'].includes(String(profile.contentQuality)) ? profile.contentQuality : null,
      };

      const rawShop = profile.shopProfile || {};
      const shopProfile = {
        headline: String(rawShop.headline || '').trim(),
        shortDescription: String(rawShop.shortDescription || '').trim(),
        longDescription: String(rawShop.longDescription || '').trim(),
        keywords: stringList(rawShop.keywords).map((word: string) => word.toLowerCase()),
      };

      const campaignAngles = Array.isArray(profile.campaignAngles)
        ? profile.campaignAngles.slice(0, 20).map((entry: any) => ({
            angle: String(entry?.angle || '').trim(),
            evidence: String(entry?.evidence || '').trim(),
            targetRole: String(entry?.targetRole || '').trim(),
          })).filter((entry: any) => entry.angle)
        : [];

      // Tags and keywords are folded into the indexed blob so retrieval matches on classification as well as raw wording.
      const existingCorpus = String(located.data.searchCorpus || '');
      const searchCorpus = [
        existingCorpus,
        serviceProfile.serviceTags.join(' '),
        serviceProfile.capabilities.join(' '),
        serviceProfile.industriesServed.join(' '),
        serviceProfile.geographicCoverage.join(' '),
        shopProfile.keywords.join(' '),
      ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 60_000);

      await located.ref.set({
        serviceProfile,
        shopProfile,
        campaignAngles,
        searchCorpus,
        minedServiceWording: located.data.minedServiceWording || shopProfile.longDescription || null,
        researchStage: 'service_profile_complete',
        serviceProfileSavedAt: new Date().toISOString(),
        serviceProfileSavedBy: adminUid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true, id: recordId, collection: located.collection });
    }

    if (action === 'applyForensicFindings') {
      const { db: adminDb, adminUid } = await verifyAdmin(request as any);
      const recordId = String(resolvedPayload.partnerId || resolvedPayload.recordId || '').trim();
      const findings = resolvedPayload.findings;
      const overwrite = Boolean(resolvedPayload.overwrite);

      if (!recordId || !findings || typeof findings !== 'object') {
        return NextResponse.json({ success: false, error: 'partnerId and findings are required.' }, { status: 400 });
      }

      const located = await findResearchRecord(adminDb, recordId, resolvedPayload.collection);
      if (!located) {
        return NextResponse.json({ success: false, error: `Record ${recordId} was not found.` }, { status: 404 });
      }

      const existing = located.data;
      const update: Record<string, any> = {};
      const applied: string[] = [];
      const skipped: string[] = [];

      const isEmpty = (value: any) =>
        value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(v => v === null || v === undefined || v === ''));

      const assign = (field: string, value: any) => {
        if (isEmpty(value)) return;
        if (!overwrite && !isEmpty(existing[field])) { skipped.push(field); return; }
        update[field] = value;
        applied.push(field);
      };

      for (const field of FORENSIC_SCALAR_FIELDS) {
        const value = findings[field];
        if (typeof value === 'string' || typeof value === 'number') assign(field, String(value).trim());
      }

      for (const field of FORENSIC_CONTACT_FIELDS) {
        const raw = findings[field];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        const contact = {
          name: raw.name ? String(raw.name).trim() : '',
          role: raw.role ? String(raw.role).trim() : '',
          email: raw.email ? String(raw.email).trim() : '',
          mobile: raw.mobile ? String(raw.mobile).trim() : '',
        };
        assign(field, isEmpty(contact) ? null : contact);
      }

      if (findings.socialProfiles && typeof findings.socialProfiles === 'object') {
        const social = ['facebook', 'linkedin', 'instagram', 'twitter'].reduce((acc: Record<string, string>, key) => {
          const value = findings.socialProfiles[key];
          if (value) acc[key] = String(value).trim();
          return acc;
        }, {});
        assign('socialProfiles', social);
      }

      for (const field of ['siteMap', 'otherStaff', 'sourceUrls']) {
        if (Array.isArray(findings[field]) && findings[field].length) {
          assign(field, findings[field].filter(Boolean).slice(0, 50));
        }
      }

      if (Object.keys(update).length === 0) {
        return NextResponse.json({ success: true, applied: [], skipped, message: 'No new values to apply.' });
      }

      await located.ref.set({
        ...update,
        researchStage: 'gap_analysis_complete',
        forensicAppliedAt: new Date().toISOString(),
        forensicAppliedBy: adminUid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true, applied, skipped, collection: located.collection });
    }

    if (action === 'logForensicInitiated' || action === 'saveCommercialDeepDive' || action === 'logDeepDiveInitiated') {
      const { db: adminDb, adminUid } = await verifyAdmin(request as any);
      const recordId = String(resolvedPayload.partnerId || resolvedPayload.recordId || resolvedPayload.id || '').trim();
      if (!recordId) {
        return NextResponse.json({ success: false, error: 'A record ID is required.' }, { status: 400 });
      }

      const located = await findResearchRecord(adminDb, recordId, resolvedPayload.collection);
      if (!located) {
        return NextResponse.json({ success: false, error: `Record ${recordId} was not found.` }, { status: 404 });
      }

      const now = new Date().toISOString();
      let update: Record<string, any> = { updatedAt: now };

      if (action === 'logForensicInitiated') {
        update = { ...update, forensicInitiatedAt: now, forensicInitiatedBy: adminUid, researchStage: 'gap_analysis_requested' };
      } else if (action === 'logDeepDiveInitiated') {
        update = { ...update, deepDiveInitiatedAt: now, deepDiveInitiatedBy: adminUid, researchStage: 'deep_dive_requested' };
      } else {
        const profile = resolvedPayload.commercialProfile;
        if (!profile || typeof profile !== 'object') {
          return NextResponse.json({ success: false, error: 'commercialProfile object is required.' }, { status: 400 });
        }
        update = {
          ...update,
          commercialProfile: profile,
          deepDiveCompletedAt: now,
          deepDiveCompletedBy: adminUid,
          researchStage: 'deep_dive_complete',
        };
      }

      await located.ref.set(update, { merge: true });
      return NextResponse.json({ success: true, id: recordId, collection: located.collection });
    }

    if (action?.startsWith('delete')) {
      const recordId = payload?.id || payload?.partnerId || payload?.leadId || (body as any)?.id || (body as any)?.partnerId || (body as any)?.leadId;
      if (recordId) {
        const requestedCollection = String(payload?.collection || payload?.sourceCollection || '').trim();
        const targetCollection = requestedCollection || collectionName;
        const targetRef = db.collection(targetCollection).doc(String(recordId));
        const targetSnapshot = await targetRef.get();
        if (!targetSnapshot.exists) {
          return NextResponse.json({ success: false, error: `Record ${recordId} was not found in ${targetCollection}.` }, { status: 404 });
        }
        await targetRef.delete();
        return NextResponse.json({ success: true, deletedId: recordId, collection: targetCollection }, { status: 200 });
      }
      return NextResponse.json({ success: false, error: 'A record ID is required for deletion.' }, { status: 400 });
    }

    if (action === 'savePartner') {
      const partner = payload?.partner;
      if (!partner || typeof partner !== 'object') {
        return NextResponse.json({ success: false, error: 'Partner data is required.' }, { status: 400 });
      }

      const isManagedPartnerType = ['isa', 'associate', 'partner', 'supplier', 'transporter', 'finance', 'investor', 'developer', 'driver'].includes(String(partner.type || '').toLowerCase());
      const targetCollection = String(payload?.collection || (isManagedPartnerType ? 'partners' : collectionName)).trim();
      const { id, ...partnerData } = partner;
      const dataToSave = {
        ...partnerData,
        updatedAt: new Date().toISOString(),
      };

      let linkedCompanyId: string | null = null;
      if (partner.type === 'isa' && partner.email) {
        const matchedUsers = await db.collection('users').where('email', '==', String(partner.email).trim().toLowerCase()).limit(1).get();
        const matchedCompanyId = matchedUsers.docs[0]?.data()?.companyId;
        if (matchedCompanyId) {
          linkedCompanyId = String(matchedCompanyId);
          dataToSave.linkedCompanyId = linkedCompanyId;
        }
      }

      if (id) {
        await db.collection(targetCollection).doc(String(id)).set(dataToSave, { merge: true });
        if (partner.type === 'isa' && linkedCompanyId) {
          await db.collection('companies').doc(linkedCompanyId).set({
            isaStatus: partner.status === 'active' ? 'active' : 'inactive',
            isaPartnerId: String(id),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
        return NextResponse.json({ success: true, id, collection: targetCollection, message: 'Record updated successfully' }, { status: 200 });
      }

      const docRef = await db.collection(targetCollection).add({
        ...dataToSave,
        createdAt: new Date().toISOString(),
      });
      if (partner.type === 'isa' && linkedCompanyId) {
        await db.collection('companies').doc(linkedCompanyId).set({
          isaStatus: partner.status === 'active' ? 'active' : 'inactive',
          isaPartnerId: docRef.id,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      return NextResponse.json({ success: true, id: docRef.id, collection: targetCollection, message: 'Record created successfully' }, { status: 200 });
    }

    if (action === 'createPartnerAgreement') {
      const agreement = resolvedPayload?.agreement;
      if (!agreement?.partnerId || !agreement?.partnerName) {
        return NextResponse.json({ success: false, error: 'partnerId and partnerName are required.' }, { status: 400 });
      }
      const docRef = await db.collection('partnerAgreements').add({
        partnerId: String(agreement.partnerId),
        partnerName: String(agreement.partnerName),
        discountType: agreement.discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(agreement.discountValue) || 0,
        appliesTo: agreement.appliesTo || 'partner-sales-only',
        eligibilityRule: agreement.eligibilityRule === 'any-member' ? 'any-member' : 'tagged-customer',
        status: 'proposed',
        notes: agreement.notes || '',
        effectiveFrom: agreement.effectiveFrom || null,
        effectiveTo: agreement.effectiveTo || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, id: docRef.id, message: 'Partner agreement created.' }, { status: 200 });
    }

    if (action === 'updatePartnerAgreementStatus') {
      const agreementId = String(resolvedPayload?.agreementId || '').trim();
      const status = String(resolvedPayload?.status || '').trim();
      const allowedStatuses = ['proposed', 'accepted', 'active', 'expired'];
      if (!agreementId || !allowedStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: 'A valid agreementId and status are required.' }, { status: 400 });
      }
      await db.collection('partnerAgreements').doc(agreementId).set({
        status,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return NextResponse.json({ success: true, message: `Agreement status set to ${status}.` }, { status: 200 });
    }

    if (action === 'listPartnerAgreements') {
      const snapshot = await db.collection('partnerAgreements').get();
      const agreements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, agreements }, { status: 200 });
    }

    if (action === 'bulkSavePartners') {
      const rawPartners: any[] = Array.isArray(resolvedPayload?.partners) ? resolvedPayload.partners : [];
      const importType = String(resolvedPayload?.type || '').trim();
      const sourcePartnerId = String(resolvedPayload?.sourcePartnerId || '').trim();
      const discountEligible = Boolean(resolvedPayload?.discountEligible);
      const agreementId = String(resolvedPayload?.agreementId || '').trim();

      if (rawPartners.length === 0) {
        return NextResponse.json({ success: false, error: 'No records provided for import.' }, { status: 400 });
      }

      const targetCollection = resolveCollection(request.url, { type: importType });
      const batch = db.batch();
      let count = 0;

      for (const record of rawPartners) {
        if (!record || typeof record !== 'object') continue;
        const docRef = db.collection(targetCollection).doc();
        const dataToSave: Record<string, any> = {
          ...record,
          id: docRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (sourcePartnerId) {
          dataToSave.sourcePartnerId = sourcePartnerId;
          dataToSave.sourceType = 'existing-customer-import';
          dataToSave.discountEligible = discountEligible;
          if (agreementId) dataToSave.discountAgreementId = agreementId;
        }
        batch.set(docRef, dataToSave);
        count += 1;
      }

      await batch.commit();
      return NextResponse.json({ success: true, count, collection: targetCollection, message: `Imported ${count} records into ${targetCollection}.` }, { status: 200 });
    }

    if (action === 'dispatchEngagement') {
      const partnerId = String(resolvedPayload?.partnerId || '').trim();
      const email = String(resolvedPayload?.email || '').trim();
      const subject = String(resolvedPayload?.subject || '').trim();
      const html = String(resolvedPayload?.html || '').trim();
      const targetCollection = String(resolvedPayload?.collection || 'partners').trim();
      const allowedCollections = ['partners', 'leads', 'strategic_partners', 'suppliers', 'transporters', 'finance_co', 'investors', 'isa_agents', 'digital_associates'];

      if (!partnerId || !email || !subject || !html) {
        return NextResponse.json({ success: false, error: 'Recipient, subject, and message content are required.' }, { status: 400 });
      }
      if (!allowedCollections.includes(targetCollection)) {
        return NextResponse.json({ success: false, error: `Unsupported target collection: ${targetCollection}.` }, { status: 400 });
      }
      if (!process.env.SENDGRID_API_KEY) {
        return NextResponse.json({ success: false, error: 'Email dispatch is not configured. SENDGRID_API_KEY is missing.' }, { status: 503 });
      }

      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      await sgMail.send({
        to: email,
        from: 'michael@logisticsflow.co.za',
        subject,
        html,
      });

      await db.collection(targetCollection).doc(partnerId).set({
        lastOutreachSubject: subject,
        lastOutreachAt: new Date().toISOString(),
        lastOutreachChannel: 'Email',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true, message: 'Engagement email dispatched successfully.' }, { status: 200 });
    }

    if (action === 'searchRegistry') {
      const requestType = normalizeRegistryType(resolvedPayload?.type || requestBody?.type || requestBody?.collection || request.url);
      const typeValues = getMatchingTypeValues(requestType);
      const requestedPageSize = Number(resolvedPayload?.pageSize ?? resolvedPayload?.limit ?? 100);
      const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0
        ? Math.min(Math.max(requestedPageSize, 25), 100000)
        : 100;
      const page = Math.max(1, Number(resolvedPayload?.page || 1));
      const filters = {
        term: String(resolvedPayload?.term || resolvedPayload?.search || '').trim(),
        category: String(resolvedPayload?.category || resolvedPayload?.industrial_category || '').trim(),
        status: String(resolvedPayload?.status || '').trim(),
        tag: String(resolvedPayload?.tag || '').trim(),
        assigneeId: String(resolvedPayload?.assigneeId || '').trim(),
      };

      const collectionCandidates = getCollectionCandidates(request.url, resolvedPayload);
      const collectedRecords = new Map<string, Record<string, any>>();
      const maxQueryWindow = Math.min(Math.max(pageSize * 3, 250), 5000);

      for (const candidateCollection of collectionCandidates) {
        try {
          let queryRef: FirebaseFirestore.Query = db.collection(candidateCollection);

          if (typeValues.length && candidateCollection !== 'companies') {
            queryRef = queryRef.where('type', 'in', typeValues);
          }

          const snapshot = await queryRef.limit(maxQueryWindow).get();
          for (const doc of snapshot.docs) {
            const record = { id: doc.id, ...doc.data(), sourceCollection: candidateCollection };
            const recordKey = `${candidateCollection}:${doc.id}`;
            if (!collectedRecords.has(recordKey)) {
              collectedRecords.set(recordKey, record);
            }
          }
        } catch (e) {
          // Ignore collections that are unavailable or not configured; other candidates may still work.
        }
      }

      const allRecords = Array.from(collectedRecords.values());
      const filteredRecords = allRecords.filter((record: any) => matchesRegistryFilters(record, filters, typeValues));
      const totalCount = filteredRecords.length;
      const start = (page - 1) * pageSize;
      const pagedRecords = filteredRecords.slice(start, start + pageSize);

      return NextResponse.json({
        success: true,
        leads: pagedRecords,
        data: pagedRecords,
        items: pagedRecords,
        records: pagedRecords,
        totalCount,
        page,
        pageSize,
        hasNextPage: page * pageSize < totalCount
      }, { status: 200 });
    }

    if (action === 'create' || action === 'add' || payload?.data || (body as any)?.data) {
      const dataToSave = payload?.data || (body as any)?.data || payload || body;
      if (typeof dataToSave === 'object' && dataToSave !== null) {
        delete dataToSave.action;
        delete dataToSave.payload;
      }

      const docRef = await db.collection(collectionName).add({
        ...(typeof dataToSave === 'object' ? dataToSave : {}),
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        id: docRef.id,
        message: 'Record created successfully'
      }, { status: 200 });
    }

    const snapshot = await db.collection(collectionName).limit(100).get();
    const records = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      leads: records,
      data: records,
      items: records,
      records: records
    }, { status: 200 });
  } catch (error: any) {
    console.error('Admin API POST Error:', error);
    return NextResponse.json({
      success: true,
      leads: [],
      data: [],
      items: [],
      records: [],
      error: error.message
    }, { status: 200 });
  }
}