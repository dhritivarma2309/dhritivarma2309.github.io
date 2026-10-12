/* ==========================================================================
   TRIVIA NIGHT · AI drafting (a Cloudflare Worker)
   --------------------------------------------------------------------------
   The board builder asks this worker to draft questions; the worker asks
   Claude. It exists so the Claude API key never reaches a browser: the key
   lives only in Cloudflare, as the secret ANTHROPIC_API_KEY.

   Who may use it: only the people listed in ALLOWED_EMAILS (a Cloudflare
   variable, comma-separated), signed in with Google. Every request carries
   the Firebase sign-in token from the builder, and the worker checks it
   against Google's public keys before doing anything.

   Cloudflare settings (Worker → Settings → Variables and Secrets):
     ANTHROPIC_API_KEY  Secret. The Claude API key (sk-ant-...).
     ALLOWED_EMAILS     Text. e.g. you@gmail.com
   Optional:
     FIREBASE_PROJECT   Text. Defaults to trivia-night-a7636.
     MODEL              Text. Defaults to claude-sonnet-5-5.

   POST /draft  (Authorization: Bearer <Firebase ID token>)
     { "mode": "category", "theme": "90s Bollywood" }
       -> { "category": "...", "questions": [ { value, q, a, unsure, note } x5 ] }
     { "mode": "question", "theme": "...", "value": 300,
       "keep": [ { "q": "...", "a": "..." } ] }   (the category's other questions)
       -> { "questions": [ { value, q, a, unsure, note } ] }
   ========================================================================== */

const ORIGINS = ['https://dhritivarma2309.github.io', 'http://localhost:8765'];
const VALUES = [100, 200, 300, 400, 500];
const KEYS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const reply = (status, body) => new Response(JSON.stringify(body), {
      status, headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') return reply(200, { ok: true, service: 'trivia-night-ai' });
    if (request.method !== 'POST' || url.pathname !== '/draft') return reply(404, { error: 'Not found.' });
    if (!env.ANTHROPIC_API_KEY) return reply(500, { error: 'The AI key isn\'t set up in Cloudflare yet.' });

    // 1. Who is asking?
    let user;
    try {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      user = await verifyFirebaseToken(token, env.FIREBASE_PROJECT || 'trivia-night-a7636');
    } catch (e) {
      return reply(401, { error: 'Please sign in again.' });
    }
    const allowed = String(env.ALLOWED_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    if (!user.email || !user.emailVerified || !allowed.includes(user.email.toLowerCase())) {
      return reply(403, { error: 'AI drafting is only switched on for the site owner.' });
    }

    // 2. What do they want?
    let ask;
    try { ask = cleanRequest(await request.json()); }
    catch (e) { return reply(400, { error: e.message || 'That request didn\'t make sense.' }); }

    // 3. Ask Claude.
    try {
      const result = await draft(ask, env);
      return reply(200, result);
    } catch (e) {
      return reply(502, { error: e.message || 'Claude didn\'t answer. Try again.' });
    }
  }
};

/* ---- Checking the sign-in token ---------------------------------------- */

let keyCache = { keys: null, until: 0 };

async function googleKeys() {
  if (keyCache.keys && Date.now() < keyCache.until) return keyCache.keys;
  const res = await fetch(KEYS_URL);
  if (!res.ok) throw new Error('keys');
  const body = await res.json();
  const age = /max-age=(\d+)/.exec(res.headers.get('Cache-Control') || '');
  keyCache = { keys: body.keys || [], until: Date.now() + (age ? +age[1] * 1000 : 3600 * 1000) };
  return keyCache.keys;
}

function b64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

export async function verifyFirebaseToken(token, project) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
  const claims = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
  if (header.alg !== 'RS256') throw new Error('bad alg');
  const jwk = (await googleKeys()).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad signature');
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== project || claims.iss !== 'https://securetoken.google.com/' + project) throw new Error('wrong project');
  if (!(claims.exp > now) || !(claims.iat <= now + 300) || !claims.sub) throw new Error('expired');
  const provider = claims.firebase && claims.firebase.sign_in_provider;
  if (provider !== 'google.com') throw new Error('not google');
  return { uid: claims.sub, email: claims.email || '', emailVerified: claims.email_verified === true };
}

/* ---- What we ask Claude ------------------------------------------------ */

function text(v, max) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max); }

export function cleanRequest(body) {
  const mode = body && body.mode === 'question' ? 'question' : 'category';
  const theme = text(body && body.theme, 80);
  if (!theme) throw new Error('Type a theme first.');
  const ask = { mode, theme };
  if (mode === 'question') {
    ask.value = VALUES.includes(+body.value) ? +body.value : 300;
    ask.keep = (Array.isArray(body.keep) ? body.keep : []).slice(0, 4)
      .map(k => ({ q: text(k && k.q, 300), a: text(k && k.a, 120) })).filter(k => k.q);
  }
  return ask;
}

const SYSTEM = `You write questions for Trivia Night, a Jeopardy-style quiz that the host plays with a group of friends over a video call. Teams buzz in and answer out loud; the host checks the answer.

Write questions that are fun to hear read aloud and fair to answer:
- Plain questions ("Which city...?"), not Jeopardy-style answers phrased as clues.
- Each question has one clear, short answer: a name, a title, a word or a number. No "name three..." questions and no multiple choice.
- Never put the answer, or an obvious giveaway of it, in the question.
- Keep each question under 25 words.
- Vary the kinds of question within a category (who, what, when, where, how many).
- Difficulty rises with the value: 100 is something most people in a casual group would know; 300 needs real familiarity; 500 is for a true fan of the theme.
- Only use facts you are confident are accurate and still true. If you are not fully sure of a fact, still write the question but set "unsure" to true and say in "note" what the host should double-check.
- The category name is short (at most 24 characters) and based on the theme.`;

const TOOL = {
  name: 'save_questions',
  description: 'Save the drafted trivia questions.',
  input_schema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Short category name, at most 24 characters.' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: { type: 'integer', enum: VALUES },
            question: { type: 'string' },
            answer: { type: 'string', description: 'The short answer the host checks against.' },
            unsure: { type: 'boolean', description: 'True if any fact in this question should be double-checked.' },
            note: { type: 'string', description: 'If unsure: what to check. Otherwise empty.' }
          },
          required: ['value', 'question', 'answer', 'unsure', 'note']
        }
      }
    },
    required: ['category', 'questions']
  }
};

export function buildMessages(ask) {
  if (ask.mode === 'category') {
    return 'Theme: ' + ask.theme + '\n\nWrite one category for this theme: exactly five questions, one at each value 100, 200, 300, 400 and 500, getting harder in that order.';
  }
  const others = ask.keep.length
    ? '\n\nThe category already has these questions. Don\'t repeat their facts or answers:\n' + ask.keep.map(k => '- ' + k.q + ' (' + k.a + ')').join('\n')
    : '';
  return 'Theme: ' + ask.theme + others + '\n\nWrite one new question worth ' + ask.value + ' for this category, at the right difficulty for that value. Return it as the only item in "questions", and repeat the category name.';
}

export async function draft(ask, env) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: env.MODEL || 'claude-sonnet-5-5',
      max_tokens: 2000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: buildMessages(ask) }]
    })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('The AI key in Cloudflare isn\'t working. Check ANTHROPIC_API_KEY.');
    if (res.status === 429) throw new Error('Claude is busy right now. Wait a moment and try again.');
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      if (/credit/i.test(JSON.stringify(body))) throw new Error('Your Anthropic account is out of credit.');
    }
    throw new Error('Claude didn\'t answer. Try again.');
  }
  const body = await res.json();
  const use = (body.content || []).find(c => c.type === 'tool_use' && c.name === TOOL.name);
  if (!use) throw new Error('Claude didn\'t return any questions. Try again.');
  return shape(use.input, ask);
}

// Make Claude's answer exactly what the builder expects.
export function shape(input, ask) {
  const raw = Array.isArray(input && input.questions) ? input.questions : [];
  const clean = raw.map(q => ({
    value: +q.value,
    q: text(q.question, 300),
    a: text(q.answer, 120),
    unsure: q.unsure === true,
    note: q.unsure === true ? text(q.note, 200) : ''
  })).filter(q => q.q && q.a);
  if (ask.mode === 'question') {
    const one = clean[0];
    if (!one) throw new Error('Claude didn\'t return a question. Try again.');
    one.value = ask.value;
    return { questions: [one] };
  }
  // One per value, in order; fall back to the order given if values are off.
  const byValue = VALUES.map(v => clean.find(q => q.value === v));
  const questions = byValue.every(Boolean) ? byValue : clean.slice(0, 5).map((q, i) => Object.assign(q, { value: VALUES[i] }));
  if (questions.length < 5) throw new Error('Claude returned too few questions. Try again.');
  return { category: text(input.category, 24) || text(ask.theme, 24), questions };
}
