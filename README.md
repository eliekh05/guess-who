# Guess Who?

The classic **Guess Who?** board game, reimagined as a web app. Challenge a friend to a game of deduction — ask yes/no questions about physical characteristics and eliminate characters until you can guess theirs.

[**▶ Play Now**](https://guess-who.eliekh05.workers.dev)

---

## What Is Guess Who?

Guess Who? is a two-player deduction game first released in 1986. Each player has a board of 24 characters, each with unique physical attributes (hair color, eye color, gender, glasses, etc.). Players take turns asking yes/no questions to eliminate characters and narrow down their opponent's secret choice.

The first player to correctly guess their opponent's character wins.

---

## How to Play

1. **Create or Join a Room** — Enter your name and create a room, or join a friend with their 6-letter room code.
2. **Choose a Character** — Secretly pick one of the 24 characters. Your opponent won't see your choice.
3. **Ask Questions** — Take turns asking yes/no questions like:
   - *"Does your character have red hair?"*
   - *"Is your character male?"*
   - *"Does your character wear glasses?"*
4. **Eliminate** — After each answer, flip down the characters that don't match. The system tracks this for you.
5. **Make Your Guess** — When only one character remains on your board, you can guess your opponent's character.
6. **Win or Lose** — Correct guess? You win! Wrong? You lose.

---

## Rules

- Questions must be about **physical characteristics only** (hair, eyes, gender, accessories, skin).
- You may **not** ask about names, ages, professions, or anything non-physical.
- There is a maximum of **25 questions** per game.
- Only ask **yes/no** questions.
- The game alternates turns — you cannot skip a turn.

---

## Characters

The game features **24 unique characters** with varied attributes:

| Attribute | Options |
|-----------|---------|
| Hair Color | Black, Brown, Red, Blonde, Gray, Bald |
| Eye Color | Blue, Green, Brown, Hazel |
| Gender | Male, Female |
| Glasses | Yes / No |
| Hat | Yes / No |
| Hair Length | Short, Medium, Long, Bald |
| Facial Hair | Yes / No |
| Skin Tone | Light, Medium, Dark |

Character data is scraped from Wikipedia at startup, with hardcoded fallback characters if the API is unavailable.

---

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Scraping**: Wikipedia MediaWiki API
- **Storage**: Cloudflare KV (game sessions + character cache)
- **PWA**: Service Worker + Web App Manifest
- **CI/CD**: GitHub Actions → `wrangler deploy`

---

## Project Structure

```
guess-who/
├── backend/               # Cloudflare Worker
│   ├── src/
│   │   ├── index.js       # Request router
│   │   ├── api/           # API endpoints
│   │   ├── game/          # Game engine & logic
│   │   ├── scrape/        # Character scraper
│   │   └── static/        # Frontend assets
│   └── wrangler.jsonc
├── frontend/              # Emergency fallback
└── .github/workflows/     # CI/CD
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Cloudflare account with Workers enabled

### Development

```bash
cd backend
npm install
npm run dev
```

### Environment Variables

Set these as GitHub Actions secrets for deployment:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

---

## Status

[![Deploy to Cloudflare Workers](https://github.com/eliekh05/guess-who/actions/workflows/deploy.yml/badge.svg)](https://github.com/eliekh05/guess-who/actions/workflows/deploy.yml)

## License

[MIT](LICENSE)
