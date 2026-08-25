'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Registro de skins. Cada skin define dos paletas (dark / light) y su funcion de
// dibujo. El indice 1-7 que viaja dentro de la forma de la pieza no cambia:
// cada paleta es un array de 8 posiciones con null en el indice 0.
const SKINS = {
  retro: {
    label: 'Retro',
    palettes: {
      dark: [
        null,
        '#4dd0e1', // I - cyan
        '#ffd54f', // O - yellow
        '#ba68c8', // T - purple
        '#81c784', // S - green
        '#e57373', // Z - red
        '#64b5f6', // J - blue
        '#ffb74d', // L - orange
      ],
      light: [
        null,
        '#00acc1',
        '#f9a825',
        '#8e24aa',
        '#43a047',
        '#e53935',
        '#1e88e5',
        '#f57c00',
      ],
    },
    draw: drawBlockRetro,
  },
  neon: {
    label: 'Neon',
    palettes: {
      dark: [
        null,
        '#00ffff',
        '#ffee00',
        '#ff3cff',
        '#39ff14',
        '#ff2d55',
        '#3d8bff',
        '#ff9500',
      ],
      light: [
        null,
        '#0097a7',
        '#e6a100',
        '#c000c0',
        '#1faa00',
        '#e00030',
        '#1046d8',
        '#e05e00',
      ],
    },
    draw: drawBlockNeon,
  },
  pastel: {
    label: 'Pastel',
    palettes: {
      dark: [
        null,
        '#8fdfe8',
        '#ffe6a3',
        '#d7b3e8',
        '#a8e6b8',
        '#f5a9a9',
        '#a9c9f5',
        '#ffd0a3',
      ],
      light: [
        null,
        '#5fbfd0',
        '#e8c46a',
        '#bc8fd6',
        '#7fcf95',
        '#e88b8b',
        '#7fa9e0',
        '#eaa96a',
      ],
    },
    draw: drawBlockPastel,
  },
  pixel: {
    label: 'Pixel art',
    palettes: {
      dark: [
        null,
        '#00e0e0',
        '#e8e800',
        '#c000c0',
        '#00c000',
        '#e02020',
        '#2060e0',
        '#e07000',
      ],
      light: [
        null,
        '#00a8a8',
        '#c8a000',
        '#900090',
        '#008a00',
        '#b01818',
        '#1848a8',
        '#a85800',
      ],
    },
    draw: drawBlockPixel,
  },
};

const DEFAULT_SKIN = 'retro';
const SKIN_STORAGE_KEY = 'tetris-skin';

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
const pauseMenu = document.getElementById('pause-menu');
const resumeBtn = document.getElementById('resume-btn');
const menuRestartBtn = document.getElementById('menu-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const controlsPanel = document.getElementById('controls-panel');
const startLevelSel = document.getElementById('start-level');
const skinSelect = document.getElementById('skin-select');

let board, current, next, score, lines, level, startLevel, paused, gameOver, lastTime, dropAccum, dropInterval, animId, gridColor;
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

// Preferencias (fuera de init(): no son estado de partida).
let skin = DEFAULT_SKIN;
let isLight = false;

function readGridColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim();
}

function applyTheme(light) {
  isLight = light;
  document.body.classList.toggle('light-theme', isLight);
  gridColor = readGridColor();
  draw();
  drawNext();
}

function palette() {
  return SKINS[skin].palettes[isLight ? 'light' : 'dark'];
}

function applySkin(name, repaint = true) {
  if (!SKINS[name]) name = DEFAULT_SKIN;
  for (const key of Object.keys(SKINS)) {
    document.body.classList.toggle('skin-' + key, key === name);
  }
  skin = name;
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, name);
  } catch (e) {
    /* modo privado: la preferencia no se persiste */
  }
  gridColor = readGridColor();
  if (repaint) {
    draw();
    drawNext();
  }
}

function readStoredSkin() {
  try {
    const stored = localStorage.getItem(SKIN_STORAGE_KEY);
    if (stored && SKINS[stored]) return stored;
  } catch (e) {
    /* modo privado: se usa el skin por defecto */
  }
  return DEFAULT_SKIN;
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
    level = startLevel + Math.floor(lines / 10);
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

// Dispatcher: mantiene la firma original (coordenadas de celda) y delega en la
// funcion de dibujo del skin activo con las coordenadas ya en pixeles.
function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = palette()[colorIndex];
  SKINS[skin].draw(context, x * size, y * size, color, size, alpha);
}

function drawBlockRetro(context, px, py, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(px + 1, py + 1, size - 2, 4);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function drawBlockNeon(context, px, py, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  // El nucleo se oscurece sobre fondo oscuro y se aclara sobre fondo claro, para
  // que el tubo de neon contraste en los dos temas.
  context.fillStyle = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 10, 22, 0.55)';
  context.fillRect(px + 1, py + 1, size - 2, size - 2);
  context.shadowColor = color;
  context.shadowBlur = size * (isLight ? 0.5 : 0.4);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.strokeRect(px + 2, py + 2, size - 4, size - 4);
  // Sobre fondo claro un solo trazo pierde el halo: se repasa para intensificarlo.
  if (isLight) context.strokeRect(px + 2, py + 2, size - 4, size - 4);
  // El reset es imprescindible: si no, el glow contamina el grid y el canvas de NEXT.
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
  context.globalAlpha = 1;
}

function drawBlockPastel(context, px, py, color, size, alpha) {
  const radius = Math.max(2, size * 0.22);
  const x = px + 1.5;
  const y = py + 1.5;
  const w = size - 3;
  const h = size - 3;
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  if (typeof context.roundRect === 'function') {
    context.beginPath();
    context.roundRect(x, y, w, h, radius);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.28)';
    context.beginPath();
    context.roundRect(x + w * 0.18, y + h * 0.16, w * 0.64, h * 0.2, radius * 0.5);
    context.fill();
  } else {
    context.fillRect(x, y, w, h);
    context.fillStyle = 'rgba(255,255,255,0.28)';
    context.fillRect(x + w * 0.18, y + h * 0.16, w * 0.64, h * 0.2);
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
}

function drawBlockPixel(context, px, py, color, size, alpha) {
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(px, py, size, size);
  // Rejilla de "pixeles" alternando luz y sombra (look 8-bit).
  const step = Math.max(4, Math.round(size / 6));
  for (let yy = 0; yy < size; yy += step) {
    for (let xx = 0; xx < size; xx += step) {
      const even = ((xx / step) + (yy / step)) % 2 === 0;
      context.fillStyle = even ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)';
      context.fillRect(px + xx, py + yy, Math.min(step, size - xx), Math.min(step, size - yy));
    }
  }
  context.strokeStyle = 'rgba(0,0,0,0.55)';
  context.lineWidth = 1;
  context.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
  context.globalAlpha = 1;
  context.shadowBlur = 0;
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
  pauseMenu.classList.add('hidden');
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

function hideControlsPanel() {
  controlsPanel.classList.add('hidden');
  controlsBtn.textContent = 'Ver controles';
}

function resumeGame() {
  if (gameOver || !paused) return;
  paused = false;
  pauseMenu.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}

function pauseGame() {
  if (gameOver || paused) return;
  paused = true;
  cancelAnimationFrame(animId);
  hideControlsPanel();
  pauseMenu.classList.remove('hidden');
  resumeBtn.focus();
}

function togglePause() {
  if (gameOver) return;
  if (paused) resumeGame();
  else pauseGame();
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
  startLevel = Number(startLevelSel.value) || 1;
  level = startLevel;
  combo = 0;
  bestComboRun = 0;
  paused = false;
  gameOver = false;
  started = true;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  dropAccum = 0;
  lastTime = performance.now();
  gridColor = readGridColor();
  next = randomPiece();
  spawn();
  updateHUD();
  startScreen.classList.add('hidden');
  overlay.classList.add('hidden');
  pauseMenu.classList.add('hidden');
  hideControlsPanel();
  nameEntry.classList.add('hidden');
  overlayRecords.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!started || gameOver) return;
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    togglePause();
    return;
  }
  if (paused) return;
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

resumeBtn.addEventListener('click', resumeGame);

menuRestartBtn.addEventListener('click', init);

controlsBtn.addEventListener('click', () => {
  const shown = controlsPanel.classList.toggle('hidden');
  controlsBtn.textContent = shown ? 'Ver controles' : 'Ocultar controles';
});

startLevelSel.addEventListener('change', () => {
  startLevelSel.blur();
});

themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked));

skinSelect.addEventListener('change', () => applySkin(skinSelect.value));

// Skin guardado: se aplica sin repintar (aun no hay tablero) y despues arranca la pantalla de inicio.
applySkin(readStoredSkin(), false);
skinSelect.value = skin;

records = loadRecords();
showStartScreen();
