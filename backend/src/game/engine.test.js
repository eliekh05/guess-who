import { describe, it, expect } from 'vitest';
import { createGameState, selectCharacter, askQuestion, makeGuess } from './engine.js';

const SAMPLE_BOARD = [
  { name: 'Alice', hairColor: 'black', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Bob', hairColor: 'blonde', eyeColor: 'green', gender: 'male', glasses: true, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
  { name: 'Charlie', hairColor: 'red', eyeColor: 'brown', gender: 'male', glasses: false, hat: true, hairLength: 'medium', facialHair: true, skinTone: 'dark' },
  { name: 'Diana', hairColor: 'brown', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'medium' },
  { name: 'Eve', hairColor: 'blonde', eyeColor: 'blue', gender: 'female', glasses: true, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
];

describe('Game Engine', () => {
  it('creates a game state', () => {
    const state = createGameState('Alice', 'Bob');
    expect(state.status).toBe('waiting');
    expect(state.players.a.name).toBe('Alice');
    expect(state.players.b.name).toBe('Bob');
    expect(state.currentTurn).toBe('a');
    expect(state.questionCount).toBe(0);
  });

  it('selects a character', () => {
    const state = createGameState('A', 'B');
    state.players.a.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));

    const result = selectCharacter(state, 'a', 'Alice');
    expect(result.success).toBe(true);
    expect(state.players.a.character).toBe('Alice');
  });

  it('prevents double character selection', () => {
    const state = createGameState('A', 'B');
    state.players.a.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    selectCharacter(state, 'a', 'Alice');

    const result = selectCharacter(state, 'a', 'Bob');
    expect(result.error).toBeDefined();
  });

  it('answers yes when attribute matches', () => {
    const state = createGameState('A', 'B');
    state.players.a.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    state.players.b.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    state.players.a.character = 'Alice';
    state.players.b.character = 'Charlie';
    state.status = 'playing';

    const result = askQuestion(state, 'a', 'Does your character have red hair?');
    expect(result.success).toBe(true);
    expect(result.answer).toBe(true);
    expect(state.questionCount).toBe(1);
    expect(state.currentTurn).toBe('b');
  });

  it('answers no when attribute does not match', () => {
    const state = createGameState('A', 'B');
    state.players.a.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    state.players.b.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    state.players.a.character = 'Alice';
    state.players.b.character = 'Charlie';
    state.status = 'playing';

    const result = askQuestion(state, 'a', 'Does your character have blue eyes?');
    expect(result.answer).toBe(false);
  });

  it('eliminates characters on wrong answer', () => {
    const state = createGameState('A', 'B');
    state.players.a.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    state.players.b.board = SAMPLE_BOARD.map((c) => ({ ...c, eliminated: false }));
    state.players.a.character = 'Alice';
    state.players.b.character = 'Charlie';
    state.status = 'playing';

    askQuestion(state, 'a', 'Is your character male?');

    const eliminated = state.players.a.board.filter((c) => c.eliminated);
    const remaining = state.players.a.board.filter((c) => !c.eliminated);

    expect(eliminated.length).toBeGreaterThan(0);
    expect(remaining.length).toBeLessThan(5);
    remaining.forEach((c) => {
      expect(c.gender).toBe('male');
    });
  });

  it('prevents asking on wrong turn', () => {
    const state = createGameState('A', 'B');
    state.status = 'playing';
    state.currentTurn = 'a';

    const result = askQuestion(state, 'b', 'Is your character male?');
    expect(result.error).toBeDefined();
  });

  it('detects correct guess', () => {
    const state = createGameState('A', 'B');
    state.players.a.character = 'Alice';
    state.players.b.character = 'Charlie';
    state.status = 'playing';
    state.currentTurn = 'a';

    const result = makeGuess(state, 'a', 'Charlie');
    expect(result.success).toBe(true);
    expect(result.correct).toBe(true);
    expect(result.winner).toBe('a');
    expect(state.status).toBe('finished');
  });

  it('detects incorrect guess', () => {
    const state = createGameState('A', 'B');
    state.players.a.character = 'Alice';
    state.players.b.character = 'Charlie';
    state.status = 'playing';
    state.currentTurn = 'a';

    const result = makeGuess(state, 'a', 'Alice');
    expect(result.correct).toBe(false);
    expect(result.winner).toBe('b');
  });
});
