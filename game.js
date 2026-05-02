const TILE_W = 64;
const TILE_H = 32;
const ROOM_COLS = 9;
const ROOM_ROWS = 9;

const SPRITE_FRAME_W = 102;
const SPRITE_FRAME_H = 153;
const SPRITE_SCALE = 0.8;
const MOVE_DELAY = 220;

const ANIM_ROW = { idle: 0, walk: 0 };

const avatarState = { col: 4, row: 4, anim: 'idle', facing: 'right', animFrame: 2, animTimer: 0 };
let moveTarget = null;
let moveTimer = 0;

function isoToScreen(col, row, originX, originY) {
  return { x: originX + (col - row) * (TILE_W / 2), y: originY + (col + row) * (TILE_H / 2) };
}

function screenToTile(px, py, originX, originY) {
  const dx = px - originX;
  const dy = py - (originY + TILE_H);
  const col = Math.round((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
  const row = Math.round((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
  return { col, row };
}

const config = {
  type: Phaser.AUTO,
  parent: 'gameContainer',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1A0533',
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() { this.load.image('personagem', 'personagem.png'); }

function drawRoom(scene, originX, originY) {
  if (scene.floorGraphics) scene.floorGraphics.destroy();
  if (scene.wallGraphics) scene.wallGraphics.destroy();

  scene.floorGraphics = scene.add.graphics();
  for (let row = 0; row < ROOM_ROWS; row++) {
    for (let col = 0; col < ROOM_COLS; col++) {
      const { x, y } = isoToScreen(col, row, originX, originY);
      scene.floorGraphics.fillStyle((col + row) % 2 === 0 ? 0x9B7FD4 : 0x7A5CB5, 1);
      scene.floorGraphics.fillPoints([
        { x, y: y + TILE_H / 2 },
        { x: x + TILE_W / 2, y: y + TILE_H },
        { x, y: y + TILE_H * 1.5 },
        { x: x - TILE_W / 2, y: y + TILE_H }
      ], true);
    }
  }

  scene.wallGraphics = scene.add.graphics();
  const pStart = isoToScreen(0, 0, originX, originY);
  scene.wallGraphics.fillStyle(0xD4B0F5, 1);
  scene.wallGraphics.fillPoints([
    { x: pStart.x - TILE_W/2, y: pStart.y + TILE_H },
    { x: pStart.x, y: pStart.y + TILE_H/2 },
    { x: pStart.x, y: pStart.y - 120 },
    { x: pStart.x - TILE_W/2, y: pStart.y + TILE_H - 120 }
  ], true);

  scene.wallGraphics.fillStyle(0xE8D0FF, 1);
  scene.wallGraphics.fillPoints([
    { x: pStart.x, y: pStart.y + TILE_H/2 },
    { x: pStart.x + (ROOM_COLS * TILE_W/2), y: pStart.y + (ROOM_COLS * TILE_H/2) + TILE_H/2 },
    { x: pStart.x + (ROOM_COLS * TILE_W/2), y: pStart.y + (ROOM_COLS * TILE_H/2) + TILE_H/2 - 120 },
    { x: pStart.x, y: pStart.y + TILE_H/2 - 120 }
  ], true);
}

function create() {
  const scene = this;
  scene.originYFactor = 0.3;
  scene.originX = scene.scale.width / 2;
  scene.originY = scene.scale.height * scene.originYFactor;

  drawRoom(scene, scene.originX, scene.originY);

  const pos = isoToScreen(avatarState.col, avatarState.row, scene.originX, scene.originY);
  scene.player = scene.add.sprite(pos.x, pos.y + TILE_H, 'personagem').setOrigin(0.5, 1).setScale(SPRITE_SCALE).setDepth(100);

  scene.input.on('pointerdown', (pointer) => {
    const tile = screenToTile(pointer.x, pointer.y, scene.originX, scene.originY);
    if (tile.col >= 0 && tile.col < ROOM_COLS && tile.row >= 0 && tile.row < ROOM_ROWS) {
      moveTarget = tile;
      avatarState.anim = 'walk';
      avatarState.facing = tile.col >= avatarState.col ? 'right' : 'left';
    }
  });

  document.getElementById('btnEnter').onclick = () => {
    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');
    setTimeout(() => game.scale.resize(window.innerWidth, window.innerHeight), 50);
  };

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
    scene.originX = scene.scale.width / 2;
    scene.originY = scene.scale.height * scene.originYFactor;
    drawRoom(scene, scene.originX, scene.originY);
    const p = isoToScreen(avatarState.col, avatarState.row, scene.originX, scene.originY);
    scene.player.setPosition(p.x, p.y + TILE_H);
  });
}

function update(_time, delta) {
  if (moveTarget) {
    moveTimer += delta;
    if (moveTimer >= MOVE_DELAY) {
      moveTimer = 0;
      const dCol = Math.sign(moveTarget.col - avatarState.col);
      const dRow = Math.sign(moveTarget.row - avatarState.row);
      if (dCol !== 0) avatarState.col += dCol;
      else if (dRow !== 0) avatarState.row += dRow;

      const pos = isoToScreen(avatarState.col, avatarState.row, this.originX, this.originY);
      this.player.setPosition(pos.x, pos.y + TILE_H);
      if (avatarState.col === moveTarget.col && avatarState.row === moveTarget.row) {
        moveTarget = null;
        avatarState.anim = 'idle';
      }
    }
  }

  avatarState.animTimer += delta;
  if (avatarState.animTimer > 200) {
    avatarState.animTimer = 0;
    avatarState.animFrame = avatarState.anim === 'idle' ? 2 : (avatarState.animFrame + 1) % 4;
  }

  const row = ANIM_ROW[avatarState.anim] || 0;
  const col = avatarState.anim === 'idle' ? 2 : avatarState.animFrame;
  this.player.setFlipX(avatarState.facing === 'left');
  this.player.setCrop(col * SPRITE_FRAME_W, row * SPRITE_FRAME_H, SPRITE_FRAME_W, SPRITE_FRAME_H);
}
