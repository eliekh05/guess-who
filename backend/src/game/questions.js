export const QUESTION_CATEGORIES = {
  hairColor: {
    label: 'Hair Color',
    questions: [
      { text: 'Does your character have red hair?', attribute: 'hairColor', value: 'red' },
      { text: 'Does your character have blonde hair?', attribute: 'hairColor', value: 'blonde' },
      { text: 'Does your character have black hair?', attribute: 'hairColor', value: 'black' },
      { text: 'Does your character have brown hair?', attribute: 'hairColor', value: 'brown' },
      { text: 'Does your character have gray hair?', attribute: 'hairColor', value: 'gray' },
      { text: 'Is your character bald?', attribute: 'hairColor', value: 'bald' },
    ],
  },
  eyeColor: {
    label: 'Eye Color',
    questions: [
      { text: 'Does your character have blue eyes?', attribute: 'eyeColor', value: 'blue' },
      { text: 'Does your character have green eyes?', attribute: 'eyeColor', value: 'green' },
      { text: 'Does your character have brown eyes?', attribute: 'eyeColor', value: 'brown' },
      { text: 'Does your character have hazel eyes?', attribute: 'eyeColor', value: 'hazel' },
    ],
  },
  gender: {
    label: 'Gender',
    questions: [
      { text: 'Is your character male?', attribute: 'gender', value: 'male' },
      { text: 'Is your character female?', attribute: 'gender', value: 'female' },
    ],
  },
  accessories: {
    label: 'Accessories',
    questions: [
      { text: 'Does your character wear glasses?', attribute: 'glasses', value: true },
      { text: 'Does your character wear a hat?', attribute: 'hat', value: true },
    ],
  },
  hairLength: {
    label: 'Hair Style',
    questions: [
      { text: 'Does your character have long hair?', attribute: 'hairLength', value: 'long' },
      { text: 'Does your character have short hair?', attribute: 'hairLength', value: 'short' },
      { text: 'Does your character have medium-length hair?', attribute: 'hairLength', value: 'medium' },
    ],
  },
  facialHair: {
    label: 'Facial Hair',
    questions: [
      { text: 'Does your character have facial hair?', attribute: 'facialHair', value: true },
    ],
  },
  skinTone: {
    label: 'Skin Tone',
    questions: [
      { text: 'Does your character have light skin?', attribute: 'skinTone', value: 'light' },
      { text: 'Does your character have medium skin?', attribute: 'skinTone', value: 'medium' },
      { text: 'Does your character have dark skin?', attribute: 'skinTone', value: 'dark' },
    ],
  },
};

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
    .filter((w) => w.length > 2 && !['does', 'your', 'character', 'have', 'the', 'and'].includes(w));
}

function keywordsOverlap(a, b) {
  const setA = new Set(a);
  return b.filter((w) => setA.has(w)).length >= 2;
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
