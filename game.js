// ─────────────────────────────────────────────
//  Songs of Mew  –  A mini metroidvania demo
// ─────────────────────────────────────────────

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Constants ──────────────────────────────────
const GRAVITY       = 0.55;
const JUMP_FORCE    = -13;
const JUMP2_FORCE   = -11;
const MOVE_SPEED    = 4.5;
const FRICTION      = 0.82;
const ATTACK_WINDUP   = 14;   // windup frames
const ATTACK_SLASH    = 6;    // slash frames
const ATTACK_RECOVERY = 16;   // recovery frames
const ATTACK_DURATION = ATTACK_WINDUP + ATTACK_SLASH + ATTACK_RECOVERY; // 36
const ATTACK_COOLDOWN = 40;
const ATTACK_RANGE  = 80;
const ATTACK_ARC    = Math.PI * 0.8;
const INVINCIBLE_FRAMES = 50;

// ── Input ───────────────────────────────────────
const keys = {};
const justPressed = {};
window.addEventListener('keydown', e => {
  if (!keys[e.code]) justPressed[e.code] = true;
  keys[e.code] = true;
  e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
function clearJustPressed() { for (const k in justPressed) delete justPressed[k]; }

// ── Camera ──────────────────────────────────────
const camera = { x: 0, y: 0 };

// ── Particle System ─────────────────────────────
const particles = [];

function spawnParticles(x, y, count, color, speedMult = 1, gravity = 0.15, life = 30) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (1 + Math.random() * 3) * speedMult;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life, maxLife: life,
      color,
      size: 2 + Math.random() * 3,
      gravity
    });
  }
}

function spawnDustParticles(x, y) {
  for (let i = 0; i < 4; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 20,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 1.5,
      life: 20, maxLife: 20,
      color: '#8888aa',
      size: 2 + Math.random() * 2,
      gravity: 0.05
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.95;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - camera.x, p.y - camera.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Level Data ──────────────────────────────────
const LEVEL_WIDTH = 3200;
const LEVEL_HEIGHT = 600;

// platforms: { x, y, w, h }
const platforms = [
  // Ground sections with gaps
  { x: 0,    y: 520, w: 320,  h: 20 },
  { x: 380,  y: 520, w: 200,  h: 20 },
  { x: 640,  y: 520, w: 260,  h: 20 },
  // Mid platforms
  { x: 280,  y: 420, w: 120,  h: 16 },
  { x: 500,  y: 380, w: 120,  h: 16 },
  { x: 680,  y: 340, w: 100,  h: 16 },
  // Second area ground
  { x: 950,  y: 520, w: 300,  h: 20 },
  { x: 1310, y: 520, w: 280,  h: 20 },
  // Second area platforms
  { x: 1000, y: 410, w: 140,  h: 16 },
  { x: 1180, y: 350, w: 130,  h: 16 },
  { x: 1370, y: 430, w: 110,  h: 16 },
  // Third area ground
  { x: 1650, y: 520, w: 320,  h: 20 },
  { x: 2030, y: 520, w: 260,  h: 20 },
  // Third area platforms
  { x: 1700, y: 400, w: 120,  h: 16 },
  { x: 1880, y: 340, w: 130,  h: 16 },
  { x: 2060, y: 400, w: 110,  h: 16 },
  // Final area ground
  { x: 2350, y: 520, w: 500,  h: 20 },
  { x: 2400, y: 420, w: 120,  h: 16 },
  { x: 2570, y: 360, w: 130,  h: 16 },
  // Ceiling/walls feel
  { x: 0,    y: 140, w: 900,  h: 16 },
  { x: 1000, y: 160, w: 800,  h: 16 },
  { x: 1900, y: 140, w: 960,  h: 16 },
];

// decorative background pillars
const pillars = [
  { x: 200,  y: 140, w: 30, h: 380 },
  { x: 500,  y: 160, w: 25, h: 360 },
  { x: 820,  y: 0,   w: 30, h: 540 },
  { x: 1100, y: 160, w: 30, h: 360 },
  { x: 1450, y: 0,   w: 25, h: 520 },
  { x: 1700, y: 140, w: 30, h: 380 },
  { x: 2000, y: 0,   w: 25, h: 540 },
  { x: 2300, y: 140, w: 30, h: 380 },
  { x: 2700, y: 0,   w: 25, h: 520 },
];

// goal portal
const portal = { x: 2780, y: 440, w: 50, h: 80 };

// enemy spawn data
const enemySpawns = [
  { x: 430, y: 490,  patrol: 100 },
  { x: 1020, y: 480, patrol: 120 },
  { x: 1350, y: 490, patrol: 80  },
  { x: 1700, y: 490, patrol: 90  },
  { x: 2070, y: 490, patrol: 100 },
  { x: 2420, y: 490, patrol: 120 },
];

// ── Enemy Class ─────────────────────────────────
class Enemy {
  constructor(data) {
    this.x = data.x;
    this.y = data.y;
    this.w = 36;
    this.h = 36;
    this.originX = data.x;
    this.patrolRange = data.patrol;
    this.vx = 1.2;
    this.vy = 0;
    this.onGround = false;
    this.alive = true;
    this.dyingTimer = 0;
    this.eyeAnim = 0;
    this.hp = 1;
  }

  update() {
    if (!this.alive) {
      this.dyingTimer--;
      return;
    }
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // patrol bounce
    if (this.x < this.originX - this.patrolRange || this.x > this.originX + this.patrolRange) {
      this.vx *= -1;
    }

    // edge detection: check if the leading foot has ground beneath it
    if (this.onGround) {
      // probeX is just inside the leading edge (not outside), so it stays on the platform until the very edge
      const probeX = this.vx > 0 ? this.x + this.w - 1 : this.x + 1;
      const footY  = this.y + this.h;
      // look for a platform whose top surface is right under probeX
      const hasGround = platforms.some(p =>
        probeX >= p.x && probeX <= p.x + p.w &&
        footY >= p.y && footY <= p.y + p.h + 8
      );
      if (!hasGround) {
        this.vx *= -1;
        this.x += this.vx * 3;
      }
    }

    // platform collision
    this.onGround = false;
    platforms.forEach(p => {
      if (rectOverlap(this, p)) resolveCollision(this, p, (dy) => {
        if (dy < 0) { this.onGround = true; this.vy = 0; }
        else this.vy = 0;
      });
    });

    // bounds
    if (this.y > LEVEL_HEIGHT + 100) { this.alive = false; }

    this.eyeAnim = (this.eyeAnim + 0.08) % (Math.PI * 2);
  }

  die() {
    this.alive = false;
    this.dyingTimer = 20;
    spawnParticles(this.cx(), this.cy(), 12, '#ff6655', 1.5, 0.2, 35);
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  draw() {
    const sx = this.cx() - camera.x;
    const sy = this.cy() - camera.y;

    if (!this.alive) {
      if (this.dyingTimer > 0) {
        ctx.globalAlpha = this.dyingTimer / 20;
        ctx.fillStyle = '#ff8866';
        ctx.beginPath();
        ctx.arc(sx, sy, 22 * (1 - this.dyingTimer / 20), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      return;
    }

    // body
    ctx.fillStyle = '#2a1a2e';
    ctx.strokeStyle = '#c05588';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(sx - 18, sy - 18, 36, 36, 6);
    ctx.fill();
    ctx.stroke();

    // spikes on top
    ctx.fillStyle = '#c05588';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sx + i * 10 - 5, sy - 18);
      ctx.lineTo(sx + i * 10, sy - 28);
      ctx.lineTo(sx + i * 10 + 5, sy - 18);
      ctx.fill();
    }

    // eyes
    const blink = Math.sin(this.eyeAnim * 3) > 0.95 ? 1 : 0;
    const eyeH = blink ? 2 : 7;
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.ellipse(sx - 7, sy - 4, 5, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 7, sy - 4, 5, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // pupils
    if (!blink) {
      ctx.fillStyle = '#1a0010';
      ctx.beginPath();
      ctx.ellipse(sx - 7, sy - 4, 2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(sx + 7, sy - 4, 2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // direction indicator (fang)
    const fangDir = this.vx > 0 ? 1 : -1;
    ctx.fillStyle = '#ff9988';
    ctx.beginPath();
    ctx.moveTo(sx + fangDir * 14, sy + 4);
    ctx.lineTo(sx + fangDir * 20, sy + 10);
    ctx.lineTo(sx + fangDir * 14, sy + 10);
    ctx.fill();
  }
}

// ── Player Class ─────────────────────────────────
class Player {
  constructor() {
    this.x = 60;
    this.y = 450;
    this.w = 32;
    this.h = 38;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumpsLeft = 2;
    this.facingRight = true;

    // attack
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackAngle = 0;
    this.attackPhase = null;  // 'windup' | 'slash' | 'recovery' | null

    // health
    this.hp = 3;
    this.maxHp = 3;
    this.invincible = 0;

    // animation
    this.tailAngle = 0;
    this.earTwitch = 0;
    this.runFrame = 0;
    this.runTimer = 0;
    this.landSquish = 0;

    this.dead = false;
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  update(enemies) {
    if (this.dead) return;

    // ── Input ──
    const left  = keys['ArrowLeft']  || keys['KeyA'];
    const right  = keys['ArrowRight'] || keys['KeyD'];
    const jumpP  = justPressed['ArrowUp'] || justPressed['KeyW'] || justPressed['Space'];
    const attackP = justPressed['KeyJ'] || justPressed['KeyZ'] || justPressed['KeyX'];

    // Move
    if (left)  { this.vx -= 1.2; this.facingRight = false; }
    if (right) { this.vx += 1.2; this.facingRight = true; }
    this.vx *= FRICTION;
    if (Math.abs(this.vx) > MOVE_SPEED) this.vx = Math.sign(this.vx) * MOVE_SPEED;

    // Jump
    if (jumpP && this.jumpsLeft > 0) {
      const isDouble = this.jumpsLeft < 2;
      this.vy = isDouble ? JUMP2_FORCE : JUMP_FORCE;
      this.jumpsLeft--;
      this.earTwitch = 15;
      if (isDouble) spawnParticles(this.cx(), this.y + this.h, 8, '#aaddff', 0.7, -0.05, 20);
    }

    // Attack
    if (attackP && this.attackCooldown <= 0) {
      this.attacking = true;
      this.attackTimer = ATTACK_DURATION;
      this.attackCooldown = ATTACK_COOLDOWN;
      // tail sweeps from behind toward the front — attack lands in front
      this.attackAngle = this.facingRight ? 0 : Math.PI;
      this.earTwitch = 10;
    }

    // Gravity
    this.vy += GRAVITY;
    if (this.vy > 18) this.vy = 18;

    // Move X
    this.x += this.vx;
    platforms.forEach(p => rectOverlap(this, p) && resolveCollision(this, p, () => {}));

    // Move Y
    const wasOnGround = this.onGround;
    this.onGround = false;
    this.y += this.vy;
    platforms.forEach(p => {
      if (rectOverlap(this, p)) {
        resolveCollision(this, p, (dy) => {
          if (dy < 0) {
            this.onGround = true;
            this.vy = 0;
            this.jumpsLeft = 2;
            if (!wasOnGround) {
              this.landSquish = 12;
              spawnDustParticles(this.cx(), this.y + this.h);
            }
          } else {
            this.vy = 0;
          }
        });
      }
    });

    // World bounds (left edge)
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // Fell off level
    if (this.y > LEVEL_HEIGHT + 50) {
      this.takeDamage(1);
      this.x = 60; this.y = 450;
      this.vx = 0; this.vy = 0;
    }

    // ── Attack timers & phase ──
    if (this.attackTimer > 0) this.attackTimer--;
    else this.attacking = false;
    if (this.attackCooldown > 0) this.attackCooldown--;

    if (this.attacking) {
      const elapsed = ATTACK_DURATION - this.attackTimer;
      if      (elapsed < ATTACK_WINDUP)                        this.attackPhase = 'windup';
      else if (elapsed < ATTACK_WINDUP + ATTACK_SLASH)         this.attackPhase = 'slash';
      else                                                     this.attackPhase = 'recovery';
    } else {
      this.attackPhase = null;
    }

    // windup: slow the player down (charging stance)
    if (this.attackPhase === 'windup') {
      this.vx *= 0.6;
    }

    // Attack hit detection — fires on the very first slash frame
    if (this.attacking) {
      const elapsed = ATTACK_DURATION - this.attackTimer;
      if (elapsed === ATTACK_WINDUP) {
        const tailOriginX = this.cx() + (this.facingRight ? -14 : 14);
        const tailOriginY = this.cy() + 10;
        enemies.forEach(e => {
          if (!e.alive) return;
          const dx = e.cx() - tailOriginX;
          const dy = e.cy() - tailOriginY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ATTACK_RANGE + 20) {
            const angle = Math.atan2(dy, dx);
            const diff = angleDiff(angle, this.attackAngle);
            if (Math.abs(diff) < ATTACK_ARC / 2) {
              e.die();
              spawnParticles(e.cx(), e.cy(), 14, '#ffee44', 1.5, 0.15, 32);
            }
          }
        });
      }
    }

    // ── Invincibility ──
    if (this.invincible > 0) this.invincible--;

    // Enemy collision damage
    if (this.invincible <= 0) {
      enemies.forEach(e => {
        if (!e.alive) return;
        if (rectsOverlap(this.x, this.y, this.w, this.h, e.x, e.y, e.w, e.h)) {
          this.takeDamage(1);
          const knockDir = this.cx() < e.cx() ? -1 : 1;
          this.vx = knockDir * 6;
          this.vy = -7;
        }
      });
    }

    // ── Animation ──
    this.tailAngle = Math.sin(Date.now() * 0.003) * 0.4 + (this.onGround ? 0 : 0.6);
    if (this.earTwitch > 0) this.earTwitch--;
    if (this.landSquish > 0) this.landSquish--;

    if (this.onGround && Math.abs(this.vx) > 0.5) {
      this.runTimer++;
      if (this.runTimer > 8) { this.runTimer = 0; this.runFrame = (this.runFrame + 1) % 4; }
    } else {
      this.runFrame = 0; this.runTimer = 0;
    }
  }

  takeDamage(amount) {
    if (this.invincible > 0 || this.dead) return;
    this.hp -= amount;
    this.invincible = INVINCIBLE_FRAMES;
    spawnParticles(this.cx(), this.cy(), 10, '#ff4444', 1, 0.1, 30);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  draw() {
    const sx = this.cx() - camera.x;
    const sy = this.cy() - camera.y;
    const dir = this.facingRight ? 1 : -1;

    // flicker when invincible
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2 === 0) return;

    let sqX = this.landSquish > 0 ? 1 + this.landSquish * 0.04 : 1;
    let sqY = this.landSquish > 0 ? 1 - this.landSquish * 0.04 : 1;

    // windup crouch: squash body slightly downward
    if (this.attackPhase === 'windup') {
      const elapsed = ATTACK_DURATION - this.attackTimer;
      const wp = elapsed / ATTACK_WINDUP;
      sqX = 1 + wp * 0.12;
      sqY = 1 - wp * 0.10;
    } else if (this.attackPhase === 'slash') {
      // snap to stretched on slash
      sqX = 0.88;
      sqY = 1.12;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(sqX, sqY);

    // ── Tail ──
    const tailBase = { x: -dir * 10, y: 10 };
    ctx.lineCap = 'round';

    if (this.attackPhase === 'windup') {
      // Windup: tail coils tightly behind and above, color shifts white→gold
      const elapsed = ATTACK_DURATION - this.attackTimer;
      const wp = elapsed / ATTACK_WINDUP; // 0→1 over windup
      // tail tip angle: resting position → coiled high behind
      // resting: behind and drooping; coiled: straight up-behind
      const restA  = dir > 0 ? Math.PI * 1.15 : -Math.PI * 0.15;
      const coilA  = dir > 0 ? Math.PI * 0.65 : Math.PI * 0.35;
      const tipA   = restA + (coilA - restA) * wp;
      const tailLen = 44 - wp * 10; // tail pulls in slightly
      const tx = tailBase.x + Math.cos(tipA) * tailLen;
      const ty = tailBase.y + Math.sin(tipA) * tailLen;
      // color: white → gold
      const r = Math.round(232 + (255 - 232) * wp);
      const g = Math.round(224 + (224 - 224) * wp);
      const b = Math.round(240 - 138 * wp);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      ctx.lineWidth = 4 + wp * 2;
      ctx.beginPath();
      ctx.moveTo(tailBase.x, tailBase.y);
      ctx.bezierCurveTo(
        tailBase.x + Math.cos(tipA + (dir > 0 ? 0.5 : -0.5)) * 16,
        tailBase.y + Math.sin(tipA + (dir > 0 ? 0.5 : -0.5)) * 16,
        tailBase.x + Math.cos(tipA) * 28,
        tailBase.y + Math.sin(tipA) * 28,
        tx, ty
      );
      ctx.stroke();

      // subtle glow at tail tip during windup
      ctx.globalAlpha = 0.3 * wp;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(tx, ty, 5 + wp * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

    } else if (this.attackPhase === 'slash') {
      // Slash: tail whips from coiled position to fully extended forward, easeOut
      const elapsed = ATTACK_DURATION - this.attackTimer;
      const sp = (elapsed - ATTACK_WINDUP) / ATTACK_SLASH; // 0→1 over slash
      const eased = 1 - Math.pow(1 - sp, 3); // easeOutCubic: fast start, slows at end
      const coilA  = dir > 0 ? Math.PI * 0.65 : Math.PI * 0.35;
      const finalA = dir > 0 ? -Math.PI * 0.1  : Math.PI * 1.1;
      const tipA   = coilA + (finalA - coilA) * eased;
      const tailLen = 34 + eased * 18; // extends as it whips
      const tx = tailBase.x + Math.cos(tipA) * tailLen;
      const ty = tailBase.y + Math.sin(tipA) * tailLen;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(tailBase.x, tailBase.y);
      ctx.bezierCurveTo(
        tailBase.x + Math.cos(tipA + (dir > 0 ? 0.3 : -0.3)) * 20,
        tailBase.y + Math.sin(tipA + (dir > 0 ? 0.3 : -0.3)) * 20,
        tailBase.x + Math.cos(tipA) * 36,
        tailBase.y + Math.sin(tipA) * 36,
        tx, ty
      );
      ctx.stroke();

    } else if (this.attackPhase === 'recovery') {
      // Recovery: tail rests at final forward position, fades back to normal
      const elapsed = ATTACK_DURATION - this.attackTimer;
      const rp = (elapsed - ATTACK_WINDUP - ATTACK_SLASH) / ATTACK_RECOVERY; // 0→1
      const finalA = dir > 0 ? -Math.PI * 0.1 : Math.PI * 1.1;
      const restA  = dir > 0 ? Math.PI * 1.15  : -Math.PI * 0.15;
      const tipA   = finalA + (restA - finalA) * rp;
      const tailLen = 52 - rp * 10;
      const tx = tailBase.x + Math.cos(tipA) * tailLen;
      const ty = tailBase.y + Math.sin(tipA) * tailLen;
      // color: gold → white
      const g2 = Math.round(224 * rp + 224 * (1 - rp));
      ctx.strokeStyle = `rgba(255, ${g2}, ${Math.round(102 + 138 * rp)}, ${1 - rp * 0.3})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(tailBase.x, tailBase.y);
      ctx.bezierCurveTo(
        tailBase.x + Math.cos(tipA + (dir > 0 ? 0.3 : -0.3)) * 18,
        tailBase.y + Math.sin(tipA + (dir > 0 ? 0.3 : -0.3)) * 18,
        tailBase.x + Math.cos(tipA) * 32,
        tailBase.y + Math.sin(tipA) * 32,
        tx, ty
      );
      ctx.stroke();

    } else {
      // Idle tail
      ctx.strokeStyle = '#e8e0f0';
      ctx.lineWidth = 4;
      const tailCurve = this.tailAngle;
      ctx.beginPath();
      ctx.moveTo(tailBase.x, tailBase.y);
      ctx.bezierCurveTo(
        tailBase.x - dir * 20, tailBase.y + 10,
        tailBase.x - dir * 30 + Math.cos(tailCurve) * 20, tailBase.y - 10 + Math.sin(tailCurve) * 15,
        tailBase.x - dir * 18 + Math.cos(tailCurve) * 30, tailBase.y - 25 + Math.sin(tailCurve) * 20
      );
      ctx.stroke();
    }

    // ── Body ──
    const bodyColor = '#d4c8e8';
    const bellyColor = '#f0eaf8';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 4, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // belly
    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, 8, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Head ──
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(dir * 3, -14, 13, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Ears ──
    const earTwitch = this.earTwitch > 0 ? Math.sin(this.earTwitch * 0.6) * 0.3 : 0;
    drawEar(ctx, dir * 5, -23, dir, earTwitch, bodyColor, '#e8a0b8');
    drawEar(ctx, -dir * 3, -23, dir, earTwitch, bodyColor, '#e8a0b8');

    // ── Eyes ──
    const eyeX = dir * 6;
    ctx.fillStyle = '#1a0820';
    ctx.beginPath();
    ctx.ellipse(eyeX, -15, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // eye shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eyeX + dir * 1.5, -16.5, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // nose
    ctx.fillStyle = '#e88899';
    ctx.beginPath();
    ctx.ellipse(dir * 8, -11, 2.5, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // whiskers
    ctx.strokeStyle = '#c0b8d0';
    ctx.lineWidth = 0.8;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(dir * 9, -11 + i * 2);
      ctx.lineTo(dir * 22, -11 + i * 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dir * 9, -11 + i * 2);
      ctx.lineTo(dir * 22, -9 + i * 2);
      ctx.stroke();
    }

    // ── Legs (running animation) ──
    const legBob = this.onGround ? Math.sin(this.runFrame * Math.PI * 0.5) * 4 : 0;
    ctx.fillStyle = bodyColor;
    // front legs
    ctx.beginPath(); ctx.ellipse(dir * 8, 14 + legBob, 5, 7, 0.2 * dir, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(dir * 6, 14 - legBob, 5, 7, -0.2 * dir, 0, Math.PI * 2); ctx.fill();
    // back legs
    ctx.beginPath(); ctx.ellipse(-dir * 7, 14 - legBob, 5, 7, -0.2 * dir, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-dir * 5, 14 + legBob, 5, 7, 0.2 * dir, 0, Math.PI * 2); ctx.fill();

    // ── Attack phase visual effects ──
    if (this.attackPhase === 'slash') {
      const elapsed = ATTACK_DURATION - this.attackTimer;
      const sp     = (elapsed - ATTACK_WINDUP) / ATTACK_SLASH;
      const eased  = 1 - Math.pow(1 - sp, 3);
      const coilA  = dir > 0 ? Math.PI * 0.65 : Math.PI * 0.35;
      const finalA = dir > 0 ? -Math.PI * 0.1  : Math.PI * 1.1;
      const tbx = -dir * 10;
      const tby = 10;

      // full-screen flash on the very first slash frame
      if (sp === 0 || elapsed === ATTACK_WINDUP) {
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-sx, -sy, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      // sweep arc trail (coil → current tip)
      const currentA = coilA + (finalA - coilA) * eased;
      ctx.lineCap = 'round';
      for (let arc = 0; arc < 5; arc++) {
        const r = 28 + arc * 10;
        ctx.globalAlpha = (0.75 - sp * 0.5) * (1 - arc * 0.18);
        ctx.strokeStyle = arc < 2 ? '#ffffff' : arc < 4 ? '#ffe066' : '#ffaacc';
        ctx.lineWidth = 6 - arc;
        ctx.beginPath();
        if (dir > 0) {
          ctx.arc(tbx, tby, r, currentA, coilA);
        } else {
          ctx.arc(tbx, tby, r, coilA, currentA);
        }
        ctx.stroke();
      }

      // speed lines at the tail tip
      ctx.globalAlpha = 0.9 - sp * 0.7;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      for (let ml = 0; ml < 5; ml++) {
        const mlAngle = currentA + (ml - 2) * 0.12;
        ctx.beginPath();
        ctx.moveTo(tbx + Math.cos(mlAngle) * 22, tby + Math.sin(mlAngle) * 22);
        ctx.lineTo(tbx + Math.cos(mlAngle) * (50 + (1 - sp) * 18), tby + Math.sin(mlAngle) * (50 + (1 - sp) * 18));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

    } else if (this.attackPhase === 'recovery') {
      // Fading afterimage arc during recovery
      const elapsed = ATTACK_DURATION - this.attackTimer;
      const rp     = (elapsed - ATTACK_WINDUP - ATTACK_SLASH) / ATTACK_RECOVERY;
      const coilA  = dir > 0 ? Math.PI * 0.65 : Math.PI * 0.35;
      const finalA = dir > 0 ? -Math.PI * 0.1  : Math.PI * 1.1;
      const tbx = -dir * 10;
      const tby = 10;

      ctx.lineCap = 'round';
      for (let arc = 0; arc < 3; arc++) {
        const r = 28 + arc * 10;
        ctx.globalAlpha = (0.35 - rp * 0.35) * (1 - arc * 0.3);
        ctx.strokeStyle = arc === 0 ? '#ffe066' : '#ffaacc';
        ctx.lineWidth = 4 - arc;
        ctx.beginPath();
        if (dir > 0) {
          ctx.arc(tbx, tby, r, finalA, coilA);
        } else {
          ctx.arc(tbx, tby, r, coilA, finalA);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}

function drawEar(ctx, x, y, dir, twitch, fill, inner) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(twitch * dir);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(dir * 2, -12);
  ctx.lineTo(8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.moveTo(-3, -1);
  ctx.lineTo(dir * 2, -8);
  ctx.lineTo(5, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Collision Helpers ───────────────────────────
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resolveCollision(obj, plat, callback) {
  const ox = obj.x + obj.w / 2 - (plat.x + plat.w / 2);
  const oy = obj.y + obj.h / 2 - (plat.y + plat.h / 2);
  const hw = (obj.w + plat.w) / 2;
  const hh = (obj.h + plat.h) / 2;
  const dx = hw - Math.abs(ox);
  const dy = hh - Math.abs(oy);

  if (dx < dy) {
    obj.x += Math.sign(ox) * dx;
    obj.vx = 0;
    callback(0);
  } else {
    obj.y += Math.sign(oy) * dy;
    callback(Math.sign(oy) * dy);
  }
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ── Render: Level ───────────────────────────────
function drawLevel() {
  // Starfield / bg decorations (static, not scrolling much)
  const bgX = camera.x * 0.1;
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137 + 50) % LEVEL_WIDTH) - bgX;
    const sy = (i * 89 + 20) % (LEVEL_HEIGHT - 100);
    if (sx < -10 || sx > canvas.width + 10) continue;
    const alpha = 0.2 + (i % 5) * 0.1;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#8899cc';
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Background pillars
  pillars.forEach(p => {
    const sx = p.x - camera.x;
    if (sx > canvas.width + 60 || sx + p.w < -60) return;
    const grad = ctx.createLinearGradient(sx, p.y, sx + p.w, p.y);
    grad.addColorStop(0, '#16102a');
    grad.addColorStop(0.4, '#221a3a');
    grad.addColorStop(1, '#16102a');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, p.y - camera.y, p.w, p.h);
    ctx.strokeStyle = '#3a2855';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, p.y - camera.y, p.w, p.h);
  });

  // Platforms
  platforms.forEach(p => {
    const sx = p.x - camera.x;
    const sy = p.y - camera.y;
    if (sx > canvas.width + 100 || sx + p.w < -100) return;

    // platform body
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + p.h);
    grad.addColorStop(0, '#2e2048');
    grad.addColorStop(1, '#1a1030');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, p.w, p.h);

    // glow top edge
    ctx.strokeStyle = '#7755cc';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#9966ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + p.w, sy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // subtle bottom edge
    ctx.strokeStyle = '#3a2860';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy + p.h);
    ctx.lineTo(sx + p.w, sy + p.h);
    ctx.stroke();
  });

  // Portal
  drawPortal();
}

function drawPortal() {
  const px = portal.x - camera.x;
  const py = portal.y - camera.y;
  const t = Date.now() * 0.002;

  // outer glow rings
  for (let r = 3; r >= 0; r--) {
    const radius = 28 + r * 8 + Math.sin(t + r) * 4;
    ctx.globalAlpha = 0.08 + r * 0.03;
    ctx.fillStyle = '#44ffcc';
    ctx.beginPath();
    ctx.ellipse(px + 25, py + 40, radius * 0.55, radius, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // portal frame
  ctx.strokeStyle = '#44ffcc';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#44ffcc';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.ellipse(px + 25, py + 40, 18, 38, 0, 0, Math.PI * 2);
  ctx.stroke();

  // inner shimmer
  for (let i = 0; i < 5; i++) {
    const angle = t * 1.5 + i * (Math.PI * 2 / 5);
    const ix = px + 25 + Math.cos(angle) * 10;
    const iy = py + 40 + Math.sin(angle) * 22;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#88ffee';
    ctx.beginPath();
    ctx.arc(ix, iy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // label
  ctx.fillStyle = '#aaffee';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', px + 25, py - 10);
}

// ── UI ───────────────────────────────────────────
function drawHUD(player) {
  const padding = 20;
  const heartSize = 22;

  // HUD background
  ctx.fillStyle = 'rgba(10,8,20,0.7)';
  ctx.beginPath();
  ctx.roundRect(padding - 8, padding - 8, player.maxHp * (heartSize + 6) + 16, heartSize + 20, 8);
  ctx.fill();

  for (let i = 0; i < player.maxHp; i++) {
    const hx = padding + i * (heartSize + 6);
    const hy = padding;
    drawHeart(hx, hy, heartSize, i < player.hp);
  }

  // Controls hint (fades after 5s)
  if (gameTime < 300) {
    const alpha = Math.min(1, (300 - gameTime) / 60);
    ctx.globalAlpha = alpha * 0.75;
    ctx.fillStyle = 'rgba(10,8,20,0.8)';
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 160, canvas.height - 70, 320, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#aaaacc';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('移动: ← → / A D    跳跃: 空格/W    攻击: J / Z', canvas.width / 2, canvas.height - 40);
    ctx.globalAlpha = 1;
  }
}

function drawHeart(x, y, size, filled) {
  const s = size / 20;
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.scale(s, s);
  if (filled) {
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 8;
  } else {
    ctx.fillStyle = '#3a2840';
    ctx.shadowBlur = 0;
  }
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-10, -2, -10, -10, 0, -8);
  ctx.bezierCurveTo(10, -10, 10, -2, 0, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#050510');
  grad.addColorStop(0.4, '#0d0820');
  grad.addColorStop(1, '#120a18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ── Game States ──────────────────────────────────
let gameState = 'playing'; // 'playing' | 'win' | 'dead'
let gameTime = 0;
let winAnimTimer = 0;

function drawWinScreen() {
  winAnimTimer++;
  ctx.fillStyle = `rgba(0,0,0,${Math.min(0.75, winAnimTimer * 0.02)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const alpha = Math.min(1, winAnimTimer * 0.03);
  ctx.globalAlpha = alpha;

  // glow
  const cx2 = canvas.width / 2;
  const cy2 = canvas.height / 2;
  const grd = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, 200);
  grd.addColorStop(0, 'rgba(68,255,200,0.3)');
  grd.addColorStop(1, 'rgba(68,255,200,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#44ffcc';
  ctx.shadowColor = '#44ffcc';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 48px monospace';
  ctx.fillText('通关！', cx2, cy2 - 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aaffee';
  ctx.font = '18px monospace';
  ctx.fillText('喵～ 你找到了出口！', cx2, cy2 + 20);

  ctx.fillStyle = '#6688aa';
  ctx.font = '14px monospace';
  ctx.fillText('按 R 重新开始', cx2, cy2 + 60);

  ctx.globalAlpha = 1;
}

function drawDeadScreen() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx2 = canvas.width / 2;
  const cy2 = canvas.height / 2;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4455';
  ctx.shadowColor = '#ff2233';
  ctx.shadowBlur = 20;
  ctx.font = 'bold 42px monospace';
  ctx.fillText('已阵亡', cx2, cy2 - 30);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#cc8899';
  ctx.font = '18px monospace';
  ctx.fillText('猫猫被打败了...', cx2, cy2 + 16);

  ctx.fillStyle = '#6688aa';
  ctx.font = '14px monospace';
  ctx.fillText('按 R 重新开始', cx2, cy2 + 55);
}

// ── Main Game ────────────────────────────────────
let player = new Player();
let enemies = enemySpawns.map(d => new Enemy(d));

function resetGame() {
  player = new Player();
  enemies = enemySpawns.map(d => new Enemy(d));
  particles.length = 0;
  gameState = 'playing';
  gameTime = 0;
  winAnimTimer = 0;
  camera.x = 0;
  camera.y = 0;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updateCamera() {
  const targetX = player.cx() - canvas.width * 0.38;
  const targetY = player.cy() - canvas.height * 0.55;
  camera.x += (targetX - camera.x) * 0.1;
  camera.y += (targetY - camera.y) * 0.1;
  camera.x = Math.max(0, Math.min(LEVEL_WIDTH - canvas.width, camera.x));
  camera.y = Math.max(0, Math.min(LEVEL_HEIGHT - canvas.height + 80, camera.y));
}

function checkPortal() {
  return rectsOverlap(player.x, player.y, player.w, player.h,
                      portal.x, portal.y, portal.w, portal.h);
}

function gameLoop() {
  requestAnimationFrame(gameLoop);

  // Resize guard
  if (canvas.width !== window.innerWidth) resizeCanvas();

  // Restart
  if ((justPressed['KeyR']) && gameState !== 'playing') {
    resetGame();
  }

  if (gameState === 'playing') {
    gameTime++;
    player.update(enemies);
    enemies.forEach(e => e.update());
    updateParticles();
    updateCamera();

    if (player.dead) gameState = 'dead';
    if (checkPortal()) gameState = 'win';
  }

  // ── Draw ──
  drawBackground();
  drawLevel();

  enemies.forEach(e => e.draw());
  drawParticles();
  player.draw();

  if (gameState === 'playing') {
    drawHUD(player);
  } else if (gameState === 'win') {
    drawHUD(player);
    drawWinScreen();
  } else if (gameState === 'dead') {
    drawDeadScreen();
  }

  clearJustPressed();
}

gameLoop();
