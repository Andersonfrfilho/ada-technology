/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Comportamento da landing: menu, reveals, carrossel e o easter egg.
 *
 * Saiu de um `<script>` inline dentro do `index.html` sem uma linha alterada, para o CSP de producao
 * poder declarar `script-src 'self'` em vez de `unsafe-inline` — script inline e a porta de XSS que a
 * politica existe para fechar. Continua `.js`: tipar 600 linhas de canvas e DOM legado no `strict` do
 * projeto e trabalho proprio, e reescrever junto com a mudanca de CSP misturaria risco de regressao
 * visual com mudanca de seguranca.
 */

// A folha da pagina entra pelo grafo do modulo para o Vite emitir um `<link>` com hash na build —
// e o que permite o CSP de producao dispensar `'unsafe-inline'` em `style-src`.
import './landing.css';

import { mountThemeToggle } from './theme';

mountThemeToggle();

// ── Mobile menu ───────────────────────────────
const burger = document.getElementById('navBurger');
const mobileMenu = document.getElementById('mobileMenu');

burger.addEventListener('click', () => {
  burger.classList.toggle('open');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});

function closeMobileMenu() {
  burger.classList.remove('open');
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}

// Os tres wire-ups abaixo eram `onclick=` no HTML — atributo inline tambem e script inline para o CSP.
for (const link of mobileMenu.querySelectorAll('a')) {
  link.addEventListener('click', closeMobileMenu);
}

// ── Nav scroll effect ─────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ── Scroll reveal ─────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
  revealObserver.observe(el);
});

// ── Step highlight on scroll ──────────────────
const steps = document.querySelectorAll('.step');
const stepObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('active');
    else entry.target.classList.remove('active');
  });
}, { threshold: 0.6 });
steps.forEach(s => stepObserver.observe(s));

// ── Counter animation ─────────────────────────
function animateCounter(element, target, duration = 1800) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const target = parseInt(entry.target.dataset.target);
      animateCounter(entry.target, target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

// ── Featured list stagger ─────────────────────
const listObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const items = entry.target.querySelectorAll('li');
      items.forEach((item, index) => {
        setTimeout(() => item.classList.add('item-visible'), index * 120);
      });
      listObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

const featuredList = document.getElementById('featuredList');
if (featuredList) listObserver.observe(featuredList);

// ── Chat animation sequence ───────────────────
function runChatAnimation() {
  const messages = [
    { id: 'msg1',    delay: 0 },
    { id: 'typing1', delay: 700,  hide: 1400 },
    { id: 'msg2',    delay: 1500 },
    { id: 'msg3',    delay: 2400 },
    { id: 'msg4',    delay: 3600 },
    { id: 'msg5',    delay: 4600 },
  ];

  messages.forEach(({ id, delay, hide }) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.classList.add('msg-visible', 'visible');
      if (hide) {
        setTimeout(() => {
          el.classList.remove('msg-visible', 'visible');
        }, hide - delay);
      }
    }, delay);
  });
}

const chatObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      runChatAnimation();
      chatObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const chat = document.getElementById('chatMockup');
if (chat) chatObserver.observe(chat);
// ── Easter Egg: Snake via Konami Code ────────
const konamiSequence = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  if (e.key === konamiSequence[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === konamiSequence.length) {
      konamiIndex = 0;
      openEasterEgg();
    }
  } else {
    konamiIndex = e.key === konamiSequence[0] ? 1 : 0;
  }
});

// Triple-click on nav logo also triggers it (mobile friendly)
let logoClickCount = 0, logoClickTimer;
document.querySelector('.nav-logo').addEventListener('click', (e) => {
  e.preventDefault();
  logoClickCount++;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 600);
  if (logoClickCount >= 5) { logoClickCount = 0; openEasterEgg(); }
});

function openEasterEgg() {
  const modal = document.getElementById('easterEggModal');
  modal.style.display = 'flex';
  startAdaDefender();
}

function closeEasterEgg() {
  document.getElementById('easterEggModal').style.display = 'none';
  stopGame();
  if (window._gameCleanup) { window._gameCleanup(); window._gameCleanup = null; }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEasterEgg(); });

// ── Ada Defender (Asteroids) ──────────────────
let gameAnimId, gameKeys = {}, gameState;

function restartGame() { stopGame(); startAdaDefender(); }

document.getElementById('snakeRestart').addEventListener('click', restartGame);
document.getElementById('snakeClose').addEventListener('click', closeEasterEgg);
function stopGame() {
  cancelAnimationFrame(gameAnimId);
  gameKeys = {};
}

function startAdaDefender() {
  const canvas = document.getElementById('snakeCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let frame = 0;

  document.getElementById('snakeScore').textContent = '0';

  // ── helpers ──
  function wrap(v, max) { return ((v % max) + max) % max; }

  function makeAsteroidVerts(radius) {
    const n = 8 + Math.floor(Math.random() * 5);
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const r = radius * (0.65 + Math.random() * 0.35);
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
  }

  function spawnAsteroids(count, level) {
    const speed = 0.55 + level * 0.12;
    for (let i = 0; i < count; i++) {
      let x, y;
      do { x = Math.random() * W; y = Math.random() * H; }
      while (Math.hypot(x - W / 2, y - H / 2) < 90);
      const a = Math.random() * Math.PI * 2;
      gameState.asteroids.push({
        x, y,
        vx: Math.cos(a) * (speed + Math.random() * 0.5),
        vy: Math.sin(a) * (speed + Math.random() * 0.5),
        size: 3, radius: 52,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        verts: makeAsteroidVerts(52),
      });
    }
  }

  // ── initial state ──
  gameState = {
    ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, invul: 150, alive: true },
    bullets: [], asteroids: [], particles: [], score: 0, lives: 3, level: 1,
    over: false, cooldown: 0, thrust: false,
    stars: Array.from({ length: 90 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3, b: Math.random(),
    })),
  };
  spawnAsteroids(5, 1);

  // ── draw ship (Ada pyramid) ──
  function drawShip(ship) {
    if (ship.invul > 0 && Math.floor(ship.invul / 5) % 2) return;
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle + Math.PI / 2);

    const sz = 22;

    // Outer glow when thrusting
    if (ship.thrust) {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 18;
    }

    // Body gradient
    const bg = ctx.createLinearGradient(0, -sz, 0, sz);
    bg.addColorStop(0, '#2563eb');
    bg.addColorStop(1, '#0d1b3e');
    ctx.beginPath();
    ctx.moveTo(0, -sz);
    ctx.lineTo(-sz * 0.82, sz * 0.82);
    ctx.lineTo(sz * 0.82, sz * 0.82);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Eye iris glow
    const eyeY = sz * 0.08;
    const er = sz * 0.27;
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.07);
    const eg = ctx.createRadialGradient(0, eyeY, 0, 0, eyeY, er * 2.2);
    eg.addColorStop(0, `rgba(6,182,212,${0.35 + pulse * 0.25})`);
    eg.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.beginPath();
    ctx.arc(0, eyeY, er * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = eg;
    ctx.fill();

    // Eye white
    ctx.beginPath();
    ctx.ellipse(0, eyeY, er, er * 0.62, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,248,255,0.92)';
    ctx.fill();

    // Pupil
    ctx.beginPath();
    ctx.arc(0, eyeY, er * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = '#050d1e';
    ctx.fill();

    // Iris
    ctx.beginPath();
    ctx.arc(0, eyeY, er * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6,182,212,${0.75 + pulse * 0.25})`;
    ctx.fill();

    // Eyelid lines
    ctx.beginPath();
    ctx.ellipse(0, eyeY, er, er * 0.62, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(147,197,253,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Thrust flame
    if (ship.thrust) {
      const fl = 14 + Math.random() * 10;
      const fg = ctx.createLinearGradient(0, sz * 0.82, 0, sz * 0.82 + fl);
      fg.addColorStop(0, 'rgba(34,211,238,0.95)');
      fg.addColorStop(0.5, 'rgba(251,146,60,0.7)');
      fg.addColorStop(1, 'rgba(239,68,68,0)');
      ctx.beginPath();
      ctx.moveTo(-sz * 0.22, sz * 0.82);
      ctx.lineTo(0, sz * 0.82 + fl);
      ctx.lineTo(sz * 0.22, sz * 0.82);
      ctx.fillStyle = fg;
      ctx.fill();
    }

    ctx.restore();
  }

  // ── draw asteroid ──
  function drawAsteroid(ast) {
    ctx.save();
    ctx.translate(ast.x, ast.y);
    ctx.rotate(ast.rot);
    ctx.beginPath();
    ctx.moveTo(ast.verts[0].x, ast.verts[0].y);
    ast.verts.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
    ctx.closePath();
    const col = ast.size === 3 ? '#1e3a6e' : ast.size === 2 ? '#1e4d8c' : '#1a6090';
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = ast.size === 3 ? '#3b82f6' : ast.size === 2 ? '#60a5fa' : '#7dd3fc';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // ── draw bullet ──
  function drawBullet(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
    g.addColorStop(0, 'rgba(6,182,212,0.7)');
    g.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
    ctx.restore();
  }

  // ── mini pyramid (HUD lives) ──
  function drawMiniPyramid(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(-8, 7); ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fillStyle = '#1a4fd6';
    ctx.fill();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // tiny eye
    ctx.beginPath();
    ctx.arc(0, 2, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.restore();
  }

  // ── split asteroid ──
  function splitAsteroid(ast, level) {
    if (ast.size <= 1) return [];
    const newSize = ast.size - 1;
    const newRadius = newSize * 18;
    const spd = 1.2 + Math.random() + level * 0.12;
    return [0, 1].map(() => {
      const a = Math.random() * Math.PI * 2;
      return {
        x: ast.x + Math.cos(a) * 12,
        y: ast.y + Math.sin(a) * 12,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: newSize, radius: newRadius,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.07,
        verts: makeAsteroidVerts(newRadius),
      };
    });
  }

  // ── burst particles ──
  function burst(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3.5;
      gameState.particles.push({
        x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 35 + Math.random() * 25, maxLife: 60,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  // ── main loop ──
  function loop() {
    frame++;
    const gs = gameState;
    const ship = gs.ship;

    // Clear
    ctx.fillStyle = '#000814';
    ctx.fillRect(0, 0, W, H);

    // Stars
    gs.stars.forEach(star => {
      const tw = 0.35 + 0.65 * Math.sin(frame * 0.04 + star.b * 12);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${tw * star.b * 0.85})`;
      ctx.fill();
    });

    if (!gs.over) {
      const TURN = 0.058, THRUST = 0.16, FRICTION = 0.988, MAX_SPD = 7;

      // Ship controls
      if (gameKeys['ArrowLeft'] || gameKeys['a'] || gameKeys['A']) ship.angle -= TURN;
      if (gameKeys['ArrowRight'] || gameKeys['d'] || gameKeys['D']) ship.angle += TURN;

      ship.thrust = !!(gameKeys['ArrowUp'] || gameKeys['w'] || gameKeys['W']);
      if (ship.thrust) {
        ship.vx += Math.cos(ship.angle) * THRUST;
        ship.vy += Math.sin(ship.angle) * THRUST;
      }

      const spd = Math.hypot(ship.vx, ship.vy);
      if (spd > MAX_SPD) { ship.vx *= MAX_SPD / spd; ship.vy *= MAX_SPD / spd; }
      ship.vx *= FRICTION; ship.vy *= FRICTION;
      ship.x = wrap(ship.x + ship.vx, W);
      ship.y = wrap(ship.y + ship.vy, H);
      if (ship.invul > 0) ship.invul--;

      // Shoot
      if (gameKeys[' '] && gs.cooldown <= 0) {
        gs.bullets.push({
          x: ship.x + Math.cos(ship.angle) * 25,
          y: ship.y + Math.sin(ship.angle) * 25,
          vx: Math.cos(ship.angle) * 10 + ship.vx * 0.25,
          vy: Math.sin(ship.angle) * 10 + ship.vy * 0.25,
          life: 52,
        });
        gs.cooldown = 11;
      }
      if (gs.cooldown > 0) gs.cooldown--;

      // Move bullets
      gs.bullets = gs.bullets.filter(b => {
        b.x = wrap(b.x + b.vx, W);
        b.y = wrap(b.y + b.vy, H);
        return --b.life > 0;
      });

      // Move asteroids
      gs.asteroids.forEach(ast => {
        ast.x = wrap(ast.x + ast.vx, W);
        ast.y = wrap(ast.y + ast.vy, H);
        ast.rot += ast.rotSpeed;
      });

      // Bullet-asteroid collisions
      const survivingBullets = [];
      gs.bullets.forEach(b => {
        let hit = false;
        gs.asteroids = gs.asteroids.flatMap(ast => {
          if (!hit && Math.hypot(b.x - ast.x, b.y - ast.y) < ast.radius) {
            hit = true;
            burst(ast.x, ast.y, 10, ['#38bdf8', '#60a5fa', '#93c5fd']);
            const pts = ast.size === 3 ? 20 : ast.size === 2 ? 50 : 100;
            gs.score += pts;
            document.getElementById('snakeScore').textContent = gs.score;
            return splitAsteroid(ast, gs.level);
          }
          return [ast];
        });
        if (!hit) survivingBullets.push(b);
      });
      gs.bullets = survivingBullets;

      // Ship-asteroid collision
      if (ship.invul <= 0) {
        for (const ast of gs.asteroids) {
          if (Math.hypot(ship.x - ast.x, ship.y - ast.y) < ast.radius + 13) {
            burst(ship.x, ship.y, 22, ['#06b6d4', '#1a4fd6', '#38bdf8', '#fbbf24']);
            gs.lives--;
            ship.x = W / 2; ship.y = H / 2;
            ship.vx = 0; ship.vy = 0;
            ship.invul = 180;
            if (gs.lives <= 0) gs.over = true;
            break;
          }
        }
      }

      // Next level
      if (gs.asteroids.length === 0) {
        gs.level++;
        spawnAsteroids(4 + gs.level, gs.level);
      }
    }

    // Particles
    gs.particles = gs.particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life--;
      if (p.life <= 0) return false;
      const alpha = p.life / p.maxLife;
      const rgb = p.color === '#38bdf8' ? '56,189,248'
                : p.color === '#60a5fa' ? '96,165,250'
                : p.color === '#93c5fd' ? '147,197,253'
                : p.color === '#1a4fd6' ? '26,79,214'
                : p.color === '#fbbf24' ? '251,191,36'
                : '6,182,212';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb},${alpha})`;
      ctx.fill();
      return true;
    });

    // Draw world
    gs.asteroids.forEach(drawAsteroid);
    gs.bullets.forEach(drawBullet);
    if (ship.alive) drawShip(ship);

    // HUD — lives as mini pyramids
    for (let i = 0; i < gs.lives; i++) drawMiniPyramid(18 + i * 24, H - 18);

    // HUD — level
    ctx.fillStyle = 'rgba(56,189,248,0.55)';
    ctx.font = '11px Space Grotesk, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`LVL ${gs.level}`, W - 10, H - 10);
    ctx.textAlign = 'left';

    // Game over screen
    if (gs.over) {
      ctx.fillStyle = 'rgba(0,8,20,0.75)';
      ctx.fillRect(0, 0, W, H);

      // Ada pyramid logo watermark
      ctx.save();
      ctx.translate(W / 2, H / 2 - 64);
      const sz = 36;
      const bg = ctx.createLinearGradient(0, -sz, 0, sz);
      bg.addColorStop(0, '#2563eb');
      bg.addColorStop(1, '#0d1b3e');
      ctx.beginPath();
      ctx.moveTo(0, -sz); ctx.lineTo(-sz * 0.82, sz * 0.82); ctx.lineTo(sz * 0.82, sz * 0.82);
      ctx.closePath();
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, sz * 0.1, sz * 0.27, sz * 0.17, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240,248,255,0.9)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, sz * 0.1, sz * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 26px Space Grotesk, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 + 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px Space Grotesk, monospace';
      ctx.fillText(`Pontuação: ${gs.score}`, W / 2, H / 2 + 42);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '12px Space Grotesk, monospace';
      ctx.fillText('Pressione R para tentar novamente', W / 2, H / 2 + 68);
      ctx.textAlign = 'left';
      return;
    }

    gameAnimId = requestAnimationFrame(loop);
  }

  // Key listeners (scoped to game)
  function onKeyDown(e) {
    gameKeys[e.key] = true;
    if (e.key === ' ') e.preventDefault();
    if ((e.key === 'r' || e.key === 'R') && gameState && gameState.over) restartGame();
  }
  function onKeyUp(e) { gameKeys[e.key] = false; }
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window._gameCleanup = () => {
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
  };

  gameAnimId = requestAnimationFrame(loop);

  // Touch controls
  function holdKey(key, el) {
    let interval;
    el.addEventListener('touchstart', e => { e.preventDefault(); gameKeys[key] = true; if (key === ' ') interval = setInterval(() => { gameKeys[key] = true; }, 120); }, { passive: false });
    el.addEventListener('touchend',   e => { e.preventDefault(); gameKeys[key] = false; clearInterval(interval); }, { passive: false });
  }
  holdKey('ArrowUp',    document.getElementById('touchUp'));
  holdKey('ArrowLeft',  document.getElementById('touchLeft'));
  holdKey('ArrowRight', document.getElementById('touchRight'));
  holdKey('ArrowDown',  document.getElementById('touchDown'));
  holdKey(' ',          document.getElementById('touchFire'));
}
