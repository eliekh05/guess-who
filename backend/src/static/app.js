(() => {
  'use strict';

  const API = '';
  let currentScreen = 'landing';
  let player = null;
  let roomCode = null;
  let gameState = null;
  let pollInterval = null;

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

  function getAvatar(char) {
    const gender = char.gender === 'female' ? '👩' : '👨';
    const skin = char.skinTone === 'dark' ? '🏿' : char.skinTone === 'medium' ? '🏽' : '🏻';
    return gender + skin;
  }

  function renderCharacterCard(char, options = {}) {
    const { selectable = false, showBoard = false, eliminated = false } = options;
    const card = document.createElement('div');
    card.className = 'char-card' + (eliminated ? ' eliminated' : '');
    card.dataset.name = char.name;

    if (selectable) {
      card.addEventListener('click', () => selectCharacter(char.name));
    }

    const avatar = document.createElement('div');
    avatar.className = 'char-avatar';
    avatar.textContent = getAvatar(char);

    const name = document.createElement('div');
    name.className = 'char-name';
    name.textContent = char.name;

    card.appendChild(avatar);
    card.appendChild(name);

    if (showBoard) {
      const attrs = document.createElement('div');
      attrs.className = 'char-attrs';

      if (char.glasses) {
        const dot = document.createElement('span');
        dot.className = 'attr-dot';
        dot.style.background = '#4fc3f7';
        dot.title = 'Glasses';
        attrs.appendChild(dot);
      }

      if (char.hat) {
        const dot = document.createElement('span');
        dot.className = 'attr-dot';
        dot.style.background = '#8d6e63';
        dot.title = 'Hat';
        attrs.appendChild(dot);
      }

      if (char.facialHair) {
        const dot = document.createElement('span');
        dot.className = 'attr-dot';
        dot.style.background = '#5d4037';
        dot.title = 'Facial Hair';
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

  function startGame() {
    stopPolling();
    renderGameBoard();
    populateQuestions();
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

  function populateQuestions() {
    const select = document.getElementById('question-select');
    select.innerHTML = '<option value="">Ask a question...</option>';

    const categories = [
      { label: 'Hair Color', questions: [
        'Does your character have red hair?',
        'Does your character have blonde hair?',
        'Does your character have black hair?',
        'Does your character have brown hair?',
        'Is your character bald?',
      ]},
      { label: 'Eye Color', questions: [
        'Does your character have blue eyes?',
        'Does your character have green eyes?',
        'Does your character have brown eyes?',
      ]},
      { label: 'Gender', questions: [
        'Is your character male?',
        'Is your character female?',
      ]},
      { label: 'Accessories', questions: [
        'Does your character wear glasses?',
        'Does your character wear a hat?',
      ]},
      { label: 'Hair Style', questions: [
        'Does your character have long hair?',
        'Does your character have short hair?',
      ]},
      { label: 'Other', questions: [
        'Does your character have facial hair?',
        'Does your character have dark skin?',
      ]},
    ];

    categories.forEach((cat) => {
      const group = document.createElement('optgroup');
      group.label = cat.label;
      cat.questions.forEach((q) => {
        const opt = document.createElement('option');
        opt.value = q;
        opt.textContent = q;
        group.appendChild(opt);
      });
      select.appendChild(group);
    });
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

    const recentHistory = gameState.history.slice(-10).reverse();
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
      reveal.innerHTML = `
        Their character was: <strong>${oppChar.name}</strong>
        <div style="margin-top:0.5rem;font-size:2rem">${getAvatar(oppChar)}</div>
      `;
    }

    showScreen('gameover');
  }

  // --- Polling ---
  function startPolling() {
    stopPolling();
    pollInterval = setInterval(pollGameState, 2000);
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
  function init() {
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
