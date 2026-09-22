import { NextResponse } from 'next/server';
import { FieldValue, FieldPath, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import sgMail from '@sendgrid/mail';
import { validateAgreementAgainstPolicies } from '@/lib/lending/policy-engine';
import {
  engagementContentLabel,
  normalizeEngagementContentType,
} from '@/lib/engagement-content';
import {
  buildRegistryFilterKey,
  buildRegistryIndexRecord,
  deleteRegistryIndexDocument,
  getActiveRegistryIndexCollection,
  getRegistryIndexWriteCollections,
  normalizeRegistryIndexText,
  REGISTRY_INDEX_COLLECTIONS,
  REGISTRY_INDEX_META_COLLECTION,
  REGISTRY_INDEX_META_DOCUMENT,
  REGISTRY_INDEX_SCHEMA_VERSION,
  REGISTRY_SOURCE_COLLECTIONS,
  syncRegistryIndexDocument,
} from '@/lib/registry-index';

function resolveCollection(requestUrl: string, bodyPayload?: any): string {
  try {
    const url = new URL(requestUrl);
    const nestedPayload = (bodyPayload?.payload && typeof bodyPayload.payload === 'object') ? bodyPayload.payload : {};
    const viewParam = (
      url.searchParams.get('view') ||
      bodyPayload?.view ||
      bodyPayload?.type ||
      bodyPayload?.collection ||
      bodyPayload?.collectionName ||
      nestedPayload?.view ||
      nestedPayload?.type ||
      nestedPayload?.collection ||
      nestedPayload?.collectionName ||
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

// --- Follow-up task register ---------------------------------------------

const DEFAULT_COMMUNICATION_POLICY = {
  enabled: true,
  emailFollowUpHours: 72,
  whatsappFollowUpHours: 24,
  socialFollowUpHours: 48,
  callFollowUpHours: 120,
  defaultFollowUpHours: 72,
  escalateToCallAfterFollowUps: 2,
  maxFollowUps: 3,
};

type CommunicationPolicy = typeof DEFAULT_COMMUNICATION_POLICY;

function coerceHours(value: any, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.round(parsed), 24 * 365);
}

function normalizeCommunicationPolicy(raw: any): CommunicationPolicy {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    enabled: source.enabled !== false,
    emailFollowUpHours: coerceHours(source.emailFollowUpHours, DEFAULT_COMMUNICATION_POLICY.emailFollowUpHours),
    whatsappFollowUpHours: coerceHours(source.whatsappFollowUpHours, DEFAULT_COMMUNICATION_POLICY.whatsappFollowUpHours),
    socialFollowUpHours: coerceHours(source.socialFollowUpHours, DEFAULT_COMMUNICATION_POLICY.socialFollowUpHours),
    callFollowUpHours: coerceHours(source.callFollowUpHours, DEFAULT_COMMUNICATION_POLICY.callFollowUpHours),
    defaultFollowUpHours: coerceHours(source.defaultFollowUpHours, DEFAULT_COMMUNICATION_POLICY.defaultFollowUpHours),
    escalateToCallAfterFollowUps: Math.max(0, Math.round(Number(source.escalateToCallAfterFollowUps ?? DEFAULT_COMMUNICATION_POLICY.escalateToCallAfterFollowUps)) || 0),
    maxFollowUps: Math.max(0, Math.round(Number(source.maxFollowUps ?? DEFAULT_COMMUNICATION_POLICY.maxFollowUps)) || 0),
  };
}

async function loadCommunicationPolicy(db: any): Promise<CommunicationPolicy> {
  try {
    const snapshot = await db.collection('configuration').doc('communicationPolicy').get();
    return normalizeCommunicationPolicy(snapshot.exists ? snapshot.data() : null);
  } catch {
    return { ...DEFAULT_COMMUNICATION_POLICY };
  }
}

// Maps whatever channel wording the UI used onto a policy interval.
function hoursForChannel(policy: CommunicationPolicy, channel: string): number {
  const value = (channel || '').toLowerCase();
  if (value.includes('whatsapp') || value.includes('sms')) return policy.whatsappFollowUpHours;
  if (value.includes('call') || value.includes('phone')) return policy.callFollowUpHours;
  if (value.includes('linkedin') || value.includes('social') || value.includes('facebook') || value.includes('dm')) return policy.socialFollowUpHours;
  if (value.includes('email') || value.includes('mail') || value.includes('engage')) return policy.emailFollowUpHours;
  return policy.defaultFollowUpHours;
}

function recordDisplayName(data: any): string {
  return String(
    data?.companyName
    || data?.tradingName
    || `${data?.firstName || ''} ${data?.lastName || ''}`.trim()
    || data?.email
    || 'Unnamed record'
  ).trim();
}

/**
 * Creates (or replaces) the outstanding follow-up task for a record after outreach is sent.
 * Deterministic id per record so repeated sends reschedule rather than pile up duplicates.
 */
async function scheduleFollowUpTask(db: any, opts: {
  recordRef: any;
  collection: string;
  recordId: string;
  recordData: any;
  channel: string;
  subject: string;
  sentAt: string;
  actorUid: string;
  overrideDueAt?: string | null;
}) {
  const policy = await loadCommunicationPolicy(db);
  if (!policy.enabled) return null;

  const followUpNumber = Number(opts.recordData?.followUpCount || 0) + 1;
  if (policy.maxFollowUps > 0 && followUpNumber > policy.maxFollowUps) return null;

  const escalateToCall = policy.escalateToCallAfterFollowUps > 0
    && followUpNumber > policy.escalateToCallAfterFollowUps;
  const normalizedChannel = String(opts.channel || '').toLowerCase();
  const actionType = escalateToCall
    ? 'call'
    : normalizedChannel.includes('whatsapp')
      ? 'whatsapp'
      : 'email';
  const hours = escalateToCall
    ? policy.callFollowUpHours
    : hoursForChannel(policy, opts.channel);

  // A manually-picked follow-up date (from the register's Log Outcome form) always
  // wins over the policy-calculated default.
  const dueAt = opts.overrideDueAt
    ? new Date(opts.overrideDueAt).toISOString()
    : new Date(new Date(opts.sentAt).getTime() + hours * 60 * 60 * 1000).toISOString();
  const companyName = recordDisplayName(opts.recordData);
  const taskId = `followup_${opts.collection}_${opts.recordId}`;

  const task = {
    id: taskId,
    source: 'auto_follow_up',
    status: 'pending',
    actionType,
    title: escalateToCall
      ? `Call ${companyName} — no reply after ${followUpNumber - 1} follow-up(s)`
      : `Follow up with ${companyName} re: ${opts.subject}`,
    description: `${opts.channel} sent ${new Date(opts.sentAt).toISOString()}. Policy allows ${hours}h before follow-up #${followUpNumber}.`,
    recordId: opts.recordId,
    recordCollection: opts.collection,
    companyName,
    contactEmail: String(opts.recordData?.email || '').trim() || null,
    contactPhone: String(opts.recordData?.phone || opts.recordData?.mobile || '').trim() || null,
    lastChannel: opts.channel,
    lastSubject: opts.subject,
    lastOutreachAt: opts.sentAt,
    followUpNumber,
    dueAt,
    dueDate: dueAt.slice(0, 10),
    assigneeId: String(opts.recordData?.assigneeId || opts.actorUid || '').trim() || null,
    createdBy: opts.actorUid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await Promise.all([
    db.collection('platformTasks').doc(taskId).set(task, { merge: true }),
    opts.recordRef.set({
      nextFollowUpAt: dueAt,
      nextFollowUpAction: actionType,
      followUpCount: followUpNumber,
    }, { merge: true }),
  ]);

  return task;
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

function getRegistryDuplicateIdentity(record: Record<string, any>) {
  const contacts = [
    record.marketingManager,
    record.operationsManager,
    record.technicalManager,
    record.ceo,
  ].filter(contact => contact && typeof contact === 'object');
  const emails = new Set(
    [record.email, ...contacts.map(contact => contact.email)]
      .map(value => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const phones = new Set(
    [
      record.phone,
      record.mobile,
      ...contacts.flatMap(contact => [contact.phone, contact.mobile, contact.telephone]),
    ]
      .map(value => String(value || '').replace(/\D/g, ''))
      .filter(value => value.length >= 7)
  );
  const domains = new Set<string>();
  for (const value of [record.website, ...contacts.map(contact => contact.website)]) {
    try {
      const rawWebsite = String(value || '').trim();
      if (!rawWebsite) continue;
      const parsed = new URL(/^https?:\/\//i.test(rawWebsite) ? rawWebsite : `https://${rawWebsite}`);
      domains.add(parsed.hostname.toLowerCase().replace(/^www\./, ''));
    } catch {
      // Invalid website values are not duplicate evidence.
    }
  }
  return {
    sourceId: String(record.sourceId || '').trim(),
    domains,
    emails,
    phones,
  };
}

function hasStrongRegistryDuplicateEvidence(left: Record<string, any>, right: Record<string, any>) {
  const leftIdentity = getRegistryDuplicateIdentity(left);
  const rightIdentity = getRegistryDuplicateIdentity(right);
  const overlaps = (first: Set<string>, second: Set<string>) =>
    Array.from(first).some(value => second.has(value));
  return (
    Boolean(leftIdentity.sourceId && leftIdentity.sourceId === rightIdentity.sourceId) ||
    overlaps(leftIdentity.domains, rightIdentity.domains) ||
    overlaps(leftIdentity.emails, rightIdentity.emails) ||
    overlaps(leftIdentity.phones, rightIdentity.phones)
  );
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

const DEDICATED_TYPE_COLLECTIONS = new Set([
  'suppliers', 'transporters', 'finance_co', 'investors', 'isa_agents', 'digital_associates', 'strategic_partners',
]);

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

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter(item => item !== undefined).map(item => removeUndefinedValues(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedValues(item)])
    ) as T;
  }
  return value;
}

function matchesRegistryFilters(record: Record<string, any>, filters: Record<string, any>, typeValues: string[] = []) {
  const term = String(filters.term || '').trim().toLowerCase();
  const category = String(filters.category || filters.industrial_category || '').trim();
  const status = String(filters.status || '').trim();
  const tag = String(filters.tag || '').trim();
  const assigneeId = String(filters.assigneeId || '').trim();

  if (typeValues.length && !DEDICATED_TYPE_COLLECTIONS.has(String(record.sourceCollection || ''))) {
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

    let db: FirebaseFirestore.Firestore;
    let adminUid: string = '';

    if (action === 'logClick') {
      db = getFirestore(app);
    } else {
      const authResult = await verifyAdmin(request as any);
      db = authResult.db;
      adminUid = authResult.adminUid;
    }

    if (action === 'getLendingData') {
      const requestedCollection = String(resolvedPayload.collectionName || resolvedPayload.collection || '').trim();
      const allowedCollections = new Set([
        'agreements',
        'collateral',
        'documents',
        'facilities',
        'lendingAssets',
        'lendingClients',
        'lendingDebtors',
        'lendingPartners',
        'lendingSuppliers',
        'securities',
        'transactions',
      ]);

      if (!allowedCollections.has(requestedCollection)) {
        return NextResponse.json({ success: false, error: 'Invalid lending collection requested.' }, { status: 400 });
      }

      const requestedLimit = Number(resolvedPayload.limit || 250);
      const safeLimit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 250, 1), 500);
      const orderedSnapshot = await db.collection(requestedCollection).orderBy('updatedAt', 'desc').limit(safeLimit).get();
      const fallbackSnapshot = orderedSnapshot.size < safeLimit
        ? await db.collection(requestedCollection).limit(safeLimit).get()
        : null;
      const recordsById = new Map<string, Record<string, any>>();
      for (const doc of [...orderedSnapshot.docs, ...(fallbackSnapshot?.docs || [])]) {
        recordsById.set(doc.id, { id: doc.id, ...doc.data() });
      }
      const records = Array.from(recordsById.values())
        .sort((first: any, second: any) => {
          const firstDate = new Date(first.updatedAt?.toDate?.() || first.updatedAt || first.createdAt?.toDate?.() || first.createdAt || 0).getTime();
          const secondDate = new Date(second.updatedAt?.toDate?.() || second.updatedAt || second.createdAt?.toDate?.() || second.createdAt || 0).getTime();
          return secondDate - firstDate;
        });

      return NextResponse.json({
        success: true,
        leads: records,
        data: records,
        items: records,
        records,
      }, { status: 200 });
    }

    if (action === 'getLendingPolicies') {
      const policySnapshot = await db.collection('configuration').doc('lendingPolicies').get();
      return NextResponse.json({ success: true, data: policySnapshot.data() || {} }, { status: 200 });
    }

    if (action === 'createAgreementFacilityApplication') {
      const application = resolvedPayload.application;
      if (!application || typeof application !== 'object') {
        return NextResponse.json({ success: false, error: 'Agreement application data is required.' }, { status: 400 });
      }
      const clientId = String(application.clientId || '').trim();
      const masterFacilityId = String(application.masterFacilityId || '').trim();
      const amountRequested = Number(application.amountRequested || 0);
      if (!clientId || !masterFacilityId || !application.type || !amountRequested) {
        return NextResponse.json({ success: false, error: 'Client, approved global facility, agreement type, and requested amount are required.' }, { status: 400 });
      }
      const [clientSnapshot, masterSnapshot] = await Promise.all([
        db.collection('lendingClients').doc(clientId).get(),
        db.collection('facilities').doc(masterFacilityId).get(),
      ]);
      if (!clientSnapshot.exists || !masterSnapshot.exists) return NextResponse.json({ success: false, error: 'Client or global facility was not found.' }, { status: 404 });
      const master = masterSnapshot.data() || {};
      if (master.facilityClass !== 'global' || (master.status !== 'approved' && master.status !== 'active')) {
        return NextResponse.json({ success: false, error: 'An approved global facility is required before an agreement application can be made.' }, { status: 409 });
      }
      const existingSubFacilities = await db.collection('facilities').where('parentId', '==', masterFacilityId).get();
      const matchingSub = existingSubFacilities.docs.find((document) => document.data()?.applicationId === String(application.applicationId || ''));
      const subFacilityRef = matchingSub?.ref || db.collection('facilities').doc();
      const now = new Date().toISOString();
      const client = clientSnapshot.data() || {};
      const subFacility = {
        id: subFacilityRef.id,
        applicationId: String(application.applicationId || subFacilityRef.id),
        ownerType: 'client',
        clientId,
        parentId: masterFacilityId,
        facilityClass: 'sub',
        type: String(application.type),
        limit: amountRequested,
        status: matchingSub?.data()?.status || 'pending_credit',
        onboardingStage: matchingSub?.data()?.onboardingStage || 'application',
        onboardingTasks: matchingSub?.data()?.onboardingTasks || {},
        onboardingEvidence: matchingSub?.data()?.onboardingEvidence || {},
        applicantRequest: { amountRequested, termMonths: Number(application.termMonths || 0), description: String(application.description || '') },
        source: 'client_agreement_application',
        clientApplicationId: clientId,
        sourceClientStatus: String(client.status || 'not_started'),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: matchingSub?.data()?.createdAt || FieldValue.serverTimestamp(),
        createdBy: matchingSub?.data()?.createdBy || adminUid,
      };
      await subFacilityRef.set(subFacility, { merge: true });
      const caseSnapshot = await db.collection('lendingApplications').where('facilityId', '==', subFacilityRef.id).limit(1).get();
      const caseRef = caseSnapshot.empty ? db.collection('lendingApplications').doc() : caseSnapshot.docs[0].ref;
      await caseRef.set({
        id: caseRef.id,
        applicationId: caseRef.id,
        caseType: 'agreement_facility_case',
        clientId,
        masterFacilityId,
        facilityId: subFacilityRef.id,
        companyName: String(client.name || ''),
        entityType: String(client.entityType || 'Pty Ltd'),
        primaryContact: String(client.primaryContact || ''),
        email: String(client.email || ''),
        phone: String(client.phone || ''),
        amountRequested,
        termMonths: Number(application.termMonths || 0),
        facilityType: String(application.type),
        facilityAgreementType: String(application.type),
        fundingNeed: String(application.fundingNeed || 'agreement-specific'),
        purposeNarrative: String(application.description || ''),
        status: caseSnapshot.empty ? 'submitted' : (caseSnapshot.docs[0].data()?.status || 'submitted'),
        sourceCollections: ['lendingClients', 'facilities', 'agreements'],
        sourceSnapshot: { clientId, masterFacilityId, facilityId: subFacilityRef.id, clientApplicationId: clientId, clientApplicationUpdatedAt: client.updatedAt || null, capturedAt: now },
        updatedAt: now,
        createdAt: caseSnapshot.empty ? now : (caseSnapshot.docs[0].data()?.createdAt || now),
      }, { merge: true });
      await subFacilityRef.set({ creditCaseId: caseRef.id }, { merge: true });
      return NextResponse.json({ success: true, facilityId: subFacilityRef.id, creditCaseId: caseRef.id, collection: 'facilities' }, { status: 200 });
    }

    if (action === 'ensureGlobalFacilityReview') {
      const clientId = String(resolvedPayload.clientId || '').trim();
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId is required.' }, { status: 400 });
      }
      const clientSnapshot = await db.collection('lendingClients').doc(clientId).get();
      if (!clientSnapshot.exists) {
        return NextResponse.json({ success: false, error: 'Client application was not found.' }, { status: 404 });
      }

      const client = clientSnapshot.data() || {};
      const globalSnapshot = await db.collection('facilities')
        .where('clientId', '==', clientId)
        .get();
      const existingGlobal = globalSnapshot.docs.find((document) => {
        const data = document.data();
        return data.facilityClass === 'global' || !data.parentId;
      });
      const facilityRef = existingGlobal?.ref || db.collection('facilities').doc();
      const facilityData = {
        id: facilityRef.id,
        ownerType: 'client',
        clientId,
        facilityClass: 'global',
        parentId: null,
        type: 'Global Client Facility',
        limit: Number(existingGlobal?.data()?.limit || 0),
        status: existingGlobal?.data()?.status || 'pending_credit',
        onboardingStage: existingGlobal?.data()?.onboardingStage || 'application',
        onboardingTasks: existingGlobal?.data()?.onboardingTasks || {},
        onboardingEvidence: existingGlobal?.data()?.onboardingEvidence || {},
        source: 'completed_client_application',
        clientApplicationId: clientId,
        createdBy: existingGlobal?.data()?.createdBy || adminUid,
        createdAt: existingGlobal?.data()?.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await facilityRef.set(facilityData, { merge: true });

      const caseSnapshot = await db.collection('lendingApplications')
        .where('clientId', '==', clientId)
        .get();
      const existingCase = caseSnapshot.docs.find((document) => {
        const data = document.data();
        return data.masterFacilityId === facilityRef.id && !data.facilityId;
      });
      const caseRef = existingCase?.ref || db.collection('lendingApplications').doc();
      const now = new Date().toISOString();
      await caseRef.set({
        id: caseRef.id,
        applicationId: caseRef.id,
        caseType: 'global_facility_indication',
        clientId,
        masterFacilityId: facilityRef.id,
        companyName: String(client.name || '').trim(),
        entityType: String(client.entityType || 'Pty Ltd'),
        primaryContact: String(client.primaryContact || ''),
        email: String(client.email || ''),
        phone: String(client.phone || ''),
        amountRequested: 0,
        termMonths: 0,
        facilityType: 'Global Client Facility',
        fundingNeed: 'broad_client_facility',
        status: existingCase?.data()?.status || 'submitted',
        sourceCollections: ['lendingClients', 'facilities', 'agreements'],
        originationType: existingCase?.data()?.originationType || 'direct',
        engagementEvents: existingCase?.data()?.engagementEvents || [],
        facilityIndication: { status: 'non_binding', committeeDetermined: true },
        sourceSnapshot: { clientId, masterFacilityId: facilityRef.id, capturedAt: now },
        createdAt: existingCase?.data()?.createdAt || now,
        updatedAt: now,
      }, { merge: true });
      await clientSnapshot.ref.set({ globalFacilityId: facilityRef.id, globalFacilityCaseId: caseRef.id, facilityReviewStatus: 'pending_credit', updatedAt: FieldValue.serverTimestamp() }, { merge: true });

      return NextResponse.json({ success: true, facilityId: facilityRef.id, creditCaseId: caseRef.id, collection: 'facilities' }, { status: 200 });
    }

    if (action === 'saveLendingFacility') {
      const facility = resolvedPayload.facility;
      if (!facility || typeof facility !== 'object') {
        return NextResponse.json({ success: false, error: 'Facility data is required.' }, { status: 400 });
      }

      const { id, ...facilityData } = removeUndefinedValues(facility) as Record<string, any>;
      const facilityRef = id ? db.collection('facilities').doc(String(id)) : db.collection('facilities').doc();
      const facilityLimit = Number(facilityData.limit || 0);

      if (facilityData.facilityClass === 'sub') {
        const parentId = String(facilityData.parentId || '').trim();
        if (!parentId) {
          return NextResponse.json({ success: false, error: 'Sub-facilities require a parent master facility.' }, { status: 400 });
        }

        const parentSnapshot = await db.collection('facilities').doc(parentId).get();
        if (!parentSnapshot.exists) {
          return NextResponse.json({ success: false, error: 'Parent master facility was not found.' }, { status: 404 });
        }

        const parentData = parentSnapshot.data() || {};
        if (parentData.status !== 'approved' && parentData.status !== 'active') {
          return NextResponse.json({ success: false, error: 'The global facility must be approved before an agreement facility can be created.' }, { status: 409 });
        }
        const parentLimit = Number(parentData.limit || 0);
        const siblingSnapshot = await db.collection('facilities').where('parentId', '==', parentId).get();
        const siblingTotal = siblingSnapshot.docs.reduce((total, document) => {
          if (document.id === facilityRef.id) return total;
          return total + Number(document.data()?.limit || 0);
        }, 0);

        if (siblingTotal + facilityLimit > parentLimit) {
          return NextResponse.json({
            success: false,
            error: `Sub-facility total ${siblingTotal + facilityLimit} exceeds master facility limit ${parentLimit}.`,
          }, { status: 400 });
        }
      }

      await facilityRef.set({
        ...facilityData,
        id: facilityRef.id,
        limit: facilityLimit,
        status: facilityData.status || 'pending_credit',
        onboardingStage: facilityData.onboardingStage || 'lead',
        onboardingTasks: facilityData.onboardingTasks || {},
        onboardingEvidence: facilityData.onboardingEvidence || {},
        createdBy: facilityData.createdBy || adminUid,
        createdAt: facilityData.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return NextResponse.json({ success: true, id: facilityRef.id, collection: 'facilities' }, { status: 200 });
    }

    if (action === 'updateFacilityStatus') {
      const facilityId = String(resolvedPayload.facilityId || '').trim();
      const status = String(resolvedPayload.status || '').trim();
      if (!facilityId || !status) {
        return NextResponse.json({ success: false, error: 'facilityId and status are required.' }, { status: 400 });
      }

      await db.collection('facilities').doc(facilityId).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return NextResponse.json({ success: true, id: facilityId, collection: 'facilities' }, { status: 200 });
    }

    if (action === 'deleteLendingFacility') {
      const facilityId = String(resolvedPayload.facilityId || '').trim();
      if (!facilityId) {
        return NextResponse.json({ success: false, error: 'facilityId is required.' }, { status: 400 });
      }

      await db.collection('facilities').doc(facilityId).delete();
      return NextResponse.json({ success: true, deletedId: facilityId, collection: 'facilities' }, { status: 200 });
    }

    if (action === 'saveLendingAgreement') {
      const agreement = resolvedPayload.agreement;
      if (!agreement || typeof agreement !== 'object') {
        return NextResponse.json({ success: false, error: 'Agreement data is required.' }, { status: 400 });
      }

      const { id, ...agreementData } = removeUndefinedValues(agreement) as Record<string, any>;
      const agreementRef = id ? db.collection('agreements').doc(String(id)) : db.collection('agreements').doc();
      const previousAgreement = id ? await agreementRef.get() : null;
      const agreementAmount = Number(agreementData.totalAdvanced || 0);
      const policySnapshot = await db.collection('configuration').doc('lendingPolicies').get();
      const policyViolations = validateAgreementAgainstPolicies(agreementData, policySnapshot.data() || {});
      if (policyViolations.length > 0) {
        return NextResponse.json({ success: false, error: policyViolations.join(' ') }, { status: 400 });
      }

      const facilityId = String(agreementData.facilityId || '').trim();
      if (facilityId) {
        const facilitySnapshot = await db.collection('facilities').doc(facilityId).get();
        if (!facilitySnapshot.exists) {
          return NextResponse.json({ success: false, error: 'Selected sub-facility was not found.' }, { status: 404 });
        }
        const facility = facilitySnapshot.data() || {};
        if (facility.facilityClass !== 'sub') {
          return NextResponse.json({ success: false, error: 'Agreements must be allocated to a sub-facility, not directly to the master facility.' }, { status: 400 });
        }
        if (facility.status !== 'approved' && facility.status !== 'active') {
          return NextResponse.json({ success: false, error: 'The agreement sub-facility must be approved before an agreement can be booked.' }, { status: 409 });
        }
        const siblingSnapshot = await db.collection('agreements').where('facilityId', '==', facilityId).get();
        const existingAgreementTotal = siblingSnapshot.docs.reduce((total, document) => {
          if (document.id === agreementRef.id) return total;
          return total + Number(document.data()?.totalAdvanced || 0);
        }, 0);
        const subFacilityLimit = Number(facility.limit || 0);
        if (existingAgreementTotal + agreementAmount > subFacilityLimit) {
          return NextResponse.json({ success: false, error: `Agreement total ${existingAgreementTotal + agreementAmount} exceeds sub-facility limit ${subFacilityLimit}.` }, { status: 400 });
        }
      }

      let creditCaseId = String(agreementData.creditCaseId || '').trim();
      if (!creditCaseId && agreementData.clientId && facilityId) {
        const caseSnapshot = await db.collection('lendingApplications')
          .where('clientId', '==', String(agreementData.clientId))
          .get();
        const linkedCase = caseSnapshot.docs.find((document) => document.data()?.facilityId === facilityId);
        creditCaseId = linkedCase?.id || '';
      }
      if (creditCaseId) agreementData.creditCaseId = creditCaseId;

      await agreementRef.set({
        ...agreementData,
        id: agreementRef.id,
        totalAdvanced: agreementAmount,
        interestRate: Number(agreementData.interestRate || 0),
        numberOfInstallments: Number(agreementData.numberOfInstallments || 0),
        status: agreementData.status || 'booking',
        createDate: agreementData.createDate || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: adminUid,
      }, { merge: true });

      const previousCreditCaseId = String(previousAgreement?.data()?.creditCaseId || '').trim();
      if (previousCreditCaseId && previousCreditCaseId !== creditCaseId) {
        await db.collection('lendingApplications').doc(previousCreditCaseId).set({
          linkedAgreementIds: FieldValue.arrayRemove(agreementRef.id),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      if (creditCaseId) {
        await db.collection('lendingApplications').doc(creditCaseId).set({
          agreementId: agreementRef.id,
          linkedAgreementIds: FieldValue.arrayUnion(agreementRef.id),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      return NextResponse.json({ success: true, data: { id: agreementRef.id }, id: agreementRef.id, collection: 'agreements' }, { status: 200 });
    }

    if (action === 'deleteLendingAgreement') {
      const agreementId = String(resolvedPayload.agreementId || '').trim();
      if (!agreementId) {
        return NextResponse.json({ success: false, error: 'agreementId is required.' }, { status: 400 });
      }

      await db.collection('agreements').doc(agreementId).delete();
      return NextResponse.json({ success: true, deletedId: agreementId, collection: 'agreements' }, { status: 200 });
    }

    if (action === 'createLendingPayment') {
      const payment = resolvedPayload.payment;
      if (!payment || typeof payment !== 'object') {
        return NextResponse.json({ success: false, error: 'Payment data is required.' }, { status: 400 });
      }

      const { id, ...paymentData } = removeUndefinedValues(payment) as Record<string, any>;
      const paymentRef = id ? db.collection('lendingPayments').doc(String(id)) : db.collection('lendingPayments').doc();
      await paymentRef.set({
        ...paymentData,
        id: paymentRef.id,
        amount: Number(paymentData.amount || 0),
        amountPaid: Number(paymentData.amountPaid || 0),
        status: paymentData.status || 'pending',
        createdAt: paymentData.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: adminUid,
      }, { merge: true });

      return NextResponse.json({ success: true, data: { id: paymentRef.id }, id: paymentRef.id, collection: 'lendingPayments' }, { status: 200 });
    }

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

        // Generate Deposit Receipt Invoice & Account Statement Record
        const receiptInvoiceRef = companyRef.collection('invoices').doc();
        const rootReceiptInvoiceRef = adminDb.collection('platformInvoices').doc(receiptInvoiceRef.id);
        const receiptNum = `RCP-2026-${Math.floor(100000 + Math.random() * 900000)}`;

        const receiptData = {
          id: receiptInvoiceRef.id,
          invoiceNumber: receiptNum,
          companyId,
          companyName: company.data()?.companyName || 'Member Company',
          date: FieldValue.serverTimestamp(),
          dueDate: FieldValue.serverTimestamp(),
          status: 'paid',
          planType: 'deposit_receipt',
          description: paymentData.description || 'Wallet top-up via EFT Deposit',
          items: [{ description: 'EFT Wallet Top-Up Credit', quantity: 1, unitPrice: amount, subtotal: amount, vat: 0, total: amount }],
          subtotal: amount,
          vatAmount: 0,
          totalAmount: amount,
          paymentMethod: 'EFT Transfer',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        transaction.set(receiptInvoiceRef, receiptData);
        transaction.set(rootReceiptInvoiceRef, receiptData);

        const statementRef = companyRef.collection('statements').doc();
        transaction.set(statementRef, {
          id: statementRef.id,
          companyId,
          invoiceId: receiptInvoiceRef.id,
          invoiceNumber: receiptNum,
          description: 'Wallet top-up via EFT Deposit',
          type: 'credit',
          amount,
          runningBalance: (Number(company.data()?.availableBalance || 0) + amount),
          date: FieldValue.serverTimestamp(),
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

      // The gap analysis often leaves a one-line stub here. The classification pass
      // produces a far richer write-up, so the longer of the two wins rather than
      // letting whichever arrived first permanently short-circuit the other.
      const existingWording = String(located.data.minedServiceWording || '').trim();
      const harvestedWording = shopProfile.longDescription;
      const wordsIn = (value: string) => value.split(/\s+/).filter(Boolean).length;
      const minedServiceWording =
        wordsIn(harvestedWording) > wordsIn(existingWording)
          ? harvestedWording
          : existingWording || harvestedWording || null;

      await located.ref.set({
        serviceProfile,
        shopProfile,
        campaignAngles,
        searchCorpus,
        minedServiceWording,
        researchStage: 'service_profile_complete',
        serviceProfileSavedAt: new Date().toISOString(),
        serviceProfileSavedBy: adminUid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      await syncRegistryIndexDocument(adminDb, located.collection, recordId);

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

      for (const field of ['contactability', 'emailVerification']) {
        const value = findings[field];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          assign(field, value);
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
      await syncRegistryIndexDocument(adminDb, located.collection, recordId);

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
        let profile = resolvedPayload.commercialProfile;
        if (!profile || typeof profile !== 'object') {
          return NextResponse.json({ success: false, error: 'commercialProfile object is required.' }, { status: 400 });
        }

        // Avoid clobbering a richer earlier deep-dive with a weaker re-run (e.g. a later
        // pass that failed to identify the owner/contact). Where the new profile is missing
        // a value that the previously-saved profile had, keep the old value instead of
        // wiping it out.
        const previousProfile = located.data?.commercialProfile;
        if (previousProfile && typeof previousProfile === 'object') {
          const prevTargetContact = previousProfile.engagementStrategy?.targetContact;
          const newTargetContact = profile.engagementStrategy?.targetContact;
          const prevHasContactName = typeof prevTargetContact === 'object' && String(prevTargetContact?.name || '').trim();
          const newHasContactName = typeof newTargetContact === 'object' && String(newTargetContact?.name || '').trim();
          if (prevHasContactName && !newHasContactName) {
            profile = {
              ...profile,
              engagementStrategy: {
                ...(profile.engagementStrategy || {}),
                targetContact: prevTargetContact,
              },
            };
          }

          const prevEmail = String(previousProfile.contactability?.emailVerification?.email || '').trim();
          const newEmail = String(profile.contactability?.emailVerification?.email || '').trim();
          if (prevEmail && !newEmail) {
            profile = {
              ...profile,
              contactability: {
                ...(profile.contactability || {}),
                emailVerification: {
                  ...(previousProfile.contactability?.emailVerification || {}),
                  ...(profile.contactability?.emailVerification || {}),
                  email: prevEmail,
                },
              },
            };
          }

          const prevPhone = String(previousProfile.contactability?.phoneVerification?.phone || '').trim();
          const newPhone = String(profile.contactability?.phoneVerification?.phone || '').trim();
          if (prevPhone && !newPhone) {
            profile = {
              ...profile,
              contactability: {
                ...(profile.contactability || {}),
                phoneVerification: {
                  ...(previousProfile.contactability?.phoneVerification || {}),
                  ...(profile.contactability?.phoneVerification || {}),
                  phone: prevPhone,
                },
              },
            };
          }
        }

        const targetContact = profile.engagementStrategy?.targetContact;
        const targetName = typeof targetContact === 'object' ? String(targetContact.name || '').trim() : '';
        const targetRole = typeof targetContact === 'object' ? String(targetContact.role || '').trim() : '';
        const emailVerification = profile.contactability?.emailVerification;
        const verifiedEmail = emailVerification?.bounceRisk !== 'high' && emailVerification?.domainStatus !== 'domain_not_found'
          ? String(targetContact?.email || emailVerification?.email || '').trim()
          : '';
        const verifiedPhone = String(targetContact?.mobile || profile.contactability?.phoneVerification?.phone || '').trim();
        const targetRoleLower = targetRole.toLowerCase();
        const contactField = /market|sales|brand/.test(targetRoleLower) ? 'marketingManager' : /operat|logistics|fleet/.test(targetRoleLower) ? 'operationsManager' : /technical|workshop|maintenance|engineer/.test(targetRoleLower) ? 'technicalManager' : 'ceo';
        const researchedContact = targetName ? {
          name: targetName,
          role: targetRole,
          email: String(targetContact.email || '').trim(),
          mobile: String(targetContact.mobile || '').trim(),
        } : null;
        update = {
          ...update,
          commercialProfile: profile,
          deepDiveCompletedAt: now,
          deepDiveCompletedBy: adminUid,
          researchStage: 'deep_dive_complete',
          ...(verifiedEmail ? { email: verifiedEmail } : {}),
          ...(verifiedPhone ? { phone: verifiedPhone } : {}),
          ...(researchedContact ? { [contactField]: researchedContact, primaryContactRole: contactField } : {}),
        };
      }

      await located.ref.set(update, { merge: true });
      await syncRegistryIndexDocument(adminDb, located.collection, recordId);
      return NextResponse.json({ success: true, id: recordId, collection: located.collection });
    }

    // Manual admin-triggered promotion of a research/lead record into a visible (but not yet
    // self-claimed) member entity in /backend. The record stays linked via leadId/companyId so
    // that when the real person eventually signs up with a matching email, checkAndCreateUser
    // reuses this same companies doc instead of creating a duplicate.
    if (action === 'deleteMember') {
      const companyId = String(resolvedPayload?.companyId || resolvedPayload?.id || '').trim();
      if (!companyId) {
        return NextResponse.json({ success: false, error: 'A companyId is required for deletion.' }, { status: 400 });
      }
      const companyRef = db.collection('companies').doc(companyId);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) {
        return NextResponse.json({ success: false, error: `Member ${companyId} was not found.` }, { status: 404 });
      }
      const leadId = companySnap.data()?.leadId;
      const sourceCollection = companySnap.data()?.sourceCollection || 'leads';
      const batch = db.batch();
      batch.delete(companyRef);
      if (leadId) {
        batch.update(db.collection(sourceCollection).doc(leadId), {
          companyId: FieldValue.delete(),
          status: 'qualified',
          invitationStatus: FieldValue.delete(),
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
      await deleteRegistryIndexDocument(db, 'companies', companyId);
      if (leadId) await syncRegistryIndexDocument(db, sourceCollection, String(leadId));
      return NextResponse.json({ success: true, deletedId: companyId }, { status: 200 });
    }

    if (action === 'updateMemberStatus') {
      const companyId = String(resolvedPayload?.companyId || resolvedPayload?.id || '').trim();
      const status = String(resolvedPayload?.status || '').trim();
      const allowedStatuses = ['active', 'suspended', 'invited', 'pending'];
      if (!companyId || !allowedStatuses.includes(status)) {
        return NextResponse.json({ success: false, error: 'A valid companyId and status are required.' }, { status: 400 });
      }
      const companyRef = db.collection('companies').doc(companyId);
      const companySnap = await companyRef.get();
      if (!companySnap.exists) {
        return NextResponse.json({ success: false, error: `Member ${companyId} was not found.` }, { status: 404 });
      }
      await companyRef.set({ status, updatedAt: new Date().toISOString() }, { merge: true });
      await syncRegistryIndexDocument(db, 'companies', companyId);
      return NextResponse.json({ success: true, id: companyId, status }, { status: 200 });
    }

    if (action?.startsWith('delete') && action !== 'deleteRegistryDuplicates') {
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
        await deleteRegistryIndexDocument(db, targetCollection, String(recordId));
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
        await syncRegistryIndexDocument(db, targetCollection, String(id));
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
      await syncRegistryIndexDocument(db, targetCollection, docRef.id);
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
      const normalizedImportType = importType || (targetCollection === 'suppliers' ? 'supplier' : targetCollection === 'transporters' ? 'transporter' : '');
      const indexCollections = await getRegistryIndexWriteCollections(db);
      const writer = db.bulkWriter();
      writer.onWriteError(error => error.failedAttempts < 3);
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
        if (!dataToSave.type && normalizedImportType) {
          dataToSave.type = normalizedImportType;
        }
        if (sourcePartnerId) {
          dataToSave.sourcePartnerId = sourcePartnerId;
          dataToSave.sourceType = 'existing-customer-import';
          dataToSave.discountEligible = discountEligible;
          if (agreementId) dataToSave.discountAgreementId = agreementId;
        }
        writer.set(docRef, dataToSave);
        for (const indexCollection of indexCollections) {
          writer.set(
            db.collection(indexCollection).doc(`${targetCollection}__${docRef.id}`),
            buildRegistryIndexRecord(targetCollection, docRef.id, dataToSave),
            { merge: false }
          );
        }
        count += 1;
      }

      await writer.close();
      return NextResponse.json({ success: true, count, collection: targetCollection, message: `Imported ${count} records into ${targetCollection}.` }, { status: 200 });
    }

    if (action === 'dispatchEngagement') {
      const partnerId = String(resolvedPayload?.partnerId || '').trim();
      const email = String(resolvedPayload?.email || '').trim();
      const subject = String(resolvedPayload?.subject || '').trim();
      const html = String(resolvedPayload?.html || '').trim();
      const contentType = normalizeEngagementContentType(resolvedPayload?.contentType, subject, 'Email');
      const contentLabel = String(resolvedPayload?.contentLabel || engagementContentLabel(contentType)).trim();
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

      const now = new Date().toISOString();
      const logEntry = {
        timestamp: now,
        action: 'direct_engagement_dispatched',
        subject,
        channel: 'Email',
        recipient: email,
        contentType,
        contentLabel,
      };

      await db.collection(targetCollection).doc(partnerId).set({
        lastOutreachSubject: subject,
        lastOutreachAt: now,
        lastOutreachChannel: 'Email',
        lastEngagementType: contentType,
        lastEngagementLabel: contentLabel,
        lastEngagementAt: now,
        lastEngagementChannel: 'Email',
        sentContentTypes: FieldValue.arrayUnion(contentType),
        engagementStage: 'Contacted',
        engagementScore: FieldValue.increment(20),
        outreachCount: FieldValue.increment(1),
        updatedAt: now,
        engagementLogs: FieldValue.arrayUnion(logEntry)
      }, { merge: true });
      await syncRegistryIndexDocument(db, targetCollection, partnerId);

      return NextResponse.json({ success: true, message: 'Engagement email dispatched successfully.' }, { status: 200 });
    }

    if (action === 'logCommunication') {
      const partnerId = String(resolvedPayload?.partnerId || resolvedPayload?.recordId || resolvedPayload?.id || '').trim();
      const communication = resolvedPayload?.communication && typeof resolvedPayload.communication === 'object'
        ? resolvedPayload.communication
        : resolvedPayload;
      const channel = String(communication?.type || communication?.communicationType || communication?.channel || 'Manual').trim();
      const subject = String(communication?.subject || 'Manual engagement').trim();
      const notes = String(communication?.notes || '').trim();
      const contentType = normalizeEngagementContentType(
        communication?.contentType,
        subject,
        channel
      );
      const contentLabel = String(
        communication?.contentLabel || engagementContentLabel(contentType)
      ).trim();
      const stopSequence = resolvedPayload?.stopSequence === true;
      const overrideDueAt = resolvedPayload?.followUpDate
        ? new Date(String(resolvedPayload.followUpDate)).toISOString()
        : null;

      if (!partnerId || !channel || !subject) {
        return NextResponse.json({ success: false, error: 'Partner ID, communication type, and subject are required.' }, { status: 400 });
      }

      const located = await findResearchRecord(db, partnerId, resolvedPayload?.collection);
      if (!located) {
        return NextResponse.json({ success: false, error: `Record ${partnerId} was not found.` }, { status: 404 });
      }

      const now = new Date().toISOString();
      const logEntry = {
        timestamp: now,
        action: 'manual_engagement_logged',
        subject,
        channel,
        notes,
        recipient: String(communication?.recipient || '').trim() || null,
        loggedBy: adminUid,
        contentType,
        contentLabel,
      };
      const communicationRef = located.ref.collection('communications').doc();
      const communicationRecord = {
        ...communication,
        id: communicationRef.id,
        type: channel,
        subject,
        notes,
        contentType,
        contentLabel,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: adminUid,
      };

      // Complete any still-open follow-up task for this record so logging a new event
      // here doesn't leave a stale task sitting in the register alongside the new one.
      const openTaskId = `followup_${located.collection}_${partnerId}`;
      const openTaskSnap = await db.collection('platformTasks').doc(openTaskId).get().catch(() => null);
      const hasOpenTask = openTaskSnap && openTaskSnap.exists && (openTaskSnap.data() || {}).status !== 'completed';

      await Promise.all([
        communicationRef.set(communicationRecord),
        located.ref.set({
          lastOutreachSubject: subject,
          lastOutreachAt: now,
          lastOutreachChannel: channel,
          lastEngagementType: contentType,
          lastEngagementLabel: contentLabel,
          lastEngagementAt: now,
          lastEngagementChannel: channel,
          sentContentTypes: FieldValue.arrayUnion(contentType),
          engagementStage: 'Contacted',
          engagementScore: FieldValue.increment(10),
          outreachCount: FieldValue.increment(1),
          updatedAt: now,
          engagementLogs: FieldValue.arrayUnion(logEntry),
          ...(stopSequence ? { nextFollowUpAt: null, nextFollowUpAction: null, followUpSequenceStopped: true } : {}),
        }, { merge: true }),
        hasOpenTask
          ? db.collection('platformTasks').doc(openTaskId).set({ status: 'completed', completedAt: now, completedBy: adminUid, updatedAt: now }, { merge: true })
          : Promise.resolve(),
      ]);

      let followUpTask: any = null;
      if (!stopSequence) {
        try {
          followUpTask = await scheduleFollowUpTask(db, {
            recordRef: located.ref,
            collection: located.collection,
            recordId: partnerId,
            recordData: located.data,
            channel,
            subject,
            sentAt: now,
            actorUid: adminUid,
            overrideDueAt,
          });
        } catch (followUpError: any) {
          // A scheduling failure must never block the outreach itself from being logged.
          console.error('Follow-up scheduling failed', followUpError);
        }
      }
      await syncRegistryIndexDocument(db, located.collection, partnerId);

      return NextResponse.json({
        success: true,
        id: communicationRef.id,
        collection: located.collection,
        followUpTask,
      }, { status: 200 });
    }

    // Lets the "New Event" picker in the Follow-Up Register find any record across every
    // registry collection by company name or email, even if it has no open task yet.
    if (action === 'searchAnyRecord') {
      const term = String(resolvedPayload?.term || '').trim().toLowerCase();
      if (term.length < 2) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 });
      }

      const results: any[] = [];
      for (const collection of RESEARCH_COLLECTIONS) {
        if (results.length >= 25) break;
        try {
          const snapshot = await db.collection(collection).limit(500).get();
          for (const doc of snapshot.docs) {
            const data = doc.data() || {};
            const name = String(data.companyName || data.tradingName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || '').toLowerCase();
            const email = String(data.email || data.marketingManager?.email || '').toLowerCase();
            if (name.includes(term) || email.includes(term)) {
              results.push({
                id: doc.id,
                collection,
                companyName: recordDisplayName(data),
                email: data.email || data.marketingManager?.email || null,
                phone: data.phone || data.mobile || null,
              });
              if (results.length >= 25) break;
            }
          }
        } catch {
          // Ignore collections that fail — others may still succeed.
        }
      }

      return NextResponse.json({ success: true, data: results }, { status: 200 });
    }

    if (action === 'listRecordsByCollection') {
      const collection = String(resolvedPayload?.collection || '').trim();
      if (!RESEARCH_COLLECTIONS.includes(collection)) {
        return NextResponse.json({ success: false, error: 'Unknown register.' }, { status: 400 });
      }
      const snapshot = await db.collection(collection).orderBy('companyName', 'asc').limit(1000).get().catch(() => db.collection(collection).limit(1000).get());
      const results = snapshot.docs.map((doc: any) => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          collection,
          companyName: recordDisplayName(data),
          email: data.email || data.marketingManager?.email || null,
          phone: data.phone || data.mobile || null,
        };
      }).sort((a: any, b: any) => String(a.companyName).localeCompare(String(b.companyName)));

      return NextResponse.json({ success: true, data: results }, { status: 200 });
    }

    if (action === 'getCommunicationPolicy') {
      const policy = await loadCommunicationPolicy(db);
      return NextResponse.json({ success: true, data: policy, defaults: DEFAULT_COMMUNICATION_POLICY }, { status: 200 });
    }

    if (action === 'saveCommunicationPolicy') {
      const policy = normalizeCommunicationPolicy(resolvedPayload?.policy || resolvedPayload);
      await db.collection('configuration').doc('communicationPolicy').set({
        ...policy,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUid,
      }, { merge: true });
      return NextResponse.json({ success: true, data: policy }, { status: 200 });
    }

    if (action === 'getFollowUpRegister') {
      const includeCompleted = resolvedPayload?.includeCompleted === true;
      const snapshot = await db.collection('platformTasks').limit(500).get().catch(() => ({ docs: [] }));
      const nowMs = Date.now();
      const startOfTomorrow = new Date();
      startOfTomorrow.setHours(24, 0, 0, 0);

      const tasks = snapshot.docs
        .map((doc: any) => ({ ...(doc.data() || {}), id: doc.id }))
        .filter((task: any) => includeCompleted || task.status !== 'completed')
        .map((task: any) => {
          const dueMs = task.dueAt ? new Date(task.dueAt).getTime() : NaN;
          let bucket = 'upcoming';
          if (task.status === 'completed') bucket = 'completed';
          else if (!Number.isFinite(dueMs)) bucket = 'upcoming';
          else if (dueMs <= nowMs) bucket = 'overdue';
          else if (dueMs < startOfTomorrow.getTime()) bucket = 'due_today';
          return { ...task, bucket, hoursUntilDue: Number.isFinite(dueMs) ? Math.round((dueMs - nowMs) / 36e5) : null };
        })
        .sort((a: any, b: any) => String(a.dueAt || '').localeCompare(String(b.dueAt || '')));

      return NextResponse.json({
        success: true,
        data: tasks,
        summary: {
          overdue: tasks.filter((t: any) => t.bucket === 'overdue').length,
          dueToday: tasks.filter((t: any) => t.bucket === 'due_today').length,
          upcoming: tasks.filter((t: any) => t.bucket === 'upcoming').length,
        },
      }, { status: 200 });
    }

    if (action === 'updateFollowUpTask') {
      const taskId = String(resolvedPayload?.taskId || resolvedPayload?.id || '').trim();
      const mode = String(resolvedPayload?.mode || '').trim();
      if (!taskId || !mode) {
        return NextResponse.json({ success: false, error: 'Task ID and mode are required.' }, { status: 400 });
      }

      const taskRef = db.collection('platformTasks').doc(taskId);
      const nowIso = new Date().toISOString();

      if (mode === 'notes') {
        const description = String(resolvedPayload?.description ?? '').trim();
        await taskRef.set({ description, updatedAt: nowIso }, { merge: true });
        return NextResponse.json({ success: true }, { status: 200 });
      }

      if (mode === 'dismiss') {
        await taskRef.delete();
        return NextResponse.json({ success: true, deleted: true }, { status: 200 });
      }

      if (mode === 'snooze') {
        const hours = coerceHours(resolvedPayload?.hours, 24);
        const dueAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        await taskRef.set({ dueAt, dueDate: dueAt.slice(0, 10), status: 'pending', updatedAt: nowIso }, { merge: true });
        return NextResponse.json({ success: true, dueAt }, { status: 200 });
      }

      if (mode === 'complete' || mode === 'reopen') {
        const completed = mode === 'complete';
        await taskRef.set({
          status: completed ? 'completed' : 'pending',
          completedAt: completed ? nowIso : null,
          completedBy: completed ? adminUid : null,
          updatedAt: nowIso,
        }, { merge: true });
        return NextResponse.json({ success: true, status: completed ? 'completed' : 'pending' }, { status: 200 });
      }

      if (mode === 'assign') {
        const assigneeId = String(resolvedPayload?.assigneeId || '').trim() || null;
        const taskSnap = await taskRef.get();
        const task = taskSnap.exists ? (taskSnap.data() || {}) : {};
        await taskRef.set({ assigneeId, updatedAt: nowIso }, { merge: true });
        // Keep the underlying record's assignment in sync so it persists beyond this one task.
        if (task.recordId) {
          const located = await findResearchRecord(db, task.recordId, task.recordCollection);
          if (located) {
            await located.ref.set({ assigneeId, updatedAt: nowIso }, { merge: true });
            await syncRegistryIndexDocument(db, located.collection, String(task.recordId));
          }
        }
        return NextResponse.json({ success: true }, { status: 200 });
      }

      // Fired the instant the one-click Send/Call button opens the mailto:/wa.me/tel:
      // link. Completes this task and immediately schedules the next follow-up in
      // the sequence, so the register always reflects what was just actioned.
      if (mode === 'sent') {
        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) {
          return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
        }
        const task = taskSnap.data() || {};
        const located = await findResearchRecord(db, task.recordId, task.recordCollection);

        await taskRef.set({ status: 'completed', completedAt: nowIso, completedBy: adminUid, updatedAt: nowIso }, { merge: true });

        let nextTask: any = null;
        if (located) {
          const channel = task.actionType === 'call' ? 'Call' : String(resolvedPayload?.channel || task.lastChannel || 'Email');
          const subject = task.lastSubject || task.title || 'Follow-up';
          const contentType = task.actionType === 'call' ? 'call' : 'follow-up';
          const contentLabel = engagementContentLabel(contentType);
          try {
            nextTask = await scheduleFollowUpTask(db, {
              recordRef: located.ref,
              collection: located.collection,
              recordId: task.recordId,
              recordData: located.data,
              channel,
              subject,
              sentAt: nowIso,
              actorUid: adminUid,
            });
          } catch (e) {
            console.error('Failed to schedule next follow-up', e);
          }

          await located.ref.set({
            lastOutreachSubject: subject,
            lastOutreachAt: nowIso,
            lastOutreachChannel: channel,
            lastEngagementType: contentType,
            lastEngagementLabel: contentLabel,
            lastEngagementAt: nowIso,
            lastEngagementChannel: channel,
            sentContentTypes: FieldValue.arrayUnion(contentType),
            engagementStage: 'Contacted',
            engagementScore: FieldValue.increment(10),
            outreachCount: FieldValue.increment(1),
            engagementLogs: FieldValue.arrayUnion({
              timestamp: nowIso,
              action: 'follow_up_sent',
              subject,
              channel,
              contentType,
              contentLabel,
              notes: 'Sent from the Follow-Up Register one-click queue.',
              loggedBy: adminUid,
            }),
          }, { merge: true });
          await syncRegistryIndexDocument(db, located.collection, String(task.recordId));
        }

        return NextResponse.json({ success: true, nextTask }, { status: 200 });
      }

      // Logs the outcome of an actual conversation/attempt (call, WhatsApp reply, etc.)
      // against the task's underlying record and either reschedules the next follow-up
      // (per policy or a manually-picked date) or stops the sequence entirely.
      if (mode === 'outcome') {
        const outcome = String(resolvedPayload?.outcome || '').trim();
        const notes = String(resolvedPayload?.notes || '').trim();
        const stopSequence = resolvedPayload?.stopSequence === true;
        const overrideDueAt = resolvedPayload?.followUpDate
          ? new Date(String(resolvedPayload.followUpDate)).toISOString()
          : null;

        if (!outcome) {
          return NextResponse.json({ success: false, error: 'Outcome is required.' }, { status: 400 });
        }

        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) {
          return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
        }
        const task = taskSnap.data() || {};
        const located = await findResearchRecord(db, task.recordId, task.recordCollection);

        const logEntry = {
          timestamp: nowIso,
          action: 'outcome_logged',
          subject: outcome,
          channel: task.actionType === 'call' ? 'Call' : (task.lastChannel || 'Email'),
          notes,
          loggedBy: adminUid,
        };

        if (located) {
          await located.ref.set({
            lastOutcome: outcome,
            lastOutcomeAt: nowIso,
            lastOutcomeNotes: notes || null,
            engagementLogs: FieldValue.arrayUnion(logEntry),
            updatedAt: nowIso,
            ...(stopSequence ? { nextFollowUpAt: null, nextFollowUpAction: null, followUpSequenceStopped: true } : {}),
          }, { merge: true }).catch(() => {});

          const commRef = located.ref.collection('communications').doc();
          await commRef.set({
            id: commRef.id,
            type: task.actionType === 'call' ? 'Call' : (task.lastChannel || 'Email'),
            subject: outcome,
            notes,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: adminUid,
          }).catch(() => {});
        }

        await taskRef.set({
          status: 'completed',
          completedAt: nowIso,
          completedBy: adminUid,
          outcome,
          outcomeNotes: notes || null,
          updatedAt: nowIso,
        }, { merge: true });

        let nextTask: any = null;
        if (located && !stopSequence) {
          try {
            nextTask = await scheduleFollowUpTask(db, {
              recordRef: located.ref,
              collection: located.collection,
              recordId: task.recordId,
              recordData: located.data,
              channel: task.actionType === 'call' ? 'Call' : (task.lastChannel || 'Email'),
              subject: task.lastSubject || task.title,
              sentAt: nowIso,
              actorUid: adminUid,
              overrideDueAt,
            });
          } catch (e) {
            console.error('Failed to schedule follow-up after outcome log', e);
          }
        }
        if (located) {
          await syncRegistryIndexDocument(db, located.collection, String(task.recordId));
        }

        return NextResponse.json({ success: true, nextTask }, { status: 200 });
      }

      return NextResponse.json({ success: false, error: `Unsupported mode "${mode}".` }, { status: 400 });
    }

    // Generates the ready-to-send follow-up copy for a task so the register can
    // open a pre-filled mailto:/wa.me link with one click, no template hunting.
    if (action === 'prepareFollowUpMessage') {
      const taskId = String(resolvedPayload?.taskId || '').trim();
      if (!taskId) {
        return NextResponse.json({ success: false, error: 'Task ID is required.' }, { status: 400 });
      }
      const taskSnap = await db.collection('platformTasks').doc(taskId).get();
      if (!taskSnap.exists) {
        return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
      }
      const task = taskSnap.data() || {};
      const companyName = task.companyName || 'there';
      const firstName = String(companyName).split(' ')[0];
      const followUpNumber = Number(task.followUpNumber || 1);
      const isCall = task.actionType === 'call';

      // Escalating tone by follow-up number, same progression used across the
      // engagement template library (nudge -> value reminder -> last call).
      const STAGE_COPY = [
        {
          subject: `Following up: ${task.lastSubject || 'Logistics Flow partnership'}`,
          body: `Hi ${firstName},\n\nJust following up on my note re: "${task.lastSubject || 'our partnership proposal'}" — wanted to check this reached you and see if you had any questions.\n\nHappy to jump on a quick call if that's easier.\n\nRegards,\nThe Logistics Flow Team`,
        },
        {
          subject: `Still keen to connect — ${companyName}`,
          body: `Hi ${firstName},\n\nCircling back once more. The offer we sent through is still open, and I don't want ${companyName} to miss the window on this.\n\nCan I send through a short summary, or would a 10-minute call suit better?\n\nRegards,\nThe Logistics Flow Team`,
        },
        {
          subject: `Last call before we close this out — ${companyName}`,
          body: `Hi ${firstName},\n\nThis will be my last note on this for now — I don't want to keep filling your inbox. If timing isn't right, that's completely fine.\n\nIf you'd like to pick this back up whenever suits, just reply and I'll pick up where we left off.\n\nRegards,\nThe Logistics Flow Team`,
        },
      ];
      const stage = STAGE_COPY[Math.min(followUpNumber - 1, STAGE_COPY.length - 1)];

      const mailtoLink = task.contactEmail
        ? `mailto:${task.contactEmail}?subject=${encodeURIComponent(stage.subject)}&body=${encodeURIComponent(stage.body)}`
        : null;
      const whatsappNumber = task.contactPhone ? String(task.contactPhone).replace(/\s/g, '').replace(/^\+/, '').replace(/^0/, '27') : null;
      const whatsappLink = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(stage.body)}`
        : null;

      return NextResponse.json({
        success: true,
        data: {
          subject: stage.subject,
          body: stage.body,
          mailtoLink: isCall ? null : mailtoLink,
          whatsappLink,
          telLink: task.contactPhone ? `tel:${String(task.contactPhone).replace(/\s/g, '')}` : null,
        },
      }, { status: 200 });
    }

    // Per-record tasks. Resolves the record across every registry so suppliers,
    // leads and transporters work, not just `partners`.
    if (action === 'getRecordTasks' || action === 'createRecordTask') {
      const recordId = String(resolvedPayload?.recordId || resolvedPayload?.partnerId || resolvedPayload?.id || '').trim();
      if (!recordId) {
        return NextResponse.json({ success: false, error: 'Record ID is required.' }, { status: 400 });
      }
      const located = await findResearchRecord(db, recordId, resolvedPayload?.collection);
      if (!located) {
        return NextResponse.json({ success: false, error: `Record ${recordId} was not found.` }, { status: 404 });
      }

      if (action === 'getRecordTasks') {
        const [subSnap, registerSnap] = await Promise.all([
          located.ref.collection('tasks').limit(200).get().catch(() => ({ docs: [] })),
          db.collection('platformTasks').where('recordId', '==', recordId).limit(200).get().catch(() => ({ docs: [] })),
        ]);
        const merged = [
          ...subSnap.docs.map((doc: any) => ({ ...(doc.data() || {}), id: doc.id, scope: 'record' })),
          ...registerSnap.docs.map((doc: any) => ({ ...(doc.data() || {}), id: doc.id, scope: 'register' })),
        ].sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return NextResponse.json({ success: true, data: merged, collection: located.collection }, { status: 200 });
      }

      const nowIso = new Date().toISOString();
      const taskRef = db.collection('platformTasks').doc();
      const dueDate = String(resolvedPayload?.dueDate || '').trim();
      const task = {
        id: taskRef.id,
        source: 'manual',
        status: 'pending',
        actionType: String(resolvedPayload?.actionType || 'email').trim(),
        title: String(resolvedPayload?.title || '').trim(),
        description: String(resolvedPayload?.description || '').trim(),
        recordId,
        recordCollection: located.collection,
        companyName: recordDisplayName(located.data),
        contactEmail: String(located.data?.email || '').trim() || null,
        contactPhone: String(located.data?.phone || located.data?.mobile || '').trim() || null,
        assigneeId: String(resolvedPayload?.assigneeId || '').trim() || null,
        dueDate: dueDate || nowIso.slice(0, 10),
        dueAt: dueDate ? new Date(`${dueDate}T09:00:00.000Z`).toISOString() : nowIso,
        createdBy: adminUid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      if (!task.title) {
        return NextResponse.json({ success: false, error: 'Task title is required.' }, { status: 400 });
      }
      await taskRef.set(task);
      return NextResponse.json({ success: true, data: task }, { status: 200 });
    }

    if (action === 'bulkLogForensicInitiated') {
      const leadIds = Array.isArray(resolvedPayload?.leadIds) ? resolvedPayload.leadIds : [];
      const targetCollection = String(resolvedPayload?.type === 'lead' ? 'leads' : 'partners').trim();
      const now = new Date().toISOString();
      
      const batch = db.batch();
      for (const id of leadIds.slice(0, 200)) {
        const ref = db.collection(targetCollection).doc(String(id));
        batch.set(ref, {
          forensicInitiatedAt: now,
          researchStage: 'gap_analysis_requested',
          lastEngagementType: 'forensic_batch_initiated',
          updatedAt: now,
          engagementLogs: FieldValue.arrayUnion({
            timestamp: now,
            action: 'forensic_batch_initiated',
            channel: 'Discovery Research',
            notes: 'Forensic batch research prompt generated & logged.'
          })
        }, { merge: true });
      }
      await batch.commit();
      return NextResponse.json({ success: true, count: leadIds.length }, { status: 200 });
    }

    if (action === 'getPipelineQueue') {
      const [leadsSnap, partnersSnap] = await Promise.all([
        db.collection('leads').limit(150).get().catch(() => ({ docs: [] })),
        db.collection('partners').limit(150).get().catch(() => ({ docs: [] })),
      ]);

      const queue: any[] = [];
      const processDocs = (docs: any[], type: string) => {
        docs.forEach(doc => {
          const d = doc.data();
          if (d.email && d.status !== 'unqualified' && d.status !== 'converted') {
            const step = Number(d.currentPipelineStep || 0);
            const lastAt = d.lastOutreachAt ? new Date(d.lastOutreachAt).getTime() : 0;
            const now = Date.now();
            const hoursSinceLast = lastAt ? (now - lastAt) / (1000 * 3600) : 999;
            
            queue.push({
              id: doc.id,
              type,
              companyName: d.companyName || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Company',
              email: d.email,
              phone: d.phone || d.mobile || '',
              industrial_category: d.industrial_category || d.category || '',
              currentPipelineStep: step,
              lastOutreachAt: d.lastOutreachAt || null,
              lastOutreachSubject: d.lastOutreachSubject || null,
              hoursSinceLast,
              engagementScore: d.engagementScore || (step * 25),
              engagementStage: d.engagementStage || (step > 0 ? 'Engaged' : 'New Lead'),
              engagementLogs: d.engagementLogs || []
            });
          }
        });
      };

      processDocs(leadsSnap.docs, 'lead');
      processDocs(partnersSnap.docs, 'partner');

      queue.sort((a, b) => b.hoursSinceLast - a.hoursSinceLast);
      return NextResponse.json({ success: true, data: queue.slice(0, 100) }, { status: 200 });
    }

    if (action === 'dispatchPipelineStep') {
      const leadId = String(resolvedPayload?.leadId || '').trim();
      const stepIndex = Number(resolvedPayload?.stepIndex || 1);
      const email = String(resolvedPayload?.email || '').trim();
      const subject = String(resolvedPayload?.subject || 'Logistics Flow Follow-up').trim();
      const html = String(resolvedPayload?.html || '').trim();
      const targetCollection = String(resolvedPayload?.collection || 'leads').trim();
      const now = new Date().toISOString();

      if (!leadId || !email) {
        return NextResponse.json({ success: false, error: 'Lead ID and Email are required.' }, { status: 400 });
      }

      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({ to: email, from: 'michael@logisticsflow.co.za', subject, html });
      }

      const logEntry = {
        timestamp: now,
        action: 'pipeline_step_dispatch',
        stepIndex,
        subject,
        channel: 'Email',
        recipient: email
      };

      await db.collection(targetCollection).doc(leadId).set({
        currentPipelineStep: stepIndex,
        lastOutreachAt: now,
        lastOutreachSubject: subject,
        lastOutreachChannel: 'Email',
        engagementStage: stepIndex >= 4 ? 'Converted' : 'Engaged',
        engagementScore: FieldValue.increment(25),
        updatedAt: now,
        engagementLogs: FieldValue.arrayUnion(logEntry)
      }, { merge: true });

      return NextResponse.json({ success: true, message: `Pipeline step ${stepIndex} dispatched to ${email}.` }, { status: 200 });
    }

    if (action === 'liveAIDiscovery') {
      const promptText = String(resolvedPayload?.prompt || '').trim();
      const category = String(resolvedPayload?.category || '').trim();
      if (!promptText) {
        return NextResponse.json({ success: false, error: 'Prompt is required.' }, { status: 400 });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
      }

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.2 },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Gemini discovery failed.');
      }

      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let jsonText = rawText.trim();
      if (jsonText.includes('```')) {
        jsonText = jsonText.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      }

      let items: any[] = [];
      try {
        items = JSON.parse(jsonText);
      } catch (e) {
        const matches = jsonText.match(/\{(?:[^{}]|((?:\{[^{}]*\})))*\}/g);
        if (matches) {
          matches.forEach((m: string) => {
            try { items.push(JSON.parse(m)); } catch (inner) {}
          });
        }
      }

      return NextResponse.json({ success: true, count: items.length, records: items, rawText }, { status: 200 });
    }

    if (action === 'createScheduledPost') {
      const { platform, headline, body, scheduledDate, frequency, targetUrl, imagePrompt, videoPrompt, campaignName } = resolvedPayload || {};
      if (!platform || !headline || !body) {
        return NextResponse.json({ success: false, error: 'Platform, headline, and post body are required.' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const postRef = await db.collection('scheduledPosts').add({
        platform: String(platform).toLowerCase(),
        headline,
        body,
        scheduledDate: scheduledDate || now,
        frequency: frequency || 'once',
        targetUrl: targetUrl || '',
        imagePrompt: imagePrompt || '',
        videoPrompt: videoPrompt || '',
        campaignName: campaignName || 'General Awareness',
        status: 'scheduled',
        createdBy: adminUid,
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({ success: true, id: postRef.id, message: 'Post scheduled successfully.' }, { status: 200 });
    }

    if (action === 'getScheduledPosts') {
      const snapshot = await db.collection('scheduledPosts').orderBy('createdAt', 'desc').limit(100).get();
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data: posts }, { status: 200 });
    }

    if (action === 'deleteScheduledPost') {
      const postId = String(resolvedPayload?.id || '').trim();
      if (!postId) return NextResponse.json({ success: false, error: 'Post ID is required.' }, { status: 400 });
      await db.collection('scheduledPosts').doc(postId).delete();
      return NextResponse.json({ success: true, message: 'Scheduled post removed.' }, { status: 200 });
    }

    if (action === 'logClick') {
      const featureId = String(resolvedPayload?.featureId || resolvedPayload?.planId || 'general').trim();
      const discountCode = String(resolvedPayload?.discountCode || 'JOIN20').trim();
      const discountPercent = Number(resolvedPayload?.discountPercent || 20);
      const targetUrl = String(resolvedPayload?.targetUrl || '').trim();
      const now = new Date().toISOString();

      let companyId: string | null = null;
      let userId: string | null = null;
      try {
        const authorization = request.headers.get('authorization');
        if (authorization?.startsWith('Bearer ')) {
          const token = authorization.split('Bearer ')[1];
          const decoded = await getAuth(app).verifyIdToken(token);
          userId = decoded.uid;
          const uDoc = await db.collection('users').doc(userId).get();
          companyId = uDoc.data()?.companyId || null;
        }
      } catch (e) {}

      const logRef = await db.collection('auditLogs').add({
        action: 'cta_upsell_click',
        featureId,
        discountCode,
        discountPercent,
        targetUrl,
        userId: userId || 'anonymous',
        companyId: companyId || 'guest',
        silo: 'behavioral',
        details: `CTA Upgrade Click: ${featureId} (Discount ${discountCode} - ${discountPercent}%)`,
        timestamp: FieldValue.serverTimestamp(),
        createdAt: now
      });

      return NextResponse.json({ success: true, id: logRef.id, discountCode, discountPercent }, { status: 200 });
    }

    if (action === 'getDataHarvestLogs') {
      const [auditSnap, txSnap, companiesSnap] = await Promise.all([
        db.collection('auditLogs').limit(100).get().catch(() => ({ docs: [] })),
        db.collection('platformTransactions').limit(100).get().catch(() => ({ docs: [] })),
        db.collection('companies').limit(100).get().catch(() => ({ docs: [] }))
      ]);

      const harvestLogs: any[] = [];
      let behavioralCount = 0;
      let operationalCount = 0;
      let financialCount = 0;

      auditSnap.docs.forEach((doc, idx) => {
        const d = doc.data();
        const actionType = String(d.action || '').toLowerCase();
        const isBehavioral = actionType.includes('click') || actionType.includes('search') || actionType.includes('view') || actionType.includes('handshake');
        
        if (isBehavioral) behavioralCount += 1;
        else operationalCount += 1;

        harvestLogs.push({
          id: `SIG_${doc.id.slice(0, 6).toUpperCase()}`,
          silo: d.silo || (isBehavioral ? 'behavioral' : 'operational'),
          source: d.companyId ? `Node_${d.companyId.slice(-4).toUpperCase()}` : 'Guest_Signal',
          type: d.details || d.action || 'Market Intent Ping',
          protocol: d.discountCode ? `Discount Protocol (${d.discountCode})` : 'V14 Forensic Protocol',
          tier: d.userId !== 'anonymous' ? 'High' : 'Standard',
          timestamp: d.createdAt || d.timestamp || new Date().toISOString()
        });
      });

      txSnap.docs.forEach((doc, idx) => {
        financialCount += 1;
        const d = doc.data();
        harvestLogs.push({
          id: `FIN_${doc.id.slice(0, 6).toUpperCase()}`,
          silo: 'financial',
          source: d.companyId ? `Wallet_${d.companyId.slice(-4).toUpperCase()}` : 'Platform_Ledger',
          type: d.description || 'Settlement Velocity Signal',
          protocol: 'Double-Entry Accounting Audit',
          tier: 'Premium',
          timestamp: d.date || d.createdAt || new Date().toISOString()
        });
      });

      operationalCount += companiesSnap.docs.length;

      return NextResponse.json({
        success: true,
        behavioralCount: Math.max(behavioralCount, 1280),
        operationalCount: Math.max(operationalCount, 410),
        financialCount: Math.max(financialCount, 280),
        harvestLogs: harvestLogs.slice(0, 50)
      }, { status: 200 });
    }

    if (action === 'getMembers') {
      const companiesSnap = await db.collection('companies').limit(200).get();
      const userIds = new Set<string>();
      companiesSnap.docs.forEach(doc => {
        const ownerId = doc.data()?.ownerId;
        if (ownerId) userIds.add(ownerId);
      });

      const userMap = new Map<string, any>();
      if (userIds.size > 0) {
        const userRefs = Array.from(userIds).slice(0, 100).map(uid => db.collection('users').doc(uid));
        const userSnaps = await db.getAll(...userRefs);
        userSnaps.forEach(uSnap => {
          if (uSnap.exists) userMap.set(uSnap.id, uSnap.data());
        });
      }

      const members = companiesSnap.docs.map(doc => {
        const cData = doc.data();
        const uData = cData.ownerId ? userMap.get(cData.ownerId) : null;
        return {
          id: doc.id,
          ...cData,
          firstName: uData?.firstName || cData.firstName || '',
          lastName: uData?.lastName || cData.lastName || '',
          email: uData?.email || cData.email || '',
          phone: uData?.phone || cData.phone || '',
          source: cData.conversionSource || (cData.leadId ? 'AI Funnel' : 'Direct')
        };
      });

      return NextResponse.json({ success: true, data: members }, { status: 200 });
    }

    if (action === 'getRecordDetail') {
      // Fetches a single record's full data (including large corpus/profile blobs that are
      // stripped out of the bulk `searchRegistry` list response to keep that payload small).
      const recordId = String(resolvedPayload?.id || resolvedPayload?.partnerId || '').trim();
      const recordCollection = String(resolvedPayload?.collection || resolvedPayload?.sourceCollection || '').trim();
      if (!recordId || !recordCollection) {
        return NextResponse.json({ success: false, error: 'id and collection are required' }, { status: 400 });
      }
      const docSnap = await db.collection(recordCollection).doc(recordId).get();
      if (!docSnap.exists) {
        return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: { id: docSnap.id, ...docSnap.data(), sourceCollection: recordCollection }
      }, { status: 200 });
    }

    if (action === 'rebuildRegistryIndexBatch') {
      const requestedBatchSize = Number(resolvedPayload?.batchSize || 1000);
      const batchSize = Math.min(Math.max(requestedBatchSize, 100), 2500);
      let collectionIndex = Math.max(0, Number(resolvedPayload?.collectionIndex || 0));
      let afterId = String(resolvedPayload?.afterId || '').trim();
      const buildId = String(resolvedPayload?.buildId || Date.now());
      let phase = String(resolvedPayload?.phase || 'clear');
      const activeIndexCollection = await getActiveRegistryIndexCollection(db);
      const requestedTarget = String(resolvedPayload?.targetIndexCollection || '');
      const targetIndexCollection = REGISTRY_INDEX_COLLECTIONS.includes(requestedTarget as typeof REGISTRY_INDEX_COLLECTIONS[number])
        ? requestedTarget
        : activeIndexCollection === REGISTRY_INDEX_COLLECTIONS[0]
          ? REGISTRY_INDEX_COLLECTIONS[1]
          : REGISTRY_INDEX_COLLECTIONS[0];

      if (phase === 'clear') {
        await db.collection(REGISTRY_INDEX_META_COLLECTION).doc(REGISTRY_INDEX_META_DOCUMENT).set({
          rebuildStatus: 'building',
          rebuildingCollection: targetIndexCollection,
          rebuildId: buildId,
          rebuildStartedAt: new Date().toISOString(),
        }, { merge: true });
        const staleSnapshot = await db.collection(targetIndexCollection)
          .orderBy(FieldPath.documentId())
          .limit(batchSize)
          .get();
        if (!staleSnapshot.empty) {
          const writer = db.bulkWriter();
          writer.onWriteError(error => error.failedAttempts < 3);
          staleSnapshot.docs.forEach(indexDoc => writer.delete(indexDoc.ref));
          await writer.close();
          return NextResponse.json({
            success: true,
            processed: staleSnapshot.size,
            operation: 'cleared',
            done: false,
            cursor: { phase: 'clear', collectionIndex: 0, afterId: '', buildId, targetIndexCollection },
          }, { status: 200 });
        }
        const facetTypes = ['supplier', 'transporter', 'finance', 'investor', 'isa', 'associate', 'partner', 'unclassified'];
        await Promise.all(facetTypes.map(registryType =>
          db.collection(REGISTRY_INDEX_META_COLLECTION).doc(`${targetIndexCollection}__${registryType}`).delete()
        ));
        phase = 'build';
      }

      while (collectionIndex < REGISTRY_SOURCE_COLLECTIONS.length) {
        const sourceCollection = REGISTRY_SOURCE_COLLECTIONS[collectionIndex];
        let queryRef: FirebaseFirestore.Query = db
          .collection(sourceCollection)
          .orderBy(FieldPath.documentId());
        if (afterId) queryRef = queryRef.startAfter(afterId);

        const snapshot = await queryRef.limit(batchSize).get();
        if (snapshot.empty) {
          collectionIndex += 1;
          afterId = '';
          continue;
        }

        const writer = db.bulkWriter();
        writer.onWriteError(error => error.failedAttempts < 3);
        const facets = new Map<string, { categories: Set<string>; tags: Set<string> }>();
        for (const sourceDoc of snapshot.docs) {
          const indexId = `${sourceCollection}__${sourceDoc.id}`;
          const indexRecord = buildRegistryIndexRecord(sourceCollection, sourceDoc.id, sourceDoc.data());
          writer.set(
            db.collection(targetIndexCollection).doc(indexId),
            { ...indexRecord, buildId },
            { merge: false }
          );
          const registryType = String(indexRecord.registryType || 'unclassified');
          const registryFacets = facets.get(registryType) || { categories: new Set<string>(), tags: new Set<string>() };
          if (indexRecord.categoryKey && indexRecord.categoryKey !== 'uncategorized') {
            registryFacets.categories.add(String(indexRecord.industrial_category || indexRecord.category || indexRecord.categoryKey));
          }
          for (const tag of indexRecord.tagKeys || []) registryFacets.tags.add(String(tag));
          facets.set(registryType, registryFacets);
        }
        await writer.close();
        await Promise.all(Array.from(facets.entries()).map(([registryType, values]) => {
          const facetUpdate: Record<string, any> = { updatedAt: new Date().toISOString() };
          if (values.categories.size > 0) {
            facetUpdate.categories = FieldValue.arrayUnion(...Array.from(values.categories));
          }
          if (values.tags.size > 0) {
            facetUpdate.tags = FieldValue.arrayUnion(...Array.from(values.tags));
          }
          return db.collection(REGISTRY_INDEX_META_COLLECTION).doc(`${targetIndexCollection}__${registryType}`).set(facetUpdate, { merge: true });
        }));

        const reachedCollectionEnd = snapshot.size < batchSize;
        const nextCollectionIndex = reachedCollectionEnd ? collectionIndex + 1 : collectionIndex;
        const nextAfterId = reachedCollectionEnd ? '' : snapshot.docs[snapshot.docs.length - 1].id;
        const done = nextCollectionIndex >= REGISTRY_SOURCE_COLLECTIONS.length;

        if (done) {
          await db.collection(REGISTRY_INDEX_META_COLLECTION).doc(REGISTRY_INDEX_META_DOCUMENT).set({
            activeCollection: targetIndexCollection,
            buildId,
            status: 'ready',
            schemaVersion: REGISTRY_INDEX_SCHEMA_VERSION,
            rebuildStatus: FieldValue.delete(),
            rebuildingCollection: FieldValue.delete(),
            rebuildId: FieldValue.delete(),
            completedAt: new Date().toISOString(),
          }, { merge: true });
        }

        return NextResponse.json({
          success: true,
          processed: snapshot.size,
          operation: 'indexed',
          sourceCollection,
          done,
          cursor: done ? null : { phase: 'build', collectionIndex: nextCollectionIndex, afterId: nextAfterId, buildId, targetIndexCollection },
        }, { status: 200 });
      }

      await db.collection(REGISTRY_INDEX_META_COLLECTION).doc(REGISTRY_INDEX_META_DOCUMENT).set({
        activeCollection: targetIndexCollection,
        buildId,
        status: 'ready',
        schemaVersion: REGISTRY_INDEX_SCHEMA_VERSION,
        rebuildStatus: FieldValue.delete(),
        rebuildingCollection: FieldValue.delete(),
        rebuildId: FieldValue.delete(),
        completedAt: new Date().toISOString(),
      }, { merge: true });
      return NextResponse.json({ success: true, processed: 0, operation: 'indexed', done: true, cursor: null }, { status: 200 });
    }

    if (action === 'getRegistryIndexPage') {
      const registryType = normalizeRegistryType(resolvedPayload?.type || 'all');
      const requestedPageSize = Number(resolvedPayload?.pageSize || 100);
      const pageSize = Math.min(Math.max(requestedPageSize, 25), 250);
      const page = Math.max(1, Number(resolvedPayload?.page || 1));
      const term = normalizeRegistryIndexText(resolvedPayload?.term);
      const statusKey = normalizeRegistryIndexText(resolvedPayload?.status);
      const categoryKey = normalizeRegistryIndexText(resolvedPayload?.category);
      const assigneeKey = normalizeRegistryIndexText(resolvedPayload?.assigneeId);
      const tagKey = normalizeRegistryIndexText(resolvedPayload?.tag);
      const engagementKey = normalizeRegistryIndexText(resolvedPayload?.engagement);
      const contentKey = normalizeRegistryIndexText(resolvedPayload?.content);
      const resultKey = normalizeRegistryIndexText(resolvedPayload?.result);
      const cursor = resolvedPayload?.cursor && typeof resolvedPayload.cursor === 'object'
        ? resolvedPayload.cursor
        : null;
      const activeIndexCollection = await getActiveRegistryIndexCollection(db);

      let indexQuery: FirebaseFirestore.Query = db.collection(activeIndexCollection);
      if (registryType !== 'all') indexQuery = indexQuery.where('registryType', '==', registryType);
      const filterKey = buildRegistryFilterKey({
        status: statusKey && statusKey !== 'all' ? statusKey : undefined,
        category: categoryKey && categoryKey !== 'all' ? categoryKey : undefined,
        assignee: assigneeKey === 'none' ? 'unassigned' : assigneeKey && assigneeKey !== 'all' ? assigneeKey : undefined,
        tag: tagKey && tagKey !== 'all' ? tagKey : undefined,
        engagement: engagementKey && engagementKey !== 'all' ? engagementKey : undefined,
        content: contentKey && contentKey !== 'all' ? contentKey : undefined,
        result: resultKey && resultKey !== 'all' ? resultKey : undefined,
      });
      if (filterKey) indexQuery = indexQuery.where('filterKeys', 'array-contains', filterKey);
      indexQuery = indexQuery
        .orderBy('normalizedCompanyName')
        .orderBy(FieldPath.documentId());

      const countQuery = term
        ? indexQuery.startAt(term).endAt(`${term}\uf8ff`)
        : indexQuery;
      const countSnapshot = await countQuery.count().get();
      const totalCount = countSnapshot.data().count;

      let pageQuery = indexQuery;
      if (cursor?.normalizedCompanyName && cursor?.indexId) {
        pageQuery = pageQuery.startAfter(
          String(cursor.normalizedCompanyName),
          String(cursor.indexId)
        );
        if (term) pageQuery = pageQuery.endAt(`${term}\uf8ff`);
      } else if (page > 1) {
        if (term) pageQuery = pageQuery.startAt(term).endAt(`${term}\uf8ff`);
        pageQuery = pageQuery.offset((page - 1) * pageSize);
      } else if (term) {
        pageQuery = pageQuery.startAt(term).endAt(`${term}\uf8ff`);
      }

      const snapshot = await pageQuery.limit(pageSize).get();
      const records = snapshot.docs.map(indexDoc => {
        const data = indexDoc.data();
        const { sourceId, ...record } = data;
        return { ...record, id: sourceId, indexId: indexDoc.id };
      });
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastDoc && page * pageSize < totalCount
        ? {
            normalizedCompanyName: String(lastDoc.data().normalizedCompanyName || ''),
            indexId: lastDoc.id,
          }
        : null;
      const metaSnapshot = await db.collection(REGISTRY_INDEX_META_COLLECTION).doc(REGISTRY_INDEX_META_DOCUMENT).get();
      const facetSnapshot = await db.collection(REGISTRY_INDEX_META_COLLECTION).doc(`${activeIndexCollection}__${registryType}`).get();
      const facets = facetSnapshot.data() || {};

      return NextResponse.json({
        success: true,
        data: records,
        totalCount,
        page,
        pageSize,
        hasNextPage: Boolean(nextCursor),
        nextCursor,
        indexReady:
          metaSnapshot.data()?.status === 'ready' &&
          metaSnapshot.data()?.schemaVersion === REGISTRY_INDEX_SCHEMA_VERSION,
        indexSchemaVersion: metaSnapshot.data()?.schemaVersion || 0,
        requiredIndexSchemaVersion: REGISTRY_INDEX_SCHEMA_VERSION,
        facets: {
          categories: Array.isArray(facets.categories) ? facets.categories : [],
          tags: Array.isArray(facets.tags) ? facets.tags : [],
        },
      }, { status: 200 });
    }

    if (action === 'findRegistryDuplicates') {
      const activeIndexCollection = await getActiveRegistryIndexCollection(db);
      const maxGroups = Math.min(Math.max(Number(resolvedPayload?.maxGroups || 500), 25), 500);
      const registryType = String(resolvedPayload?.type || 'all').trim().toLowerCase();
      const searchTerm = normalizeRegistryIndexText(resolvedPayload?.term);
      const duplicateGroups: any[] = [];
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
      let pendingGroup: any[] = [];
      let scanned = 0;

      const duplicateScore = (record: Record<string, any>) => {
        const sourceCollection = String(record.sourceCollection || '');
        let score = sourceCollection === 'companies'
          ? 500
          : sourceCollection === 'partners'
            ? 200
            : sourceCollection === 'leads'
              ? 0
              : 300;
        if (record.companyId) score += 100;
        if (record.lastOutreachAt) score += 30;
        if (record.lastOpenedAt || record.lastAccessedAt) score += 20;
        if (record.has_commercialProfile || record.has_serviceProfile || record.has_contentCorpus) score += 20;
        if (record.email) score += 8;
        if (record.phone || record.mobile) score += 5;
        if (record.website) score += 3;
        return score;
      };

      const addPendingGroup = () => {
        if (pendingGroup.length < 2 || duplicateGroups.length >= maxGroups) {
          pendingGroup = [];
          return;
        }
        const components: any[][] = [];
        const unvisited = [...pendingGroup];
        while (unvisited.length > 0) {
          const component = [unvisited.shift()];
          for (let componentIndex = 0; componentIndex < component.length; componentIndex += 1) {
            const current = component[componentIndex];
            for (let candidateIndex = unvisited.length - 1; candidateIndex >= 0; candidateIndex -= 1) {
              if (hasStrongRegistryDuplicateEvidence(current, unvisited[candidateIndex])) {
                component.push(unvisited[candidateIndex]);
                unvisited.splice(candidateIndex, 1);
              }
            }
          }
          components.push(component);
        }

        for (const component of components) {
          if (component.length < 2 || duplicateGroups.length >= maxGroups) continue;
          const groupRecords = [...component].sort((left, right) => {
            const scoreDifference = duplicateScore(right) - duplicateScore(left);
            if (scoreDifference !== 0) return scoreDifference;
            return String(right.updatedAt || right.createdAt || '')
              .localeCompare(String(left.updatedAt || left.createdAt || ''));
          });
          const keeper = groupRecords[0];
          const hasDeletableCopies = groupRecords.some((record, index) =>
            index > 0 && ['leads', 'partners'].includes(String(record.sourceCollection || ''))
          );
          if (!hasDeletableCopies) continue;

          duplicateGroups.push({
            key: `${keeper.normalizedCompanyName}__${keeper.indexId}`,
            companyName: keeper.companyName,
            keepIndexId: keeper.indexId,
            records: groupRecords.map((record, index) => ({
              indexId: record.indexId,
              id: record.sourceId,
              sourceCollection: record.sourceCollection,
              registryType: record.registryType || 'unclassified',
              companyName: record.companyName,
              contactPerson: record.contactPerson || `${record.firstName || ''} ${record.lastName || ''}`.trim(),
              email: record.email || record.marketingManager?.email || '',
              phone: record.phone || record.mobile || '',
              website: record.website || '',
              lastOutreachAt: record.lastOutreachAt || null,
              researchStage: record.researchStage || '',
              recommendedKeep: index === 0 || !['leads', 'partners'].includes(String(record.sourceCollection || '')),
              recommendedDelete: index > 0 && ['leads', 'partners'].includes(String(record.sourceCollection || '')),
            })),
          });
        }
        pendingGroup = [];
      };

      while (duplicateGroups.length < maxGroups) {
        let queryRef: FirebaseFirestore.Query = db.collection(activeIndexCollection);
        if (registryType !== 'all') {
          queryRef = queryRef.where('registryType', '==', registryType);
        }
        queryRef = queryRef
          .orderBy('normalizedCompanyName')
          .orderBy(FieldPath.documentId());
        if (lastDoc) {
          queryRef = queryRef.startAfter(lastDoc);
        } else if (searchTerm) {
          queryRef = queryRef.startAt(searchTerm);
        }
        if (searchTerm) {
          queryRef = queryRef.endAt(`${searchTerm}\uf8ff`);
        }
        const snapshot = await queryRef.limit(2500).get();
        if (snapshot.empty) break;

        for (const indexDoc of snapshot.docs) {
          const record = indexDoc.data();
          const normalizedCompanyName = String(record.normalizedCompanyName || '').trim();
          if (!normalizedCompanyName) continue;
          const indexedRecord = { ...record, indexId: indexDoc.id };
          if (pendingGroup.length === 0 || pendingGroup[0].normalizedCompanyName === normalizedCompanyName) {
            pendingGroup.push(indexedRecord);
          } else {
            addPendingGroup();
            if (duplicateGroups.length >= maxGroups) break;
            pendingGroup = [indexedRecord];
          }
        }

        scanned += snapshot.size;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < 2500 || duplicateGroups.length >= maxGroups) break;
      }
      if (duplicateGroups.length < maxGroups) addPendingGroup();

      const recommendedDeleteCount = duplicateGroups.reduce(
        (count, group) => count + group.records.filter((record: any) => record.recommendedDelete).length,
        0
      );
      return NextResponse.json({
        success: true,
        data: duplicateGroups,
        scanned,
        recommendedDeleteCount,
        truncated: duplicateGroups.length >= maxGroups,
        scope: {
          registryType,
          searchTerm,
        },
      }, { status: 200 });
    }

    if (action === 'deleteRegistryDuplicates') {
      const groups = Array.isArray(resolvedPayload?.groups) ? resolvedPayload.groups.slice(0, 500) : [];
      if (groups.length === 0) {
        return NextResponse.json({ success: false, error: 'No duplicate groups were selected.' }, { status: 400 });
      }

      const activeIndexCollection = await getActiveRegistryIndexCollection(db);
      const indexWriteCollections = await getRegistryIndexWriteCollections(db);
      const writer = db.bulkWriter();
      writer.onWriteError(error => error.failedAttempts < 3);
      let deletedCount = 0;
      let skippedCount = 0;
      for (const group of groups) {
        const keepIndexId = String(group?.keepIndexId || '').trim();
        const deleteIndexIds = Array.isArray(group?.deleteIndexIds)
          ? group.deleteIndexIds.map((value: any) => String(value || '').trim()).filter(Boolean)
          : [];
        const evidenceIndexIds = Array.isArray(group?.evidenceIndexIds)
          ? group.evidenceIndexIds.map((value: any) => String(value || '').trim()).filter(Boolean)
          : [];
        if (!keepIndexId || deleteIndexIds.length === 0 || deleteIndexIds.includes(keepIndexId)) {
          skippedCount += deleteIndexIds.length;
          continue;
        }

        const requestedIndexIds = Array.from(new Set([keepIndexId, ...evidenceIndexIds, ...deleteIndexIds]));
        const refs = requestedIndexIds.map(indexId =>
          db.collection(activeIndexCollection).doc(indexId)
        );
        const snapshots = await db.getAll(...refs);
        const snapshotsById = new Map(snapshots.map(snapshot => [snapshot.id, snapshot]));
        const keeper = snapshotsById.get(keepIndexId);
        if (!keeper?.exists) {
          skippedCount += deleteIndexIds.length;
          continue;
        }
        const keeperData = keeper.data() || {};
        const groupKey = String(keeperData.normalizedCompanyName || '');
        const evidenceSnapshots = snapshots.filter(snapshot =>
          snapshot.exists && String(snapshot.data()?.normalizedCompanyName || '') === groupKey
        );
        const reachableIndexIds = new Set<string>([keepIndexId]);
        let addedEvidence = true;
        while (addedEvidence) {
          addedEvidence = false;
          for (const candidate of evidenceSnapshots) {
            if (reachableIndexIds.has(candidate.id)) continue;
            const candidateData = candidate.data() || {};
            const connected = evidenceSnapshots.some(existing =>
              reachableIndexIds.has(existing.id) &&
              hasStrongRegistryDuplicateEvidence(existing.data() || {}, candidateData)
            );
            if (connected) {
              reachableIndexIds.add(candidate.id);
              addedEvidence = true;
            }
          }
        }

        for (const deleteIndexId of deleteIndexIds) {
          const candidate = snapshotsById.get(deleteIndexId);
          const candidateData = candidate?.data() || {};
          const sourceCollection = String(candidateData.sourceCollection || '');
          const sourceId = String(candidateData.sourceId || '');
          const isSafeDuplicate =
            candidate?.exists &&
            groupKey &&
            candidateData.normalizedCompanyName === groupKey &&
            reachableIndexIds.has(deleteIndexId) &&
            ['leads', 'partners'].includes(sourceCollection) &&
            sourceId;
          if (!isSafeDuplicate) {
            skippedCount += 1;
            continue;
          }

          writer.delete(db.collection(sourceCollection).doc(sourceId));
          for (const indexCollection of indexWriteCollections) {
            writer.delete(db.collection(indexCollection).doc(candidate.id));
          }
          deletedCount += 1;
        }
      }

      await writer.close();
      return NextResponse.json({
        success: true,
        deletedCount,
        skippedCount,
        message: [
          `Deleted ${deletedCount} redundant registry record${deletedCount === 1 ? '' : 's'}.`,
          skippedCount > 0 ? `${skippedCount} record${skippedCount === 1 ? ' was' : 's were'} skipped because the duplicate evidence changed.` : '',
        ].filter(Boolean).join(' '),
      }, { status: 200 });
    }

    if (action === 'getRegistryClassificationGaps') {
      // Diagnoses why records exist in the raw registry but don't show up under a specific
      // type tab (Suppliers, Transporters, etc.): they were harvested/handshaken into `leads`/
      // `partners`/`companies` but never got a `type`/`role`/`category` field set, so the
      // type filter in searchRegistry silently excludes them.
      const scanCollections = ['leads', 'partners', 'companies'];
      const maxDocsToScan = 60000;
      let unclassifiedCount = 0;
      let totalScanned = 0;
      const sample: Array<{ id: string; collection: string; companyName: string; createdAt?: any }> = [];

      for (const collectionName of scanCollections) {
        try {
          let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
          let scanned = 0;
          while (scanned < maxDocsToScan) {
            let queryRef: FirebaseFirestore.Query = db.collection(collectionName).orderBy(FieldPath.documentId());
            if (lastDoc) queryRef = queryRef.startAfter(lastDoc);
            const batchLimit = Math.min(1000, maxDocsToScan - scanned);
            const snapshot = await queryRef.limit(batchLimit).get();
            if (snapshot.empty) break;

            for (const doc of snapshot.docs) {
              const data = doc.data();
              const hasClassification = Boolean(data.type || data.role || data.declaredRole || data.category || data.industrial_category);
              totalScanned += 1;
              if (!hasClassification) {
                unclassifiedCount += 1;
                if (sample.length < 50) {
                  sample.push({ id: doc.id, collection: collectionName, companyName: data.companyName || data.name || '(unnamed)', createdAt: data.createdAt });
                }
              }
            }

            scanned += snapshot.docs.length;
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < batchLimit) break;
          }
        } catch (e: any) {
          console.error(`getRegistryClassificationGaps: error scanning "${collectionName}":`, e?.message || e);
        }
      }

      return NextResponse.json({
        success: true,
        totalScanned,
        unclassifiedCount,
        sample
      }, { status: 200 });
    }

    if (action === 'classifyUnclassifiedRecords') {
      return NextResponse.json({
        success: false,
        error: 'Bulk classification is disabled. Unclassified records must be reviewed so non-suppliers are not mislabeled.'
      }, { status: 409 });
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
      const debugErrors: Array<{ collection: string; message: string }> = [];
      const debugCounts: Array<{ collection: string; scanned: number }> = [];
      // Previously capped at 5000 regardless of pageSize, which silently truncated large
      // registries (e.g. 20000+ suppliers) so records beyond the cap were never searchable.
      // Scaled this up, but keep it bounded enough to avoid request timeouts — collections that
      // support a `type` filter can safely use a larger window since Firestore filters server-side;
      // the unfiltered `companies` fallback scan is kept modest to avoid pulling huge unrelated data.
      const filteredQueryWindow = Math.min(Math.max(pageSize * 3, 250), 10000);
      const unfilteredQueryWindow = Math.min(Math.max(pageSize * 2, 250), 3000);

      for (const candidateCollection of collectionCandidates) {
        try {
          const isDedicatedCollection = DEDICATED_TYPE_COLLECTIONS.has(candidateCollection);
          const isFiltered = typeValues.length > 0 && candidateCollection !== 'companies' && !isDedicatedCollection;

          // Dedicated collections and type-filtered queries can both use the larger window;
          // only the unfiltered scan of a shared collection (e.g. `companies`) is kept modest.
          const maxQueryWindow = (isFiltered || isDedicatedCollection) ? filteredQueryWindow : unfilteredQueryWindow;

          // Firestore hard-caps limit() at 10,000, so a single query can never see beyond that —
          // registries with more records than that (e.g. 20,000+ suppliers) need multiple pages
          // to be fully scanned. The scan ceiling must cover the whole collection regardless of
          // the requested pageSize (a small pageSize just controls how many records come back in
          // this response) — otherwise search/filtering and totalCount would silently miss
          // records beyond an early cutoff.
          const maxDocsToScan = 60000;
          let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
          let scanned = 0;

          while (scanned < maxDocsToScan) {
            let queryRef: FirebaseFirestore.Query = db.collection(candidateCollection).orderBy(FieldPath.documentId());
            if (isFiltered) {
              queryRef = queryRef.where('type', 'in', typeValues);
            }
            if (lastDoc) {
              queryRef = queryRef.startAfter(lastDoc);
            }
            const batchLimit = Math.min(10000, maxDocsToScan - scanned);
            const snapshot = await queryRef.limit(batchLimit).get();
            if (snapshot.empty) break;

            for (const doc of snapshot.docs) {
              const record = { id: doc.id, ...doc.data(), sourceCollection: candidateCollection };
              const recordKey = `${candidateCollection}:${doc.id}`;
              if (!collectedRecords.has(recordKey)) {
                collectedRecords.set(recordKey, record);
              }
            }

            scanned += snapshot.docs.length;
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            if (snapshot.docs.length < batchLimit) break; // reached the end of the collection
          }
          debugCounts.push({ collection: candidateCollection, scanned });
        } catch (e: any) {
          // Ignore collections that are unavailable or not configured; other candidates may still work.
          console.error(`searchRegistry: error scanning collection "${candidateCollection}":`, e?.message || e);
          debugErrors.push({ collection: candidateCollection, message: e?.message || String(e) });
        }
      }

      const allRecords = Array.from(collectedRecords.values());
      const filteredRecords = allRecords.filter((record: any) => matchesRegistryFilters(record, filters, typeValues));
      const totalCount = filteredRecords.length;
      const start = (page - 1) * pageSize;
      // Strip large text-blob fields (AI-harvested search/content corpora can be tens of KB per
      // record) from the returned page only — filtering above still uses the full record via
      // matchesRegistryFilters/JSON.stringify. Returning these blobs for thousands of records at
      // once produced multi-megabyte JSON responses that could be truncated in transit, causing a
      // parse failure on the client and a silent fallback to a much smaller client-side query.
      const LARGE_TEXT_FIELDS = ['searchCorpus', 'contentCorpus', 'minedServiceWording', 'commercialProfile', 'serviceProfile', 'shopProfile', 'campaignAngles'];
      const pagedRecords = filteredRecords.slice(start, start + pageSize).map((record: any) => {
        const trimmed = { ...record };
        for (const field of LARGE_TEXT_FIELDS) {
          if (trimmed[field] !== undefined && trimmed[field] !== null) {
            // Keep a lightweight marker so list-view UI (e.g. "Profile on record" badges) still
            // knows a profile exists, without shipping the full multi-KB payload for every row.
            trimmed[`has_${field}`] = true;
            delete trimmed[field];
          }
        }
        return trimmed;
      });

      return NextResponse.json({
        success: true,
        leads: pagedRecords,
        data: pagedRecords,
        items: pagedRecords,
        records: pagedRecords,
        totalCount,
        page,
        pageSize,
        hasNextPage: page * pageSize < totalCount,
        debug: { errors: debugErrors, counts: debugCounts }
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
    const msg = String(error?.message || '');
    const isUnauthorized = msg.includes('Unauthorized') || msg.includes('Missing or invalid token');
    const isForbidden = msg.includes('Forbidden') || msg.includes('Access denied');
    if (isUnauthorized || isForbidden) {
      return NextResponse.json({
        success: false,
        error: error.message || 'Access Denied'
      }, { status: isUnauthorized ? 401 : 403 });
    }
    return NextResponse.json({
      success: false,
      error: error.message || 'An unknown error occurred.'
    }, { status: 500 });
  }
}