import { handleCharacters } from './api/characters.js';
import { handleGame } from './api/game.js';
import { getCharacters } from './scrape/characters.js';
import { buildQuestionCategories, setQuestionCategories, getQuestionCategories } from './game/questions.js';
import { GAME_CONFIG } from './config/game.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }));
    }

    // Warm up question categories on every cold start (fast: reads from KV cache)
    if (!getQuestionCategories()) {
      try {
        const characters = await getCharacters(env.CHARACTER_CACHE);
        setQuestionCategories(buildQuestionCategories(characters), characters);
      } catch (e) {
        console.warn('Startup: could not build question categories:', e.message);
      }
    }

    // API routes
    if (url.pathname.startsWith('/api/characters')) {
      return cors(await handleCharacters(request, env) ?? notFound());
    }
    if (url.pathname.startsWith('/api/game')) {
      return cors(await handleGame(request, env) ?? notFound());
    }
    if (url.pathname === '/api/questions') {
      return cors(Response.json(getQuestionCategories() ?? {}));
    }
    if (url.pathname === '/api/config') {
      return cors(Response.json({ frontend: GAME_CONFIG.frontend }));
    }
    if (url.pathname === '/api/health') {
      return cors(Response.json({ status: 'ok', ts: Date.now() }));
    }

    // Static assets + SPA fallback
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not Found', { status: 404 });
  },
};

function cors(response) {
  const h = new Headers(response.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

function notFound() {
  return Response.json({ error: 'Not found' }, { status: 404 });
}
