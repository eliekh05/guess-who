import {
  createSession,
  joinSession,
  chooseCharacter,
  submitQuestion,
  submitGuess,
  getSession,
} from '../game/session.js';
import { getCharacters } from '../scrape/characters.js';

export async function handleGame(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'POST' && path === '/api/game') {
    const body = await request.json();
    const { playerName } = body;
    if (!playerName) return Response.json({ error: 'Player name required' }, { status: 400 });

    const { code, state } = await createSession(env.GAME_SESSIONS, playerName);
    return Response.json({ code, player: 'a', state: sanitizeState(state) });
  }

  const joinMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/join$/);
  if (request.method === 'POST' && joinMatch) {
    const code = joinMatch[1];
    const body = await request.json();
    const { playerName } = body;
    if (!playerName) return Response.json({ error: 'Player name required' }, { status: 400 });

    const result = await joinSession(env.GAME_SESSIONS, code, playerName);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({ player: 'b', state: sanitizeState(result.state) });
  }

  const chooseMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/choose$/);
  if (request.method === 'POST' && chooseMatch) {
    const code = chooseMatch[1];
    const body = await request.json();
    const { player, character } = body;
    if (!player || !character) return Response.json({ error: 'Player and character required' }, { status: 400 });

    const result = await chooseCharacter(env.GAME_SESSIONS, code, player, character);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({ state: sanitizeState(result.state) });
  }

  const questionMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/ask$/);
  if (request.method === 'POST' && questionMatch) {
    const code = questionMatch[1];
    const body = await request.json();
    const { player, question } = body;
    if (!player || !question) return Response.json({ error: 'Player and question required' }, { status: 400 });

    const result = await submitQuestion(env.GAME_SESSIONS, code, player, question);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({
      answer: result.answer,
      canGuess: result.canGuess,
      remainingCount: result.remainingCount,
      state: sanitizeState(result.state),
    });
  }

  const guessMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/guess$/);
  if (request.method === 'POST' && guessMatch) {
    const code = guessMatch[1];
    const body = await request.json();
    const { player, character } = body;
    if (!player || !character) return Response.json({ error: 'Player and character required' }, { status: 400 });

    const result = await submitGuess(env.GAME_SESSIONS, code, player, character);
    if (result.error) return Response.json(result, { status: 400 });
    return Response.json({
      correct: result.correct,
      winner: result.winner,
      opponentCharacter: result.opponentCharacter,
      state: sanitizeState(result.state),
    });
  }

  const pollMatch = path.match(/^\/api\/game\/([A-Z0-9]{6})\/poll$/);
  if (request.method === 'GET' && pollMatch) {
    const code = pollMatch[1];
    const player = url.searchParams.get('player');
    const state = await getSession(env.GAME_SESSIONS, code);
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
    sanitized.players[p] = {
      name: player.name,
      character: viewer === p ? player.character : (state.status === 'finished' ? player.character : null),
      characterChosen: !!player.character,
      board: player.board.map((c) => ({
        name: c.name,
        eliminated: c.eliminated,
        ...(viewer === p || state.status === 'finished' ? {
          hairColor: c.hairColor,
          eyeColor: c.eyeColor,
          gender: c.gender,
          glasses: c.glasses,
          hat: c.hat,
          hairLength: c.hairLength,
          facialHair: c.facialHair,
          skinTone: c.skinTone,
        } : {}),
      })),
    };
  }

  return sanitized;
}
