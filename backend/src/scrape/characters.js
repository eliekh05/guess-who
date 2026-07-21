import FALLBACK_CHARACTERS from '../config/characters.js';
import { GAME_CONFIG } from '../config/game.js';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_PAGE = 'Guess_Who?';
const WIKI_SECTION = 8; // Characters section

export async function getCharacters(kv) {
  if (kv) {
    const cached = await kv.get(GAME_CONFIG.cache.key, 'json');
    if (cached) return cached;
  }

  let characters;
  try {
    characters = await scrapeCharacters();
  } catch (err) {
    console.warn('Wikipedia scrape failed, using fallback:', err.message);
    characters = FALLBACK_CHARACTERS;
  }

  if (kv) {
    await kv.put(GAME_CONFIG.cache.key, JSON.stringify(characters), {
      expirationTtl: GAME_CONFIG.cache.ttl,
    });
  }

  return characters;
}

async function scrapeCharacters() {
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(WIKI_PAGE)}&format=json&prop=wikitext&section=${WIKI_SECTION}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'GuessWhoScraper/1.0 (Educational Project)' },
  });

  if (!res.ok) throw new Error(`Wikipedia API returned ${res.status}`);

  const data = await res.json();
  if (!data.parse?.wikitext?.['*']) throw new Error('No wikitext in response');

  const allChars = parseWikiTable(data.parse.wikitext['*']);

  if (allChars.length < GAME_CONFIG.scrape.minCharacters) {
    throw new Error(`Only found ${allChars.length} characters, need ${GAME_CONFIG.scrape.minCharacters}`);
  }

  // Select 24 characters with best attribute diversity
  return selectBalancedSubset(allChars, 24);
}

function parseWikiTable(wikitext) {
  const characters = [];

  for (const row of wikitext.split('|-').slice(1)) {
    const cells = row.split('||').map((c) => c.trim());

    if (cells.length < 11) continue;

    const name = cells[0].replace(/^\|\s*/, '').trim().split(',')[0].trim();
    if (!name || name.startsWith('{') || name === 'Name') continue;

    const gender = cells[2].trim().toLowerCase();
    const eyes = extractAfterPipe(cells[3]).toLowerCase();
    const hair = extractAfterPipe(cells[4]).toLowerCase();
    const beard = cells[5].includes('yes');
    const mustache = cells[6].includes('yes');
    const glasses = cells[8].includes('yes');
    const hat = cells[9].includes('yes');

    characters.push({
      name,
      hairColor: mapHairColor(hair),
      eyeColor: mapEyeColor(eyes),
      gender,
      glasses,
      hat,
      hairLength: inferHairLength(name),
      facialHair: beard ? 'beard' : mustache ? 'mustache' : 'none',
      skinTone: 'light', // Not available from Wikipedia
    });
  }

  return characters;
}

function extractAfterPipe(cell) {
  const match = cell.match(/\|([A-Za-z ]+?)$/);
  return match ? match[1].trim() : cell.replace(/[{}]|style="[^"]*"/g, '').trim();
}

function mapHairColor(raw) {
  const map = {
    black: 'black', brown: 'brown', 'light brown': 'brown',
    'dark brown': 'brown', blonde: 'blonde', red: 'red',
    white: 'gray', highlights: 'brown', gray: 'gray', grey: 'gray',
  };
  return map[raw] || 'brown';
}

function mapEyeColor(raw) {
  const map = { blue: 'blue', brown: 'brown', green: 'green', hazel: 'hazel' };
  return map[raw] || 'brown';
}

// Wikipedia doesn't have hair length — infer from the character's classic look
function inferHairLength(name) {
  const short = ['Al', 'Alex', 'Ben', 'Bernard', 'Bill', 'Charles', 'Daniel', 'David',
    'Eric', 'Frans', 'Gabe', 'George', 'Herman', 'Joe', 'Jordan', 'Leo', 'Max',
    'Mike', 'Nick', 'Paul', 'Peter', 'Philip', 'Richard', 'Robert', 'Sam', 'Tom', 'Victor'];
  const long = ['Amy', 'Anita', 'Betty', 'Carmen', 'Claire', 'Emma', 'Farah',
    'Holly', 'Katie', 'Laura', 'Lily', 'Liz', 'Maria', 'Mia', 'Olivia',
    'Rachel', 'Sally', 'Sofia', 'Susan'];
  if (short.includes(name)) return 'short';
  if (long.includes(name)) return 'long';
  return 'medium';
}

// Select N characters ensuring attribute diversity
function selectBalancedSubset(all, count) {
  const selected = [];
  const seenHair = new Set();
  const seenEyes = new Set();
  const seenGender = new Set();

  // First pass: ensure we have all attribute values represented
  for (const char of all) {
    if (selected.length >= count) break;
    const novelty = [
      !seenHair.has(char.hairColor),
      !seenEyes.has(char.eyeColor),
      !seenGender.has(char.gender),
    ].filter(Boolean).length;

    if (novelty > 0) {
      selected.push(char);
      seenHair.add(char.hairColor);
      seenEyes.add(char.eyeColor);
      seenGender.add(char.gender);
    }
  }

  // Second pass: fill remaining slots
  for (const char of all) {
    if (selected.length >= count) break;
    if (!selected.includes(char)) {
      selected.push(char);
    }
  }

  return selected.slice(0, count);
}

// CLI: node src/scrape/characters.js
if (process.argv[1]?.endsWith('characters.js')) {
  scrapeCharacters().then((chars) => {
    console.log(JSON.stringify(chars, null, 2));
  }).catch((err) => {
    console.error('Scrape failed:', err.message);
    console.log('Using fallback characters');
    console.log(JSON.stringify(FALLBACK_CHARACTERS, null, 2));
  });
}
