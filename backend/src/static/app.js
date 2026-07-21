(() => {
  'use strict';

  const API = '';
  let currentScreen = 'landing';
  let player = null;
  let roomCode = null;
  let gameState = null;
  let pollInterval = null;
  let appConfig = null;

  const screens = {
    landing: document.getElementById('screen-landing'),
    join: document.getElementById('screen-join'),
    waiting: document.getElementById('screen-waiting'),
    select: document.getElementById('screen-select'),
    game: document.getElementById('screen-game'),
    gameover: document.getElementById('screen-gameover'),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
    currentScreen = name;
  }

  function showError(id, msg) {
    document.getElementById(id).textContent = msg;
  }

  function showToast(msg) {
    const toast = document.getElementById('copy-toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  function getShareLink(code) {
    return `${window.location.origin}/game/${code}`;
  }

  // Skin tone color map
  const SKIN_COLORS = {
    light: '#f5d0a9',
    medium: '#c68642',
    dark: '#8d5524',
  };

  // Hair color map
  const HAIR_COLORS = {
    black: '#1a1a1a',
    brown: '#6b3a2a',
    blonde: '#e8c872',
    red: '#b5451b',
    gray: '#9e9e9e',
    bald: 'transparent',
  };

  // Eye color map
  const EYE_COLORS = {
    blue: '#4a90d9',
    brown: '#5c3317',
    green: '#4a9e4a',
    hazel: '#8e7618',
    black: '#1a1a1a',
  };

  function renderCharacterPortrait(char) {
    const face = document.createElement('div');
    face.className = 'face-portrait';
    face.style.setProperty('--skin', SKIN_COLORS[char.skinTone] || SKIN_COLORS.light);
    face.style.setProperty('--hair', HAIR_COLORS[char.hairColor] || HAIR_COLORS.brown);
    face.style.setProperty('--eyes', EYE_COLORS[char.eyeColor] || EYE_COLORS.blue);

    // Hat (rendered first, above head)
    if (char.hat) {
      const hat = document.createElement('div');
      hat.className = 'face-hat';
      face.appendChild(hat);
    }

    // Hair
    if (char.hairColor !== 'bald') {
      const hair = document.createElement('div');
      hair.className = 'face-hair face-hair--' + char.hairLength;
      face.appendChild(hair);
    }

    // Head/face shape
    const head = document.createElement('div');
    head.className = 'face-head';

    // Eyes
    const eyes = document.createElement('div');
    eyes.className = 'face-eyes';
    const leftEye = document.createElement('div');
    leftEye.className = 'face-eye';
    const rightEye = document.createElement('div');
    rightEye.className = 'face-eye';
    eyes.appendChild(leftEye);
    eyes.appendChild(rightEye);
    head.appendChild(eyes);

    // Glasses
    if (char.glasses) {
      const glasses = document.createElement('div');
      glasses.className = 'face-glasses';
      head.appendChild(glasses);
    }

    // Nose
    const nose = document.createElement('div');
    nose.className = 'face-nose';
    head.appendChild(nose);

    // Mouth
    const mouth = document.createElement('div');
    mouth.className = 'face-mouth';
    head.appendChild(mouth);

    // Facial hair
    if (char.facialHair === 'mustache') {
      const stache = document.createElement('div');
      stache.className = 'face-mustache';
      head.appendChild(stache);
    } else if (char.facialHair === 'beard') {
      const beard = document.createElement('div');
      beard.className = 'face-beard';
      head.appendChild(beard);
    }

    face.appendChild(head);
    return face;
  }

  function renderCharacterCard(char, options = {}) {
    const { selectable = false, showBoard = false, eliminated = false } = options;
    const card = document.createElement('div');
    card.className = 'char-card' + (eliminated ? ' eliminated' : '');
    card.dataset.name = char.name;

    if (selectable) {
      card.addEventListener('click', () => selectCharacter(char.name));
    }

    const portrait = renderCharacterPortrait(char);

    const name = document.createElement('div');
    name.className = 'char-name';
    name.textContent = char.name;

    card.appendChild(portrait);
    card.appendChild(name);

    if (showBoard) {
      const attrs = document.createElement('div');
      attrs.className = 'char-attrs';

      if (char.glasses) {
        const dot = document.createElement('span');
        dot.className = 'attr-dot';
        dot.style.background = appConfig?.attributeColors?.glasses || '#4fc3f7';
        dot.title = 'Glasses';
        attrs.appendChild(dot);
      }

      if (char.hat) {
        const dot = document.createElement('span');
        dot.className = 'attr-dot';
        dot.style.background = appConfig?.attributeColors?.hat || '#8d6e63';
        dot.title = 'Hat';
        attrs.appendChild(dot);
      }

      if (char.facialHair && char.facialHair !== 'none') {
        const dot = document.createElement('span');
        dot.className = 'attr-dot';
        dot.style.background = appConfig?.attributeColors?.facialHair || '#5d4037';
        dot.title = char.facialHair === 'beard' ? 'Beard' : 'Mustache';
        attrs.appendChild(dot);
      }

      card.appendChild(attrs);
    }

    return card;
  }

  async function apiCall(path, options = {}) {
    const res = await fetch(API + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return res.json();
  }

  // --- Create Game ---
  async function createGame() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) return showError('landing-error', 'Please enter your name');

    showError('landing-error', '');
    document.getElementById('btn-create').disabled = true;

    try {
      const data = await apiCall('/api/game', {
        method: 'POST',
        body: JSON.stringify({ playerName: name }),
      });

      if (data.error) {
        showError('landing-error', data.error);
        document.getElementById('btn-create').disabled = false;
        return;
      }

      player = 'a';
      roomCode = data.code;
      gameState = data.state;

      // Set share link and auto-copy
      const link = getShareLink(roomCode);
      document.getElementById('share-link').value = link;

      showScreen('waiting');

      // Auto-copy link to clipboard
      try {
        await navigator.clipboard.writeText(link);
        showToast('Link copied to clipboard!');
      } catch {
        // Clipboard API might fail (e.g. no HTTPS), user can tap copy button
      }

      startPolling();
    } catch (err) {
      showError('landing-error', 'Failed to create game. Please try again.');
      document.getElementById('btn-create').disabled = false;
    }
  }

  // --- Join Game via Link ---
  async function joinGame() {
    const name = document.getElementById('join-name').value.trim();
    if (!name) return showError('join-error', 'Please enter your name');
    if (!roomCode) return showError('join-error', 'Invalid game link');

    showError('join-error', '');
    document.getElementById('btn-join-game').disabled = true;

    try {
      const data = await apiCall(`/api/game/${roomCode}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerName: name }),
      });

      if (data.error) {
        showError('join-error', data.error);
        document.getElementById('btn-join-game').disabled = false;
        return;
      }

      player = 'b';
      gameState = data.state;

      showCharacterSelect();
    } catch (err) {
      showError('join-error', 'Failed to join game. The game may have expired.');
      document.getElementById('btn-join-game').disabled = false;
    }
  }

  function showCharacterSelect() {
    const board = document.getElementById('select-board');
    board.innerHTML = '';

    const chars = gameState.players[player].board;
    chars.forEach((char) => {
      board.appendChild(renderCharacterCard(char, { selectable: true }));
    });

    showScreen('select');
  }

  async function selectCharacter(name) {
    try {
      const data = await apiCall(`/api/game/${roomCode}/choose`, {
        method: 'POST',
        body: JSON.stringify({ player, character: name }),
      });

      if (data.error) return alert(data.error);

      gameState = data.state;

      if (gameState.status === 'playing') {
        startGame();
      } else {
        showScreen('waiting');
        startPolling();
      }
    } catch (err) {
      alert('Failed to select character');
    }
  }

  async function startGame() {
    stopPolling();
    renderGameBoard();
    await populateQuestions();
    updateTurnDisplay();
    showScreen('game');
  }

  function renderGameBoard() {
    const board = document.getElementById('my-board');
    board.innerHTML = '';

    const myData = gameState.players[player];
    myData.board.forEach((char) => {
      board.appendChild(renderCharacterCard(char, {
        showBoard: true,
        eliminated: char.eliminated,
      }));
    });

    updateGuessSection();
  }

  async function populateQuestions() {
    const select = document.getElementById('question-select');
    select.innerHTML = '<option value="">Ask a question...</option>';

    try {
      const categories = await apiCall('/api/questions');

      Object.values(categories).forEach((cat) => {
        const group = document.createElement('optgroup');
        group.label = cat.label;
        cat.questions.forEach((q) => {
          const opt = document.createElement('option');
          opt.value = q.text;
          opt.textContent = q.text;
          group.appendChild(opt);
        });
        select.appendChild(group);
      });
    } catch {
      select.innerHTML = '<option value="">Failed to load questions</option>';
    }
  }

  function updateTurnDisplay() {
    const isMyTurn = gameState.currentTurn === player;
    const badge = document.getElementById('turn-label');
    badge.textContent = isMyTurn ? 'Your Turn' : "Opponent's Turn";
    badge.className = 'turn-badge ' + (isMyTurn ? 'your-turn' : 'opponent-turn');

    document.getElementById('question-count').textContent =
      `${gameState.questionCount} / ${gameState.maxQuestions}`;

    document.getElementById('btn-ask').disabled = !isMyTurn;
    document.getElementById('question-select').disabled = !isMyTurn;

    const status = document.getElementById('game-status');
    if (gameState.questionCount >= gameState.maxQuestions) {
      status.textContent = 'Max questions reached!';
    } else {
      status.textContent = '';
    }
  }

  function updateHistory() {
    const history = document.getElementById('question-history');
    history.innerHTML = '';

    const recentHistory = gameState.history.slice(-(appConfig?.historyDisplayLimit || 10)).reverse();
    recentHistory.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'history-item';

      const playerAName = gameState.players.a.name;
      const playerName = entry.player === 'a' ? playerAName : gameState.players.b.name;

      item.innerHTML = `
        <span class="player">${playerName}</span>:
        "${entry.question}"
        <span class="answer ${entry.answer ? 'yes' : 'no'}">${entry.answer ? 'YES' : 'NO'}</span>
      `;
      history.appendChild(item);
    });
  }

  function updateGuessSection() {
    const myData = gameState.players[player];
    const remaining = myData.board.filter((c) => !c.eliminated);
    const guessSection = document.getElementById('guess-section');
    const remainingList = document.getElementById('remaining-chars');

    if (remaining.length === 1 && gameState.currentTurn === player) {
      guessSection.classList.remove('hidden');
      remainingList.innerHTML = '';

      const char = remaining[0];
      const btn = document.createElement('button');
      btn.className = 'remaining-btn';
      btn.textContent = `It's ${char.name}!`;
      btn.addEventListener('click', () => makeGuess(char.name));
      remainingList.appendChild(btn);
    } else {
      guessSection.classList.add('hidden');
    }
  }

  async function askQuestion() {
    const select = document.getElementById('question-select');
    const question = select.value;
    if (!question) return;

    try {
      const data = await apiCall(`/api/game/${roomCode}/ask`, {
        method: 'POST',
        body: JSON.stringify({ player, question }),
      });

      if (data.error) return alert(data.error);

      gameState = data.state;
      select.value = '';

      renderGameBoard();
      updateTurnDisplay();
      updateHistory();
      updateGuessSection();

      if (gameState.status === 'finished') {
        showGameOver();
      }
    } catch (err) {
      alert('Failed to ask question');
    }
  }

  async function makeGuess(character) {
    try {
      const data = await apiCall(`/api/game/${roomCode}/guess`, {
        method: 'POST',
        body: JSON.stringify({ player, character }),
      });

      if (data.error) return alert(data.error);

      gameState = data.state;
      showGameOver();
    } catch (err) {
      alert('Failed to submit guess');
    }
  }

  function showGameOver() {
    stopPolling();

    const isWinner = gameState.winner === player;
    const icon = document.getElementById('gameover-icon');
    const title = document.getElementById('gameover-title');
    const message = document.getElementById('gameover-message');
    const reveal = document.getElementById('gameover-reveal');

    icon.textContent = isWinner ? '🎉' : '😞';
    title.textContent = isWinner ? 'You Won!' : 'You Lost!';
    message.textContent = isWinner
      ? 'You correctly guessed their character!'
      : 'Better luck next time!';

    const opponent = player === 'a' ? 'b' : 'a';
    const oppChar = gameState.players[opponent].board.find(
      (c) => c.name === gameState.players[opponent].character
    );

    if (oppChar) {
      reveal.innerHTML = `Their character was: <strong>${oppChar.name}</strong>`;
      reveal.appendChild(renderCharacterPortrait(oppChar));
    }

    showScreen('gameover');
  }

  // --- Polling ---
  function startPolling() {
    stopPolling();
    pollInterval = setInterval(pollGameState, appConfig?.pollingIntervalMs || 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  async function pollGameState() {
    if (!roomCode || !player) return;

    try {
      const data = await apiCall(`/api/game/${roomCode}/poll?player=${player}`);
      if (data.error) return;

      const oldStatus = gameState?.status;
      gameState = data.state;

      if (gameState.status === 'choosing' && oldStatus === 'waiting') {
        // Opponent joined — show character select
        showCharacterSelect();
      } else if (gameState.status === 'playing' && oldStatus !== 'playing') {
        startGame();
      } else if (gameState.status === 'playing') {
        updateTurnDisplay();
        updateHistory();
        updateGuessSection();
      } else if (gameState.status === 'finished') {
        showGameOver();
      }
    } catch (err) {
      console.error('Poll failed:', err);
    }
  }

  // --- Event Listeners ---
  document.getElementById('btn-create').addEventListener('click', createGame);
  document.getElementById('btn-join-game').addEventListener('click', joinGame);
  document.getElementById('btn-ask').addEventListener('click', askQuestion);

  document.getElementById('btn-copy-link').addEventListener('click', async () => {
    const link = document.getElementById('share-link').value;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied!');
    } catch {
      // Fallback: select the input text
      document.getElementById('share-link').select();
    }
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    player = null;
    roomCode = null;
    gameState = null;
    stopPolling();
    document.getElementById('player-name').value = '';
    document.getElementById('btn-create').disabled = false;
    showScreen('landing');
    // Clear URL back to root
    window.history.replaceState({}, '', '/');
  });

  // Enter key handlers
  document.getElementById('player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createGame();
  });
  document.getElementById('join-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinGame();
  });

  // --- Init: check for /game/CODE in URL ---
  async function init() {
    try {
      const configRes = await apiCall('/api/config');
      if (configRes?.frontend) {
        appConfig = configRes.frontend;
      }
    } catch {
      // Config fetch failed — defaults will be used
    }

    const match = window.location.pathname.match(/^\/game\/([A-Z0-9]{6})$/);
    if (match) {
      roomCode = match[1];
      showScreen('join');
      document.getElementById('join-name').focus();
    }
  }

  init();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
