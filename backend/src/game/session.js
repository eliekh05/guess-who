import { createGameState, selectCharacter, askQuestion, makeGuess } from './engine.js';
import { getCharacters } from '../scrape/characters.js';

const ROOM_CODE_LENGTH = 6;
const SESSION_TTL = 3600;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createSession(kv, playerAName) {
  const code = generateRoomCode();
  const characters = await getCharacters(kv);
  const state = createGameState(playerAName, '');

  state.players.a.board = characters.map((c) => ({ ...c, eliminated: false }));
  state.players.b.board = characters.map((c) => ({ ...c, eliminated: false }));

  await kv.put(`game:${code}`, JSON.stringify(state), { expirationTtl: SESSION_TTL });

  return { code, state };
}

export async function getSession(kv, code) {
  const data = await kv.get(`game:${code}`, 'json');
  return data;
}

export async function joinSession(kv, code, playerBName) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };
  if (state.status !== 'waiting') return { error: 'Game already started' };

  state.players.b.name = playerBName;
  state.status = 'choosing';

  await kv.put(`game:${code}`, JSON.stringify(state), { expirationTtl: SESSION_TTL });
  return { state };
}

export async function chooseCharacter(kv, code, player, characterName) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };

  const result = selectCharacter(state, player, characterName);
  if (result.error) return result;

  await kv.put(`game:${code}`, JSON.stringify(state), { expirationTtl: SESSION_TTL });
  return { state };
}

export async function submitQuestion(kv, code, player, questionText) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };

  const result = askQuestion(state, player, questionText);
  if (result.error) return result;

  await kv.put(`game:${code}`, JSON.stringify(state), { expirationTtl: SESSION_TTL });
  return { state, ...result };
}

export async function submitGuess(kv, code, player, characterName) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };

  const result = makeGuess(state, player, characterName);
  if (result.error) return result;

  await kv.put(`game:${code}`, JSON.stringify(state), { expirationTtl: SESSION_TTL });
  return { state, ...result };
}
