import { describe, it, expect, beforeEach } from 'vitest';
import { createGameState, selectCharacter, askQuestion, makeGuess } from './engine.js';
import { buildQuestionCategories, setQuestionCategories } from './questions.js';

// 6-character board with fully unique attribute combos
const BOARD = [
  { name: 'Al',     gender:'male',   hairColor:'brown',  eyeColor:'blue',  glasses:false, hat:false, facialHair:true,  skinTone:'light'  },
  { name: 'Bob',    gender:'male',   hairColor:'blonde', eyeColor:'brown', glasses:true,  hat:false, facialHair:false, skinTone:'light'  },
  { name: 'Gabe',   gender:'male',   hairColor:'black',  eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'dark'   },
  { name: 'Amy',    gender:'female', hairColor:'brown',  eyeColor:'brown', glasses:true,  hat:false, facialHair:false, skinTone:'light'  },
  { name: 'Laura',  gender:'female', hairColor:'black',  eyeColor:'green', glasses:false, hat:false, facialHair:false, skinTone:'dark'   },
  { name: 'Olivia', gender:'female', hairColor:'red',    eyeColor:'brown', glasses:false, hat:false, facialHair:false, skinTone:'medium' },
];

function makeState() {
  const state = createGameState('PlayerA', 'PlayerB');
  state.status = 'choosing';
  const board = BOARD.map((c) => ({ ...c, eliminated: false }));
  state.players.a.board = board.map((c) => ({ ...c }));
  state.players.b.board = board.map((c) => ({ ...c }));
  return state;
}

function chosenState(aChar = 'Al', bChar = 'Laura') {
  const state = makeState();
  selectCharacter(state, 'a', aChar);
  selectCharacter(state, 'b', bChar);
  // Both chosen → status = 'playing'
  return state;
}

beforeEach(() => {
  setQuestionCategories(buildQuestionCategories(BOARD), BOARD);
});

// ── createGameState ──────────────────────────────────────────────────────────
describe('createGameState', () => {
  it('creates a waiting state', () => {
    const s = createGameState('A', 'B');
    expect(s.status).toBe('waiting');
    expect(s.players.a.name).toBe('A');
    expect(s.players.b.name).toBe('B');
    expect(s.currentTurn).toBe('a');
    expect(s.questionCount).toBe(0);
    expect(s.winner).toBeNull();
  });
});

// ── selectCharacter ──────────────────────────────────────────────────────────
describe('selectCharacter', () => {
  it('rejects selection when not in choosing phase', () => {
    const s = makeState();
    s.status = 'waiting';
    expect(selectCharacter(s, 'a', 'Al').error).toBeDefined();
  });

  it('allows selection during choosing phase', () => {
    const s = makeState();
    expect(selectCharacter(s, 'a', 'Al').success).toBe(true);
    expect(s.players.a.character).toBe('Al');
  });

  it('rejects unknown character', () => {
    const s = makeState();
    expect(selectCharacter(s, 'a', 'Nonexistent').error).toBeDefined();
  });

  it('rejects double selection', () => {
    const s = makeState();
    selectCharacter(s, 'a', 'Al');
    expect(selectCharacter(s, 'a', 'Bob').error).toBeDefined();
  });

  it('transitions to playing when both players choose', () => {
    const s = makeState();
    selectCharacter(s, 'a', 'Al');
    expect(s.status).toBe('choosing'); // still waiting for B
    selectCharacter(s, 'b', 'Laura');
    expect(s.status).toBe('playing');
  });

  it('stays in choosing when only one player has chosen', () => {
    const s = makeState();
    selectCharacter(s, 'a', 'Al');
    expect(s.status).toBe('choosing');
  });
});

// ── askQuestion ──────────────────────────────────────────────────────────────
describe('askQuestion', () => {
  it('returns error when not playing', () => {
    const s = makeState(); // status = choosing
    expect(askQuestion(s, 'a', 'Is your character a woman?').error).toBeDefined();
  });

  it('returns error when not your turn', () => {
    const s = chosenState();
    expect(askQuestion(s, 'b', 'Is your character a woman?').error).toMatch(/not your turn/i);
  });

  it('answers YES correctly', () => {
    // a asks about b's char (Laura → female)
    const s = chosenState('Al', 'Laura');
    const r = askQuestion(s, 'a', 'Is your character a woman?');
    expect(r.answer).toBe(true);
    expect(r.success).toBe(true);
  });

  it('answers NO correctly', () => {
    // a asks about b's char (Laura → no glasses)
    const s = chosenState('Al', 'Laura');
    const r = askQuestion(s, 'a', 'Does your character wear glasses?');
    expect(r.answer).toBe(false);
  });

  it('eliminates characters that do NOT have the attr when answer is YES', () => {
    // b's char is Laura (female). a asks "is your character a woman?" → YES
    // a's board should keep only females, eliminate all males
    const s = chosenState('Al', 'Laura');
    askQuestion(s, 'a', 'Is your character a woman?');
    const remaining = s.players.a.board.filter((c) => !c.eliminated);
    expect(remaining.every((c) => c.gender === 'female')).toBe(true);
    expect(s.players.a.board.filter((c) => c.gender === 'male').every((c) => c.eliminated)).toBe(true);
  });

  it('eliminates characters that DO have the attr when answer is NO', () => {
    // b's char is Laura (black hair). a asks "does your character have brown hair?" → NO
    // a's board should eliminate everyone WITH brown hair
    const s = chosenState('Al', 'Laura');
    askQuestion(s, 'a', 'Does your character have brown hair?');
    const brownHairChars = s.players.a.board.filter((c) => c.hairColor === 'brown');
    expect(brownHairChars.every((c) => c.eliminated)).toBe(true);
    const otherChars = s.players.a.board.filter((c) => c.hairColor !== 'brown');
    expect(otherChars.every((c) => !c.eliminated)).toBe(true);
  });

  it('never re-eliminates already-eliminated characters', () => {
    const s = chosenState('Al', 'Laura');
    // First question: is female? → YES — males eliminated
    askQuestion(s, 'a', 'Is your character a woman?');
    // Now it's b's turn — skip to a again
    s.currentTurn = 'a';
    // Second question: has black hair? → YES — Amy (brown) and Olivia (red) eliminated
    askQuestion(s, 'a', 'Does your character have black hair?');
    // Check: only Laura survives (female + black hair)
    const remaining = s.players.a.board.filter((c) => !c.eliminated);
    expect(remaining.map((c) => c.name)).toContain('Laura');
    expect(remaining.length).toBe(1);
  });

  it('advances turn after asking', () => {
    const s = chosenState();
    expect(s.currentTurn).toBe('a');
    askQuestion(s, 'a', 'Is your character a woman?');
    expect(s.currentTurn).toBe('b');
  });

  it('increments questionCount', () => {
    const s = chosenState();
    askQuestion(s, 'a', 'Is your character a woman?');
    expect(s.questionCount).toBe(1);
  });

  it('records the question in history', () => {
    const s = chosenState('Al', 'Laura');
    askQuestion(s, 'a', 'Is your character a woman?');
    expect(s.history).toHaveLength(1);
    expect(s.history[0].player).toBe('a');
    expect(s.history[0].attribute).toBe('gender');
    expect(s.history[0].answer).toBe(true);
  });

  it('rejects question when max questions reached', () => {
    const s = chosenState();
    s.questionCount = s.maxQuestions;
    expect(askQuestion(s, 'a', 'Is your character a woman?').error).toBeDefined();
  });

  it('returns remainingCount', () => {
    const s = chosenState('Al', 'Laura');
    const r = askQuestion(s, 'a', 'Is your character a woman?');
    // 3 females on the board
    expect(r.remainingCount).toBe(3);
  });
});

// ── makeGuess ────────────────────────────────────────────────────────────────
describe('makeGuess', () => {
  it('correct guess → guesser wins, game finished', () => {
    const s = chosenState('Al', 'Laura');
    const r = makeGuess(s, 'a', 'Laura');
    expect(r.correct).toBe(true);
    expect(r.winner).toBe('a');
    expect(s.status).toBe('finished');
  });

  it('wrong guess → guesser loses, opponent wins', () => {
    const s = chosenState('Al', 'Laura');
    const r = makeGuess(s, 'a', 'Amy');
    expect(r.correct).toBe(false);
    expect(r.winner).toBe('b');
    expect(s.status).toBe('finished');
  });

  it('rejects guess when not playing', () => {
    const s = makeState();
    expect(makeGuess(s, 'a', 'Laura').error).toBeDefined();
  });

  it('rejects guess when not your turn', () => {
    const s = chosenState();
    expect(makeGuess(s, 'b', 'Al').error).toMatch(/not your turn/i);
  });

  it('reveals opponentCharacter in response', () => {
    const s = chosenState('Al', 'Laura');
    const r = makeGuess(s, 'a', 'Laura');
    expect(r.opponentCharacter).toBe('Laura');
  });

  it('logs guess to history', () => {
    const s = chosenState('Al', 'Laura');
    makeGuess(s, 'a', 'Laura');
    const last = s.history[s.history.length - 1];
    expect(last.attribute).toBe('guess');
    expect(last.value).toBe('Laura');
    expect(last.answer).toBe(true);
  });
});

// ── Full game simulation ─────────────────────────────────────────────────────
describe('Full game simulation', () => {
  it('plays a complete game where A wins via correct guess', () => {
    // A defends Al (male, brown hair), B defends Laura (female, black hair, green eyes)
    const s = chosenState('Al', 'Laura');
    expect(s.status).toBe('playing');
    expect(s.currentTurn).toBe('a');

    // Turn 1 — A asks: is your character a woman? → YES (Laura is female)
    // A eliminates all 3 males from their board, 3 females remain
    let r = askQuestion(s, 'a', 'Is your character a woman?');
    expect(r.answer).toBe(true);
    expect(r.remainingCount).toBe(3); // Amy, Laura, Olivia
    expect(s.currentTurn).toBe('b');

    // Turn 2 — B asks: does your character have brown hair? → YES (Al has brown hair)
    // B eliminates non-brown-hair chars from their board
    r = askQuestion(s, 'b', 'Does your character have brown hair?');
    expect(r.answer).toBe(true); // Al has brown hair
    expect(s.currentTurn).toBe('a');

    // Turn 3 — A asks: does your character have black hair? → YES (Laura has black hair)
    // A eliminates Amy (brown) and Olivia (red) — only Laura remains
    r = askQuestion(s, 'a', 'Does your character have black hair?');
    expect(r.answer).toBe(true);
    expect(r.remainingCount).toBe(1); // only Laura
    expect(s.currentTurn).toBe('b');

    // Turn 4 — B guesses (it's B's turn now)
    // B has narrowed down: Al has brown hair, is male. Only Al and Amy have brown hair;
    // Amy is female. So B guesses Al.
    r = makeGuess(s, 'b', 'Al');
    expect(r.correct).toBe(true);
    expect(r.winner).toBe('b');
    expect(s.status).toBe('finished');
  });

  it('wrong guess by A causes A to lose immediately', () => {
    const s = chosenState('Al', 'Laura');
    // A immediately guesses wrong
    const r = makeGuess(s, 'a', 'Amy');
    expect(r.correct).toBe(false);
    expect(r.winner).toBe('b');
    expect(s.status).toBe('finished');
  });
});

// ── Character data integrity ──────────────────────────────────────────────────
describe('Character data integrity', () => {
  it('all 24 real characters are unique across all 6 queryable attributes', async () => {
    const { default: chars } = await import('../config/characters.js');
    const attrs = ['gender', 'hairColor', 'eyeColor', 'glasses', 'hat', 'facialHair'];
    const seen = new Map();
    for (const c of chars) {
      const key = attrs.map((a) => String(c[a])).join('|');
      if (seen.has(key)) {
        throw new Error(`DUPLICATE: ${c.name} is identical to ${seen.get(key)} across all queryable attributes`);
      }
      seen.set(key, c.name);
    }
    expect(seen.size).toBe(24);
  });

  it('has exactly 12 males and 12 females', async () => {
    const { default: chars } = await import('../config/characters.js');
    expect(chars.filter((c) => c.gender === 'male').length).toBe(12);
    expect(chars.filter((c) => c.gender === 'female').length).toBe(12);
  });

  it('has balanced binary attributes (glasses, hat, facialHair 3–9 each)', async () => {
    const { default: chars } = await import('../config/characters.js');
    const g = chars.filter((c) => c.glasses).length;
    const h = chars.filter((c) => c.hat).length;
    const f = chars.filter((c) => c.facialHair).length;
    expect(g).toBeGreaterThanOrEqual(3); expect(g).toBeLessThanOrEqual(9);
    expect(h).toBeGreaterThanOrEqual(3); expect(h).toBeLessThanOrEqual(9);
    expect(f).toBeGreaterThanOrEqual(3); expect(f).toBeLessThanOrEqual(9);
  });

  it('has at least 4 distinct hair colors', async () => {
    const { default: chars } = await import('../config/characters.js');
    const colors = new Set(chars.map((c) => c.hairColor));
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });

  it('has no undefined required fields', async () => {
    const { default: chars } = await import('../config/characters.js');
    const required = ['name','gender','hairColor','eyeColor','glasses','hat','facialHair','skinTone'];
    chars.forEach((c) => {
      required.forEach((k) => {
        expect(c[k], `${c.name} missing '${k}'`).not.toBeUndefined();
        expect(c[k], `${c.name}.${k} is null`).not.toBeNull();
      });
    });
  });
});
