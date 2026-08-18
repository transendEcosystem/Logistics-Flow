import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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
    supplier: ['supplier', 'suppliers'],
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
    const recordTypeValue = String(record.type || record.role || record.category || record.industrial_category || '').toLowerCase();
    const normalizedTypes = [recordTypeValue, String(record.type || '').toLowerCase(), String(record.role || '').toLowerCase(), String(record.category || '').toLowerCase(), String(record.industrial_category || '').toLowerCase()];
    if (!normalizedTypes.some(value => typeValues.some(typeValue => value === typeValue.toLowerCase()))) {
      const legacyMatch = String(record.industrial_category || record.category || record.type || '').toLowerCase();
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
    const collectionName = resolveCollection(request.url);
    const snapshot = await adminDb.collection(collectionName).limit(100).get();
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

    if (action?.startsWith('delete')) {
      const recordId = payload?.id || payload?.leadId || (body as any)?.leadId;
      if (recordId) {
        await adminDb.collection(collectionName).doc(recordId).delete();
        return NextResponse.json({ success: true, deletedId: recordId }, { status: 200 });
      }
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
          let queryRef: FirebaseFirestore.Query = adminDb.collection(candidateCollection);

          if (typeValues.length) {
            queryRef = queryRef.where('type', 'in', typeValues);
          }

          const snapshot = await queryRef.limit(maxQueryWindow).get();
          for (const doc of snapshot.docs) {
            const record = { id: doc.id, ...doc.data() };
            if (!collectedRecords.has(doc.id)) {
              collectedRecords.set(doc.id, record);
            }
          }

          if (collectedRecords.size > 0) {
            break;
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

      const docRef = await adminDb.collection(collectionName).add({
        ...(typeof dataToSave === 'object' ? dataToSave : {}),
        createdAt: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        id: docRef.id,
        message: 'Record created successfully'
      }, { status: 200 });
    }

    const snapshot = await adminDb.collection(collectionName).limit(100).get();
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