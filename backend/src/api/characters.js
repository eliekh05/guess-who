import { getCharacters, refreshCharacterCache } from '../scrape/characters.js';
import { buildQuestionCategories, setQuestionCategories } from '../game/questions.js';

export async function handleCharacters(request, env) {
  const url = new URL(request.url);

  // GET /api/characters — return full character list
  if (request.method === 'GET' && url.pathname === '/api/characters') {
    const characters = await getCharacters(env.CHARACTER_CACHE);
    return Response.json(characters);
  }

  // POST /api/characters/refresh — force scrape + rebuild cache
  // (call this from a Cron trigger or admin tool to pre-warm the cache)
  if (request.method === 'POST' && url.pathname === '/api/characters/refresh') {
    try {
      const characters = await refreshCharacterCache(env.CHARACTER_CACHE);
      const categories = buildQuestionCategories(characters);
      setQuestionCategories(categories);
      return Response.json({
        success: true,
        count: characters.length,
        source: 'refreshed',
      });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  }

  return null;
}
