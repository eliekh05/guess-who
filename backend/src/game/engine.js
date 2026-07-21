import { matchQuestionToAttribute, ensureQuestionCategories } from './questions.js';
import { GAME_CONFIG } from '../config/game.js';

export function createGameState(playerAName, playerBName) {
  return {
    status: 'waiting',   // waiting → choosing → playing → finished
    players: {
      a: { name: playerAName, character: null, board: [] },
      b: { name: playerBName, character: null, board: [] },
    },
    currentTurn: 'a',    // 'a' always goes first
    questionCount: 0,
    maxQuestions: GAME_CONFIG.maxQuestions,
    history: [],
    winner: null,
    createdAt: Date.now(),
  };
}

export function selectCharacter(state, player, characterName) {
  if (state.status !== 'choosing') {
    return { error: 'Not in character-selection phase' };
  }
  if (state.players[player].character) {
    return { error: 'You already chose a character' };
  }

  const char = state.players[player].board.find((c) => c.name === characterName);
  if (!char) {
    return { error: `Character "${characterName}" not found on your board` };
  }

  state.players[player].character = characterName;

  // Both players chosen → start playing
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
    return { error: "It's not your turn" };
  }
  if (state.questionCount >= state.maxQuestions) {
    return { error: 'Maximum questions reached — you must guess now' };
  }

  // Ensure categories are available (guard against Worker cold-start)
  const categories = ensureQuestionCategories(
    state.players[player].board // pass board as character list for rebuild
  );
  if (!categories) {
    return { error: 'Question system not ready — please try again in a moment' };
  }

  const match = matchQuestionToAttribute(questionText);
  if (!match) {
    return {
      error:
        'Unknown question. Please use one of the questions from the dropdown.',
    };
  }

  const opponent = player === 'a' ? 'b' : 'a';
  const opponentSecret = state.players[opponent].board.find(
    (c) => c.name === state.players[opponent].character
  );

  if (!opponentSecret) {
    return { error: 'Opponent has not chosen a character yet' };
  }

  // Does the opponent's secret character have this attribute?
  const answer = opponentSecret[match.attribute] === match.value;

  // Eliminate from the ASKING player's board:
  //   YES answer → opponent's char HAS it → eliminate everyone who DOESN'T have it
  //   NO answer  → opponent's char DOESN'T have it → eliminate everyone who DOES have it
  state.players[player].board = state.players[player].board.map((c) => {
    if (c.eliminated) return c;
    const charHasIt = c[match.attribute] === match.value;
    const shouldEliminate = answer ? !charHasIt : charHasIt;
    return { ...c, eliminated: shouldEliminate };
  });

  state.questionCount++;
  // Turn always passes after asking (even when max reached)
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

  return {
    success: true,
    answer,
    remainingCount: remaining.length,
  };
}

export function makeGuess(state, player, characterName) {
  if (state.status !== 'playing') {
    return { error: 'Game is not in progress' };
  }
  if (state.currentTurn !== player) {
    return { error: "It's not your turn" };
  }

  const opponent = player === 'a' ? 'b' : 'a';
  const correct = state.players[opponent].character === characterName;

  state.status = 'finished';
  // Correct guess → you win. Wrong guess → opponent wins (real rule).
  state.winner = correct ? player : opponent;

  state.history.push({
    player,
    question: `[Guess] "${characterName}"`,
    answer: correct,
    attribute: 'guess',
    value: characterName,
    timestamp: Date.now(),
  });

  return {
    success: true,
    correct,
    winner: state.winner,
    opponentCharacter: state.players[opponent].character,
  };
}
