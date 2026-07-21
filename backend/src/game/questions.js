import { GAME_CONFIG } from '../config/game.js';

// The QUERYABLE attributes in real Guess Who? (2018 Hasbro edition).
// skinTone is intentionally excluded — it is NOT a valid question in the board game.
const QUERYABLE_ATTRS = ['gender', 'hairColor', 'eyeColor', 'glasses', 'hat', 'facialHair'];

/**
 * Build question categories dynamically from the loaded character list.
 * Only generates questions for attributes that actually vary across the board
 * (no point asking "does your character have purple hair?" if no one does).
 */
export function buildQuestionCategories(characters) {
  const values = {};
  for (const attr of QUERYABLE_ATTRS) {
    values[attr] = new Set(characters.map((c) => c[attr]));
  }

  const categories = {};

  // Hair Color
  if (values.hairColor.size > 1) {
    categories.hairColor = {
      label: 'Hair Color',
      questions: [...values.hairColor].sort().map((v) => ({
        text: `Does your character have ${v} hair?`,
        attribute: 'hairColor',
        value: v,
      })),
    };
  }

  // Eye Color
  if (values.eyeColor.size > 1) {
    categories.eyeColor = {
      label: 'Eye Color',
      questions: [...values.eyeColor].sort().map((v) => ({
        text: `Does your character have ${v} eyes?`,
        attribute: 'eyeColor',
        value: v,
      })),
    };
  }

  // Gender
  if (values.gender.size > 1) {
    categories.gender = {
      label: 'Gender',
      questions: [
        { text: 'Is your character a woman?', attribute: 'gender', value: 'female' },
        { text: 'Is your character a man?',   attribute: 'gender', value: 'male'   },
      ],
    };
  }

  // Accessories (glasses + hat grouped together)
  const accQuestions = [];
  if (values.glasses.has(true)) {
    accQuestions.push({ text: 'Does your character wear glasses?', attribute: 'glasses', value: true });
  }
  if (values.hat.has(true)) {
    accQuestions.push({ text: 'Does your character wear a hat?', attribute: 'hat', value: true });
  }
  if (accQuestions.length) {
    categories.accessories = { label: 'Accessories', questions: accQuestions };
  }

  // Facial Hair (males only in practice, but derived from data)
  if (values.facialHair.has(true)) {
    categories.facialHair = {
      label: 'Facial Hair',
      questions: [
        { text: 'Does your character have facial hair?', attribute: 'facialHair', value: true },
      ],
    };
  }

  return categories;
}

export function getAllQuestionsFromCategories(categories) {
  return Object.values(categories).flatMap((cat) => cat.questions);
}

// ── In-memory cache ──────────────────────────────────────────────────────────
// Cloudflare Workers reuse isolates between requests on the same edge node,
// so this cache is valid within a single isolate lifetime.
// If the Worker cold-starts, the cache is null and we rebuild lazily.
let _cachedCategories = null;
let _cachedCharacters = null; // kept so we can rebuild after cold-start

export function setQuestionCategories(categories, characters = null) {
  _cachedCategories = categories;
  if (characters) _cachedCharacters = characters;
}

export function getQuestionCategories() {
  return _cachedCategories;
}

/** Rebuild from characters if categories were lost after a cold start. */
export function ensureQuestionCategories(characters) {
  if (!_cachedCategories) {
    const chars = characters || _cachedCharacters;
    if (chars) _cachedCategories = buildQuestionCategories(chars);
  }
  return _cachedCategories;
}

// ── Question matching ────────────────────────────────────────────────────────

function normalize(text) {
  return text.toLowerCase().trim().replace(/[?'"]/g, '').replace(/\s+/g, ' ');
}

function extractKeywords(text) {
  const stop = new Set(GAME_CONFIG.questionMatch.stopWords);
  return normalize(text).split(' ').filter((w) => w.length > 2 && !stop.has(w));
}

/**
 * Match a free-text question string to a character attribute + value.
 * Returns { attribute, value } or null if no match.
 */
export function matchQuestionToAttribute(questionText) {
  const categories = _cachedCategories;
  if (!categories) return null;

  const allQuestions = getAllQuestionsFromCategories(categories);
  const input = normalize(questionText);

  // 1. Exact match (the dropdown always sends exact text)
  for (const q of allQuestions) {
    if (normalize(q.text) === input) {
      return { attribute: q.attribute, value: q.value };
    }
  }

  // 2. Keyword overlap fallback (handles minor rephrasing)
  const inputKw = extractKeywords(questionText);
  for (const q of allQuestions) {
    const qKw = extractKeywords(q.text);
    const overlap = inputKw.filter((w) => qKw.includes(w)).length;
    if (overlap >= GAME_CONFIG.questionMatch.minWordOverlap) {
      return { attribute: q.attribute, value: q.value };
    }
  }

  return null;
}
