import { handleCharacters } from './api/characters.js';
import { handleGame } from './api/game.js';

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

    return env.ASSETS.fetch(request);
  },
};

function addCors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');

  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return new Response(null, { ...response, headers });
  }

  return new Response(response.body, { ...response, headers });
}
