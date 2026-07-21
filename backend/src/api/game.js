import {
  createSession,
  joinSession,
  chooseCharacter,
  submitQuestion,
  submitGuess,
  getSession,
} from '../game/session.js';
import { getCharacters } from '../scrape/characters.js';
import { buildQuestionCategories, setQuestionCategories, getQuestionCategories } from '../game/questions.js';

export async function handleGame(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Ensure question categories are always available before any game action
  if (!getQuestionCategories()) {
    try {
      const characters = await getCharacters(env.CHARACTER_CACHE);
      setQuestionCategories(buildQuestionCategories(characters));
    } catch (e) {
      console.warn('Could not build question categories:', e.message);
    }
  }

  if (request.method === 'POST' && path === '/api/game') {
    const body = await request.json();
    const { playerName } = body;
    if (!playerName) return Response.json({ error: 'Player name required' }, { status: 400 });

    const { code, state } = await createSession(env, playerName);
    return Response.json({ code, player: 'a', state: sanitizeState(state, 'a') });
  }

  const joinMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/join$/);
  if (request.method === 'POST' && joinMatch) {
    const code = joinMatch[1];
    const body = await request.json();
    const { playerName } = body;
    if (!playerName) return Response.json({ error: 'Player name required' }, { status: 400 });

    const result = await joinSession(env, code, playerName);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({ player: 'b', state: sanitizeState(result.state, 'b') });
  }

  const chooseMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/choose$/);
  if (request.method === 'POST' && chooseMatch) {
    const code = chooseMatch[1];
    const body = await request.json();
    const { player, character } = body;
    if (!player || !character) return Response.json({ error: 'Player and character required' }, { status: 400 });

    const result = await chooseCharacter(env, code, player, character);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({ state: sanitizeState(result.state, player) });
  }

  const questionMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/ask$/);
  if (request.method === 'POST' && questionMatch) {
    const code = questionMatch[1];
    const body = await request.json();
    const { player, question } = body;
    if (!player || !question) return Response.json({ error: 'Player and question required' }, { status: 400 });

    const result = await submitQuestion(env, code, player, question);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({
      answer: result.answer,
      remainingCount: result.remainingCount,
      state: sanitizeState(result.state, player),
    });
  }

  const guessMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/guess$/);
  if (request.method === 'POST' && guessMatch) {
    const code = guessMatch[1];
    const body = await request.json();
    const { player, character } = body;
    if (!player || !character) return Response.json({ error: 'Player and character required' }, { status: 400 });

    const result = await submitGuess(env, code, player, character);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({
      correct: result.correct,
      winner: result.winner,
      opponentCharacter: result.opponentCharacter,
      state: sanitizeState(result.state, player),
    });
  }

  const pollMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/poll$/);
  if (request.method === 'GET' && pollMatch) {
    const code = pollMatch[1];
    const player = url.searchParams.get('player');
    const state = await getSession(env, code);
    if (!state) return Response.json({ error: 'Room not found' }, { status: 404 });
    return Response.json({ state: sanitizeState(state, player) });
  }

  return null;
}

function sanitizeState(state, viewer = null) {
  if (!state) return null;

  const sanitized = {
    status: state.status,
    currentTurn: state.currentTurn,
    questionCount: state.questionCount,
    maxQuestions: state.maxQuestions,
    winner: state.winner,
    players: {},
    history: state.history,
  };

  for (const p of ['a', 'b']) {
    const player = state.players[p];
    const isViewer = viewer === p;
    const gameOver = state.status === 'finished';

    sanitized.players[p] = {
      name: player.name,
      // Only reveal your own character, or both at game over
      character: isViewer || gameOver ? player.character : null,
      characterChosen: !!player.character,
      board: player.board.map((c) => {
        const base = {
          name: c.name,
          eliminated: c.eliminated,
        };
        // Full attributes only for your own board (so you can flip characters)
        // or at game over
        if (isViewer || gameOver) {
          return {
            ...base,
            hairColor: c.hairColor,
            eyeColor: c.eyeColor,
            gender: c.gender,
            glasses: c.glasses,
            hat: c.hat,
            hairLength: c.hairLength,
            facialHair: c.facialHair,
            skinTone: c.skinTone,
          };
        }
        return base;
      }),
    };
  }

  return sanitized;
}
