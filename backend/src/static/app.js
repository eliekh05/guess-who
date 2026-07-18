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

  function showError(msg) {
    document.getElementById('landing-error').textContent = msg;
  }

  function getAvatar(char) {
    const gender = char.gender === 'female' ? '👩' : '👨';
    const skin = char.skinTone === 'dark' ? '🏿' : char.skinTone === 'medium' ? '🏽' : '🏻';
    return gender + skin;
  }

  function getHairColorHex(color) {
    const map = {
      black: '#1a1a1a', brown: '#8B4513', red: '#B22222',
      blonde: '#DAA520', gray: '#808080', bald: 'transparent',
    };
    return map[color] || '#8B4513';
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

  async function createGame() {
    const name = document.getElementById('player-name').value.trim();
    if (!name) return showError('Please enter your name');

    showError('');
    document.getElementById('btn-create').disabled = true;

    try {
      const data = await apiCall('/api/game', {
        method: 'POST',
        body: JSON.stringify({ playerName: name }),
      });

      if (data.error) {
        showError(data.error);
        document.getElementById('btn-create').disabled = false;
        return;
      }

      player = 'a';
      roomCode = data.code;
      gameState = data.state;

      document.getElementById('display-room-code').textContent = roomCode;
      showScreen('waiting');
      startPolling();
    } catch (err) {
      showError('Failed to create game. Please try again.');
      document.getElementById('btn-create').disabled = false;
    }
  }

  async function joinGame() {
    const name = document.getElementById('player-name').value.trim();
    const code = document.getElementById('room-code').value.trim().toUpperCase();
    if (!name) return showError('Please enter your name');
    if (!code || code.length !== 6) return showError('Please enter a 6-letter room code');

    showError('');
    document.getElementById('btn-join').disabled = true;

    try {
      const data = await apiCall(`/api/game/${code}/join`, {
        method: 'POST',
        body: JSON.stringify({ playerName: name }),
      });

      if (data.error) {
        showError(data.error);
        document.getElementById('btn-join').disabled = false;
        return;
      }

      player = 'b';
      roomCode = code;
      gameState = data.state;

      showCharacterSelect();
    } catch (err) {
      showError('Failed to join game. Please check the code.');
      document.getElementById('btn-join').disabled = false;
    }
  }

  function showCharacterSelect() {
    const board = document.getElementById('select-board');
    board.innerHTML = '';

    const chars = gameState.players.b.board;
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

      if (gameState.status === 'playing' && oldStatus !== 'playing') {
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

  document.getElementById('btn-create').addEventListener('click', createGame);
  document.getElementById('btn-join').addEventListener('click', joinGame);
  document.getElementById('btn-ask').addEventListener('click', askQuestion);

  document.getElementById('btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    player = null;
    roomCode = null;
    gameState = null;
    stopPolling();
    document.getElementById('player-name').value = '';
    document.getElementById('room-code').value = '';
    document.getElementById('btn-create').disabled = false;
    document.getElementById('btn-join').disabled = false;
    showScreen('landing');
  });

  document.querySelectorAll('input').forEach((input) => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const id = input.id;
        if (id === 'player-name' || id === 'room-code') {
          if (document.getElementById('room-code').value.trim()) {
            joinGame();
          } else {
            createGame();
          }
        }
      }
    });
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();
