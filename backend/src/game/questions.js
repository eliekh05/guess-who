import QUESTION_CATEGORIES from '../config/questions.js';
import { GAME_CONFIG } from '../config/game.js';

export { QUESTION_CATEGORIES };

export function getAllQuestions() {
  const questions = [];
  for (const category of Object.values(QUESTION_CATEGORIES)) {
    questions.push(...category.questions);
  }
  return questions;
}

export function matchQuestionToAttribute(questionText) {
  const normalized = questionText.toLowerCase().trim().replace(/\?$/, '');
  const allQuestions = getAllQuestions();

  for (const q of allQuestions) {
    const normalizedQ = q.text.toLowerCase().replace(/\?$/, '');
    if (normalized === normalizedQ) {
      return { attribute: q.attribute, value: q.value };
    }
  }

  for (const q of allQuestions) {
    const keywords = extractKeywords(q.text);
    const inputKeywords = extractKeywords(questionText);
    if (keywordsOverlap(keywords, inputKeywords)) {
      return { attribute: q.attribute, value: q.value };
    }
  }

  return null;
}

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[?'"]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !GAME_CONFIG.questionMatch.stopWords.includes(w));
}

function keywordsOverlap(a, b) {
  const setA = new Set(a);
  return b.filter((w) => setA.has(w)).length >= GAME_CONFIG.questionMatch.minWordOverlap;
}

export function answerQuestion(characters, attribute, value) {
  return characters.map((char) => ({
    ...char,
    eliminated: char.eliminated || char[attribute] !== value,
  }));
}

export function eliminateCharacters(characters, attribute, value) {
  return characters.map((char) => ({
    ...char,
    eliminated: char.eliminated || char[attribute] !== value,
  }));
}
