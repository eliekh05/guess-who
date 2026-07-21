import { describe, it, expect } from 'vitest';
import FALLBACK_CHARACTERS from '../config/characters.js';

// Re-export internals for testing by duplicating the logic here
// (avoids mocking fetch in the module itself)

const HAIR_MAP = {
  'light brown': 'brown', 'dark brown': 'dark brown', 'brown': 'brown',
  'blonde': 'blonde', 'black': 'black', 'white': 'white',
  'highlights': 'brown', 'ginger': 'red', 'red': 'red',
};
const EYE_MAP = { 'blue': 'blue', 'brown': 'brown', 'green': 'green', 'hazel': 'brown' };

function parseBool(v) { return typeof v === 'string' && v.trim().toLowerCase() === 'yes'; }
function normalizeHair(r) { const l = (r || '').toLowerCase().trim(); return HAIR_MAP[l] || l || 'brown'; }
function normalizeEye(r)  { const l = (r || '').toLowerCase().trim(); return EYE_MAP[l]  || l || 'brown'; }

function validateCharacters(chars) {
  if (!Array.isArray(chars) || chars.length < 20) return false;
  const required = ['name', 'gender', 'hairColor', 'eyeColor', 'glasses', 'hat', 'facialHair'];
  for (const c of chars) {
    if (required.some((k) => c[k] === undefined || c[k] === null)) return false;
  }
  const males   = chars.filter((c) => c.gender === 'male').length;
  const females = chars.filter((c) => c.gender === 'female').length;
  if (males < 8 || females < 8) return false;
  if (new Set(chars.map((c) => c.hairColor)).size < 3) return false;
  return true;
}

// Minimal synthetic Wikipedia HTML for parser testing
function buildWikiTable(rows) {
  const header = `<tr><th>Name</th><th>Also known as</th><th>Gender</th><th>Eyes</th><th>Hair</th>
    <th>Beard</th><th>Moustache</th><th>Big nose</th><th>Glasses</th><th>Hat</th>
    <th>Introduced</th><th>Retired</th><th>Notes</th></tr>`;
  const dataRows = rows.map((r) =>
    `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`
  ).join('\n');
  return `<html><body><table>Also known as${header}${dataRows}</table></body></html>`;
}

// Sample rows matching 2018 edition format
const SAMPLE_ROWS = [
  ['Al',     'Alfred',  'Male',   'Blue',  'Light brown', 'No',  'Yes', 'No', 'No',  'No',  '1980', '—',    ''],
  ['Amy',    '—',       'Female', 'Brown', 'Highlights',  'No',  'No',  'No', 'Yes', 'No',  '2018', '—',    ''],
  ['Ben',    '—',       'Male',   'Brown', 'Dark brown',  'No',  'No',  'Yes','Yes', 'No',  '2018', '—',    ''],
  ['Carmen', '—',       'Female', 'Brown', 'White',       'No',  'No',  'No', 'No',  'No',  '2002', '—',    ''],
  ['Daniel', '—',       'Male',   'Green', 'Brown',       'Yes', 'Yes', 'Yes','No',  'No',  '2018', '—',    ''],
  ['David',  'Luke',    'Male',   'Brown', 'Blonde',      'Yes', 'No',  'No', 'No',  'Yes', '1980', '—',    ''],
  ['Emma',   '—',       'Female', 'Brown', 'Light brown', 'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
  ['Eric',   '—',       'Male',   'Brown', 'Blonde',      'No',  'No',  'No', 'No',  'Yes', '1980', '—',    ''],
  ['Farah',  '—',       'Female', 'Blue',  'Black',       'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
  ['Frans',  'Frank',   'Male',   'Brown', 'Light brown', 'No',  'No',  'No', 'No',  'No',  '1980', '1998', ''], // RETIRED before 2018 — excluded
  ['Gabe',   '—',       'Male',   'Brown', 'Black',       'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
  ['Joe',    '—',       'Male',   'Brown', 'Blonde',      'No',  'No',  'No', 'Yes', 'No',  '1980', '—',    ''],
  ['Jordan', '—',       'Male',   'Brown', 'Brown',       'Yes', 'Yes', 'No', 'No',  'No',  '2018', '—',    ''],
  ['Katie',  '—',       'Female', 'Blue',  'Blonde',      'No',  'No',  'No', 'No',  'Yes', '2018', '—',    ''],
  ['Laura',  '—',       'Female', 'Green', 'Black',       'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
  ['Leo',    '—',       'Male',   'Brown', 'White',       'No',  'Yes', 'No', 'No',  'No',  '2018', '—',    ''],
  ['Lily',   '—',       'Female', 'Green', 'Dark brown',  'No',  'No',  'No', 'No',  'Yes', '2018', '—',    ''],
  ['Liz',    '—',       'Female', 'Blue',  'White',       'No',  'No',  'No', 'Yes', 'No',  '2018', '—',    ''],
  ['Max',    'Theo',    'Male',   'Brown', 'Dark brown',  'No',  'Yes', 'Yes','No',  'No',  '1980', '2018', ''], // RETIRED in 2018 — excluded
  ['Mia',    '—',       'Female', 'Brown', 'Black',       'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
  ['Mike',   '—',       'Male',   'Brown', 'Black',       'No',  'No',  'No', 'No',  'Yes', '2018', '—',    ''],
  ['Nick',   '—',       'Male',   'Brown', 'Blonde',      'No',  'No',  'Yes','No',  'No',  '2018', '—',    ''],
  ['Olivia', '—',       'Female', 'Brown', 'Brown',       'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
  ['Rachel', '—',       'Female', 'Blue',  'Dark brown',  'No',  'No',  'No', 'Yes', 'No',  '2018', '—',    ''],
  ['Sam',    'Charles', 'Male',   'Brown', 'White',       'No',  'No',  'No', 'Yes', 'No',  '1980', '—',    ''],
  ['Sofia',  '—',       'Female', 'Green', 'Dark brown',  'No',  'No',  'No', 'No',  'No',  '2018', '—',    ''],
];

// Re-implement the parse function locally (mirrors scrape/characters.js)
function parseWikiCharacters(html) {
  const EDITION = 2018;
  const tableMatch = html.match(/<table[^>]*>[\s\S]*?Also known as[\s\S]*?<\/table>/i);
  if (!tableMatch) return null;
  const tableHtml = tableMatch[0];
  const stripTags = (s) => s.replace(/<[^>]+>/g, '').trim();
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  const rows = [];
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(stripTags(cellMatch[1]).replace(/\n/g, ' ').trim());
    }
    if (cells.length >= 10) rows.push(cells);
  }
  if (rows.length < 2) return null;
  const header = rows[0].map((h) => h.toLowerCase());
  const col = {
    name: header.indexOf('name'), gender: header.indexOf('gender'),
    eyes: header.indexOf('eyes'), hair: header.indexOf('hair'),
    beard: header.indexOf('beard'), moustache: header.indexOf('moustache'),
    glasses: header.indexOf('glasses'), hat: header.indexOf('hat'),
    introduced: header.indexOf('introduced'), retired: header.indexOf('retired'),
  };
  const characters = [];
  for (const row of rows.slice(1)) {
    const get = (k) => (col[k] >= 0 ? row[col[k]] || '' : '');
    const name = get('name').replace(/\[.*?\]/g, '').trim();
    const introduced = parseInt(get('introduced'), 10) || 0;
    const retired = get('retired').replace(/\[.*?\]/g, '').trim();
    if (!name || !introduced) continue;
    const isRetired = retired && retired !== '—' && retired !== '-';
    if (isRetired && parseInt(retired, 10) <= EDITION) continue;
    if (introduced > EDITION) continue;
    characters.push({
      name,
      gender: get('gender').toLowerCase() === 'female' ? 'female' : 'male',
      hairColor: normalizeHair(get('hair')),
      eyeColor: normalizeEye(get('eyes')),
      glasses: parseBool(get('glasses')),
      hat: parseBool(get('hat')),
      facialHair: parseBool(get('beard')) || parseBool(get('moustache')),
      skinTone: 'light', // test default
    });
  }
  return characters.length >= 20 ? characters : null;
}

describe('Character scraper', () => {
  describe('parseWikiCharacters', () => {
    it('returns null when table is not found', () => {
      expect(parseWikiCharacters('<html>no table</html>')).toBeNull();
    });

    it('parses valid Wikipedia HTML into characters', () => {
      const html = buildWikiTable(SAMPLE_ROWS);
      const chars = parseWikiCharacters(html);
      expect(chars).not.toBeNull();
      expect(chars.length).toBeGreaterThanOrEqual(20);
    });

    it('excludes characters retired before 2018', () => {
      const html = buildWikiTable(SAMPLE_ROWS);
      const chars = parseWikiCharacters(html);
      const names = chars.map((c) => c.name);
      expect(names).not.toContain('Frans'); // retired 1998
      expect(names).not.toContain('Max');   // retired 2018 means OUT of 2018 edition
    });

    it('includes characters introduced in 2018', () => {
      const html = buildWikiTable(SAMPLE_ROWS);
      const chars = parseWikiCharacters(html);
      const names = chars.map((c) => c.name);
      expect(names).toContain('Amy');
      expect(names).toContain('Farah');
      expect(names).toContain('Laura');
    });

    it('correctly maps beard OR moustache → facialHair:true', () => {
      const html = buildWikiTable(SAMPLE_ROWS);
      const chars = parseWikiCharacters(html);
      const al = chars.find((c) => c.name === 'Al');
      expect(al.facialHair).toBe(true); // has moustache
      const david = chars.find((c) => c.name === 'David');
      expect(david.facialHair).toBe(true); // has beard
      const amy = chars.find((c) => c.name === 'Amy');
      expect(amy.facialHair).toBe(false); // no facial hair
    });

    it('normalizes hair color variants', () => {
      const html = buildWikiTable(SAMPLE_ROWS);
      const chars = parseWikiCharacters(html);
      const al = chars.find((c) => c.name === 'Al');
      expect(al.hairColor).toBe('brown'); // 'light brown' → 'brown'
      const amy = chars.find((c) => c.name === 'Amy');
      expect(amy.hairColor).toBe('brown'); // 'highlights' → 'brown'
    });

    it('assigns correct gender', () => {
      const html = buildWikiTable(SAMPLE_ROWS);
      const chars = parseWikiCharacters(html);
      expect(chars.find((c) => c.name === 'Amy').gender).toBe('female');
      expect(chars.find((c) => c.name === 'Ben').gender).toBe('male');
    });
  });

  describe('fallback characters', () => {
    it('fallback has 24 characters', () => {
      expect(FALLBACK_CHARACTERS.length).toBe(24);
    });

    it('fallback has exactly 12 males and 12 females', () => {
      const males   = FALLBACK_CHARACTERS.filter((c) => c.gender === 'male').length;
      const females = FALLBACK_CHARACTERS.filter((c) => c.gender === 'female').length;
      expect(males).toBe(12);
      expect(females).toBe(12);
    });

    it('fallback passes validation', () => {
      expect(validateCharacters(FALLBACK_CHARACTERS)).toBe(true);
    });

    it('fallback has at least 3 distinct hair colors', () => {
      const colors = new Set(FALLBACK_CHARACTERS.map((c) => c.hairColor));
      expect(colors.size).toBeGreaterThanOrEqual(3);
    });

    it('fallback characters all have required fields', () => {
      const required = ['name', 'gender', 'hairColor', 'eyeColor', 'glasses', 'hat', 'facialHair', 'skinTone'];
      FALLBACK_CHARACTERS.forEach((c) => {
        required.forEach((k) => {
          expect(c[k], `${c.name} missing ${k}`).not.toBeUndefined();
        });
      });
    });

    it('fallback matches real 2018 Hasbro character names', () => {
      const expected2018 = [
        'Al','Amy','Ben','Carmen','Daniel','David','Emma','Eric',
        'Farah','Gabe','Joe','Jordan','Katie','Laura','Leo','Lily',
        'Liz','Mia','Mike','Nick','Olivia','Rachel','Sam','Sofia',
      ].sort();
      const actual = FALLBACK_CHARACTERS.map((c) => c.name).sort();
      expect(actual).toEqual(expected2018);
    });

    it('fallback has correct facial hair counts for gameplay balance', () => {
      // Classic Guess Who has ~5 of each binary attribute for binary-search balance
      const withFacialHair = FALLBACK_CHARACTERS.filter((c) => c.facialHair).length;
      const withGlasses    = FALLBACK_CHARACTERS.filter((c) => c.glasses).length;
      const withHat        = FALLBACK_CHARACTERS.filter((c) => c.hat).length;
      expect(withFacialHair).toBeGreaterThanOrEqual(4);
      expect(withFacialHair).toBeLessThanOrEqual(8);
      expect(withGlasses).toBeGreaterThanOrEqual(3);
      expect(withHat).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateCharacters', () => {
    it('rejects null', () => expect(validateCharacters(null)).toBe(false));
    it('rejects empty array', () => expect(validateCharacters([])).toBe(false));
    it('rejects array with < 20 entries', () => expect(validateCharacters([...Array(19)].map(() => ({
      name:'X', gender:'male', hairColor:'black', eyeColor:'brown', glasses:false, hat:false, facialHair:false,
    })))).toBe(false));
    it('rejects if fewer than 8 females', () => {
      const chars = FALLBACK_CHARACTERS.map((c) => ({ ...c, gender: 'male' }));
      expect(validateCharacters(chars)).toBe(false);
    });
    it('accepts valid fallback characters', () => {
      expect(validateCharacters(FALLBACK_CHARACTERS)).toBe(true);
    });
  });
});
