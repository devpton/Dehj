/* ============================================================
   MeuQuartinho - game.js (Versão Clean)
   ============================================================ */

// 1. CONFIGURAÇÃO DO TILE ISOMÉTRICO
const TILE_W = 64;
const TILE_H = 32;
const ROOM_COLS = 8;
const ROOM_ROWS = 8;

// 2. ESTADO INICIAL
let avatarState = {
  col: 4,
  row: 4,
  facing: 'right'
};

// 3. FUNÇÃO AUXILIAR: CONVERTER GRID PARA PIXELS
function isoToScreen(col, row, originX, originY) {
  const x = originX + (col - row) * (TILE_W / 2);
  const y = originY + (col + row) * (TILE_H / 2);
  return { x, y };
}

// 4. CONFIGURAÇÃO DO PHASER
const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1A0533',
  scene: {
    preload: preload,
    create: create
  }
};

const game = new Phaser.Game(config);

function preload() {
  // Carrega a nova imagem da sua filha
  this.load.image('personagem', 'watermarked_img_15131665927866115837.png');
}

function create() {
  const scene = this;
  const originX = scene.scale.width / 2;
  const originY = scene.scale.height * 0.2;

  // --- DESENHAR CHÃO ---
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

  // --- DESENHAR PAREDES (Simples) ---
  const walls = scene.add.graphics();
  walls.fillStyle(0xD4B0F5, 1);
  // Parede Esquerda
  const p1 = isoToScreen(0, 0, originX, originY);
  const p2 = isoToScreen(0, ROOM_ROWS, originX, originY);
  walls.fillPoints([
    { x: p1.x - TILE_W/2, y: p1.y + TILE_H },
    { x: p1.x, y: p1.y + TILE_H/2 },
    { x: p1.x, y: p1.y - 100 },
    { x: p1.x - TILE_W/2, y: p1.y + TILE_H - 100 }
  ], true);

  // --- ADICIONAR PERSONAGEM ---
  const pos = isoToScreen(avatarState.col, avatarState.row, originX, originY);
  const player = scene.add.sprite(pos.x, pos.y + TILE_H, 'personagem');
  
  // Como a imagem é uma sprite sheet, vamos "recortar" apenas o primeiro quadro
  // Dimensões baseadas na imagem gerada (aprox 100x150 por frame)
  player.setCrop(0, 0, 102, 153); 
  player.setOrigin(0.5, 0.8);
  player.setScale(0.8);
}
