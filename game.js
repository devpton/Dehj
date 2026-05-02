/* ============================================================
   Jade Hotel - game.js (VERSÃO CALIBRADA PARA PERSONAGEM.PNG)
   ============================================================ */

const TILE_W = 64;
const TILE_H = 32;
const ROOM_COLS = 9;
const ROOM_ROWS = 9;

// DIMENSÕES REAIS DA SUA IMAGEM (1000000927.png)
const FRAME_W = 64;  // Largura de cada quadro
const FRAME_H = 92;  // Altura de cada quadro
const SCALE   = 1.5; // Aumentei um pouco para ela não ficar pequena no quarto

// Mapeamento das linhas de poses da sua imagem
const POSES = {
  rosa_moletom: 0,
  azul_moletom: 1,
  branco_tshirt: 2,
  mista: 3
};

let avatarState = {
  col: 4, row: 4,
  pose: 'rosa_moletom',
  frame: 3, // Frame 3 é ela de frente na sua imagem
  facing: 'right'
};

let moveTarget = null;
let moveTimer = 0;
const MOVE_DELAY = 200;

// --- AUXILIARES ---
function isoToScreen(col, row, ox, oy) {
  return { x: ox + (col - row) * (TILE_W / 2), y: oy + (col + row) * (TILE_H / 2) };
}

function screenToTile(px, py, ox, oy) {
  const dx = px - ox;
  const dy = py - (oy + TILE_H);
  return {
    col: Math.round((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2),
    row: Math.round((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2)
  };
}

// --- JOGO ---
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
  // Certifique-se que o nome do arquivo aqui seja igual ao que está na sua pasta
  this.load.image('personagem', 'personagem.png'); 
}

function create() {
  const scene = this;
  const ox = scene.scale.width / 2;
  const oy = scene.scale.height * 0.3;

  // CHÃO
  const floor = scene.add.graphics();
  for (let r = 0; r < ROOM_ROWS; r++) {
    for (let c = 0; c < ROOM_COLS; c++) {
      const { x, y } = isoToScreen(c, r, ox, oy);
      floor.fillStyle((c + r) % 2 === 0 ? 0x9B7FD4 : 0x7A5CB5, 1);
      floor.fillPoints([{x, y: y+16}, {x: x+32, y: y+32}, {x, y: y+48}, {x: x-32, y: y+32}], true);
    }
  }

  // PAREDES
  const walls = scene.add.graphics();
  const p = isoToScreen(0, 0, ox, oy);
  walls.fillStyle(0xD4B0F5, 1); // Esq
  walls.fillPoints([{x: p.x-32, y: p.y+32}, {x: p.x, y: p.y+16}, {x: p.x, y: p.y-100}, {x: p.x-32, y: p.y-84}], true);
  walls.fillStyle(0xE8D0FF, 1); // Dir
  walls.fillPoints([{x: p.x, y: p.y+16}, {x: p.x+288, y: p.y+160}, {x: p.x+288, y: p.y+60}, {x: p.x, y: p.y-84}], true);

  // PERSONAGEM
  const startPos = isoToScreen(avatarState.col, avatarState.row, ox, oy);
  this.player = scene.add.sprite(startPos.x, startPos.y + 32, 'personagem');
  this.player.setOrigin(0.5, 1); // Pés no chão
  this.player.setScale(SCALE);
  this.player.setDepth(100);

  // CLICK PARA ANDAR
  scene.input.on('pointerdown', (pointer) => {
    const tile = screenToTile(pointer.x, pointer.y, ox, oy);
    if (tile.col >= 0 && tile.col < ROOM_COLS && tile.row >= 0 && tile.row < ROOM_ROWS) {
      moveTarget = tile;
    }
  });

  // BOTÕES HTML
  document.getElementById('btnEnter').onclick = () => {
    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
  };
  
  // Ação de Sentar (Pose na linha 4, frame 5 da sua imagem)
  document.getElementById('btnSit').onclick = () => {
    avatarState.pose = 'mista';
    avatarState.frame = 5; 
    moveTarget = null;
  };

  document.getElementById('btnIdle').onclick = () => {
    avatarState.pose = 'rosa_moletom';
    avatarState.frame = 3;
  };
}

function update(time, delta) {
  const ox = this.scale.width / 2;
  const oy = this.scale.height * 0.3;

  if (moveTarget) {
    moveTimer += delta;
    if (moveTimer >= MOVE_DELAY) {
      moveTimer = 0;
      const dC = Math.sign(moveTarget.col - avatarState.col);
      const dR = Math.sign(moveTarget.row - avatarState.row);

      if (dC !== 0) avatarState.col += dC;
      else if (dR !== 0) avatarState.row += dR;

      // Se estiver andando, usa os frames de caminhada (0, 1, 2 da imagem)
      avatarState.frame = (Math.floor(time / 150) % 3);
      avatarState.facing = (dC > 0 || dR > 0) ? 'right' : 'left';

      const pos = isoToScreen(avatarState.col, avatarState.row, ox, oy);
      this.player.setPosition(pos.x, pos.y + 32);

      if (avatarState.col === moveTarget.col && avatarState.row === moveTarget.row) {
        moveTarget = null;
        avatarState.frame = 3; // Volta a ficar de frente parada
      }
    }
  }

  // ATUALIZA O RECORTE DA IMAGEM
  const row = POSES[avatarState.pose];
  const col = avatarState.frame;

  this.player.setFlipX(avatarState.facing === 'left');
  this.player.setCrop(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
}
