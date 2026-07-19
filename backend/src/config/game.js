// Game settings — change these to tune the game without touching source code

export const GAME_CONFIG = {
  // Session
  maxQuestions: 25,
  sessionTTL: 3600, // seconds (1 hour)
  kvKeyPrefix: 'game:',

  // Room codes
  roomCode: {
    length: 6,
    charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // no I, O, 0, 1 (ambiguous)
  },

  // Character scraping
  scrape: {
    sources: [
      {
        url: 'https://guesswho.fandom.com/wiki/Characters',
        selector: '.article-content table',
      },
      {
        url: 'https://guesswho.fandom.com/wiki/Classic_Characters',
        selector: '.article-content table',
      },
    ],
    userAgent: 'GuessWhoScraper/1.0 (Educational Project)',
    minCharacters: 20,
  },

  // Character cache
  cache: {
    key: 'characters:v1',
    ttl: 86400, // 24 hours
  },

  // Question matching
  questionMatch: {
    stopWords: ['does', 'your', 'character', 'have', 'the', 'and'],
    minWordOverlap: 2,
  },

  // Frontend
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
