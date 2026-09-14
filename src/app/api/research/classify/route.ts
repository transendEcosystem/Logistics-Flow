import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp, verifyAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

// Repeated navigation, cookie banners and contact strips appear on every page,
// so duplicate lines are dropped before the text is sent to the model.
function buildCorpusText(pages: any[]): string {
  const seen = new Set<string>();
  return pages
    .map((page: any) => {
      const body = String(page?.text || '')
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => {
          if (line.length < 3) return false;
          const key = line.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join('\n')
        .slice(0, 4_000);
      return body ? `--- ${page?.url || ''}\n${body}` : '';
    })
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 30_000);
}

function extractJson(raw: string): any {
  const text = String(raw || '')
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('The model did not return JSON.');
    return JSON.parse(text.slice(start, end + 1));
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdmin(request as any);
    const { app, error } = getAdminApp();
    if (!app) throw new Error(error || 'Firebase administration is unavailable.');
    const db = getFirestore(app);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured, so automatic classification is unavailable. Use the copy-and-paste prompt instead.' },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const recordId = String(body?.recordId || body?.partnerId || '').trim();
    if (!recordId) {
      return NextResponse.json({ success: false, error: 'recordId is required.' }, { status: 400 });
    }

    const located = await findRecord(db, recordId, body?.collection);
    if (!located) {
      return NextResponse.json({ success: false, error: `Record ${recordId} was not found.` }, { status: 404 });
    }

    const pages = located.data?.contentCorpus?.pages || [];
    const corpusText = buildCorpusText(Array.isArray(pages) ? pages : []);
    if (corpusText.split(/\s+/).filter(Boolean).length < 20) {
      return NextResponse.json(
        { success: false, error: 'There is no harvested content to classify. Run the harvest first.' },
        { status: 400 },
      );
    }

    const companyName = String(located.data?.companyName || located.data?.name || 'this company');
    const prompt = `Classify this South African business, "${companyName}", using only the website text at the end of this message.

Rules: use only what the text supports, never guess or search the web, and use null or an empty array wherever the text is silent.

Reply with one compact JSON object and nothing else. Keep every array to 8 items or fewer.

{"serviceTags":["lowercase canonical service labels"],"capabilities":["specific things they can do"],"industriesServed":["sectors they name"],"geographicCoverage":["provinces, corridors, countries or cities they name"],"equipmentAssets":["vehicles, trailers, warehouses, plant they mention"],"certifications":["accreditations, memberships, licences"],"valueProps":["claims about why to choose them"],"shopProfile":{"headline":"under 12 words","shortDescription":"40 to 60 words","longDescription":"150 to 250 words","keywords":["buyer search terms"]},"campaignAngles":[{"angle":"an engagement hook","evidence":"supporting wording from their content","targetRole":"who to aim it at"}],"contentQuality":"rich or thin or placeholder"}

WEBSITE TEXT:
${corpusText}`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.message || 'The classification model rejected the request.');
    }

    const textOut = (result?.candidates || [])
      .flatMap((candidate: any) => candidate?.content?.parts || [])
      .map((part: any) => part?.text || '')
      .join('')
      .trim();

    if (!textOut) throw new Error('The classification model returned an empty response.');

    return NextResponse.json({ success: true, profile: extractJson(textOut), collection: located.collection });
  } catch (error: any) {
    const message = error?.message || 'Classification failed.';
    const status = /permission|unauthor|admin/i.test(message) ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
