/* ============================================================
   Jade Hotel - Versão Minimalista (Quarto e Personagem)
   ============================================================ */

// 1. CONFIGURAÇÕES DO QUARTO
const TILE_W = 64;
const TILE_H = 32;
const ROOM_COLS = 9;
const ROOM_ROWS = 9;

// 2. CONFIGURAÇÃO DA PERSONAGEM (personagem.png)
const SPRITE_FRAME_W = 102; 
const SPRITE_FRAME_H = 153;
const SPRITE_SCALE   = 0.8;

// Mapeamento das linhas de animação na imagem
const ANIM_ROW = { idle: 0, walk: 0, sit: 1, dance1: 2, dance2: 3 };

// 3. ESTADO INICIAL
let avatarState = {
  col: 4, row: 4,
  anim: 'idle', 
  facing: 'right',
  animFrame: 0,
  animTimer: 0
};

let moveTarget = null;
let moveTimer = 0;
const MOVE_DELAY = 220; 

// --- CONVERSÃO ISOMÉTRICA ---
function isoToScreen(col, row, originX, originY) {
  return {
    x: originX + (col - row) * (TILE_W / 2),
    y: originY + (col + row) * (TILE_H / 2)
  };
}

function screenToTile(px, py, originX, originY) {
  const dx = px - originX;
  const dy = py - (originY + TILE_H);
  const col = Math.round((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
  const row = Math.round((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
  return { col, row };
}

// --- CONFIGURAÇÃO DO PHASER ---
const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1A0533',
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  // Carrega a imagem da personagem
  this.load.image('personagem', 'personagem.png');
}

function create() {
  const scene = this;
  const originX = scene.scale.width / 2;
  const originY = scene.scale.height * 0.2;

  // --- DESENHAR O CHÃO ---
  const floor = scene.add.graphics();
  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const { x, y } = isoToScreen(col, row, originX, originY);
      const color = (col + row) % 2 === 0 ? 0x9B7FD4 : 0x7A5CB5;
      
      floor.fillStyle(color, 1);
      floor.fillPoints([
        { x: x, y: y + TILE_H / 2 },
        { x: x + TILE_W / 2, y: y + TILE_H },
        { x: x, y: y + TILE_H * 1.5 },
        { x: x - TILE_W / 2, y: y + TILE_H }
      ], true);
    }
  }

  // --- DESENHAR PAREDES BÁSICAS ---
  const walls = scene.add.graphics();
  walls.fillStyle(0xD4B0F5, 1);
  const p1 = isoToScreen(0, 0, originX, originY);
  // Parede esquerda
  walls.fillPoints([
    { x: p1.x - TILE_W/2, y: p1.y + TILE_H },
    { x: p1.x, y: p1.y + TILE_H/2 },
    { x: p1.x, y: p1.y - 120 },
    { x: p1.x - TILE_W/2, y: p1.y + TILE_H - 120 }
  ], true);
  // Parede direita
  walls.fillStyle(0xE8D0FF, 1);
  walls.fillPoints([
    { x: p1.x, y: p1.y + TILE_H/2 },
    { x: p1.x + (ROOM_COLS * TILE_W/2), y: p1.y + (ROOM_COLS * TILE_H/2) + TILE_H/2 },
    { x: p1.x + (ROOM_COLS * TILE_W/2), y: p1.y + (ROOM_COLS * TILE_H/2) + TILE_H/2 - 120 },
    { x: p1.x, y: p1.y + TILE_H/2 - 120 }
  ], true);

  // --- CRIAR A PERSONAGEM ---
  const pos = isoToScreen(avatarState.col, avatarState.row, originX, originY);
  this.player = scene.add.sprite(pos.x, pos.y + TILE_H, 'personagem');
  this.player.setOrigin(0.5, 0.9);
  this.player.setScale(SPRITE_SCALE);

  // --- MOVIMENTAÇÃO PELO CLIQUE ---
  scene.input.on('pointerdown', (pointer) => {
    const tile = screenToTile(pointer.x, pointer.y, originX, originY);
    if (tile.col >= 0 && tile.col < ROOM_COLS && tile.row >= 0 && tile.row < ROOM_ROWS) {
      moveTarget = tile;
      avatarState.anim = 'walk';
      avatarState.facing = (tile.col >= avatarState.col) ? 'right' : 'left';
    }
  });

  // Configuração do botão de entrada do seu index.html
  const btnEnter = document.getElementById('btnEnter');
  if(btnEnter) {
    btnEnter.onclick = () => {
      document.getElementById('welcomeScreen').classList.remove('active');
      document.getElementById('gameScreen').classList.add('active');
    };
  }
}

function update(time, delta) {
  const originX = this.scale.width / 2;
  const originY = this.scale.height * 0.2;

  // Lógica de Caminhada
  if (moveTarget) {
    moveTimer += delta;
    if (moveTimer >= MOVE_DELAY) {
      moveTimer = 0;
      const dCol = Math.sign(moveTarget.col - avatarState.col);
      const dRow = Math.sign(moveTarget.row - avatarState.row);

      if (dCol !== 0) avatarState.col += dCol;
      else if (dRow !== 0) avatarState.row += dRow;

      const pos = isoToScreen(avatarState.col, avatarState.row, originX, originY);
      this.player.setPosition(pos.x, pos.y + TILE_H);
      this.player.setDepth(avatarState.row * 10 + avatarState.col);

      if (avatarState.col === moveTarget.col && avatarState.row === moveTarget.row) {
        moveTarget = null;
        avatarState.anim = 'idle';
      }
    }
  }

  // Animação da Sprite Sheet
  avatarState.animTimer += delta;
  if (avatarState.animTimer > 200) {
    avatarState.animTimer = 0;
    avatarState.animFrame = (avatarState.animFrame + 1) % 4;
  }

  const row = ANIM_ROW[avatarState.anim] || 0;
  const col = (avatarState.anim === 'idle') ? 2 : avatarState.animFrame;
  
  this.player.setFlipX(avatarState.facing === 'left');
  this.player.setCrop(col * SPRITE_FRAME_W, row * SPRITE_FRAME_H, SPRITE_FRAME_W, SPRITE_FRAME_H);
}
