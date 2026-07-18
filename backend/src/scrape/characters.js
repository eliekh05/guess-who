import * as cheerio from 'cheerio';

const SOURCES = [
  {
    url: 'https://guesswho.fandom.com/wiki/Characters',
    selector: '.article-content table',
    parse: parseFandomTable,
  },
  {
    url: 'https://guesswho.fandom.com/wiki/Classic_Characters',
    selector: '.article-content table',
    parse: parseFandomTable,
  },
];

const FALLBACK_CHARACTERS = [
  { name: 'Albert', hairColor: 'brown', eyeColor: 'black', gender: 'male', glasses: false, hat: false, hairLength: 'short', facialHair: false, skinTone: 'dark' },
  { name: 'Bobby', hairColor: 'blonde', eyeColor: 'green', gender: 'male', glasses: true, hat: false, hairLength: 'medium', facialHair: false, skinTone: 'light' },
  { name: 'Brooke', hairColor: 'red', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Clyde', hairColor: 'black', eyeColor: 'brown', gender: 'male', glasses: false, hat: false, hairLength: 'short', facialHair: true, skinTone: 'dark' },
  { name: 'Elliott', hairColor: 'bald', eyeColor: 'green', gender: 'male', glasses: true, hat: false, hairLength: 'bald', facialHair: false, skinTone: 'light' },
  { name: 'Garrett', hairColor: 'red', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Henry', hairColor: 'blonde', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
  { name: 'Jesse', hairColor: 'black', eyeColor: 'brown', gender: 'male', glasses: false, hat: false, hairLength: 'short', facialHair: false, skinTone: 'dark' },
  { name: 'Ada', hairColor: 'red', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Alice', hairColor: 'black', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Brigitte', hairColor: 'blonde', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Cheryl', hairColor: 'red', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
  { name: 'Daphne', hairColor: 'blonde', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Ellen', hairColor: 'black', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Fran', hairColor: 'bald', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'bald', facialHair: false, skinTone: 'light' },
  { name: 'Greta', hairColor: 'blonde', eyeColor: 'blue', gender: 'female', glasses: true, hat: false, hairLength: 'medium', facialHair: false, skinTone: 'light' },
  { name: 'Ian', hairColor: 'bald', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'bald', facialHair: false, skinTone: 'light' },
  { name: 'Jack', hairColor: 'black', eyeColor: 'blue', gender: 'male', glasses: true, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
  { name: 'Larry', hairColor: 'blonde', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Mort', hairColor: 'bald', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'bald', facialHair: false, skinTone: 'light' },
  { name: 'Peter', hairColor: 'red', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
  { name: 'Sam', hairColor: 'black', eyeColor: 'blue', gender: 'male', glasses: false, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
  { name: 'Victor', hairColor: 'black', eyeColor: 'blue', gender: 'male', glasses: true, hat: false, hairLength: 'short', facialHair: false, skinTone: 'light' },
  { name: 'Wendy', hairColor: 'blonde', eyeColor: 'blue', gender: 'female', glasses: false, hat: false, hairLength: 'long', facialHair: false, skinTone: 'light' },
];

function parseFandomTable(html) {
  const $ = cheerio.load(html);
  const characters = [];

  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const name = $(cells[0]).text().trim();
    if (!name || name.toLowerCase() === 'name') return;

    const attrs = {};
    cells.each((i, cell) => {
      const text = $(cell).text().trim().toLowerCase();
      if (i === 0) return;
      attrs[`col${i}`] = text;
    });

    characters.push({
      name,
      ...inferAttributes(attrs),
    });
  });

  return characters.length > 0 ? characters : null;
}

function inferAttributes(raw) {
  const allText = Object.values(raw).join(' ').toLowerCase();
  return {
    hairColor: extractHairColor(allText),
    eyeColor: extractEyeColor(allText),
    gender: extractGender(allText),
    glasses: allText.includes('glass'),
    hat: allText.includes('hat'),
    hairLength: extractHairLength(allText),
    facialHair: allText.includes('mustache') || allText.includes('beard') || allText.includes('facial'),
    skinTone: extractSkinTone(allText),
  };
}

function extractHairColor(text) {
  if (text.includes('red') || text.includes('ginger')) return 'red';
  if (text.includes('blonde') || text.includes('blond')) return 'blonde';
  if (text.includes('black')) return 'black';
  if (text.includes('brown')) return 'brown';
  if (text.includes('gray') || text.includes('grey') || text.includes('white')) return 'gray';
  if (text.includes('bald') || text.includes('no hair')) return 'bald';
  return 'brown';
}

function extractEyeColor(text) {
  if (text.includes('blue')) return 'blue';
  if (text.includes('green')) return 'green';
  if (text.includes('brown')) return 'brown';
  if (text.includes('hazel')) return 'hazel';
  if (text.includes('black')) return 'black';
  return 'blue';
}

function extractGender(text) {
  if (text.includes('female') || text.includes('woman') || text.includes('girl')) return 'female';
  return 'male';
}

function extractHairLength(text) {
  if (text.includes('bald') || text.includes('no hair')) return 'bald';
  if (text.includes('long')) return 'long';
  if (text.includes('short')) return 'short';
  if (text.includes('medium')) return 'medium';
  return 'medium';
}

function extractSkinTone(text) {
  if (text.includes('dark') || text.includes('black')) return 'dark';
  if (text.includes('medium') || text.includes('tan') || text.includes('olive')) return 'medium';
  return 'light';
}

export async function scrapeCharacters() {
  for (const source of SOURCES) {
    try {
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'GuessWhoScraper/1.0 (Educational Project)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      const tableHtml = $(source.selector).html();
      if (!tableHtml) continue;

      const characters = source.parse(`<table>${tableHtml}</table>`);
      if (characters && characters.length >= 20) {
        return characters;
      }
    } catch (err) {
      console.warn(`Failed to scrape from ${source.url}:`, err.message);
      continue;
    }
  }

  console.warn('All scrape sources failed, using fallback character data');
  return FALLBACK_CHARACTERS;
}

export async function getCharacters(kv) {
  const cacheKey = 'characters:v1';
  const cached = await kv.get(cacheKey, 'json');
  if (cached) return cached;

  const characters = await scrapeCharacters();
  await kv.put(cacheKey, JSON.stringify(characters), { expirationTtl: 86400 });
  return characters;
}

if (process.argv[1]?.endsWith('characters.js')) {
  scrapeCharacters().then((chars) => {
    console.log(JSON.stringify(chars, null, 2));
  });
}
