// 🐍 Jeu du Serpent
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const CELL = 20;                 // taille d'une case en pixels
const COLS = canvas.width / CELL;   // 20 colonnes
const ROWS = canvas.height / CELL;  // 20 lignes

const scoreEl = document.getElementById('score');
const highscoreEl = document.getElementById('highscore');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const startBtn = document.getElementById('start-btn');

let snake, dir, nextDir, food, score, highscore, level;
let running = false, paused = false, gameOver = false;
let accumulator = 0, lastTime = 0, stepInterval = 130;

highscore = Number(localStorage.getItem('snake-highscore') || 0);
highscoreEl.textContent = highscore;

/* ---------- Sons (Web Audio, sans fichier externe) ---------- */
let audioCtx = null;
function beep(freq, duration = 0.08, type = 'square', volume = 0.05) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* audio non disponible */ }
}

/* ---------- Initialisation ---------- */
function reset() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score = 0;
  level = 1;
  stepInterval = 130;
  accumulator = 0;
  gameOver = false;
  paused = false;
  scoreEl.textContent = '0';
  levelEl.textContent = '1';
  placeFood();
  draw();
}

function placeFood() {
  const free = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  if (free.length === 0) { win(); return; }
  food = free[Math.floor(Math.random() * free.length)];
}

/* ---------- Boucle de jeu ---------- */
function loop(timestamp) {
  if (!running) return;
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (!paused && !gameOver) {
    accumulator += delta;
    while (accumulator >= stepInterval) {
      accumulator -= stepInterval;
      step();
      if (gameOver) break;
    }
  }
  draw();
  requestAnimationFrame(loop);
}

function step() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Collision avec les murs
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();

  // Collision avec le corps (la queue va bouger, sauf si on mange)
  const eating = head.x === food.x && head.y === food.y;
  const body = eating ? snake : snake.slice(0, -1);
  if (body.some(s => s.x === head.x && s.y === head.y)) return endGame();

  snake.unshift(head);

  if (eating) {
    score += 10;
    scoreEl.textContent = score;
    beep(660, 0.07);

    const newLevel = Math.floor(score / 50) + 1;
    if (newLevel !== level) {
      level = newLevel;
      levelEl.textContent = level;
      stepInterval = Math.max(55, 130 - (level - 1) * 10);
      beep(880, 0.12, 'triangle');
    }
    placeFood();
  } else {
    snake.pop();
  }
}

/* ---------- Rendu ---------- */
function draw() {
  // Fond quadrillé
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(48, 54, 61, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
  }

  // Nourriture (pomme)
  if (food) {
    const cx = food.x * CELL + CELL / 2;
    const cy = food.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 14;
    ctx.arc(cx, cy, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Serpent
  snake.forEach((seg, i) => {
    const ratio = i / Math.max(snake.length - 1, 1);
    const r = Math.round(74 + ratio * (34 - 74));
    const g = Math.round(222 + ratio * (211 - 222));
    const b = Math.round(128 + ratio * (238 - 128));
    ctx.fillStyle = i === 0 ? '#a3e635' : `rgb(${r}, ${g}, ${b})`;
    roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 5);
    ctx.fill();
  });

  // Yeux de la tête
  const head = snake[0];
  ctx.fillStyle = '#0b0f14';
  const eyeSize = 3;
  const ex = head.x * CELL, ey = head.y * CELL;
  if (dir.x === 1) {
    ctx.fillRect(ex + CELL - 7, ey + 5, eyeSize, eyeSize);
    ctx.fillRect(ex + CELL - 7, ey + CELL - 8, eyeSize, eyeSize);
  } else if (dir.x === -1) {
    ctx.fillRect(ex + 4, ey + 5, eyeSize, eyeSize);
    ctx.fillRect(ex + 4, ey + CELL - 8, eyeSize, eyeSize);
  } else if (dir.y === 1) {
    ctx.fillRect(ex + 5, ey + CELL - 7, eyeSize, eyeSize);
    ctx.fillRect(ex + CELL - 8, ey + CELL - 7, eyeSize, eyeSize);
  } else {
    ctx.fillRect(ex + 5, ey + 4, eyeSize, eyeSize);
    ctx.fillRect(ex + CELL - 8, ey + 4, eyeSize, eyeSize);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- Fin de partie ---------- */
function endGame() {
  gameOver = true;
  running = false;
  beep(180, 0.3, 'sawtooth', 0.08);

  if (score > highscore) {
    highscore = score;
    localStorage.setItem('snake-highscore', highscore);
    highscoreEl.textContent = highscore;
  }

  overlayTitle.textContent = '💀 Perdu !';
  overlayText.innerHTML = `Score : <strong>${score}</strong> &nbsp;|&nbsp; Record : <strong>${highscore}</strong>`;
  startBtn.textContent = 'Rejouer';
  overlay.classList.remove('hidden');
}

function win() {
  gameOver = true;
  running = false;
  overlayTitle.textContent = '🏆 Gagné !';
  overlayText.innerHTML = `Tu as rempli la grille ! Score : <strong>${score}</strong>`;
  startBtn.textContent = 'Rejouer';
  overlay.classList.remove('hidden');
}

/* ---------- Contrôles ---------- */
function setDirection(x, y) {
  if (!running || gameOver) return;
  // Empêche le demi-tour instantané
  if (dir.x === -x && dir.y === -y) return;
  if (nextDir.x === -x && nextDir.y === -y) return;
  nextDir = { x, y };
}

const keyMap = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  z: [0, -1], q: [-1, 0]
};

document.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  if (keyMap[k]) {
    e.preventDefault();
    const [x, y] = keyMap[k];
    setDirection(x, y);
    return;
  }

  if (k === ' ') {
    e.preventDefault();
    if (running && !gameOver) togglePause();
    else startGame();
  }
  if (k === 'p' || k === 'P') { if (running && !gameOver) togglePause(); }
  if (k === 'r' || k === 'R') { startGame(); }
});

function togglePause() {
  paused = !paused;
  if (paused) {
    overlayTitle.textContent = '⏸ Pause';
    overlayText.textContent = 'Appuie sur Espace ou P pour reprendre.';
    startBtn.textContent = 'Reprendre';
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
    lastTime = 0;
  }
}

// Boutons tactiles
startBtn.addEventListener('click', () => {
  if (paused && running && !gameOver) { togglePause(); return; }
  startGame();
});

document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const map = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [x, y] = map[btn.dataset.dir];
    setDirection(x, y);
  });
});

// Glissement tactile (swipe)
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 1 : -1, 0);
  else setDirection(0, dy > 0 ? 1 : -1);
  touchStart = null;
}, { passive: true });

/* ---------- Démarrage ---------- */
function startGame() {
  reset();
  running = true;
  paused = false;
  lastTime = 0;
  overlay.classList.add('hidden');
  requestAnimationFrame(loop);
}

reset();
</script>
