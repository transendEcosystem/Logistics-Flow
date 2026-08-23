import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { harvestSite, buildSearchCorpus, normalizeSiteUrl } from '@/lib/site-harvester';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

async function findRecord(db: any, recordId: string, preferred?: string) {
  const ordered = [String(preferred || '').trim(), ...RESEARCH_COLLECTIONS].filter(Boolean);
  const seen = new Set<string>();
  for (const collection of ordered) {
    if (seen.has(collection)) continue;
    seen.add(collection);
    const ref = db.collection(collection).doc(recordId);
    const snapshot = await ref.get();
    if (snapshot.exists) return { ref, collection, data: snapshot.data() || {} };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    await verifyAdmin(request as any);
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const db = getFirestore(app);

    const body = await request.json().catch(() => ({}));
    const recordId = String(body?.recordId || body?.partnerId || '').trim();
    if (!recordId) {
      return NextResponse.json({ success: false, error: 'recordId is required.' }, { status: 400 });
    }

    const located = await findRecord(db, recordId, body?.collection);
    if (!located) {
      return NextResponse.json({ success: false, error: `Record ${recordId} was not found.` }, { status: 404 });
    }

    const website = String(body?.website || located.data.website || '').trim();
    if (!website) {
      return NextResponse.json({ success: false, error: 'This record has no website. Run the gap analysis first.' }, { status: 400 });
    }
    if (!normalizeSiteUrl(website)) {
      return NextResponse.json({ success: false, error: `"${website}" is not a valid website address.` }, { status: 400 });
    }

    const result = await harvestSite(website);
    const searchCorpus = buildSearchCorpus(result.pages);

    await located.ref.set({
      contentCorpus: {
        pages: result.pages.map(page => ({
          url: page.url,
          title: page.title,
          text: page.text.slice(0, 20_000),
          wordCount: page.wordCount,
        })),
        totalWords: result.totalWords,
        pageCount: result.pages.length,
        harvestedAt: result.harvestedAt,
        sourceOrigin: normalizeSiteUrl(website),
      },
      searchCorpus,
      researchStage: 'content_harvested',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      collection: located.collection,
      pageCount: result.pages.length,
      totalWords: result.totalWords,
      pages: result.pages.map(page => ({ url: page.url, title: page.title, wordCount: page.wordCount })),
    });
  } catch (error: any) {
    const message = error?.message || 'Harvest failed.';
    const status = /permission|unauthor|admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
