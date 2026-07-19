import { matchQuestionToAttribute } from './questions.js';
import { GAME_CONFIG } from '../config/game.js';

export function createGameState(playerAName, playerBName) {
  return {
    status: 'waiting',
    players: {
      a: {
        name: playerAName,
        character: null,
        board: [],
        eliminated: [],
      },
      b: {
        name: playerBName,
        character: null,
        board: [],
        eliminated: [],
      },
    },
    currentTurn: 'a',
    questionCount: 0,
    maxQuestions: GAME_CONFIG.maxQuestions,
    history: [],
    winner: null,
    createdAt: Date.now(),
  };
}

export function selectCharacter(state, player, characterName) {
  if (state.players[player].character) {
    return { error: 'Character already selected' };
  }

  state.players[player].character = characterName;
  state.players[player].board = state.players[player].board.map((c) => ({
    ...c,
    eliminated: c.name === characterName ? false : false,
  }));

  if (state.players.a.character && state.players.b.character) {
    state.status = 'playing';
  }

  return { success: true };
}

export function askQuestion(state, player, questionText) {
  if (state.status !== 'playing') {
    return { error: 'Game is not in progress' };
  }

  if (state.currentTurn !== player) {
    return { error: 'Not your turn' };
  }

  if (state.questionCount >= state.maxQuestions) {
    return { error: 'Maximum questions reached' };
  }

  const match = matchQuestionToAttribute(questionText);
  if (!match) {
    return { error: 'Could not understand that question. Please ask about a physical attribute (hair color, eye color, gender, glasses, hat, facial hair, skin tone).' };
  }

  const opponent = player === 'a' ? 'b' : 'a';
  const opponentCharacter = state.players[opponent].board.find(
    (c) => c.name === state.players[opponent].character
  );

  const answer = opponentCharacter ? opponentCharacter[match.attribute] === match.value : false;

  state.players[player].board = state.players[player].board.map((c) => {
    if (c.eliminated) return c;
    return {
      ...c,
      eliminated: c[match.attribute] !== match.value,
    };
  });

  state.questionCount++;
  state.currentTurn = opponent;

  state.history.push({
    player,
    question: questionText,
    answer,
    attribute: match.attribute,
    value: match.value,
    timestamp: Date.now(),
  });

  const remaining = state.players[player].board.filter((c) => !c.eliminated);
  if (remaining.length <= 1) {
    return {
      success: true,
      answer,
      canGuess: remaining.length === 1,
      remainingCount: remaining.length,
    };
  }

  return { success: true, answer, canGuess: false, remainingCount: remaining.length };
}

export function makeGuess(state, player, characterName) {
  if (state.status !== 'playing') {
    return { error: 'Game is not in progress' };
  }

  if (state.currentTurn !== player) {
    return { error: 'Not your turn' };
  }

  const opponent = player === 'a' ? 'b' : 'a';
  const correct = state.players[opponent].character === characterName;

  state.status = 'finished';
  state.winner = correct ? player : opponent;

  return {
    success: true,
    correct,
    winner: state.winner,
    opponentCharacter: state.players[opponent].character,
  };
}
