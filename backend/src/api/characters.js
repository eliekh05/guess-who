import { getCharacters } from '../scrape/characters.js';

export async function handleCharacters(request, env) {
  const url = new URL(request.url);

  if (request.method === 'GET' && url.pathname === '/api/characters') {
    const characters = await getCharacters(env.CHARACTER_CACHE);
    return Response.json(characters);
  }

  return null;
}
