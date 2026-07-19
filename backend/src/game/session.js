import { createGameState, selectCharacter, askQuestion, makeGuess } from './engine.js';
import { getCharacters } from '../scrape/characters.js';
import { GAME_CONFIG } from '../config/game.js';

function generateRoomCode() {
  const { length, charset } = GAME_CONFIG.roomCode;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

export async function createSession(kv, playerAName) {
  const code = generateRoomCode();
  const characters = await getCharacters(kv);
  const state = createGameState(playerAName, '');

  state.players.a.board = characters.map((c) => ({ ...c, eliminated: false }));
  state.players.b.board = characters.map((c) => ({ ...c, eliminated: false }));

  await kv.put(`${GAME_CONFIG.kvKeyPrefix}${code}`, JSON.stringify(state), { expirationTtl: GAME_CONFIG.sessionTTL });

  return { code, state };
}

export async function getSession(kv, code) {
  const data = await kv.get(`${GAME_CONFIG.kvKeyPrefix}${code}`, 'json');
  return data;
}

export async function joinSession(kv, code, playerBName) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };
  if (state.status !== 'waiting') return { error: 'Game already started' };

  state.players.b.name = playerBName;
  state.status = 'choosing';

  await kv.put(`${GAME_CONFIG.kvKeyPrefix}${code}`, JSON.stringify(state), { expirationTtl: GAME_CONFIG.sessionTTL });
  return { state };
}

export async function chooseCharacter(kv, code, player, characterName) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };

  const result = selectCharacter(state, player, characterName);
  if (result.error) return result;

  await kv.put(`${GAME_CONFIG.kvKeyPrefix}${code}`, JSON.stringify(state), { expirationTtl: GAME_CONFIG.sessionTTL });
  return { state };
}

export async function submitQuestion(kv, code, player, questionText) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };

  const result = askQuestion(state, player, questionText);
  if (result.error) return result;

  await kv.put(`${GAME_CONFIG.kvKeyPrefix}${code}`, JSON.stringify(state), { expirationTtl: GAME_CONFIG.sessionTTL });
  return { state, ...result };
}

export async function submitGuess(kv, code, player, characterName) {
  const state = await getSession(kv, code);
  if (!state) return { error: 'Room not found' };

  const result = makeGuess(state, player, characterName);
  if (result.error) return result;

  await kv.put(`${GAME_CONFIG.kvKeyPrefix}${code}`, JSON.stringify(state), { expirationTtl: GAME_CONFIG.sessionTTL });
  return { state, ...result };
}
