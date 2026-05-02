/* ============================================================
   MeuQuartinho - game.js
   Jogo estilo Habbo para tablet/mobile usando Phaser 3
   Totalmente offline (sem backend)
   ============================================================ */

// ============================================================
// CONFIGURAÇÃO GLOBAL DO AVATAR
// ============================================================
const AvatarConfig = {
  skin: 0,        // 0=claro, 1=médio, 2=escuro
  hair: 0,        // 0=liso, 1=cacheado, 2=trança
  outfit: 0,      // 0=rosa, 1=amarelo, 2=azul, 3=verde, 4=lilás
};

// Paletas de cores para o avatar (pixel art)
const SKIN_COLORS = ['#FFDBB4', '#C68642', '#8D5524'];
const SKIN_SHADOW = ['#E8B88A', '#A0652D', '#6B3D15'];
const HAIR_COLORS = ['#FFD700', '#8B4513', '#CC2200'];
const OUTFIT_COLORS = ['#FF6B9D', '#FFD93D', '#6BCEFF', '#6BFFB8', '#B48BFF'];
const OUTFIT_DARK   = ['#CC3366', '#CCB000', '#3399CC', '#33CC88', '#7755CC'];

// ============================================================
// CATÁLOGO DE MÓVEIS (definição)
// ============================================================
const FURNITURE_CATALOG = [
  { id: 'bed',     name: 'Cama',    emoji: '🛏️',  color: '#FF9BB5', dark: '#CC6688', w: 2, h: 1, canSit: true  },
  { id: 'sofa',    name: 'Sofá',    emoji: '🛋️',  color: '#B48BFF', dark: '#7755CC', w: 2, h: 1, canSit: true  },
  { id: 'chair',   name: 'Cadeira', emoji: '🪑',  color: '#FFD93D', dark: '#CCB000', w: 1, h: 1, canSit: true  },
  { id: 'table',   name: 'Mesa',    emoji: '🪵',  color: '#C8A96E', dark: '#8B6840', w: 2, h: 1, canSit: false },
  { id: 'plant',   name: 'Planta',  emoji: '🌿',  color: '#6BFFB8', dark: '#33CC88', w: 1, h: 1, canSit: false },
  { id: 'carpet',  name: 'Tapete',  emoji: '🟥',  color: '#FF6B6B', dark: '#CC3333', w: 2, h: 2, canSit: false },
  { id: 'bear',    name: 'Ursinho', emoji: '🧸',  color: '#C8A96E', dark: '#8B6840', w: 1, h: 1, canSit: false },
];

// ============================================================
// ESTADO DO JOGO (móveis posicionados no quarto)
// ============================================================
let roomFurniture = []; // { id, furniId, col, row, rotation, zIndex }
let nextFurniId = 1;

// ============================================================
// ESTADO DO AVATAR
// ============================================================
let avatarState = {
  col: 4,
  row: 4,
  x: 0,
  y: 0,
  anim: 'idle',    // idle | walk | sit | dance1 | dance2
  facing: 'right', // left | right
  animFrame: 0,
  animTimer: 0,
};

// ============================================================
// UTILITÁRIO: Toast de feedback na UI
// ============================================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 2000);
}

// ============================================================
// SALVAR / CARREGAR estado no localStorage
// ============================================================
function saveGame() {
  const data = {
    avatar: { ...AvatarConfig },
    furniture: roomFurniture.map(f => ({ ...f })),
    nextFurniId,
  };
  localStorage.setItem('meuquartinho_v1', JSON.stringify(data));
  showToast('💾 Jogo salvo!');
}

function loadGame() {
  try {
    const raw = localStorage.getItem('meuquartinho_v1');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.avatar) Object.assign(AvatarConfig, data.avatar);
    if (data.furniture) roomFurniture = data.furniture;
    if (data.nextFurniId) nextFurniId = data.nextFurniId;
  } catch (e) {
    console.warn('Erro ao carregar save:', e);
  }
}

// ============================================================
// ISOMÉTRICO: converter tile (col, row) em pixels na tela
// ============================================================
// A grade isométrica usa tiles de 64x32 pixels
const TILE_W = 64;
const TILE_H = 32;
const ROOM_COLS = 9;
const ROOM_ROWS = 9;

function isoToScreen(col, row, originX, originY) {
  const x = originX + (col - row) * (TILE_W / 2);
  const y = originY + (col + row) * (TILE_H / 2);
  return { x, y };
}

// ============================================================
// DESENHO DO AVATAR (pixel art via Graphics do Phaser)
// ============================================================

/**
 * Desenha o avatar numa Graphics do Phaser.
 * @param {Phaser.GameObjects.Graphics} g  - objeto Graphics
 * @param {number} cx  - centro X
 * @param {number} cy  - base Y (pés do personagem)
 * @param {string} anim - nome da animação
 * @param {number} frame - frame atual da animação
 * @param {string} facing - 'left' ou 'right'
 */
function drawAvatar(g, cx, cy, anim, frame, facing) {
  const skin   = SKIN_COLORS[AvatarConfig.skin];
  const skinSh = SKIN_SHADOW[AvatarConfig.skin];
  const hair   = HAIR_COLORS[AvatarConfig.hair];
  const outfit = OUTFIT_COLORS[AvatarConfig.outfit];
  const outDk  = OUTFIT_DARK[AvatarConfig.outfit];

  g.clear();

  // Offsets de animação
  let legOff = 0, armOff = 0, bodyOff = 0, headOff = 0;

  if (anim === 'walk') {
    legOff  = frame % 2 === 0 ? 2 : -2;
    armOff  = frame % 2 === 0 ? -2 : 2;
    headOff = frame % 2 === 0 ? -1 : 1;
  } else if (anim === 'sit') {
    legOff  = 4;
    bodyOff = 4;
    headOff = 4;
  } else if (anim === 'dance1') {
    bodyOff = frame % 2 === 0 ? -3 : 3;
    armOff  = frame % 2 === 0 ? -4 : 4;
    headOff = frame % 2 === 0 ? -2 : 2;
  } else if (anim === 'dance2') {
    legOff  = frame % 4 < 2 ? 3 : -3;
    armOff  = frame % 4 < 2 ? 5 : -5;
    headOff = frame % 2 === 0 ? 0 : -2;
  }

  const flip = facing === 'left' ? -1 : 1;

  // --- PERNAS ---
  g.fillStyle(outDk, 1);
  // perna esquerda
  g.fillRect(cx - 8 * flip, cy - 20 + bodyOff + legOff, 7, 20);
  // perna direita
  g.fillRect(cx + 1 * flip, cy - 20 + bodyOff - legOff, 7, 20);

  // --- SAPATOS ---
  g.fillStyle('#333', 1);
  g.fillRect(cx - 10 * flip, cy - 2 + bodyOff + legOff, 10, 4);
  g.fillRect(cx + 0 * flip,  cy - 2 + bodyOff - legOff, 10, 4);

  // --- CORPO (vestido/roupa) ---
  g.fillStyle(outfit, 1);
  g.fillRect(cx - 12, cy - 48 + bodyOff, 24, 30);

  // detalhe no centro da roupa
  g.fillStyle(outDk, 1);
  g.fillRect(cx - 3, cy - 48 + bodyOff, 6, 30);

  // --- BRAÇOS ---
  g.fillStyle(skin, 1);
  // braço esquerdo
  g.fillRect(cx - 18 * flip, cy - 46 + bodyOff + armOff, 7, 22);
  // braço direito
  g.fillRect(cx + 11 * flip, cy - 46 + bodyOff - armOff, 7, 22);

  // manga da roupa nos braços
  g.fillStyle(outfit, 1);
  g.fillRect(cx - 18 * flip, cy - 46 + bodyOff + armOff, 7, 10);
  g.fillRect(cx + 11 * flip, cy - 46 + bodyOff - armOff, 7, 10);

  // --- PESCOÇO ---
  g.fillStyle(skin, 1);
  g.fillRect(cx - 4, cy - 52 + headOff + bodyOff, 8, 6);

  // --- CABEÇA ---
  g.fillStyle(skin, 1);
  g.fillRoundedRect(cx - 14, cy - 78 + headOff + bodyOff, 28, 28, 8);

  // sombra rosto
  g.fillStyle(skinSh, 1);
  g.fillRect(cx - 6 * flip, cy - 78 + headOff + bodyOff + 12, 10, 8);

  // --- OLHOS ---
  g.fillStyle('#FFFFFF', 1);
  g.fillRect(cx - 8 * flip, cy - 72 + headOff + bodyOff, 6, 5);
  g.fillRect(cx + 2 * flip,  cy - 72 + headOff + bodyOff, 6, 5);

  g.fillStyle('#222', 1);
  g.fillRect(cx - 6 * flip, cy - 71 + headOff + bodyOff, 3, 3);
  g.fillRect(cx + 3 * flip,  cy - 71 + headOff + bodyOff, 3, 3);

  // bochecha corada
  g.fillStyle('#FFB3C8', 0.7);
  g.fillCircle(cx - 10 * flip, cy - 66 + headOff + bodyOff, 4);
  g.fillCircle(cx + 10 * flip,  cy - 66 + headOff + bodyOff, 4);

  // --- BOCA ---
  g.fillStyle('#CC5577', 1);
  g.fillRect(cx - 4, cy - 62 + headOff + bodyOff, 8, 3);

  // --- CABELO ---
  g.fillStyle(hair, 1);
  if (AvatarConfig.hair === 0) {
    // liso
    g.fillRoundedRect(cx - 16, cy - 82 + headOff + bodyOff, 32, 16, 6);
    g.fillRect(cx - 16, cy - 74 + headOff + bodyOff, 4, 22); // franja lateral
    g.fillRect(cx + 12, cy - 74 + headOff + bodyOff, 4, 22);
  } else if (AvatarConfig.hair === 1) {
    // cacheado
    g.fillCircle(cx - 12, cy - 80 + headOff + bodyOff, 10);
    g.fillCircle(cx + 12, cy - 80 + headOff + bodyOff, 10);
    g.fillCircle(cx,      cy - 86 + headOff + bodyOff, 10);
    g.fillCircle(cx,      cy - 74 + headOff + bodyOff, 8);
  } else {
    // trança
    g.fillRoundedRect(cx - 16, cy - 84 + headOff + bodyOff, 32, 14, 5);
    g.fillRect(cx - 4, cy - 72 + headOff + bodyOff, 8, 36); // trança
    // detalhe trança
    g.fillStyle('#AA0000', 1);
    for (let i = 0; i < 4; i++) {
      g.fillRect(cx - 6, cy - 68 + headOff + bodyOff + i * 9, 12, 3);
    }
  }

  // --- ENFEITE no cabelo ---
  g.fillStyle('#FF69B4', 1);
  g.fillCircle(cx + 8, cy - 85 + headOff + bodyOff, 5);
  g.fillStyle('#FFFFFF', 1);
  g.fillCircle(cx + 9, cy - 86 + headOff + bodyOff, 2);
}

// ============================================================
// DESENHO DO AVATAR NO CANVAS PREVIEW (tela de customização)
// ============================================================
function drawAvatarPreview() {
  const canvas = document.getElementById('avatarPreview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Simulamos o Phaser Graphics com Canvas 2D nativo
  const g = {
    _ctx: ctx,
    _alpha: 1,
    fillStyle(color, alpha) {
      this._alpha = alpha !== undefined ? alpha : 1;
      this._ctx.fillStyle = color;
      this._ctx.globalAlpha = this._alpha;
    },
    fillRect(x, y, w, h) { this._ctx.fillRect(x, y, w, h); },
    fillRoundedRect(x, y, w, h, r) {
      this._ctx.beginPath();
      this._ctx.roundRect(x, y, w, h, r);
      this._ctx.fill();
    },
    fillCircle(x, y, r) {
      this._ctx.beginPath();
      this._ctx.arc(x, y, r, 0, Math.PI * 2);
      this._ctx.fill();
    },
    clear() {
      this._ctx.clearRect(0, 0, canvas.width, canvas.height);
      this._ctx.globalAlpha = 1;
    },
  };

  // Fundo com gradiente
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#2D0B55');
  grad.addColorStop(1, '#0B1F55');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Desenha avatar centralizado
  drawAvatar(g, canvas.width / 2, canvas.height - 10, 'idle', 0, 'right');
}

// ============================================================
// TELA DE CUSTOMIZAÇÃO - lógica dos botões
// ============================================================
function initCustomizeScreen() {
  // Atualiza seleção visual dos botões
  function updateBtns(cls, attr, val) {
    document.querySelectorAll('.' + cls).forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset[attr]) === val);
    });
  }

  // Pele
  document.querySelectorAll('.skin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AvatarConfig.skin = parseInt(btn.dataset.skin);
      updateBtns('skin-btn', 'skin', AvatarConfig.skin);
      drawAvatarPreview();
    });
  });

  // Cabelo
  document.querySelectorAll('.hair-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AvatarConfig.hair = parseInt(btn.dataset.hair);
      updateBtns('hair-btn', 'hair', AvatarConfig.hair);
      drawAvatarPreview();
    });
  });

  // Roupa
  document.querySelectorAll('.outfit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      AvatarConfig.outfit = parseInt(btn.dataset.outfit);
      updateBtns('outfit-btn', 'outfit', AvatarConfig.outfit);
      drawAvatarPreview();
    });
  });

  // Botão jogar
  document.getElementById('btnPlay').addEventListener('click', () => {
    document.getElementById('customizeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    startGame();
  });

  // Preview inicial
  drawAvatarPreview();
}

// ============================================================
// CATÁLOGO DE MÓVEIS NA UI
// ============================================================
let selectedFurniType = null; // tipo de móvel selecionado para colocar

function buildCatalog() {
  const container = document.getElementById('catalogItems');
  container.innerHTML = '';

  FURNITURE_CATALOG.forEach(def => {
    const div = document.createElement('div');
    div.className = 'catalog-item';
    div.innerHTML = `
      <span class="item-emoji">${def.emoji}</span>
      <span>${def.name}</span>
    `;
    div.addEventListener('click', () => {
      // Seleciona o tipo de móvel para colocar no quarto
      document.querySelectorAll('.catalog-item').forEach(d => d.classList.remove('selected'));
      if (selectedFurniType === def.id) {
        selectedFurniType = null; // deseleciona
      } else {
        selectedFurniType = def.id;
        div.classList.add('selected');
        showToast(`${def.emoji} Toque no chão para colocar`);
      }
    });
    container.appendChild(div);
  });
}

// ============================================================
// INICIAR PHASER GAME
// ============================================================
let phaserGame = null;

function startGame() {
  if (phaserGame) {
    phaserGame.destroy(true);
    phaserGame = null;
  }

  // Tamanho do container
  const container = document.getElementById('gameContainer');

  const config = {
    type: Phaser.AUTO,
    parent: 'gameContainer',
    width: container.clientWidth || 600,
    height: container.clientHeight || 500,
    backgroundColor: '#1A0533',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: {
      preload: scenePreload,
      create: sceneCreate,
      update: sceneUpdate,
    },
    // Desativa o banner do Phaser no console
    banner: false,
  };

  phaserGame = new Phaser.Game(config);
}

// ============================================================
// CENA PHASER - variáveis globais da cena
// ============================================================
let scene;           // referência à cena ativa
let roomOriginX;     // ponto de origem isométrico na tela
let roomOriginY;
let floorGraphics;   // Graphics para o chão
let furniGroup;      // Group dos sprites de móveis
let avatarGraphics;  // Graphics do avatar
let furniGraphicsMap = {}; // id -> Graphics dos móveis

// Móvel selecionado no quarto (para girar/deletar)
let selectedRoomFurni = null;

// Alvo de movimento do avatar
let moveTarget = null;

// Pathfinding simples: calcula próximo passo
function stepToward(fromCol, fromRow, toCol, toRow) {
  const dc = Math.sign(toCol - fromCol);
  const dr = Math.sign(toRow - fromRow);
  if (dc !== 0) return { col: fromCol + dc, row: fromRow };
  if (dr !== 0) return { col: fromCol, row: fromRow + dr };
  return null;
}

// ============================================================
// PRELOAD
// ============================================================
function scenePreload() {
  scene = this;
  // Não há assets externos - tudo desenhado via Graphics (pixel art procedural)
}

// ============================================================
// CREATE
// ============================================================
function sceneCreate() {
  scene = this;

  computeRoomOrigin();

  // Desenha o chão isométrico
  floorGraphics = scene.add.graphics();
  drawFloor();

  // Desenha paredes
  drawWalls();

  // Grupo para móveis
  furniGroup = scene.add.group();

  // Recarrega móveis salvos
  roomFurniture.forEach(f => {
    createFurniGraphic(f);
  });

  // Avatar Graphics
  avatarGraphics = scene.add.graphics();
  updateAvatarPosition();
  redrawAvatar();

  // Configurar input touch/mouse no chão
  scene.input.on('pointerdown', onPointerDown, scene);

  // Resize handler
  scene.scale.on('resize', onResize, scene);

  // Botões de ação
  document.getElementById('btnDance1').addEventListener('click', () => {
    avatarState.anim = 'dance1';
    avatarState.animFrame = 0;
    selectedRoomFurni = null;
    showToast('💃 Dançando!');
  });
  document.getElementById('btnDance2').addEventListener('click', () => {
    avatarState.anim = 'dance2';
    avatarState.animFrame = 0;
    selectedRoomFurni = null;
    showToast('🕺 Funk!');
  });
  document.getElementById('btnSit').addEventListener('click', () => {
    avatarState.anim = 'sit';
    avatarState.animFrame = 0;
    moveTarget = null;
    selectedRoomFurni = null;
    showToast('🪑 Sentando...');
  });
  document.getElementById('btnIdle').addEventListener('click', () => {
    avatarState.anim = 'idle';
    avatarState.animFrame = 0;
    moveTarget = null;
    selectedRoomFurni = null;
  });

  // Botão salvar
  document.getElementById('btnSave').addEventListener('click', saveGame);

  // Botão reset
  document.getElementById('btnReset').addEventListener('click', () => {
    if (confirm('Apagar todos os móveis do quarto?')) {
      roomFurniture = [];
      nextFurniId = 1;
      // Remove todos os Graphics de móveis
      Object.values(furniGraphicsMap).forEach(obj => {
        if (obj.gfx) obj.gfx.destroy();
        if (obj.label) obj.label.destroy();
        if (obj.btnBar) obj.btnBar.destroy();
      });
      furniGraphicsMap = {};
      selectedRoomFurni = null;
      showToast('🗑️ Quarto limpo!');
    }
  });

  // Botão customizar
  document.getElementById('btnCustomize').addEventListener('click', () => {
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('customizeScreen').classList.add('active');
    drawAvatarPreview();
  });
}

// ============================================================
// Calcula origem do grid isométrico centralizado na tela
// ============================================================
function computeRoomOrigin() {
  const w = scene.scale.width;
  const h = scene.scale.height;
  // Centraliza o grid horizontalmente
  roomOriginX = w / 2;
  // Ajusta verticalmente para caber na tela
  roomOriginY = h * 0.18;
}

// ============================================================
// DESENHO DO CHÃO ISOMÉTRICO
// ============================================================
function drawFloor() {
  floorGraphics.clear();

  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const { x, y } = isoToScreen(col, row, roomOriginX, roomOriginY);

      // Alternar cor para efeito quadriculado
      const isLight = (col + row) % 2 === 0;
      const fillColor = isLight ? 0x9B7FD4 : 0x7A5CB5;

      floorGraphics.fillStyle(fillColor, 1);

      // Desenha losango (tile isométrico)
      floorGraphics.fillPoints([
        { x: x,              y: y + TILE_H / 2 },  // topo
        { x: x + TILE_W / 2, y: y + TILE_H },       // direita
        { x: x,              y: y + TILE_H * 1.5 }, // fundo
        { x: x - TILE_W / 2, y: y + TILE_H },       // esquerda
      ], true);

      // Borda do tile
      floorGraphics.lineStyle(1, 0x5A3A9A, 0.6);
      floorGraphics.strokePoints([
        { x: x,              y: y + TILE_H / 2 },
        { x: x + TILE_W / 2, y: y + TILE_H },
        { x: x,              y: y + TILE_H * 1.5 },
        { x: x - TILE_W / 2, y: y + TILE_H },
      ], true);
    }
  }
}

// ============================================================
// DESENHO DAS PAREDES
// ============================================================
function drawWalls() {
  const walls = scene.add.graphics();

  // Parede de fundo esquerda (ao longo da coluna 0)
  for (let row = 0; row < ROOM_ROWS; row++) {
    const { x, y } = isoToScreen(0, row, roomOriginX, roomOriginY);
    const wallH = 80;

    walls.fillStyle(0xD4B0F5, 1);
    walls.fillPoints([
      { x: x - TILE_W / 2, y: y + TILE_H },
      { x: x,              y: y + TILE_H / 2 },
      { x: x,              y: y + TILE_H / 2 - wallH },
      { x: x - TILE_W / 2, y: y + TILE_H - wallH },
    ], true);

    walls.lineStyle(1, 0xA070C0, 0.5);
    walls.strokePoints([
      { x: x - TILE_W / 2, y: y + TILE_H },
      { x: x,              y: y + TILE_H / 2 },
      { x: x,              y: y + TILE_H / 2 - wallH },
      { x: x - TILE_W / 2, y: y + TILE_H - wallH },
    ], true);
  }

  // Parede de fundo direita (ao longo da row 0)
  for (let col = 0; col < ROOM_COLS; col++) {
    const { x, y } = isoToScreen(col, 0, roomOriginX, roomOriginY);
    const wallH = 80;

    walls.fillStyle(0xE8D0FF, 1);
    walls.fillPoints([
      { x: x,              y: y + TILE_H / 2 },
      { x: x + TILE_W / 2, y: y + TILE_H },
      { x: x + TILE_W / 2, y: y + TILE_H - wallH },
      { x: x,              y: y + TILE_H / 2 - wallH },
    ], true);

    walls.lineStyle(1, 0xA070C0, 0.5);
    walls.strokePoints([
      { x: x,              y: y + TILE_H / 2 },
      { x: x + TILE_W / 2, y: y + TILE_H },
      { x: x + TILE_W / 2, y: y + TILE_H - wallH },
      { x: x,              y: y + TILE_H / 2 - wallH },
    ], true);
  }

  // Detalhes decorativos nas paredes
  drawWallDecorations(walls);
}

function drawWallDecorations(g) {
  // Quadro na parede esquerda
  const { x: wx, y: wy } = isoToScreen(0, 3, roomOriginX, roomOriginY);
  g.fillStyle(0xFFFFFF, 0.9);
  g.fillRect(wx - 44, wy - 42, 28, 22);
  g.fillStyle(0x88CCFF, 0.8);
  g.fillRect(wx - 43, wy - 41, 26, 20);
  // sol no quadro
  g.fillStyle(0xFFDD00, 1);
  g.fillCircle(wx - 30, wy - 31, 5);
  g.fillStyle(0x66BBFF, 0.7);
  g.fillCircle(wx - 36, wy - 34, 4);
  g.fillStyle(0x44AA44, 1);
  g.fillRect(wx - 43, wy - 26, 26, 5);

  // Janela na parede direita
  const { x: jx, y: jy } = isoToScreen(5, 0, roomOriginX, roomOriginY);
  g.fillStyle(0xFFFFFF, 0.9);
  g.fillRect(jx + 10, jy - 50, 26, 30);
  g.fillStyle(0xAADDFF, 0.8);
  g.fillRect(jx + 11, jy - 49, 24, 28);
  g.lineStyle(2, 0xFFFFFF, 1);
  g.lineBetween(jx + 23, jy - 49, jx + 23, jy - 21);
  g.lineBetween(jx + 11, jy - 35, jx + 35, jy - 35);
}

// ============================================================
// CRIAÇÃO DE GRÁFICO DE MÓVEL
// ============================================================
function createFurniGraphic(furniInst) {
  const def = FURNITURE_CATALOG.find(d => d.id === furniInst.furniId);
  if (!def) return;

  const g = scene.add.graphics();
  const label = scene.add.text(0, 0, def.emoji, {
    fontSize: '26px',
    resolution: 2,
  });
  label.setOrigin(0.5, 1);

  furniGraphicsMap[furniInst.id] = { gfx: g, label, def, inst: furniInst };

  redrawFurni(furniInst.id);

  // Touch no móvel para selecionar
  label.setInteractive({ useHandCursor: false });
  label.on('pointerdown', (pointer, lx, ly, event) => {
    event.stopPropagation();
    selectFurni(furniInst.id);
  });

  g.setInteractive(
    new Phaser.Geom.Rectangle(-40, -40, 80, 80),
    Phaser.Geom.Rectangle.Contains
  );
  g.on('pointerdown', (pointer, lx, ly, event) => {
    event.stopPropagation();
    selectFurni(furniInst.id);
  });
}

// ============================================================
// REDESENHA MÓVEL ESPECÍFICO
// ============================================================
function redrawFurni(furniId) {
  const entry = furniGraphicsMap[furniId];
  if (!entry) return;

  const { gfx, label, def, inst } = entry;
  const { x, y } = isoToScreen(inst.col, inst.row, roomOriginX, roomOriginY);

  // Posiciona label (emoji) no centro-topo do tile
  const centerX = x;
  const centerY = y + TILE_H;

  label.setPosition(centerX, centerY - 10);
  label.setDepth(inst.row * 10 + inst.col + 1);

  // Redesenha base do móvel (sombra no chão)
  gfx.clear();
  gfx.setPosition(0, 0);
  gfx.setDepth(inst.row * 10 + inst.col);

  // Sombra (elipse debaixo do móvel)
  gfx.fillStyle(0x000000, 0.2);
  gfx.fillEllipse(centerX, centerY + 5, 48, 16);

  // Destaque se selecionado
  if (selectedRoomFurni === furniId) {
    gfx.lineStyle(3, 0xFFD93D, 1);
    gfx.strokePoints([
      { x: centerX,              y: centerY - TILE_H / 2 },
      { x: centerX + TILE_W / 2, y: centerY },
      { x: centerX,              y: centerY + TILE_H / 2 },
      { x: centerX - TILE_W / 2, y: centerY },
    ], true);

    // Botões de ação sobre o móvel selecionado
    renderFurniActionButtons(furniId, centerX, centerY);
  } else {
    // Remove botões se existirem
    if (entry.btnBar) {
      entry.btnBar.forEach(b => b.destroy());
      entry.btnBar = null;
    }
  }
}

// ============================================================
// BOTÕES DE GIRAR / DELETAR sobre móvel selecionado
// ============================================================
function renderFurniActionButtons(furniId, cx, cy) {
  const entry = furniGraphicsMap[furniId];
  if (!entry) return;

  // Remove botões antigos
  if (entry.btnBar) {
    entry.btnBar.forEach(b => b.destroy());
  }

  const btnStyle = {
    fontSize: '20px',
    backgroundColor: '#1A0533',
    color: '#FFD93D',
    padding: { left: 8, right: 8, top: 4, bottom: 4 },
    borderRadius: 8,
  };

  // Botão girar
  const btnRotate = scene.add.text(cx - 30, cy - 60, '🔄', btnStyle)
    .setOrigin(0.5)
    .setDepth(500)
    .setInteractive();

  btnRotate.on('pointerdown', (p, lx, ly, evt) => {
    evt.stopPropagation();
    entry.inst.rotation = ((entry.inst.rotation || 0) + 1) % 4;
    // Para este jogo o emoji não rotaciona visivelmente, mas a lógica está pronta
    showToast('🔄 Girado!');
    redrawFurni(furniId);
  });

  // Botão deletar
  const btnDelete = scene.add.text(cx + 30, cy - 60, '🗑️', btnStyle)
    .setOrigin(0.5)
    .setDepth(500)
    .setInteractive();

  btnDelete.on('pointerdown', (p, lx, ly, evt) => {
    evt.stopPropagation();
    deleteFurni(furniId);
  });

  entry.btnBar = [btnRotate, btnDelete];
}

// ============================================================
// SELECIONAR MÓVEL NO QUARTO
// ============================================================
function selectFurni(furniId) {
  const prev = selectedRoomFurni;

  // Limpa botões do anterior
  if (prev && furniGraphicsMap[prev]) {
    const e = furniGraphicsMap[prev];
    if (e.btnBar) { e.btnBar.forEach(b => b.destroy()); e.btnBar = null; }
  }

  if (selectedRoomFurni === furniId) {
    selectedRoomFurni = null;
  } else {
    selectedRoomFurni = furniId;
    showToast('🔄 Girar   🗑️ Deletar');
  }

  // Redesenha ambos
  if (prev) redrawFurni(prev);
  if (selectedRoomFurni) redrawFurni(selectedRoomFurni);
}

// ============================================================
// DELETAR MÓVEL
// ============================================================
function deleteFurni(furniId) {
  const entry = furniGraphicsMap[furniId];
  if (!entry) return;

  if (entry.gfx) entry.gfx.destroy();
  if (entry.label) entry.label.destroy();
  if (entry.btnBar) entry.btnBar.forEach(b => b.destroy());

  delete furniGraphicsMap[furniId];
  roomFurniture = roomFurniture.filter(f => f.id !== furniId);
  selectedRoomFurni = null;
  showToast('🗑️ Removido!');
}

// ============================================================
// CONVERTER CLICK/TOUCH DE TELA PARA TILE ISOMÉTRICO
// ============================================================
function screenToTile(px, py) {
  // Origem do grid no centro isométrico
  const ox = roomOriginX;
  const oy = roomOriginY + TILE_H; // ajuste para base do tile

  // Inverso da projeção isométrica
  const dx = px - ox;
  const dy = py - oy;

  const col = Math.round((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
  const row = Math.round((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);

  return { col, row };
}

// ============================================================
// HANDLER DE POINTER DOWN (touch/click)
// ============================================================
function onPointerDown(pointer) {
  const px = pointer.x;
  const py = pointer.y;

  // Calcular tile tocado
  const { col, row } = screenToTile(px, py);

  // Verificar se está dentro do quarto
  if (col < 0 || col >= ROOM_COLS || row < 0 || row >= ROOM_ROWS) {
    // Fora do quarto, deseleciona tudo
    if (selectedRoomFurni) {
      const e = furniGraphicsMap[selectedRoomFurni];
      if (e && e.btnBar) { e.btnBar.forEach(b => b.destroy()); e.btnBar = null; }
      const prev = selectedRoomFurni;
      selectedRoomFurni = null;
      redrawFurni(prev);
    }
    selectedFurniType = null;
    document.querySelectorAll('.catalog-item').forEach(d => d.classList.remove('selected'));
    return;
  }

  // Se tem um móvel selecionado no catálogo, colocar no quarto
  if (selectedFurniType) {
    placeFurni(selectedFurniType, col, row);
    return;
  }

  // Se clicou em tile sem móvel, mover avatar
  selectedRoomFurni = null;
  moveTarget = { col, row };
  avatarState.anim = 'walk';

  // Determina direção
  if (col > avatarState.col) avatarState.facing = 'right';
  else if (col < avatarState.col) avatarState.facing = 'left';
}

// ============================================================
// COLOCAR MÓVEL NO QUARTO
// ============================================================
function placeFurni(furniId, col, row) {
  const def = FURNITURE_CATALOG.find(d => d.id === furniId);
  if (!def) return;

  // Verifica colisão simples
  const occupied = roomFurniture.some(f => f.col === col && f.row === row);
  if (occupied) {
    showToast('⚠️ Lugar ocupado!');
    return;
  }

  const inst = {
    id: nextFurniId++,
    furniId: def.id,
    col, row,
    rotation: 0,
    zIndex: row * 10 + col,
  };

  roomFurniture.push(inst);
  createFurniGraphic(inst);

  showToast(`${def.emoji} ${def.name} colocado!`);
}

// ============================================================
// ATUALIZA POSIÇÃO DO AVATAR NA TELA
// ============================================================
function updateAvatarPosition() {
  const { x, y } = isoToScreen(avatarState.col, avatarState.row, roomOriginX, roomOriginY);
  // O avatar fica no centro do tile, com os pés no fundo do tile
  avatarState.x = x;
  avatarState.y = y + TILE_H * 1.5 - 4;
  avatarGraphics.setDepth(avatarState.row * 10 + avatarState.col + 5);
}

// ============================================================
// REDESENHA O AVATAR
// ============================================================
function redrawAvatar() {
  // Wrapper para passar ao drawAvatar
  const g = {
    _g: avatarGraphics,
    fillStyle(color, alpha) {
      this._g.fillStyle(parseInt(color.replace('#', ''), 16), alpha !== undefined ? alpha : 1);
    },
    fillRect(x, y, w, h) { this._g.fillRect(x, y, w, h); },
    fillRoundedRect(x, y, w, h, r) { this._g.fillRoundedRect(x, y, w, h, r); },
    fillCircle(x, y, r) { this._g.fillCircle(x, y, r); },
    fillPoints(pts, close) { this._g.fillPoints(pts, close); },
    lineStyle(lw, color, alpha) { this._g.lineStyle(lw, parseInt(color.replace('#', ''), 16), alpha); },
    clear() { this._g.clear(); },
  };

  drawAvatar(g, avatarState.x, avatarState.y, avatarState.anim, avatarState.animFrame, avatarState.facing);
}

// ============================================================
// UPDATE (loop a cada frame)
// ============================================================
let moveTimer = 0;
const MOVE_DELAY = 220; // ms entre passos

function sceneUpdate(time, delta) {
  // Animação do avatar
  avatarState.animTimer += delta;
  const animSpeed = avatarState.anim === 'idle' ? 600 :
                    avatarState.anim === 'walk' ? 250 :
                    avatarState.anim === 'dance1' ? 300 :
                    avatarState.anim === 'dance2' ? 200 : 999;

  if (avatarState.animTimer >= animSpeed) {
    avatarState.animTimer = 0;
    avatarState.animFrame++;
    redrawAvatar();
  }

  // Movimentação do avatar
  if (moveTarget && avatarState.anim === 'walk') {
    moveTimer += delta;
    if (moveTimer >= MOVE_DELAY) {
      moveTimer = 0;
      const next = stepToward(avatarState.col, avatarState.row, moveTarget.col, moveTarget.row);
      if (next) {
        // Verifica se próximo tile está livre de móvel bloqueante
        const blocked = roomFurniture.some(f => f.col === next.col && f.row === next.row && !FURNITURE_CATALOG.find(d => d.id === f.furniId)?.canSit);
        if (!blocked) {
          if (next.col > avatarState.col) avatarState.facing = 'right';
          else if (next.col < avatarState.col) avatarState.facing = 'left';
          avatarState.col = next.col;
          avatarState.row = next.row;
          updateAvatarPosition();
        } else {
          moveTarget = null;
          avatarState.anim = 'idle';
        }

        if (avatarState.col === moveTarget.col && avatarState.row === moveTarget.row) {
          moveTarget = null;
          avatarState.anim = 'idle';
          avatarState.animFrame = 0;
        }
      } else {
        moveTarget = null;
        avatarState.anim = 'idle';
      }
    }
  }
}

// ============================================================
// RESIZE
// ============================================================
function onResize(gameSize) {
  computeRoomOrigin();
  drawFloor();

  // Reposiciona todos os móveis
  Object.keys(furniGraphicsMap).forEach(id => redrawFurni(parseInt(id)));

  // Reposiciona avatar
  updateAvatarPosition();
  redrawAvatar();
}

// ============================================================
// INICIALIZAÇÃO QUANDO O DOM ESTIVER PRONTO
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  // Carrega save
  loadGame();

  // Botão da tela de boas-vindas → vai para customização
  document.getElementById('btnEnter').addEventListener('click', () => {
    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('customizeScreen').classList.add('active');
    drawAvatarPreview();
  });

  // Inicializa tela de customização
  initCustomizeScreen();

  // Sincroniza botões com o AvatarConfig carregado
  document.querySelectorAll('.skin-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.skin) === AvatarConfig.skin);
  });
  document.querySelectorAll('.hair-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.hair) === AvatarConfig.hair);
  });
  document.querySelectorAll('.outfit-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.outfit) === AvatarConfig.outfit);
  });

  // Constrói catálogo de móveis (UI lateral)
  buildCatalog();

  // Preview do avatar
  drawAvatarPreview();

  // Previne zoom no iOS ao tocar duplo
  document.addEventListener('touchstart', e => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });
});
