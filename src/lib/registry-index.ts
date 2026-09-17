import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  CORE_OUTREACH_CONTENT_TYPES,
  normalizeEngagementContentType,
} from '@/lib/engagement-content';

export const REGISTRY_INDEX_COLLECTIONS = ['registry_index_a', 'registry_index_b'] as const;
export const REGISTRY_INDEX_META_COLLECTION = 'registry_index_meta';
export const REGISTRY_INDEX_META_DOCUMENT = 'current';
export const REGISTRY_INDEX_SCHEMA_VERSION = 2;

export const REGISTRY_SOURCE_COLLECTIONS = [
  'suppliers',
  'transporters',
  'finance_co',
  'investors',
  'isa_agents',
  'digital_associates',
  'strategic_partners',
  'partners',
  'leads',
  'companies',
] as const;

const COLLECTION_TYPES: Record<string, string> = {
  suppliers: 'supplier',
  transporters: 'transporter',
  finance_co: 'finance',
  investors: 'investor',
  isa_agents: 'isa',
  digital_associates: 'associate',
  strategic_partners: 'partner',
};

const TYPE_ALIASES: Record<string, string> = {
  supplier: 'supplier',
  suppliers: 'supplier',
  vendor: 'supplier',
  vendors: 'supplier',
  transporter: 'transporter',
  transporters: 'transporter',
  haulier: 'transporter',
  hauliers: 'transporter',
  finance: 'finance',
  finances: 'finance',
  funder: 'finance',
  funders: 'finance',
  lender: 'finance',
  lenders: 'finance',
  bank: 'finance',
  banks: 'finance',
  investor: 'investor',
  investors: 'investor',
  isa: 'isa',
  isa_agent: 'isa',
  associate: 'associate',
  associates: 'associate',
  partner: 'partner',
  partners: 'partner',
  strategic_partner: 'partner',
  developer: 'developer',
  developers: 'developer',
  driver: 'driver',
  drivers: 'driver',
};

const INDEX_FIELDS = [
  'companyName',
  'contactPerson',
  'firstName',
  'lastName',
  'email',
  'phone',
  'mobile',
  'website',
  'address',
  'industry',
  'industrial_category',
  'category',
  'trade_category',
  'business_category',
  'businessCategory',
  'sector',
  'status',
  'type',
  'role',
  'declaredRole',
  'assigneeId',
  'source',
  'companyId',
  'primaryContactRole',
  'marketingManager',
  'operationsManager',
  'technicalManager',
  'ceo',
  'industrial_tags',
  'tags',
  'registry_tags',
  'trade_tags',
  'lastOutreachSubject',
  'lastOutreachAt',
  'lastOutreachChannel',
  'lastEngagementType',
  'lastEngagementLabel',
  'lastEngagementAt',
  'lastEngagementChannel',
  'sentContentTypes',
  'openedContentTypes',
  'clickedContentTypes',
  'lastOpenedAt',
  'lastAccessedAt',
  'lastOutcome',
  'lastOutcomeAt',
  'engagementStage',
  'nextFollowUpAt',
  'researchStage',
  'createdAt',
  'updatedAt',
] as const;

export function normalizeRegistryIndexText(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@.+-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function registryIndexId(sourceCollection: string, sourceId: string): string {
  return `${sourceCollection}__${sourceId}`;
}

export async function getActiveRegistryIndexCollection(db: Firestore): Promise<string> {
  const meta = await db
    .collection(REGISTRY_INDEX_META_COLLECTION)
    .doc(REGISTRY_INDEX_META_DOCUMENT)
    .get();
  const activeCollection = String(meta.data()?.activeCollection || '');
  return REGISTRY_INDEX_COLLECTIONS.includes(activeCollection as typeof REGISTRY_INDEX_COLLECTIONS[number])
    ? activeCollection
    : REGISTRY_INDEX_COLLECTIONS[0];
}

export async function getRegistryIndexWriteCollections(db: Firestore): Promise<string[]> {
  const meta = await db
    .collection(REGISTRY_INDEX_META_COLLECTION)
    .doc(REGISTRY_INDEX_META_DOCUMENT)
    .get();
  const data = meta.data() || {};
  const activeCollection = REGISTRY_INDEX_COLLECTIONS.includes(data.activeCollection)
    ? data.activeCollection
    : REGISTRY_INDEX_COLLECTIONS[0];
  const rebuildingCollection =
    data.rebuildStatus === 'building' && REGISTRY_INDEX_COLLECTIONS.includes(data.rebuildingCollection)
      ? data.rebuildingCollection
      : '';
  return Array.from(new Set([activeCollection, rebuildingCollection].filter(Boolean)));
}

export function inferRegistryType(sourceCollection: string, data: Record<string, any>): string {
  if (COLLECTION_TYPES[sourceCollection]) return COLLECTION_TYPES[sourceCollection];

  const candidates = [data.type, data.role, data.declaredRole];
  for (const candidate of candidates) {
    const normalized = normalizeRegistryIndexText(candidate).replace(/\s+/g, '_');
    if (TYPE_ALIASES[normalized]) return TYPE_ALIASES[normalized];
  }

  const category = normalizeRegistryIndexText(data.category || data.industrial_category);
  for (const [alias, registryType] of Object.entries(TYPE_ALIASES)) {
    if (category === alias || category.includes(`${alias} `) || category.includes(` ${alias}`)) {
      return registryType;
    }
  }

  return 'unclassified';
}

function normalizedTags(data: Record<string, any>): string[] {
  const values = [
    ...(Array.isArray(data.industrial_tags) ? data.industrial_tags : []),
    ...(Array.isArray(data.tags) ? data.tags : []),
    ...(Array.isArray(data.registry_tags) ? data.registry_tags : []),
    ...(Array.isArray(data.trade_tags) ? data.trade_tags : []),
  ];
  return Array.from(new Set(values.map(normalizeRegistryIndexText).filter(Boolean))).slice(0, 20);
}

function registryTimestampMillis(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildRegistryFilterKey(filters: {
  status?: unknown;
  category?: unknown;
  assignee?: unknown;
  tag?: unknown;
  engagement?: unknown;
  content?: unknown;
  result?: unknown;
}): string {
  const parts = [
    filters.status ? `s:${normalizeRegistryIndexText(filters.status)}` : '',
    filters.category ? `c:${normalizeRegistryIndexText(filters.category)}` : '',
    filters.assignee ? `a:${normalizeRegistryIndexText(filters.assignee)}` : '',
    filters.tag ? `t:${normalizeRegistryIndexText(filters.tag)}` : '',
    filters.engagement ? `e:${normalizeRegistryIndexText(filters.engagement)}` : '',
    filters.content ? `d:${normalizeRegistryIndexText(filters.content)}` : '',
    filters.result ? `r:${normalizeRegistryIndexText(filters.result)}` : '',
  ].filter(Boolean);
  return parts.join('|');
}

function buildRegistryFilterKeys(
  statusKey: string,
  categoryKey: string,
  assigneeKey: string,
  tagKeys: string[],
  engagementKey: string,
  contentKeys: string[],
  resultKey: string
): string[] {
  const keys = new Set<string>();
  const baseDimensions = [
    { name: 'status', value: statusKey },
    { name: 'category', value: categoryKey },
    { name: 'assignee', value: assigneeKey },
    { name: 'engagement', value: engagementKey },
    { name: 'result', value: resultKey },
  ];

  const contentValues = Array.from(new Set(['', ...contentKeys]));
  for (const content of contentValues) {
    const dimensions = [...baseDimensions, ...(content ? [{ name: 'content', value: content }] : [])];
    for (let mask = 1; mask < (1 << dimensions.length); mask += 1) {
      const filters: Record<string, string> = {};
      dimensions.forEach((dimension, index) => {
        if (mask & (1 << index)) filters[dimension.name] = dimension.value;
      });
      keys.add(buildRegistryFilterKey(filters));
    }

    for (const tag of tagKeys) {
      keys.add(buildRegistryFilterKey({ tag, ...(content ? { content } : {}) }));
      for (let mask = 1; mask < (1 << baseDimensions.length); mask += 1) {
        const filters: Record<string, string> = { tag, ...(content ? { content } : {}) };
        baseDimensions.forEach((dimension, index) => {
          if (mask & (1 << index)) filters[dimension.name] = dimension.value;
        });
        keys.add(buildRegistryFilterKey(filters));
      }
    }
  }

  return Array.from(keys);
}

export function buildRegistryIndexRecord(
  sourceCollection: string,
  sourceId: string,
  data: Record<string, any>
): Record<string, any> {
  const projection: Record<string, any> = {};
  for (const field of INDEX_FIELDS) {
    if (data[field] !== undefined) projection[field] = data[field];
  }

  const companyName = String(data.companyName || data.name || '').trim();
  const category = String(
    data.industrial_category ||
    data.category ||
    data.trade_category ||
    data.business_category ||
    data.businessCategory ||
    data.sector ||
    ''
  ).trim();
  const tags = normalizedTags(data);
  const statusKey = normalizeRegistryIndexText(data.status || 'unknown');
  const categoryKey = normalizeRegistryIndexText(category || 'uncategorized');
  const assigneeKey = normalizeRegistryIndexText(data.assigneeId || 'unassigned');
  const engagementLogs = Array.isArray(data.engagementLogs) ? data.engagementLogs : [];
  const lastLog = engagementLogs[engagementLogs.length - 1] || {};
  const deepDiveSubject = normalizeRegistryIndexText(data.commercialProfile?.engagementPack?.emailSubject);
  const inferLoggedContentType = (log: Record<string, any>) => {
    const logSubject = normalizeRegistryIndexText(log.subject);
    return normalizeEngagementContentType(
      log.contentType || (deepDiveSubject && logSubject === deepDiveSubject ? 'deep-dive-strategy' : ''),
      log.subject,
      log.channel
    );
  };
  const lastEngagementType = normalizeEngagementContentType(
    data.lastEngagementType ||
      lastLog.contentType ||
      (deepDiveSubject && normalizeRegistryIndexText(data.lastOutreachSubject) === deepDiveSubject
        ? 'deep-dive-strategy'
        : ''),
    data.lastOutreachSubject || lastLog.subject,
    data.lastEngagementChannel || data.lastOutreachChannel || lastLog.channel
  );
  const sentContentTypes = Array.from(new Set([
    ...(Array.isArray(data.sentContentTypes) ? data.sentContentTypes : []),
    ...engagementLogs.map(inferLoggedContentType),
    lastEngagementType,
  ].map(type => normalizeEngagementContentType(type)).filter(Boolean)));
  const coreContentTypes = sentContentTypes.filter(type =>
    CORE_OUTREACH_CONTENT_TYPES.includes(type as typeof CORE_OUTREACH_CONTENT_TYPES[number])
  );
  const coreComplete = CORE_OUTREACH_CONTENT_TYPES.every(type => coreContentTypes.includes(type));
  const contentKeys = coreContentTypes.length > 0
    ? [...coreContentTypes, ...(coreComplete ? ['core-complete'] : [])]
    : ['none'];
  const engagementKey = lastEngagementType || 'none';
  const lastEngagementAt = data.lastEngagementAt || data.lastOutreachAt || lastLog.timestamp || null;
  const engagementAtMillis = registryTimestampMillis(lastEngagementAt);
  const resultKey = registryTimestampMillis(data.lastOutcomeAt) >= engagementAtMillis && data.lastOutcome
    ? 'responded'
    : registryTimestampMillis(data.lastAccessedAt) >= engagementAtMillis && data.lastAccessedAt
      ? 'clicked'
      : registryTimestampMillis(data.lastOpenedAt) >= engagementAtMillis && data.lastOpenedAt
        ? 'opened'
        : lastEngagementType
          ? 'sent'
          : 'none';

  return {
    ...projection,
    companyName,
    sourceId,
    sourceCollection,
    indexSchemaVersion: REGISTRY_INDEX_SCHEMA_VERSION,
    collection: sourceCollection,
    collectionName: sourceCollection,
    registryType: inferRegistryType(sourceCollection, data),
    normalizedCompanyName: normalizeRegistryIndexText(companyName || data.email || sourceId),
    statusKey,
    categoryKey,
    assigneeKey,
    lastEngagementType: engagementKey,
    lastEngagementAt,
    lastEngagementChannel: data.lastEngagementChannel || data.lastOutreachChannel || lastLog.channel || '',
    sentContentTypes,
    contentMilestoneKeys: contentKeys,
    engagementResultKey: resultKey,
    tagKeys: tags,
    filterKeys: buildRegistryFilterKeys(
      statusKey,
      categoryKey,
      assigneeKey,
      tags,
      engagementKey,
      contentKeys,
      resultKey
    ),
    has_commercialProfile: Boolean(data.commercialProfile),
    has_serviceProfile: Boolean(data.serviceProfile),
    has_contentCorpus: Boolean(data.contentCorpus),
    has_searchCorpus: Boolean(data.searchCorpus),
    indexedAt: FieldValue.serverTimestamp(),
  };
}

export async function syncRegistryIndexDocument(
  db: Firestore,
  sourceCollection: string,
  sourceId: string,
  sourceData?: Record<string, any>
): Promise<void> {
  let data = sourceData;
  if (!data) {
    const snapshot = await db.collection(sourceCollection).doc(sourceId).get();
    if (!snapshot.exists) {
      await deleteRegistryIndexDocument(db, sourceCollection, sourceId);
      return;
    }
    data = snapshot.data() || {};
  }

  const indexCollections = await getRegistryIndexWriteCollections(db);
  const indexRecord = buildRegistryIndexRecord(sourceCollection, sourceId, data);
  await Promise.all(indexCollections.map(indexCollection =>
    db
      .collection(indexCollection)
      .doc(registryIndexId(sourceCollection, sourceId))
      .set(indexRecord, { merge: false })
  ));
}

export async function deleteRegistryIndexDocument(
  db: Firestore,
  sourceCollection: string,
  sourceId: string
): Promise<void> {
  const indexCollections = await getRegistryIndexWriteCollections(db);
  await Promise.all(indexCollections.map(indexCollection =>
    db.collection(indexCollection).doc(registryIndexId(sourceCollection, sourceId)).delete()
  ));
}
