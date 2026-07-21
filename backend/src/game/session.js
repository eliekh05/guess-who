import { createGameState, selectCharacter, askQuestion, makeGuess } from './engine.js';
import { getCharacters } from '../scrape/characters.js';
import { buildQuestionCategories, setQuestionCategories } from './questions.js';
import { GAME_CONFIG } from '../config/game.js';

function generateRoomCode() {
  const { length, charset } = GAME_CONFIG.roomCode;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

function kvKey(code) {
  return `${GAME_CONFIG.kvKeyPrefix}${code}`;
}

async function saveSession(env, code, state) {
  await env.GAME_SESSIONS.put(kvKey(code), JSON.stringify(state), {
    expirationTtl: GAME_CONFIG.sessionTTL,
  });
}

export async function getSession(env, code) {
  return env.GAME_SESSIONS.get(kvKey(code), 'json');
}

export async function createSession(env, playerAName) {
  const code = generateRoomCode();
  const characters = await getCharacters(env.CHARACTER_CACHE);

  // Ensure question categories are built whenever we load characters
  setQuestionCategories(buildQuestionCategories(characters), characters);

  const state = createGameState(playerAName, '');
  // status starts as 'waiting' — board is populated, character not chosen yet
  const board = characters.map((c) => ({ ...c, eliminated: false }));
  state.players.a.board = board;
  state.players.b.board = board.map((c) => ({ ...c })); // each player gets own copy

  await saveSession(env, code, state);
  return { code, state };
}

export async function joinSession(env, code, playerBName) {
  const state = await getSession(env, code);
  if (!state) return { error: 'Room not found' };
  if (state.status !== 'waiting') return { error: 'This game has already started' };

  state.players.b.name = playerBName;
  state.status = 'choosing'; // both players now select their secret character

  await saveSession(env, code, state);
  return { state };
}

export async function chooseCharacter(env, code, player, characterName) {
  const state = await getSession(env, code);
  if (!state) return { error: 'Room not found' };

  const result = selectCharacter(state, player, characterName);
  if (result.error) return result;

  await saveSession(env, code, state);
  return { state };
}

export async function submitQuestion(env, code, player, questionText) {
  const state = await getSession(env, code);
  if (!state) return { error: 'Room not found' };

  const result = askQuestion(state, player, questionText);
  if (result.error) return result;

  await saveSession(env, code, state);
  return { state, ...result };
}

export async function submitGuess(env, code, player, characterName) {
  const state = await getSession(env, code);
  if (!state) return { error: 'Room not found' };

  const result = makeGuess(state, player, characterName);
  if (result.error) return result;

  await saveSession(env, code, state);
  return { state, ...result };
}
