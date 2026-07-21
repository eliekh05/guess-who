import { handleCharacters } from './api/characters.js';
import { handleGame } from './api/game.js';
import { QUESTION_CATEGORIES } from './game/questions.js';
import { GAME_CONFIG } from './config/game.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/characters')) {
      const response = await handleCharacters(request, env);
      if (response) return addCors(response);
    }

    if (url.pathname.startsWith('/api/game')) {
      const response = await handleGame(request, env);
      if (response) return addCors(response);
    }

    if (url.pathname === '/api/health') {
      return addCors(Response.json({ status: 'ok', timestamp: Date.now() }));
    }

    if (url.pathname === '/api/questions') {
      return addCors(Response.json(QUESTION_CATEGORIES));
    }

    if (url.pathname === '/api/config') {
      return addCors(Response.json({
        frontend: GAME_CONFIG.frontend,
      }));
    }

    // Static assets + SPA fallback.
    // not_found_handling: "single-page-application" in wrangler.jsonc
    // makes ASSETS serve index.html for unknown paths (e.g. /game/ABCDEF).
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};

function addCors(response) {
  const corsHeaders = new Headers(response.headers);
  corsHeaders.set('Access-Control-Allow-Origin', '*');
  corsHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type');

  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return new Response(null, { status: response.status, statusText: response.statusText, headers: corsHeaders });
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: corsHeaders });
}
