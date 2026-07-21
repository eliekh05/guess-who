# Guess Who?

A faithful online multiplayer implementation of the classic **Guess Who?** board game. Two players connect via a shared link and take turns asking yes/no questions to deduce each other's secret character.

**[▶ Play Now](https://guess-who.eliekh05.workers.dev)**

---

## How to Play

Guess Who? is a two-player deduction game. Each player secretly picks one of 24 characters. Players alternate asking yes/no questions about physical features to eliminate characters and narrow down who the opponent chose. The first player to correctly guess the opponent's character wins.

**Real rules (as implemented here):**

1. Player A creates a room and shares the link. Player B joins.
2. Each player secretly picks one of the 24 characters from their board.
3. Player A goes first. On your turn you can:
   - **Ask a question** — pick from the dropdown (e.g. *"Does your character wear glasses?"*). The opponent answers YES or NO honestly. Characters that don't match the answer are automatically eliminated from your board.
   - **Make a guess** — name who you think the opponent's character is. A correct guess wins the game instantly. A **wrong guess loses the game instantly** — this is the core tension of Guess Who?.
4. After asking a question your turn passes to the opponent. After a guess the game ends.
5. The game also ends after 25 total questions if no one has guessed yet.

---

## Characters

Uses the official **2018 Hasbro Guess Who?** character set — 24 characters, 12 male and 12 female:

| Males | Females |
|-------|---------|
| Al, Ben, Daniel, David, Eric, Gabe | Amy, Carmen, Emma, Farah, Katie, Laura |
| Joe, Jordan, Leo, Mike, Nick, Sam | Lily, Liz, Mia, Olivia, Rachel, Sofia |

**Queryable attributes** (what you can ask YES/NO questions about):

- Gender, Hair color, Eye color, Glasses, Hat, Facial hair

*Skin tone is used for avatar rendering only and is not a valid question in the real board game.*

Character data is scraped live from [Wikipedia's Guess Who? article](https://en.wikipedia.org/wiki/Guess_Who%3F) and cached for 24 hours. The bundled fallback in `config/characters.js` is used if the scrape fails.

---

## Tech Stack

- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/) — edge-deployed, zero cold-start penalty
- **Storage:** [Cloudflare KV](https://developers.cloudflare.com/kv/) — two namespaces:
  - `CHARACTER_CACHE` — scraped character data (24h TTL)
  - `GAME_SESSIONS` — live game state (1h TTL)
- **Frontend:** Vanilla JS, no framework, no build step — served as static assets via Workers Assets
- **Deploy:** GitHub Actions → `wrangler deploy` on every push to `main`

---

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── characters.js     # GET /api/characters, POST /api/characters/refresh
│   │   └── game.js           # All /api/game/* routes + state sanitization
│   ├── config/
│   │   ├── characters.js     # Fallback 2018 Hasbro character set (24 chars)
│   │   └── game.js           # All tunable settings (TTLs, room code, question matching)
│   ├── game/
│   │   ├── engine.js         # Pure game logic: selectCharacter, askQuestion, makeGuess
│   │   ├── engine.test.js    # 32 unit tests covering all game rules
│   │   ├── questions.js      # Dynamic question generation from character data
│   │   └── session.js        # KV read/write wrapper around engine
│   ├── scrape/
│   │   ├── characters.js     # Wikipedia scraper + KV cache + fallback logic
│   │   └── characters.test.js # 19 tests: parser, validation, fallback integrity
│   ├── static/
│   │   ├── index.html        # Single-page app shell
│   │   ├── app.js            # All frontend logic (vanilla JS, no framework)
│   │   ├── style.css         # CSS custom properties, responsive, dark theme
│   │   ├── favicon.svg       # Centered 🤔 emoji
│   │   ├── manifest.json     # PWA manifest
│   │   └── sw.js             # Service worker for offline support
│   └── index.js              # Cloudflare Worker entry point + CORS
└── wrangler.jsonc            # Cloudflare deployment config
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/game` | Create a new game room. Body: `{ playerName }`. Returns `{ code, player: 'a', state }` |
| `POST` | `/api/game/:code/join` | Join an existing room. Body: `{ playerName }`. Returns `{ player: 'b', state }` |
| `POST` | `/api/game/:code/choose` | Pick your secret character. Body: `{ player, character }` |
| `POST` | `/api/game/:code/ask` | Ask a yes/no question. Body: `{ player, question }`. Returns `{ answer, remainingCount, state }` |
| `POST` | `/api/game/:code/guess` | Guess the opponent's character. Body: `{ player, character }`. Returns `{ correct, winner, state }` |
| `GET`  | `/api/game/:code/poll` | Poll for state updates. Query: `?player=a\|b`. Returns `{ state }` |
| `GET`  | `/api/questions` | Get all valid questions grouped by category |
| `GET`  | `/api/characters` | Get the full character list |
| `POST` | `/api/characters/refresh` | Force re-scrape Wikipedia and rebuild the KV cache |
| `GET`  | `/api/config` | Get frontend config (polling interval, attribute colors) |

**Game state lifecycle:** `waiting` → `choosing` → `playing` → `finished`

---

## Game Logic Notes

**Elimination:** When you ask a question and the answer is YES, every character on your board who does NOT have that attribute is automatically eliminated. When the answer is NO, every character who DOES have it is eliminated. This is the core mechanic — each question should halve your remaining candidates.

**Optimal questions** narrow the board most evenly. With 24 characters and 12M/12F, asking about gender first always eliminates exactly 12 characters regardless of the answer — the theoretically best opening move.

**Wrong guess = instant loss.** This is the real rule and what makes the game tense. Don't guess until you're sure.

**Questions are derived dynamically** from the loaded character data — there is no separate hardcoded question list that can go stale. If the character set changes (e.g. a new edition is scraped), valid questions update automatically.
