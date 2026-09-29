import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { googleSearchTool } from '@/ai/tools/google-search';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';
import { harvestSite, normalizeSiteUrl } from '@/lib/site-harvester';

function text(value: unknown): string { return String(value || '').trim(); }

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const auth = await verifyAdmin(request);
    const body = await request.json();
    const applicationId = text(body?.applicationId);
    const website = text(body?.website);
    if (!applicationId) return NextResponse.json({ success: false, error: 'applicationId is required.' }, { status: 400 });
    const applicationRef = auth.db.collection('lendingApplications').doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) return NextResponse.json({ success: false, error: 'Application not found.' }, { status: 404 });
    const application = applicationSnapshot.data() || {};
    const companyName = text(application.companyName);
    if (!companyName) return NextResponse.json({ success: false, error: 'Application company name is required.' }, { status: 400 });

    const disclosedAssets = text(application.disclosedPaidUpAssets);
    const proposedAsset = text(application.proposedAssetOrReceivable);
    const queries = [
      `${companyName} South Africa official website company registration operations`,
      `${companyName} South Africa fleet vehicles equipment`,
      ...(disclosedAssets ? [`${companyName} ${disclosedAssets} South Africa`] : []),
      ...(proposedAsset ? [`${companyName} ${proposedAsset} South Africa`] : []),
    ].slice(0, 4);
    const resultSets = await Promise.all(queries.map(async (query) => ({ query, results: await googleSearchTool({ query }) })));
    const sources = resultSets.flatMap(({ query, results }) => results.map((result) => ({ query, url: result.link, title: result.title, snippet: result.snippet, sourceType: 'public_search' })));
    const normalizedWebsite = normalizeSiteUrl(website);
    let websitePages: Array<{ url: string; title: string; excerpt: string }> = [];
    if (normalizedWebsite) {
      const harvested = await harvestSite(normalizedWebsite);
      websitePages = harvested.pages.map((page) => ({ url: page.url, title: page.title, excerpt: page.text.slice(0, 1_500) }));
    }
    const now = new Date().toISOString();
    const spiderRef = applicationRef.collection('discovery').doc('spider');
    await spiderRef.set({ applicationId, companyName, website: normalizedWebsite || null, queries, sources, websitePages, status: 'completed', completedAt: now, completedBy: auth.adminUid }, { merge: true });
    await applicationRef.collection('discovery').doc('current').set({ spiderLastRunAt: now, spiderStatus: 'completed', updatedAt: now }, { merge: true });
    await auth.db.collection('auditLogs').add({ action: 'lending_discovery_public_spider_completed', applicationId, queryCount: queries.length, sourceCount: sources.length, websitePageCount: websitePages.length, actorId: auth.adminUid, timestamp: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, data: { queries, sources, websitePages, completedAt: now } });
  } catch (error: any) {
    console.error('Lending discovery spider failed:', error);
    return NextResponse.json({ success: false, error: error.message || 'Discovery spider failed.' }, { status: 500 });
  }
}
