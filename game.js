'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - blue
  '#ffb74d', // L - orange
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const RECORDS_KEY = 'tetris-records-v1';
const MAX_RECORDS = 5;
const MAX_NAME_LENGTH = 12;
const COMBO_BONUS = 50;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const overlayRecords = document.getElementById('overlay-records');
const nameEntry = document.getElementById('name-entry');
const nameMessage = document.getElementById('name-message');
const nameInput = document.getElementById('player-name');
const saveNameBtn = document.getElementById('save-name-btn');
const restartBtn = document.getElementById('restart-btn');
const startScreen = document.getElementById('start-screen');
const startRecords = document.getElementById('start-records');
const playBtn = document.getElementById('play-btn');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const themeToggle = document.getElementById('theme-toggle');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId, gridColor;
let combo, bestComboRun, started = false;
let records;

/* ---------- Records en localStorage ---------- */

function defaultRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return defaultRecords();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !Array.isArray(data.top)) return defaultRecords();
    const top = data.top
      .filter(e => e && typeof e === 'object' && Number.isFinite(Number(e.score)))
      .map(e => ({
        name: String(e.name ?? 'ANON').slice(0, MAX_NAME_LENGTH) || 'ANON',
        score: Number(e.score) || 0,
        lines: Number(e.lines) || 0,
        level: Number(e.level) || 1,
        bestCombo: Number(e.bestCombo) || 0,
        date: typeof e.date === 'string' ? e.date : '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECORDS);
    return {
      top,
      bestCombo: Number(data.bestCombo) || 0,
      maxLines: Number(data.maxLines) || 0,
    };
  } catch (err) {
    return defaultRecords();
  }
}

function saveRecords(data) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(data));
  } catch (err) {
    /* modo privado o almacenamiento bloqueado: el juego sigue funcionando */
  }
}

function qualifiesForTop(value) {
  return records.top.length < MAX_RECORDS || value > records.top[records.top.length - 1].score;
}

function insertRecord(entry) {
  records.top.push(entry);
  records.top.sort((a, b) => b.score - a.score);
  records.top = records.top.slice(0, MAX_RECORDS);
  saveRecords(records);
  return records.top.indexOf(entry);
}

function resetRecords() {
  try {
    localStorage.removeItem(RECORDS_KEY);
  } catch (err) {
    /* nada que hacer */
  }
  records = defaultRecords();
  renderRecords(startRecords, -1);
  renderRecords(overlayRecords, -1);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function renderRecords(container, highlightIndex) {
  if (!container) return;
  let html = '<p class="records-title">MEJORES PUNTUACIONES</p>';
  if (!records.top.length) {
    html += '<p class="records-empty">Todavía no hay records. ¡Sé el primero!</p>';
  } else {
    html += '<table class="records-table"><thead><tr>' +
      '<th>#</th><th>Nombre</th><th>Puntos</th><th>Líneas</th><th>Combo</th>' +
      '</tr></thead><tbody>';
    records.top.forEach((entry, i) => {
      const cls = i === highlightIndex ? ' class="record-highlight"' : '';
      html += `<tr${cls}><td>${i + 1}</td><td>${escapeHTML(entry.name)}</td>` +
        `<td>${entry.score.toLocaleString()}</td><td>${entry.lines}</td><td>${entry.bestCombo}</td></tr>`;
    });
    html += '</tbody></table>';
  }
  html += '<div class="records-bests">' +
    `<span>Mejor combo: <strong>${records.bestCombo}</strong></span>` +
    `<span>Líneas máximas: <strong>${records.maxLines}</strong></span>` +
    '</div>';
  container.innerHTML = html;
}

/* ---------- Tema ---------- */

function readGridColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim();
}

function applyTheme(isLight) {
  document.body.classList.toggle('light-theme', isLight);
  gridColor = readGridColor();
  draw();
}

/* ---------- Juego ---------- */

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    combo++;
    if (combo > bestComboRun) bestComboRun = combo;
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    if (combo > 1) score += COMBO_BONUS * (combo - 1) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  } else {
    combo = 0;
  }
  updateHUD();
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? `x${combo}` : '—';
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (gameOver || !current) return;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!next) return;
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  started = false;
  cancelAnimationFrame(animId);

  if (bestComboRun > records.bestCombo) records.bestCombo = bestComboRun;
  if (lines > records.maxLines) records.maxLines = lines;
  saveRecords(records);

  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent =
    `Puntuación: ${score.toLocaleString()} · Líneas: ${lines} · Mejor combo: ${bestComboRun}`;

  const qualifies = qualifiesForTop(score);
  if (qualifies) {
    nameMessage.textContent = '¡Entras en el top! Escribe tu nombre:';
    nameInput.value = '';
    nameEntry.classList.remove('hidden');
  } else {
    nameEntry.classList.add('hidden');
  }

  renderRecords(overlayRecords, -1);
  overlayRecords.classList.remove('hidden');
  overlay.classList.remove('hidden');
  if (qualifies) nameInput.focus();
}

function saveCurrentScore() {
  if (nameEntry.classList.contains('hidden')) return;
  const name = nameInput.value.trim().slice(0, MAX_NAME_LENGTH) || 'ANON';
  const index = insertRecord({
    name,
    score,
    lines,
    level,
    bestCombo: bestComboRun,
    date: new Date().toISOString(),
  });
  nameEntry.classList.add('hidden');
  renderRecords(overlayRecords, index);
  renderRecords(startRecords, -1);
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlayRecords.innerHTML = '';
    overlayRecords.classList.add('hidden');
    nameEntry.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return;
  animId = requestAnimationFrame(loop);
}

function showStartScreen() {
  started = false;
  paused = false;
  gameOver = false;
  board = createBoard();
  current = null;
  next = null;
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  bestComboRun = 0;
  gridColor = readGridColor();
  cancelAnimationFrame(animId);
  updateHUD();
  drawNext();
  draw();
  overlay.classList.add('hidden');
  nameEntry.classList.add('hidden');
  renderRecords(startRecords, -1);
  startScreen.classList.remove('hidden');
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  bestComboRun = 0;
  paused = false;
  gameOver = false;
  started = true;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  gridColor = readGridColor();
  next = randomPiece();
  spawn();
  updateHUD();
  startScreen.classList.add('hidden');
  overlay.classList.add('hidden');
  nameEntry.classList.add('hidden');
  overlayRecords.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!started) return;
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
playBtn.addEventListener('click', init);
saveNameBtn.addEventListener('click', saveCurrentScore);

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveCurrentScore();
  }
});

resetRecordsBtn.addEventListener('click', () => {
  if (confirm('¿Seguro que quieres borrar todos los records?')) resetRecords();
});

themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked));

records = loadRecords();
showStartScreen();
