const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { z } = require('zod');

function loadTypeScript(path, dependencies) {
  const source = fs.readFileSync(path, 'utf8');
  const result = ts.transpileModule(source, { fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length || 0, 0);
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputText)(name => dependencies[name] || require(name), module, module.exports);
  return module.exports;
}

const catalogue = loadTypeScript('src/lib/agent-operations.ts', {});
const records = new Map();
let counter = 0;
let authorised = true;
let generationFails = false;
const db = {
  collection: () => ({
    limit: count => ({ get: async () => ({ size: Math.min(records.size, count), docs: [...records].slice(0, count).map(([id, data]) => ({ id, data: () => data })) }) }),
    doc: suppliedId => {
      const id = suppliedId || `run-${++counter}`;
      return {
        id,
        set: async data => records.set(id, data),
        update: async data => records.set(id, { ...records.get(id), ...data }),
        get: async () => ({ exists: records.has(id), data: () => records.get(id) }),
      };
    },
    orderBy: field => ({
      limit: () => ({ get: async () => ({ docs: [...records].map(([id, data]) => ({ id, data: () => data })) }) }),
      startAt: search => ({ endAt: () => ({ limit: count => ({ get: async () => {
        const matches = [...records].filter(([, data]) => String(data[field] || '').startsWith(search)).slice(0, count);
        return { size: matches.length, docs: matches.map(([id, data]) => ({ id, data: () => data })) };
      } }) }) }),
    }),
  }),
  runTransaction: async callback => callback({ get: reference => reference.get(), update: (reference, data) => reference.update(data) }),
};
const api = loadTypeScript('src/app/api/admin/agent-operations/route.ts', {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  '@/lib/firebase-admin': { verifyAdmin: async () => { if (!authorised) throw new Error('Forbidden'); return { db, adminUid: 'reviewer-1' }; } },
  '@/lib/agent-operations': catalogue,
  'firebase-admin/storage': {},
  zod: { z },
});
const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;
global.fetch = async () => {
  if (generationFails) return { ok: false, json: async () => ({ error: { message: 'Provider unavailable' } }) };
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'Result', findings: [{ statement: 'Unverified opportunity', basis: 'hypothesis', sourceUrl: null }], deliverables: [{ title: 'Brief', content: 'Review before use' }], nextActions: ['Validate findings'] }) }] } }] }) };
};
const post = payload => api.POST({ json: async () => payload });

(async () => {
  try {
    process.env.GEMINI_API_KEY = 'test-only';
    assert.equal(catalogue.INTERNAL_AGENTS.length, 4);
    for (const agent of catalogue.INTERNAL_AGENTS) assert.ok(catalogue.AGENT_DEFAULT_BRIEFS[agent.id].length >= 20);
    records.set('supplier-one', { companyName: 'Alpha Truck Dealers', website: 'https://example.com', privateNotes: 'Do not return' });
    const listed = await api.GET({ url: 'https://example.com/api/admin/agent-operations?action=records&collection=suppliers' });
    assert.equal(listed.status, 200);
    assert.deepEqual(listed.body.records[0], { id: 'supplier-one', name: 'Alpha Truck Dealers', website: 'https://example.com' });
    const searched = await api.GET({ url: 'https://example.com/api/admin/agent-operations?action=records&collection=suppliers&search=Alpha' });
    assert.equal(searched.body.records.length, 1);
    assert.notEqual((await api.GET({ url: 'https://example.com/api/admin/agent-operations?action=records&collection=privateSecrets' })).status, 200);
    records.delete('supplier-one');
    for (const agent of catalogue.INTERNAL_AGENTS) {
      const response = await post({ action: 'run', agentId: agent.id, brief: 'Prepare a measured pilot for truck dealers.' });
      assert.equal(response.status, 200);
      const saved = records.get(response.body.runId);
      assert.equal(saved.status, 'awaiting_approval');
      assert.equal(saved.policy.messagesRequireApproval, true);
      assert.equal(saved.policy.socialPostsRequireApproval, true);
    }
    const approval = await post({ action: 'review', runId: 'run-1', decision: 'approved' });
    assert.equal(approval.status, 200);
    assert.equal(records.get('run-1').reviewedBy, 'reviewer-1');
    assert.ok(records.get('run-1').reviewedAt);
    assert.notEqual((await post({ action: 'review', runId: 'run-1', decision: 'approved' })).status, 200);
    assert.notEqual((await post({ action: 'render-video', runId: 'run-4' })).status, 200);
    generationFails = true;
    const failed = await post({ action: 'run', agentId: 'research-qualification', brief: 'Prepare a measured pilot for truck dealers.' });
    assert.notEqual(failed.status, 200);
    assert.equal(records.get('run-5').status, 'failed');
    generationFails = false;
    records.set('lead-1', { companyName: 'Pilot supplier' });
    const linked = await post({ action: 'run', agentId: 'research-qualification', brief: 'Research the pilot supplier and compare its public enquiry routes.', recordId: 'lead-1', collection: 'leads' });
    assert.equal(linked.status, 200);
    assert.equal(records.get('lead-1')['agentProfile.research-qualification'], undefined);
    assert.equal((await post({ action: 'review', runId: linked.body.runId, decision: 'approved' })).status, 200);
    assert.equal(records.get('lead-1')['agentProfile.research-qualification'].runId, linked.body.runId);
    authorised = false;
    assert.equal((await api.GET({})).status, 403);
    assert.equal((await post({ action: 'review', runId: 'run-2', decision: 'approved' })).status, 403);
    console.log('PASS: four generation paths, persistence, approval audit, duplicate review block, render approval gate, provider failure and admin checks');
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });