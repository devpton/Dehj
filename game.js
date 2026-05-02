diff --git a/game.js b/game.js
new file mode 100644
index 0000000000000000000000000000000000000000..1726746501a72a3d7c984f447db2d3f377eaed0b
--- /dev/null
+++ b/game.js
@@ -0,0 +1,91 @@
+/* Mini jogo offline estilo quarto isométrico.
+   Tudo é desenhado em runtime para funcionar sem assets externos. */
+const GRID_W = 7, GRID_H = 7, TILE_W = 74, TILE_H = 37;
+const SAVE_KEY = 'mini_habbo_v1';
+
+const FURNITURE = [
+  { id: 'cama', color: 0x8e44ad }, { id: 'sofa', color: 0xe67e22 },
+  { id: 'cadeira', color: 0x3498db }, { id: 'mesa', color: 0x16a085 },
+  { id: 'planta', color: 0x2ecc71 }, { id: 'tapete', color: 0xe91e63 }, { id: 'ursinho', color: 0xf4d03f }
+];
+const AVATAR = {
+  hair: [0x442200, 0x1c1c1c, 0xffc107],
+  outfit: [0xe57373, 0x64b5f6, 0x81c784, 0xba68c8, 0xff8a65],
+  skin: [0xf8d2b4, 0xe0ac69, 0xc68642]
+};
+let sceneRef;
+const state = { avatar: { hair:0, outfit:0, skin:0 }, furniture: [], selected: null, activeDance: 0 };
+
+function isoToScreen(x,y,offsetX,offsetY){ return { x:(x-y)*TILE_W/2+offsetX, y:(x+y)*TILE_H/2+offsetY }; }
+function saveState(){ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
+function loadState(){ try{ Object.assign(state, JSON.parse(localStorage.getItem(SAVE_KEY)||'{}')); }catch{} }
+
+class RoomScene extends Phaser.Scene {
+  constructor(){ super('room'); }
+  create(){
+    sceneRef=this; this.cameras.main.setBackgroundColor('#6ab5ff');
+    this.room = this.add.container(0,0);
+    this.tileOffsetX = this.scale.width*0.35; this.tileOffsetY = this.scale.height*0.30;
+    this.drawGrid(); this.makeAvatar(); this.restoreFurniture(); this.bindInput(); this.scale.on('resize', ()=>this.onResize());
+  }
+  drawGrid(){
+    for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){
+      const p=isoToScreen(x,y,this.tileOffsetX,this.tileOffsetY);
+      const g=this.add.graphics();
+      g.fillStyle((x+y)%2?0xd8c4a0:0xeed9b8,1);
+      g.lineStyle(1,0x8b6f47,0.6);
+      g.beginPath(); g.moveTo(p.x,p.y-TILE_H/2); g.lineTo(p.x+TILE_W/2,p.y); g.lineTo(p.x,p.y+TILE_H/2); g.lineTo(p.x-TILE_W/2,p.y); g.closePath(); g.fillPath(); g.strokePath();
+      g.setInteractive(new Phaser.Geom.Polygon([p.x,p.y-TILE_H/2,p.x+TILE_W/2,p.y,p.x,p.y+TILE_H/2,p.x-TILE_W/2,p.y]), Phaser.Geom.Polygon.Contains);
+      g.on('pointerdown', ()=>this.moveAvatarTo(x,y));
+    }
+  }
+  makeAvatar(){ this.avatar=this.add.container(0,0); this.avatarState='idle'; this.avatarPos={x:3,y:3}; this.redrawAvatar(); }
+  redrawAvatar(){
+    this.avatar.removeAll(true); const c=state.avatar;
+    const body=this.add.rectangle(0,6,20,26,AVATAR.outfit[c.outfit]);
+    const head=this.add.circle(0,-10,10,AVATAR.skin[c.skin]);
+    const hair=this.add.rectangle(0,-18,22,9,AVATAR.hair[c.hair]);
+    this.avatar.add([body,head,hair]); this.placeAvatar(this.avatarPos.x,this.avatarPos.y);
+  }
+  placeAvatar(x,y){ const p=isoToScreen(x,y,this.tileOffsetX,this.tileOffsetY); this.avatar.setPosition(p.x,p.y-30); }
+  moveAvatarTo(tx,ty){
+    const p=isoToScreen(tx,ty,this.tileOffsetX,this.tileOffsetY); this.avatarState='walk';
+    this.tweens.add({targets:this.avatar,x:p.x,y:p.y-30,duration:350,onComplete:()=>{this.avatarState='idle'; this.avatarPos={x:tx,y:ty};}});
+  }
+  createFurniture(item,x=2,y=2,rot=0){
+    const p=isoToScreen(x,y,this.tileOffsetX,this.tileOffsetY); const c=this.add.container(p.x,p.y-18);
+    const base=this.add.rectangle(0,0,42,24,item.color).setStrokeStyle(2,0x333333); const label=this.add.text(-18,-8,item.id[0].toUpperCase(),{font:'16px Arial',color:'#fff'});
+    c.add([base,label]); c.setSize(42,24); c.setInteractive({draggable:true,useHandCursor:true}); c.data=new Phaser.Data.DataManager(c); c.data.set('meta',{id:item.id,color:item.color,x,y,rot});
+    c.on('pointerdown',()=>{state.selected=c;}); this.input.setDraggable(c);
+    c.on('drag',(pointer,dragX,dragY)=>{ c.x=dragX; c.y=dragY; });
+    c.on('dragend',()=>{ const g=this.screenToGrid(c.x,c.y+18); const pp=isoToScreen(g.x,g.y,this.tileOffsetX,this.tileOffsetY); c.setPosition(pp.x,pp.y-18); c.data.get('meta').x=g.x; c.data.get('meta').y=g.y; this.persistFurniture();});
+    c.angle=rot; this.room.add(c); return c;
+  }
+  screenToGrid(sx,sy){
+    let best={x:0,y:0,d:1e9}; for(let y=0;y<GRID_H;y++) for(let x=0;x<GRID_W;x++){ const p=isoToScreen(x,y,this.tileOffsetX,this.tileOffsetY); const d=Phaser.Math.Distance.Between(sx,sy,p.x,p.y); if(d<best.d) best={x,y,d}; }
+    return {x:best.x,y:best.y};
+  }
+  persistFurniture(){ state.furniture=this.room.list.map(c=>c.data?.get('meta')).filter(Boolean); saveState(); }
+  restoreFurniture(){ (state.furniture||[]).forEach(f=>this.createFurniture(f,f.x,f.y,f.rot||0)); }
+  bindInput(){ this.input.on('dragstart',(_,obj)=>{state.selected=obj;}); }
+  onResize(){ this.tileOffsetX=this.scale.width*0.35; this.tileOffsetY=this.scale.height*0.30; this.scene.restart(); }
+}
+
+loadState();
+const game = new Phaser.Game({ type: Phaser.AUTO, parent:'phaser-game', width: window.innerWidth, height: window.innerHeight, scene:[RoomScene], scale:{mode:Phaser.Scale.RESIZE} });
+
+function fillSelect(id,count,prefix){ const s=document.getElementById(id); for(let i=0;i<count;i++){ const o=document.createElement('option'); o.value=i; o.textContent=`${prefix} ${i+1}`; s.appendChild(o);} }
+fillSelect('avatar-hair',3,'Cabelo'); fillSelect('avatar-outfit',5,'Roupa'); fillSelect('avatar-skin',3,'Pele');
+
+const catalog = document.getElementById('catalog-list');
+FURNITURE.forEach(item=>{ const b=document.createElement('button'); b.className='catalog-item'; b.textContent=item.id; b.onclick=()=>{ sceneRef?.createFurniture(item); sceneRef?.persistFurniture(); }; catalog.appendChild(b); });
+
+document.getElementById('btn-save').onclick=()=>{ sceneRef?.persistFurniture(); saveState(); alert('Jogo salvo!'); };
+document.getElementById('btn-reset').onclick=()=>{ state.furniture=[]; saveState(); sceneRef?.scene.restart(); };
+document.getElementById('btn-custom').onclick=()=>{ const m=document.getElementById('avatar-modal'); m.classList.remove('hidden'); ['hair','outfit','skin'].forEach(k=>document.getElementById(`avatar-${k}`).value=state.avatar[k]); };
+document.getElementById('avatar-close').onclick=()=> document.getElementById('avatar-modal').classList.add('hidden');
+document.getElementById('avatar-apply').onclick=()=>{ ['hair','outfit','skin'].forEach(k=>state.avatar[k]=+document.getElementById(`avatar-${k}`).value); saveState(); sceneRef?.redrawAvatar(); document.getElementById('avatar-modal').classList.add('hidden'); };
+document.getElementById('btn-rotate').onclick=()=>{ const s=state.selected; if(!s) return; s.angle=(s.angle+90)%360; s.data.get('meta').rot=s.angle; sceneRef.persistFurniture(); };
+document.getElementById('btn-delete').onclick=()=>{ const s=state.selected; if(!s) return; s.destroy(); state.selected=null; sceneRef.persistFurniture(); };
+document.getElementById('btn-dance').onclick=()=>{ const a=sceneRef?.avatar; if(!a) return; state.activeDance = state.activeDance?0:1; if(state.activeDance){ sceneRef.tweens.add({targets:a,angle:8,duration:120,yoyo:true,repeat:-1}); } else { a.angle=0; sceneRef.tweens.killTweensOf(a); } };
+document.getElementById('btn-sit').onclick=()=>{ const a=sceneRef?.avatar; if(!a) return; a.scaleY = a.scaleY===1?0.7:1; };
