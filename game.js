
// Simple 2D platformer for Loza (mobile-friendly)
// Assets in /assets/ : cat.png, heart.png, platform.png, background.png, bg-music.mp3, victory-music.mp3

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// responsive canvas target (iPhone 12 Pro Max portrait ~428x926 CSS pixels)
const targetWidth = 428;
const targetHeight = 926;
let scaleFactor = 1;

function resizeCanvas(){
  const maxWidth = Math.min(window.innerWidth - 20, targetWidth);
  scaleFactor = maxWidth / targetWidth;
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.width = (targetWidth*scaleFactor) + 'px';
  canvas.style.height = (targetHeight*scaleFactor) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Load images
const assets = {};
function loadImage(path){ return new Promise(res=>{ const i=new Image(); i.src=path; i.onload=()=>res(i); }); }
Promise.all([
  loadImage('assets/background.png'),
  loadImage('assets/cat.png'),
  loadImage('assets/heart.png'),
  loadImage('assets/platform.png')
]).then(imgs=>{ assets.bg=imgs[0]; assets.cat=imgs[1]; assets.heart=imgs[2]; assets.platform=imgs[3]; init(); });

// Audio
const bgAudio = new Audio('assets/bg-music.mp3');
bgAudio.loop = true;
const victoryAudio = new Audio('assets/victory-music.mp3');

// Controls
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const upBtn = document.getElementById('upBtn');
const playBgBtn = document.getElementById('playBg');
const winModal = document.getElementById('winModal');
const playVictoryBtn = document.getElementById('playVictory');
const restartBtn = document.getElementById('restartBtn');

let keys = {left:false,right:false,jump:false};
leftBtn.addEventListener('touchstart',e=>{e.preventDefault(); keys.left=true;}); leftBtn.addEventListener('touchend',e=>{keys.left=false;});
rightBtn.addEventListener('touchstart',e=>{e.preventDefault(); keys.right=true;}); rightBtn.addEventListener('touchend',e=>{keys.right=false;});
upBtn.addEventListener('touchstart',e=>{e.preventDefault(); keys.jump=true;}); upBtn.addEventListener('touchend',e=>{keys.jump=false;});
// also enable mouse for desktop testing
leftBtn.addEventListener('mousedown',()=>keys.left=true); leftBtn.addEventListener('mouseup',()=>keys.left=false);
rightBtn.addEventListener('mousedown',()=>keys.right=true); rightBtn.addEventListener('mouseup',()=>keys.right=false);
upBtn.addEventListener('mousedown',()=>keys.jump=true); upBtn.addEventListener('mouseup',()=>keys.jump=false);

// Play background music (user must press to start due to browser rules)
playBgBtn.addEventListener('click', ()=>{
  bgAudio.currentTime = 0;
  bgAudio.play().catch(()=>{});
  playBgBtn.style.display = 'none';
});

// Game state
let player = {x:80,y:700,w:64,h:64,vx:0,vy:0,onGround:false};
let gravity = 1400;
let platforms = [];
let obstacles = [];
let heart = {x:1100,y:520,w:64,h:64};
let worldWidth = 1400;
let cameraX = 0;
let win = false;

// Build simple level (platforms across)
function buildLevel(){
  platforms = [];
  platforms.push({x:0,y:820,w:1400,h:80}); // ground
  platforms.push({x:220,y:720,w:200,h:24});
  platforms.push({x:500,y:630,w:180,h:24});
  platforms.push({x:760,y:560,w:160,h:24});
  platforms.push({x:980,y:480,w:120,h:24});
  platforms.push({x:1180,y:420,w:120,h:24});
  // obstacles (simple blocks)
  obstacles = [{x:420,y:700,w:40,h:40},{x:680,y:600,w:40,h:40},{x:920,y:520,w:40,h:40}];
  heart = {x:1260,y:360,w:48,h:48};
  player.x = 40; player.y = 740; player.vx=0; player.vy=0; win=false;
  cameraX = 0;
}
function init(){ buildLevel(); lastTime=performance.now(); requestAnimationFrame(loop); }

// Collision helpers
function rectsIntersect(a,b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

let lastTime=0;
function loop(now){
  const dt = Math.min(0.03,(now-lastTime)/1000);
  update(dt);
  render();
  lastTime = now;
  if(!win) requestAnimationFrame(loop);
}

function update(dt){
  // controls
  const speed = 360;
  if(keys.left){ player.vx = -speed; } else if(keys.right){ player.vx = speed; } else { player.vx = 0; }
  // Jump: single press
  if(keys.jump && player.onGround){
    player.vy = -650; player.onGround=false;
  }
  // physics
  player.vy += gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // world bounds
  if(player.x < 0) player.x = 0;
  if(player.x + player.w > worldWidth) player.x = worldWidth - player.w;

  // platform collisions (simple)
  player.onGround = false;
  for(let p of platforms){
    if(player.x + player.w > p.x && player.x < p.x + p.w){
      if(player.y + player.h > p.y && player.y + player.h - player.vy*dt <= p.y){
        // landed on platform
        player.y = p.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }
  }
  // obstacles collision -> push back slightly
  for(let o of obstacles){
    if(rectsIntersect(player, o)){
      // simple knockback
      player.x = Math.max(0, player.x - 80);
      player.vx = 0;
    }
  }
  // Check heart (win)
  if(rectsIntersect(player, heart)){
    onWin();
  }

  // camera follow
  cameraX = player.x - 150;
  cameraX = Math.max(0, Math.min(cameraX, worldWidth - canvas.width));
}

function render(){
  // draw background scaled horizontally repeating
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw background image stretched horizontally
  if(assets.bg){
    // tile background across world width
    const pattern = assets.bg;
    // draw at -cameraX to move
    ctx.drawImage(pattern, -cameraX, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#87cefa'; ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  ctx.save();
  ctx.translate(-cameraX,0);

  // draw platforms
  for(let p of platforms){
    // draw platform tiles
    const tile = assets.platform;
    for(let tx = p.x; tx < p.x + p.w; tx += tile.width){
      ctx.drawImage(tile, tx, p.y, tile.width, p.h);
    }
  }

  // draw obstacles
  ctx.fillStyle = '#8b0000';
  for(let o of obstacles){
    ctx.fillRect(o.x, o.y, o.w, o.h);
  }

  // draw heart
  if(assets.heart) ctx.drawImage(assets.heart, heart.x, heart.y, heart.w, heart.h);

  // draw player (cat)
  if(assets.cat) ctx.drawImage(assets.cat, player.x, player.y, player.w, player.h);
  else { ctx.fillStyle='orange'; ctx.fillRect(player.x, player.y, player.w, player.h); }

  ctx.restore();

  // HUD (simple)
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.fillRect(10,10,180,36);
  ctx.fillStyle='#333'; ctx.font='18px sans-serif'; ctx.fillText('Loza — Reach the heart!', 18,34);
}

function onWin(){
  if(win) return;
  win = true;
  // stop background music
  try{ bgAudio.pause(); bgAudio.currentTime = 0; }catch(e){}
  // show modal
  winModal.classList.remove('hidden');
}

playVictoryBtn.addEventListener('click', ()=>{
  victoryAudio.currentTime = 0;
  victoryAudio.play().catch(()=>{});
  playVictoryBtn.disabled = true;
});

restartBtn.addEventListener('click', ()=>{
  winModal.classList.add('hidden');
  buildLevel();
  lastTime = performance.now();
  requestAnimationFrame(loop);
});


// === Monster Setup ===
const monsterImage = new Image();
monsterImage.src = 'assets/monster.png';

let monsters = [];

// After obstacles are defined, create monsters on pill obstacles
if (typeof obstacles !== 'undefined') {
    monsters = obstacles
        .filter(o => o.shape === 'pill') // if you have a shape property
        .map(o => ({
            x: o.x + o.width / 2 - 30,
            y: o.y - 70,
            width: 60,
            height: 60,
            name: 'Ahmed Taha'
        }));
}

// === Collision Detection Helper ===
function rectsCollide(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
             r2.x + r2.width < r1.x ||
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
}

// === Modify update loop to reset player if touch monster ===
const originalUpdate = update;
update = function() {
    originalUpdate();

    // Check collision with monsters
    monsters.forEach(m => {
        if (rectsCollide(player, m)) {
            player.x = startX;
            player.y = startY;
        }
    });
};

// === Modify draw loop to render monsters and names ===
const originalDraw = draw;
draw = function() {
    originalDraw();

    ctx.font = '16px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    monsters.forEach(m => {
        ctx.drawImage(monsterImage, m.x, m.y, m.width, m.height);
        ctx.fillText(m.name, m.x + m.width / 2, m.y - 5);
    });
};
