// Game settings — change these to tune the game without touching source code

export const GAME_CONFIG = {
  // Session
  maxQuestions: 25, // classic board game has no hard limit but 25 keeps online games moving
  sessionTTL: 3600, // seconds (1 hour)
  kvKeyPrefix: 'game:',

  // Room codes — no I, O, 0, 1 (visually ambiguous)
  roomCode: {
    length: 6,
    charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  },

  // Character scraping
  // Primary source: Wikipedia Guess Who? character table (authoritative, stable)
  scrape: {
    url: 'https://en.wikipedia.org/wiki/Guess_Who%3F',
    // Which edition's characters to use. 2018 = current Hasbro retail edition.
    // 24 characters, 12M/12F, diverse skin tones.
    editionYear: 2018,
    minCharacters: 20,
    userAgent: 'GuessWhoGame/1.0 (educational board game app; contact via github)',
  },

  // Character cache (Cloudflare KV via CHARACTER_CACHE binding)
  cache: {
    key: 'characters:v1',
    ttl: 60 * 60 * 24,        // 24 hours for scraped data
    fallbackTtl: 60 * 60,     // 1 hour if we had to use fallback
  },

  // Question matching — how free-text questions map to character attributes
  questionMatch: {
    stopWords: ['does', 'your', 'character', 'person', 'have', 'the', 'and', 'they', 'their'],
    minWordOverlap: 2,
  },

  // How the real game's attribute distribution looks (2018 edition)
  // Useful for generating balanced questions
  attributeDistribution: {
    // Roughly equal split gives best binary-search gameplay
    glasses: 5,   // out of 24
    hat: 5,
    facialHair: 5,
    // Hair colors vary — brown/dark brown most common, then blonde/black, white, red
    // Eye colors — mostly brown, then blue/green
    // Gender — exactly 12/12 in 2018 edition
  },

  // Frontend settings sent to the client via /api/config
  frontend: {
    pollingIntervalMs: 2000,
    historyDisplayLimit: 10,
    attributeColors: {
      glasses: '#4fc3f7',
      hat: '#8d6e63',
      facialHair: '#5d4037',
    },
  },
};
