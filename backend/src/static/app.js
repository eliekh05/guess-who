(() => {
  'use strict';

  // ── State ───────────────────────────────────────────────────────────────────
  let player = null;       // 'a' or 'b'
  let roomCode = null;
  let gameState = null;
  let pollInterval = null;
  let myCharacter = null;  // the character THIS player is defending (kept client-side for display)
  let cfg = {};            // server-sent frontend config

  // ── Screen management ───────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  const SCREENS = ['landing','join','waiting','select','game','gameover'];
  function showScreen(name) {
    SCREENS.forEach((s) => $(`screen-${s}`).classList.toggle('active', s === name));
  }

  function setError(id, msg) { $(id).textContent = msg ?? ''; }

  function toast(msg, durationMs = 2500) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), durationMs);
  }

  // ── API ─────────────────────────────────────────────────────────────────────
  async function api(path, body = null) {
    const opts = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : { method: 'GET' };
    const res = await fetch(path, opts);
    if (!res.ok && res.status !== 400) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const TONE = { dark: '🏿', medium: '🏽', light: '🏻' };
  function avatar(char) {
    if (!char) return '❓';
    const base = char.gender === 'female' ? '👩' : '👨';
    return base + (TONE[char.skinTone] ?? '🏻');
  }

  // ── Character card ──────────────────────────────────────────────────────────
  function makeCard(char, { clickable = false, attrs = false } = {}) {
    const card = document.createElement('div');
    card.className = 'char-card' + (char.eliminated ? ' eliminated' : '');
    card.dataset.name = char.name;

    if (clickable && !char.eliminated) {
      card.addEventListener('click', () => onSelectCharacter(char.name));
    }

    // Flip overlay for eliminated cards (like tipping the face down in real game)
    const face = document.createElement('div');
    face.className = 'card-face';

    const avi = document.createElement('div');
    avi.className = 'char-avatar';
    avi.textContent = avatar(char);

    const nm = document.createElement('div');
    nm.className = 'char-name';
    nm.textContent = char.name;
    face.appendChild(avi);
    face.appendChild(nm);

    if (attrs) {
      const dots = document.createElement('div');
      dots.className = 'char-attrs';
      const defs = [
        { key: 'glasses', color: cfg.attributeColors?.glasses ?? '#4fc3f7', title: 'Glasses 👓' },
        { key: 'hat',     color: cfg.attributeColors?.hat     ?? '#8d6e63', title: 'Hat 🎩'    },
        { key: 'facialHair', color: cfg.attributeColors?.facialHair ?? '#5d4037', title: 'Facial Hair 🧔' },
      ];
      defs.forEach(({ key, color, title }) => {
        if (char[key]) {
          const dot = document.createElement('span');
          dot.className = 'attr-dot';
          dot.style.background = color;
          dot.title = title;
          dots.appendChild(dot);
        }
      });
      face.appendChild(dots);
    }

    card.appendChild(face);
    return card;
  }

  // ── Create game ─────────────────────────────────────────────────────────────
  async function onCreateGame() {
    const name = $('player-name').value.trim();
    if (!name) return setError('landing-error', 'Please enter your name');
    setError('landing-error', '');
    $('btn-create').disabled = true;

    try {
      const data = await api('/api/game', { playerName: name });
      if (data.error) { setError('landing-error', data.error); $('btn-create').disabled = false; return; }

      player = 'a';
      roomCode = data.code;
      gameState = data.state;

      const link = `${location.origin}/game/${roomCode}`;
      $('share-link').value = link;
      showScreen('waiting');
      $('waiting-msg').textContent = 'Waiting for your opponent to join...';
      $('waiting-hint').textContent = 'Share this link with a friend:';

      try { await navigator.clipboard.writeText(link); toast('Link copied!'); } catch {}
      startPolling();
    } catch (e) {
      setError('landing-error', 'Could not create game — please try again');
      $('btn-create').disabled = false;
    }
  }

  // ── Join game ────────────────────────────────────────────────────────────────
  async function onJoinGame() {
    const name = $('join-name').value.trim();
    if (!name) return setError('join-error', 'Please enter your name');
    if (!roomCode) return setError('join-error', 'Invalid game link');
    setError('join-error', '');
    $('btn-join-game').disabled = true;

    try {
      const data = await api(`/api/game/${roomCode}/join`, { playerName: name });
      if (data.error) { setError('join-error', data.error); $('btn-join-game').disabled = false; return; }

      player = 'b';
      gameState = data.state;
      showCharacterSelect();
      // Player B also polls — so they get notified when A picks and game starts
      startPolling();
    } catch {
      setError('join-error', 'Could not join — the game may have expired');
      $('btn-join-game').disabled = false;
    }
  }

  // ── Character selection ──────────────────────────────────────────────────────
  function showCharacterSelect() {
    const board = $('select-board');
    board.innerHTML = '';
    gameState.players[player].board.forEach((char) => {
      board.appendChild(makeCard(char, { clickable: true }));
    });
    showScreen('select');
  }

  async function onSelectCharacter(name) {
    // Highlight immediately for feedback
    document.querySelectorAll('#select-board .char-card').forEach((c) => {
      c.classList.toggle('selected', c.dataset.name === name);
    });

    try {
      const data = await api(`/api/game/${roomCode}/choose`, { player, character: name });
      if (data.error) { alert(data.error); return; }
      gameState = data.state;
      myCharacter = name;

      if (gameState.status === 'playing') {
        await startGame();
      } else {
        // Waiting for opponent to also pick
        showScreen('waiting');
        $('waiting-msg').textContent = `You chose ${name}. Waiting for opponent to pick...`;
        $('waiting-hint').textContent = '';
        $('share-link-box').style.display = 'none';
      }
    } catch {
      alert('Could not save character — please try again');
    }
  }

  // ── Game start ───────────────────────────────────────────────────────────────
  async function startGame() {
    stopPolling();

    // Load questions into the dropdown once
    await populateQuestions();
    renderAll();
    showScreen('game');
    startPolling();
  }

  function renderAll() {
    renderBoard();
    renderMyCharacter();
    renderTurn();
    renderHistory();
    renderGuessSection();
  }

  // ── My character display (so you know who you're defending) ──────────────────
  function renderMyCharacter() {
    const char = gameState.players[player].board.find((c) => c.name === myCharacter);
    const el = $('my-character-display');
    if (!char) { el.style.display = 'none'; return; }

    el.style.display = 'flex';
    $('my-character-avatar').textContent = avatar(char);
    $('my-character-name').textContent = char.name;

    // Build a readable summary of the character's attributes
    const parts = [];
    parts.push(char.gender === 'female' ? 'Female' : 'Male');
    parts.push(`${char.hairColor} hair`);
    parts.push(`${char.eyeColor} eyes`);
    if (char.glasses) parts.push('glasses');
    if (char.hat) parts.push('hat');
    if (char.facialHair) parts.push('facial hair');
    $('my-character-attrs').textContent = parts.join(' · ');
  }

  // ── Board ────────────────────────────────────────────────────────────────────
  function renderBoard() {
    const el = $('my-board');
    el.innerHTML = '';
    gameState.players[player].board.forEach((char) => {
      el.appendChild(makeCard(char, { attrs: true }));
    });
  }

  // ── Turn indicator ───────────────────────────────────────────────────────────
  function renderTurn() {
    const isMyTurn = gameState.currentTurn === player;
    const opponent = player === 'a' ? 'b' : 'a';
    const opponentName = gameState.players[opponent].name;

    const badge = $('turn-label');
    badge.textContent = isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`;
    badge.className = 'turn-badge ' + (isMyTurn ? 'your-turn' : 'opponent-turn');

    $('question-count').textContent = `${gameState.questionCount} / ${gameState.maxQuestions} questions`;

    const status = $('game-status');
    if (gameState.questionCount >= gameState.maxQuestions && isMyTurn) {
      status.textContent = '⚠️ No questions left — you must guess!';
      status.className = 'status-bar warn';
    } else if (isMyTurn) {
      status.textContent = 'Ask a question or make your guess below.';
      status.className = 'status-bar';
    } else {
      status.textContent = `Waiting for ${opponentName} to ask their question...`;
      status.className = 'status-bar';
    }

    // Enable / disable controls
    const isMaxed = gameState.questionCount >= gameState.maxQuestions;
    $('btn-ask').disabled = !isMyTurn || isMaxed;
    $('question-select').disabled = !isMyTurn || isMaxed;
    $('btn-guess').disabled = !isMyTurn;
  }

  // ── History ──────────────────────────────────────────────────────────────────
  function renderHistory() {
    const el = $('question-history');
    el.innerHTML = '';
    const limit = cfg.historyDisplayLimit ?? 15;
    const recent = gameState.history.slice(-limit).reverse();

    recent.forEach((entry) => {
      const asker = gameState.players[entry.player].name;
      const item = document.createElement('div');
      item.className = 'history-item';

      // Use textContent for XSS safety, build the structure manually
      const who = document.createElement('span');
      who.className = 'history-who';
      who.textContent = asker;

      const q = document.createElement('span');
      q.className = 'history-q';
      q.textContent = ` asked: "${entry.question}"`;

      const ans = document.createElement('span');
      const isGuess = entry.attribute === 'guess';
      if (isGuess) {
        ans.className = 'answer ' + (entry.answer ? 'yes' : 'no');
        ans.textContent = entry.answer ? '✓ CORRECT' : '✗ WRONG';
      } else {
        ans.className = 'answer ' + (entry.answer ? 'yes' : 'no');
        ans.textContent = entry.answer ? 'YES' : 'NO';
      }

      item.appendChild(who);
      item.appendChild(q);
      item.appendChild(ans);
      el.appendChild(item);
    });
  }

  // ── Guess section ────────────────────────────────────────────────────────────
  function renderGuessSection() {
    const isMyTurn = gameState.currentTurn === player;
    const remaining = gameState.players[player].board.filter((c) => !c.eliminated);

    $('remaining-count').textContent =
      `${remaining.length} character${remaining.length !== 1 ? 's' : ''} left on your board`;

    const sel = $('guess-select');
    const prev = sel.value;
    sel.innerHTML = '<option value="">— who do you think it is? —</option>';
    remaining.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = `${avatar(c)}  ${c.name}`;
      sel.appendChild(opt);
    });
    // Restore previously selected value if still valid
    if (prev && remaining.find((c) => c.name === prev)) sel.value = prev;

    $('btn-guess').disabled = !isMyTurn;
    $('guess-section').classList.remove('hidden');
  }

  // ── Populate questions dropdown ──────────────────────────────────────────────
  async function populateQuestions() {
    const sel = $('question-select');
    sel.innerHTML = '<option value="">Loading questions…</option>';

    try {
      const categories = await api('/api/questions');
      sel.innerHTML = '<option value="">Select a question to ask…</option>';

      Object.values(categories).forEach((cat) => {
        const grp = document.createElement('optgroup');
        grp.label = cat.label;
        cat.questions.forEach((q) => {
          const opt = document.createElement('option');
          opt.value = q.text;
          opt.textContent = q.text;
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      });
    } catch {
      sel.innerHTML = '<option value="">Could not load questions</option>';
    }
  }

  // ── Ask question ─────────────────────────────────────────────────────────────
  async function onAskQuestion() {
    const question = $('question-select').value;
    if (!question) return;

    $('btn-ask').disabled = true;

    try {
      const data = await api(`/api/game/${roomCode}/ask`, { player, question });
      if (data.error) { toast(`❌ ${data.error}`); $('btn-ask').disabled = false; return; }

      gameState = data.state;
      $('question-select').value = '';

      renderAll();

      // Big clear answer display
      const ansMsg = data.answer
        ? '✅ YES — their character has it! Everyone who doesn\'t has been eliminated.'
        : '❌ NO — their character doesn\'t have it! Everyone who does has been eliminated.';
      toast(ansMsg, 3500);

      if (gameState.status === 'finished') showGameOver();
    } catch {
      toast('Could not send question — please try again');
      $('btn-ask').disabled = false;
    }
  }

  // ── Make guess ───────────────────────────────────────────────────────────────
  async function onMakeGuess() {
    const character = $('guess-select').value;
    if (!character) return toast('Please pick a character from the list first');

    // Real Guess Who rule: wrong guess = instant loss, so confirm
    const ok = confirm(
      `You're guessing "${character}".\n\n` +
      `In Guess Who, a WRONG guess means you LOSE immediately!\n\n` +
      `Are you confident? Press OK to guess.`
    );
    if (!ok) return;

    try {
      const data = await api(`/api/game/${roomCode}/guess`, { player, character });
      if (data.error) { toast(`❌ ${data.error}`); return; }

      gameState = data.state;
      showGameOver();
    } catch {
      toast('Could not submit guess — please try again');
    }
  }

  // ── Game over ─────────────────────────────────────────────────────────────────
  function showGameOver() {
    stopPolling();

    const iWon = gameState.winner === player;
    const opponent = player === 'a' ? 'b' : 'a';
    const oppData = gameState.players[opponent];

    $('gameover-icon').textContent = iWon ? '🎉' : '😔';
    $('gameover-title').textContent = iWon ? 'You Won!' : 'You Lost!';

    // Figure out why we won/lost from the last history entry
    const lastEntry = gameState.history[gameState.history.length - 1];
    let msg = '';
    if (lastEntry?.attribute === 'guess') {
      if (lastEntry.player === player) {
        msg = iWon
          ? `You correctly guessed it was ${lastEntry.value}!`
          : `You guessed ${lastEntry.value} — but that was wrong!`;
      } else {
        msg = iWon
          ? `${gameState.players[opponent].name} guessed wrong — you win!`
          : `${gameState.players[opponent].name} correctly guessed your character!`;
      }
    }
    $('gameover-message').textContent = msg;

    // Reveal the opponent's character
    const oppChar = oppData.board?.find((c) => c.name === oppData.character);
    const reveal = $('gameover-reveal');
    reveal.innerHTML = '';

    const label = document.createElement('p');
    label.textContent = `${oppData.name}'s character was:`;
    reveal.appendChild(label);

    if (oppChar) {
      const card = makeCard(oppChar);
      card.style.width = '100px';
      card.style.margin = '0.75rem auto 0';
      reveal.appendChild(card);
    } else if (oppData.character) {
      const nm = document.createElement('strong');
      nm.textContent = oppData.character;
      reveal.appendChild(nm);
    }

    showScreen('gameover');
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  function startPolling() {
    stopPolling();
    const interval = cfg.pollingIntervalMs ?? 2000;
    pollInterval = setInterval(poll, interval);
  }

  function stopPolling() {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  async function poll() {
    if (!roomCode || !player) return;
    try {
      const data = await api(`/api/game/${roomCode}/poll?player=${player}`);
      if (!data?.state) return;

      const prev = gameState;
      gameState = data.state;

      // Sync myCharacter from server after cold reload
      if (!myCharacter && gameState.players[player].character) {
        myCharacter = gameState.players[player].character;
      }

      if (gameState.status === 'finished') {
        showGameOver(); return;
      }

      const screen = SCREENS.find((s) => $(`screen-${s}`).classList.contains('active'));

      if (screen === 'waiting' && gameState.status === 'choosing' && player === 'a') {
        // Opponent joined → player A can now pick their character
        showCharacterSelect(); return;
      }

      if (gameState.status === 'playing' && prev?.status !== 'playing') {
        // Both players have chosen → start the game
        await startGame(); return;
      }

      if (screen === 'game' && gameState.status === 'playing') {
        const changed =
          gameState.questionCount !== prev?.questionCount ||
          gameState.currentTurn !== prev?.currentTurn;
        if (changed) {
          renderAll();
          // Notify this player that it's now their turn
          if (gameState.currentTurn === player && prev?.currentTurn !== player) {
            toast("🎯 It's your turn!");
          }
        }
      }
    } catch {
      // silently ignore poll failures
    }
  }

  // ── Event wiring ─────────────────────────────────────────────────────────────
  $('btn-create').addEventListener('click', onCreateGame);
  $('btn-join-game').addEventListener('click', onJoinGame);
  $('btn-ask').addEventListener('click', onAskQuestion);
  $('btn-guess').addEventListener('click', onMakeGuess);

  $('player-name').addEventListener('keydown', (e) => e.key === 'Enter' && onCreateGame());
  $('join-name').addEventListener('keydown', (e) => e.key === 'Enter' && onJoinGame());

  $('btn-copy-link').addEventListener('click', async () => {
    const link = $('share-link').value;
    try { await navigator.clipboard.writeText(link); toast('Link copied!'); }
    catch { $('share-link').select(); }
  });

  $('btn-play-again').addEventListener('click', () => {
    player = null; roomCode = null; gameState = null; myCharacter = null;
    stopPolling();
    $('player-name').value = '';
    $('btn-create').disabled = false;
    $('share-link-box').style.display = '';
    showScreen('landing');
    history.replaceState({}, '', '/');
  });

  // ── Init ──────────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const res = await api('/api/config');
      if (res?.frontend) cfg = res.frontend;
    } catch {}

    // Deep-link: /game/XXXXXX opens the join screen directly
    const m = location.pathname.match(/^\/game\/([A-Z0-9]{6})$/);
    if (m) {
      roomCode = m[1];
      showScreen('join');
      $('join-name').focus();
    }
  }

  init();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
