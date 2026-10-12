/* ==========================================================================
   TRIVIA NIGHT · AI drafting settings
   --------------------------------------------------------------------------
   The address of the AI worker on Cloudflare (see ai/worker.js), e.g.
   'https://trivia-night-ai.your-name.workers.dev'. This address is safe to
   publish: the worker only answers the site owner's signed-in account, and
   the Claude API key lives in Cloudflare, never here.
   Leave it as null to hide the AI buttons.
   ========================================================================== */

window.TRIVIA_AI_URL = null;
