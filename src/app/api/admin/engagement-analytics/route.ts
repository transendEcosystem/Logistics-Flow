import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const REGISTRIES = ['leads', 'partners', 'strategic_partners', 'suppliers', 'transporters', 'finance_co', 'investors', 'isa_agents', 'digital_associates', 'developers', 'drivers'] as const;
const REGISTRY_LABELS: Record<string, string> = {
  leads: 'Leads', partners: 'Partners', strategic_partners: 'Strategic Partners', suppliers: 'Suppliers',
  transporters: 'Transporters', finance_co: 'Finance Companies', investors: 'Investors',
  isa_agents: 'ISA Agents', digital_associates: 'Digital Associates', developers: 'Developers', drivers: 'Drivers',
};

function epoch(value: any): number {
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await verifyAdmin(request);
    const params = request.nextUrl.searchParams;
    const registry = params.get('registry') || 'all';
    const days = Math.min(Math.max(Number(params.get('days') || 30), 1), 365);
    if (registry !== 'all' && !REGISTRIES.includes(registry as typeof REGISTRIES[number])) {
      return NextResponse.json({ success: false, error: 'Unsupported registry.' }, { status: 400 });
    }
    const snapshot = await db.collection('engagementMetrics').orderBy('timestamp', 'desc').limit(10000).get();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const events = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as any))
      .filter(event => epoch(event.timestamp) >= cutoff && (registry === 'all' || event.registry === registry));
    const groups = new Map<string, any>();
    for (const event of events) {
      if (!event.campaignId || !event.registry || !event.recordId) continue;
      const key = `${event.registry}::${event.campaignId}`;
      const group = groups.get(key) || { registry: event.registry, campaignId: event.campaignId, recordId: event.recordId, contentType: event.contentType || 'unknown', sentAt: 0, openedAt: 0, clickedAt: 0 };
      const at = epoch(event.timestamp);
      if (event.eventType === 'sent') group.sentAt ||= at;
      if (event.eventType === 'open') group.openedAt = group.openedAt ? Math.min(group.openedAt, at) : at;
      if (event.eventType === 'click') group.clickedAt = group.clickedAt ? Math.min(group.clickedAt, at) : at;
      groups.set(key, group);
    }
    const campaigns = Array.from(groups.values());
    const summaries = (registry === 'all' ? REGISTRIES : [registry as typeof REGISTRIES[number]]).map(key => {
      const rows = campaigns.filter(item => item.registry === key && item.sentAt);
      const opened = rows.filter(item => item.openedAt);
      const clicked = rows.filter(item => item.clickedAt);
      const intervals = rows.filter(item => item.openedAt && item.clickedAt && item.clickedAt >= item.openedAt).map(item => item.clickedAt - item.openedAt).sort((a, b) => a - b);
      const middle = Math.floor(intervals.length / 2);
      const medianMs = intervals.length ? (intervals.length % 2 ? intervals[middle] : (intervals[middle - 1] + intervals[middle]) / 2) : null;
      const meanMs = intervals.length ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length : null;
      const contentTypes = Array.from(new Set(rows.map(item => item.contentType))).map(type => {
        const typeRows = rows.filter(item => item.contentType === type);
        return { contentType: type, sent: typeRows.length, opened: typeRows.filter(item => item.openedAt).length, clicked: typeRows.filter(item => item.clickedAt).length };
      });
      return {
        registry: key,
        label: REGISTRY_LABELS[key] || key,
        sent: rows.length,
        opened: opened.length,
        clicked: clicked.length,
        openRate: rows.length ? opened.length / rows.length : null,
        readToClickRatio: opened.length ? clicked.length / opened.length : null,
        meanReadToActionMinutes: meanMs === null ? null : Math.round(meanMs / 60000),
        medianReadToActionMinutes: medianMs === null ? null : Math.round(medianMs / 60000),
        timedActions: intervals.length,
        contentTypes,
      };
    });
    return NextResponse.json({ success: true, days, sampledEvents: events.length, truncated: snapshot.size === 10000, openMetricNote: 'Tracked email opens may include privacy-proxy or security-scanner fetches; treat as an estimate, not verified human reads.', actionMetricNote: 'Read-to-action time is measured from the first tracked open to the first tracked email CTA click for each sent campaign.', registries: summaries });
  } catch (error: any) {
    const message = error?.message || 'Engagement analytics failed.';
    const status = /permission|unauthor|admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}