// Tests for the AI drafting worker, with a fake Claude and fake Google sign-ins.
// Run from the repo root:  node --test projects/trivia/ai/worker.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { shape } from './worker.js';

const PROJECT = 'trivia-night-a7636';
const env = { ANTHROPIC_API_KEY: 'sk-ant-test', ALLOWED_EMAILS: 'Dhriti@example.com, friend@example.com' };

// A signing key standing in for Google's.
const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = Object.assign(await crypto.subtle.exportKey('jwk', pair.publicKey), { kid: 'test-key', alg: 'RS256', use: 'sig' });
const b64 = (bytes) => Buffer.from(bytes).toString('base64url');
async function token(over = {}, claimsOver = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Object.assign({ alg: 'RS256', kid: 'test-key' }, over);
  const claims = Object.assign({
    iss: 'https://securetoken.google.com/' + PROJECT, aud: PROJECT, sub: 'uid-1', iat: now - 10, exp: now + 3600,
    email: 'dhriti@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' }
  }, claimsOver);
  const head = b64(JSON.stringify(header)) + '.' + b64(JSON.stringify(claims));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(head));
  return head + '.' + b64(new Uint8Array(sig));
}

// Fake network: Google's keys and Claude.
let claudeCalls = [];
let claudeReply = null;
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('googleapis.com')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Cache-Control': 'max-age=3600' } });
  if (String(url).startsWith('https://api.anthropic.com/')) {
    claudeCalls.push({ headers: opts.headers, body: JSON.parse(opts.body) });
    return claudeReply();
  }
  throw new Error('unexpected fetch ' + url);
};
const fiveQuestions = [500, 100, 300, 200, 400].map(v => ({ value: v, question: 'Q' + v + '?', answer: 'A' + v, unsure: v === 500, note: v === 500 ? 'Check the year.' : 'ignored' }));
const claudeOk = (input) => () => new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'save_questions', input }] }), { status: 200 });

async function call(body, auth, envOver = {}) {
  const headers = { 'Content-Type': 'application/json', Origin: 'https://dhritivarma2309.github.io' };
  if (auth) headers.Authorization = 'Bearer ' + auth;
  const res = await worker.fetch(new Request('https://ai.example/draft', { method: 'POST', headers, body: JSON.stringify(body) }), Object.assign({}, env, envOver));
  return { status: res.status, body: await res.json(), headers: res.headers };
}

test('browsers on the site may call it (CORS), others get the site origin back', async () => {
  const res = await worker.fetch(new Request('https://ai.example/draft', { method: 'OPTIONS', headers: { Origin: 'http://localhost:8765' } }), env);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8765');
  const other = await worker.fetch(new Request('https://ai.example/draft', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env);
  assert.equal(other.headers.get('Access-Control-Allow-Origin'), 'https://dhritivarma2309.github.io');
});

test('no sign-in, a forged token, or an expired one is refused', async () => {
  claudeCalls = [];
  assert.equal((await call({ theme: 'Suits' })).status, 401);
  assert.equal((await call({ theme: 'Suits' }, 'not.a.token')).status, 401);
  const good = await token();
  const forged = good.slice(0, good.lastIndexOf('.')) + '.' + b64(new Uint8Array(256));
  assert.equal((await call({ theme: 'Suits' }, forged)).status, 401);
  assert.equal((await call({ theme: 'Suits' }, await token({}, { exp: Math.floor(Date.now() / 1000) - 5 }))).status, 401);
  assert.equal((await call({ theme: 'Suits' }, await token({}, { aud: 'some-other-project' }))).status, 401);
  assert.equal(claudeCalls.length, 0, 'Claude is never asked');
});

test('only Google sign-ins on the allowed list can draft', async () => {
  claudeCalls = [];
  const anon = await token({}, { firebase: { sign_in_provider: 'anonymous' }, email: undefined });
  assert.equal((await call({ theme: 'Suits' }, anon)).status, 401);
  const stranger = await call({ theme: 'Suits' }, await token({}, { email: 'stranger@example.com' }));
  assert.equal(stranger.status, 403);
  assert.match(stranger.body.error, /only switched on for the site owner/);
  const unverified = await call({ theme: 'Suits' }, await token({}, { email_verified: false }));
  assert.equal(unverified.status, 403);
  assert.equal(claudeCalls.length, 0);
});

test('drafts a category: asks Claude properly and returns 5 questions in value order', async () => {
  claudeCalls = [];
  claudeReply = claudeOk({ category: 'Suits Trivia', questions: fiveQuestions });
  const res = await call({ mode: 'category', theme: '  Suits  ' }, await token());
  assert.equal(res.status, 200);
  assert.equal(res.body.category, 'Suits Trivia');
  assert.deepEqual(res.body.questions.map(q => q.value), [100, 200, 300, 400, 500]);
  assert.deepEqual(res.body.questions[0], { value: 100, q: 'Q100?', a: 'A100', unsure: false, note: '' });
  assert.equal(res.body.questions[4].unsure, true);
  assert.equal(res.body.questions[4].note, 'Check the year.');
  const sent = claudeCalls[0];
  assert.equal(sent.headers['x-api-key'], 'sk-ant-test', 'the key is only used here, server-side');
  assert.equal(sent.headers['anthropic-version'], '2023-06-01');
  assert.equal(sent.body.model, 'claude-sonnet-5-5');
  assert.deepEqual(sent.body.tool_choice, { type: 'auto' });
  assert.match(sent.body.messages[0].content, /Theme: Suits\n/);
});

test('redoes one question at the right value, avoiding the others', async () => {
  claudeCalls = [];
  claudeReply = claudeOk({ category: 'Suits', questions: [{ value: 100, question: 'New Q?', answer: 'New A', unsure: false, note: '' }] });
  const res = await call({ mode: 'question', theme: 'Suits', value: 300, keep: [{ q: 'Who is Donna?', a: 'Assistant' }] }, await token());
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.questions, [{ value: 300, q: 'New Q?', a: 'New A', unsure: false, note: '' }]);
  assert.match(claudeCalls[0].body.messages[0].content, /worth 300/);
  assert.match(claudeCalls[0].body.messages[0].content, /Who is Donna\? \(Assistant\)/);
});

test('clear messages when something goes wrong', async () => {
  assert.equal((await call({ theme: '   ' }, await token())).status, 400);
  claudeReply = () => new Response('{}', { status: 401 });
  assert.match((await call({ theme: 'Suits' }, await token())).body.error, /key in Cloudflare/);
  claudeReply = () => new Response(JSON.stringify({ error: { message: 'Your credit balance is too low' } }), { status: 400 });
  assert.match((await call({ theme: 'Suits' }, await token())).body.error, /out of credit/);
  claudeReply = claudeOk({ category: 'X', questions: fiveQuestions.slice(0, 2) });
  assert.equal((await call({ theme: 'Suits' }, await token())).status, 502);
  const noKey = await call({ theme: 'Suits' }, await token(), { ANTHROPIC_API_KEY: '' });
  assert.equal(noKey.status, 500);
});

test('tidies what Claude returns (long text, missing values)', () => {
  const out = shape({ category: 'A very very very long category name indeed', questions: fiveQuestions.map(q => Object.assign({}, q, { value: 0 })) }, { mode: 'category', theme: 'T' });
  assert.equal(out.category.length, 24);
  assert.deepEqual(out.questions.map(q => q.value), [100, 200, 300, 400, 500]);
});
