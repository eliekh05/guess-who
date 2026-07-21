/**
 * Character scraper for Guess Who?
 *
 * Scrapes the Wikipedia Guess Who? character table to get the current
 * 2018 Hasbro character set with all attributes. Falls back to the
 * bundled config/characters.js if the scrape fails or the KV cache
 * is stale/missing.
 *
 * KV cache key: "characters:v1"
 * TTL: 24 hours (characters almost never change; this just picks up
 *      any future edition updates automatically)
 */

import FALLBACK_CHARACTERS from '../config/characters.js';

const WIKI_URL = 'https://en.wikipedia.org/wiki/Guess_Who%3F';
const CACHE_KEY = 'characters:v1';
const CACHE_TTL = 60 * 60 * 24; // 24 hours

// Which edition to use — "2018" is the current retail version.
// The Wikipedia table has a "Introduced" and "Retired" column.
const CURRENT_EDITION_YEAR = 2018;

// Maps Wikipedia column values → our internal attribute format
const HAIR_MAP = {
  'light brown': 'brown',
  'dark brown': 'dark brown',
  'brown': 'brown',
  'blonde': 'blonde',
  'black': 'black',
  'white': 'white',
  'highlights': 'brown', // treated as brown for questioning
  'ginger': 'red',
  'red': 'red',
};

const EYE_MAP = {
  'blue': 'blue',
  'brown': 'brown',
  'green': 'green',
  'hazel': 'brown',
};

const SKIN_MAP = {
  // We infer skin tone from character names for the 2018 cast since
  // Wikipedia doesn't list it. Used for avatar rendering only.
  'Gabe': 'dark', 'Laura': 'dark', 'Mia': 'dark',
  'Daniel': 'medium', 'Farah': 'medium', 'Jordan': 'medium',
  'Lily': 'medium', 'Mike': 'medium', 'Olivia': 'medium', 'Sofia': 'medium',
};

function parseBool(val) {
  return typeof val === 'string' && val.trim().toLowerCase() === 'yes';
}

function normalizeHair(raw) {
  const lower = (raw || '').toLowerCase().trim();
  return HAIR_MAP[lower] || lower || 'brown';
}

function normalizeEye(raw) {
  const lower = (raw || '').toLowerCase().trim();
  return EYE_MAP[lower] || lower || 'brown';
}

function inferSkinTone(name) {
  return SKIN_MAP[name] || 'light';
}

/**
 * Parse the Guess Who? Wikipedia page HTML to extract the character table.
 * Returns an array of character objects for the current edition.
 */
function parseWikiCharacters(html) {
  // Find the character table — it's the one with "Also known as" in the header
  const tableMatch = html.match(
    /<table[^>]*>[\s\S]*?Also known as[\s\S]*?<\/table>/i
  );
  if (!tableMatch) return null;

  const tableHtml = tableMatch[0];

  // Strip HTML tags for cleaner text extraction
  const stripTags = (s) => s.replace(/<[^>]+>/g, '').trim();

  // Extract all rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(stripTags(cellMatch[1]).replace(/\n/g, ' ').trim());
    }
    if (cells.length >= 10) rows.push(cells);
  }

  if (rows.length < 2) return null;

  // First row is the header — find column indices
  const header = rows[0].map((h) => h.toLowerCase());
  const col = {
    name:       header.indexOf('name'),
    gender:     header.indexOf('gender'),
    eyes:       header.indexOf('eyes'),
    hair:       header.indexOf('hair'),
    beard:      header.indexOf('beard'),
    moustache:  header.indexOf('moustache'),
    glasses:    header.indexOf('glasses'),
    hat:        header.indexOf('hat'),
    introduced: header.indexOf('introduced'),
    retired:    header.indexOf('retired'),
  };

  const characters = [];

  for (const row of rows.slice(1)) {
    const get = (key) => (col[key] >= 0 ? row[col[key]] || '' : '');

    const name       = get('name').replace(/\[.*?\]/g, '').trim();
    const introduced = parseInt(get('introduced'), 10) || 0;
    const retired    = get('retired').replace(/\[.*?\]/g, '').trim();

    if (!name || !introduced) continue;

    // Only include characters present in the current edition
    // "—" or empty retired means still active
    const isRetired = retired && retired !== '—' && retired !== '-';
    if (isRetired) {
      const retiredYear = parseInt(retired, 10) || 9999;
      if (retiredYear <= CURRENT_EDITION_YEAR) continue;
    }
    if (introduced > CURRENT_EDITION_YEAR) continue;

    const gender = get('gender').toLowerCase() === 'female' ? 'female' : 'male';

    characters.push({
      name,
      gender,
      hairColor:  normalizeHair(get('hair')),
      eyeColor:   normalizeEye(get('eyes')),
      glasses:    parseBool(get('glasses')),
      hat:        parseBool(get('hat')),
      // "facialHair" = has beard OR moustache (classic question is "does your character have facial hair?")
      facialHair: parseBool(get('beard')) || parseBool(get('moustache')),
      skinTone:   inferSkinTone(name),
    });
  }

  return characters.length >= 20 ? characters : null;
}

/**
 * Validate that a character list is usable for gameplay.
 * Must have ≥20 characters with balanced gender and varied attributes.
 */
function validateCharacters(chars) {
  if (!Array.isArray(chars) || chars.length < 20) return false;

  const required = ['name', 'gender', 'hairColor', 'eyeColor', 'glasses', 'hat', 'facialHair'];
  for (const c of chars) {
    if (required.some((k) => c[k] === undefined || c[k] === null)) return false;
  }

  const males   = chars.filter((c) => c.gender === 'male').length;
  const females = chars.filter((c) => c.gender === 'female').length;
  if (males < 8 || females < 8) return false;

  const hairColors = new Set(chars.map((c) => c.hairColor));
  if (hairColors.size < 3) return false;

  return true;
}

/**
 * Main entry point — used by session.js and api/characters.js.
 * Returns characters from (in order of preference):
 *   1. KV cache (fast, already validated)
 *   2. Live Wikipedia scrape (fresh, parsed + validated)
 *   3. Bundled fallback (always works)
 */
export async function getCharacters(kv) {
  // 1. Try KV cache
  if (kv) {
    try {
      const cached = await kv.get(CACHE_KEY, 'json');
      if (cached && validateCharacters(cached)) {
        return cached;
      }
    } catch (e) {
      console.warn('KV cache read failed:', e.message);
    }
  }

  // 2. Try live Wikipedia scrape
  let scraped = null;
  try {
    const res = await fetch(WIKI_URL, {
      headers: {
        'User-Agent': 'GuessWhoGame/1.0 (educational board game app; contact via github)',
        'Accept': 'text/html',
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });

    if (res.ok) {
      const html = await res.text();
      const parsed = parseWikiCharacters(html);
      if (parsed && validateCharacters(parsed)) {
        scraped = parsed;
        console.log(`Scraped ${scraped.length} characters from Wikipedia`);
      } else {
        console.warn('Wikipedia parse returned invalid/insufficient characters');
      }
    } else {
      console.warn(`Wikipedia fetch returned ${res.status}`);
    }
  } catch (e) {
    console.warn('Wikipedia scrape failed:', e.message);
  }

  const characters = scraped || FALLBACK_CHARACTERS;

  // 3. Cache whatever we got (even fallback) so next request is fast
  if (kv) {
    try {
      await kv.put(CACHE_KEY, JSON.stringify(characters), {
        expirationTtl: scraped ? CACHE_TTL : 60 * 60, // fallback cached shorter
      });
    } catch (e) {
      console.warn('KV cache write failed:', e.message);
    }
  }

  return characters;
}

/**
 * Force-refresh the character cache (call from a scheduled Cron trigger
 * or admin endpoint to keep data fresh without cold-scrape latency).
 */
export async function refreshCharacterCache(kv) {
  if (kv) {
    try {
      await kv.delete(CACHE_KEY);
    } catch (_) {}
  }
  return getCharacters(kv);
}
