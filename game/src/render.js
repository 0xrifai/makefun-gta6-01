// Rendering: the sun-soaked city, the camera, every car and person, particles,
// and the title / pause / busted / wasted screens.
import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, CONTROLS, STORY, PLACES } from './config.js';
import { clamp, lerp } from './random.js';
import { isOnRoad } from './world.js';
import { roundRect } from './hud.js';
import { missionMarker } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

export function createCamera() {
  return { x: 0, y: 0, zoom: 1 };
}

export function updateCamera(cam, targetX, targetY, W, H, dt) {
  const k = 1 - Math.pow(0.001, dt); // smooth follow
  cam.x = lerp(cam.x, targetX - W / 2, k);
  cam.y = lerp(cam.y, targetY - H / 2, k);
  cam.x = clamp(cam.x, -120, WORLD_W - W + 120);
  cam.y = clamp(cam.y, -120, WORLD_H - H + 120);
}

export function render(ctx, G, W, H) {
  const cam = G.camera;
  ctx.save();
  // Warm sky-toned backdrop beyond the world edge.
  ctx.fillStyle = '#e8d8a8';
  ctx.fillRect(0, 0, W, H);
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, G, cam, W, H);
  drawRoads(ctx, G, cam, W, H);
  drawParks(ctx, G, cam, W, H);
  drawBuildings(ctx, G, cam, W, H);
  drawTrees(ctx, G, cam, W, H);
  drawMarker(ctx, G);
  drawCars(ctx, G, cam, W, H);
  drawPeds(ctx, G, cam, W, H);
  drawPlayer(ctx, G);
  drawBullets(ctx, G);
  drawParticles(ctx, G);
  ctx.restore();
  // Screen-space vignette for a warmer look.
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(255, 220, 140, 0)');
  grad.addColorStop(1, 'rgba(120, 60, 10, 0.16)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function visible(cam, W, H, x, y, m) {
  return x > cam.x - m && x < cam.x + W + m && y > cam.y - m && y < cam.y + H + m;
}

function drawGround(ctx, G, cam, W, H) {
  const x0 = Math.max(0, cam.x), y0 = Math.max(0, cam.y);
  const x1 = Math.min(WORLD_W, cam.x + W), y1 = Math.min(WORLD_H, cam.y + H);
  ctx.fillStyle = '#b8a06a'; // dry grass / sidewalk base
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Subtle checker of lawn tiles.
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  const tile = 100;
  for (let tx = Math.floor(x0 / tile) * tile; tx < x1; tx += tile) {
    for (let ty = Math.floor(y0 / tile) * tile; ty < y1; ty += tile) {
      if (((tx + ty) / tile) % 2 === 0) ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // Beach sand and harbour water.
  ctx.fillStyle = '#e8d8a0';
  ctx.fillRect(0, 2280, WORLD_W, WORLD_H - 2280);
  ctx.fillStyle = '#2a7a9a';
  ctx.fillRect(3080, 0, WORLD_W - 3080, WORLD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 6; i += 1) {
    const wy = ((i * 397 + G.time * 12) % WORLD_H);
    ctx.fillRect(3090, wy, 110, 3);
  }
  // District labels, faint on the ground.
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(60, 40, 20, 0.10)';
  ctx.textAlign = 'center';
  for (const d of G.city.districts) {
    if (visible(cam, W, H, d.x + d.w / 2, d.y + d.h / 2, 400)) {
      ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
    }
  }
  ctx.textAlign = 'left';
}

function drawRoads(ctx, G, cam, W, H) {
  ctx.fillStyle = '#3a3a42';
  for (const rx of ROADS_X) {
    if (rx < cam.x - 80 || rx > cam.x + W + 80) continue;
    ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  }
  for (const ry of ROADS_Y) {
    if (ry < cam.y - 80 || ry > cam.y + H + 80) continue;
    ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  }
  // Centre dashes.
  ctx.fillStyle = '#e8d94a';
  for (const rx of ROADS_X) {
    if (rx < cam.x - 80 || rx > cam.x + W + 80) continue;
    for (let y = 0; y < WORLD_H; y += 56) {
      if (y < cam.y - 60 || y > cam.y + H + 60) continue;
      ctx.fillRect(rx - 2, y, 4, 30);
    }
  }
  for (const ry of ROADS_Y) {
    if (ry < cam.y - 80 || ry > cam.y + H + 80) continue;
    for (let x = 0; x < WORLD_W; x += 56) {
      if (x < cam.x - 60 || x > cam.x + W + 60) continue;
      ctx.fillRect(x, ry - 2, 30, 4);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const rx of ROADS_X) {
    for (const ry of ROADS_Y) {
      if (!visible(cam, W, H, rx, ry, 120)) continue;
      for (let i = -3; i <= 3; i += 1) {
        ctx.fillRect(rx + i * 12 - 4, ry - ROAD_W / 2 - 14, 8, 12);
        ctx.fillRect(rx + i * 12 - 4, ry + ROAD_W / 2 + 2, 8, 12);
      }
    }
  }
}

function drawParks(ctx, G, cam, W, H) {
  for (const park of G.city.parks) {
    if (!visible(cam, W, H, park.x + park.w / 2, park.y + park.h / 2, 300)) continue;
    ctx.fillStyle = '#5a8a4a';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(park.x, park.y, park.w, 12);
  }
}

function drawBuildings(ctx, G, cam, W, H) {
  for (const b of G.city.buildings) {
    if (!visible(cam, W, H, b.x + b.w / 2, b.y + b.h / 2, 200)) continue;
    // Drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Roof inset.
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    // Windows along the roof edge.
    ctx.fillStyle = 'rgba(255, 240, 200, 0.85)';
    const n = b.windows;
    for (let i = 0; i < n; i += 1) {
      const wx = b.x + 12 + (i * (b.w - 24)) / Math.max(1, n - 1);
      ctx.fillRect(wx, b.y + 10, 8, 8);
      ctx.fillRect(wx, b.y + b.h - 18, 8, 8);
    }
    // A taller building gets a rooftop box.
    if (b.height >= 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + b.w / 2 - 14, b.y + b.h / 2 - 10, 28, 20);
    }
  }
}

function drawTrees(ctx, G, cam, W, H) {
  for (const t of G.city.trees) {
    if (!visible(cam, W, H, t.x, t.y, 60)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.45, 0, Math.PI * 2); ctx.fill();
  }
}

function drawMarker(ctx, G) {
  const marker = missionMarker(G.missions);
  if (!marker) return;
  const pulse = 1 + Math.sin(G.time * 4) * 0.12;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = '#ffd94a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 217, 74, 0.18)';
  ctx.beginPath();
  ctx.arc(marker.x, marker.y, 34 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Light pillar.
  const grad = ctx.createLinearGradient(marker.x, marker.y - 260, marker.x, marker.y);
  grad.addColorStop(0, 'rgba(255, 217, 74, 0)');
  grad.addColorStop(1, 'rgba(255, 217, 74, 0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(marker.x - 10, marker.y - 260, 20, 260);
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 14);
  ctx.lineTo(marker.x + 10, marker.y + 4);
  ctx.lineTo(marker.x, marker.y + 16);
  ctx.lineTo(marker.x - 10, marker.y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a22';
  ctx.fillText(marker.label, marker.x, marker.y - 44);
  ctx.textAlign = 'left';
  ctx.restore();
}

export function drawCarShape(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(3, 4, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -24, -12, 48, 24, 7);
  ctx.fill();
  if (car.cop) {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(-6, -12, 12, 24);
    ctx.fillStyle = '#1a1a22';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, -14);
    ctx.textAlign = 'left';
    // Light bar, flashing.
    const flash = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3a3a' : '#3a7dff';
    ctx.fillRect(-4, -15, 8, 4);
    ctx.fillStyle = flash ? '#3a7dff' : '#ff3a3a';
    ctx.fillRect(-4, 11, 8, 4);
  }
  // Windshield and rear window.
  ctx.fillStyle = 'rgba(20, 30, 50, 0.75)';
  ctx.fillRect(8, -9, 8, 18);
  ctx.fillRect(-18, -9, 6, 18);
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(22, -10, 3, 5);
  ctx.fillRect(22, 5, 3, 5);
  // Brake lights when slow.
  if (car.speed < 20) {
    ctx.fillStyle = '#ff3a3a';
    ctx.fillRect(-25, -10, 3, 5);
    ctx.fillRect(-25, 5, 3, 5);
  }
  ctx.restore();
}

function drawCars(ctx, G, cam, W, H) {
  for (const car of G.cars) {
    if (car.dead) continue;
    if (!visible(cam, W, H, car.x, car.y, 120)) continue;
    // Skid marks.
    if (car.skid > 0) {
      ctx.strokeStyle = 'rgba(20,20,20,0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(car.x - Math.cos(car.angle) * 20, car.y - Math.sin(car.angle) * 20);
      ctx.lineTo(car.x - Math.cos(car.angle) * 34, car.y - Math.sin(car.angle) * 34);
      ctx.stroke();
    }
    drawCarShape(ctx, car, G.time);
  }
}

function drawPeds(ctx, G, cam, W, H) {
  for (const p of G.peds) {
    if (p.dead) {
      if (!visible(cam, W, H, p.x, p.y, 80)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(0.4);
      ctx.fillStyle = p.shirt;
      ctx.fillRect(-11, -4, 22, 8);
      ctx.fillStyle = p.pants;
      ctx.fillRect(-11, 4, 22, 6);
      ctx.restore();
      continue;
    }
    if (!visible(cam, W, H, p.x, p.y, 80)) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    const bob = Math.sin(p.bob) * 1.5;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 7, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(p.angle);
    ctx.fillStyle = p.hitFlash > 0 ? '#ffffff' : p.pants;
    ctx.fillRect(-4, -3 + bob * 0.4, 8, 6); // legs
    ctx.fillStyle = p.hitFlash > 0 ? '#ffffff' : p.shirt;
    ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill(); // torso
    ctx.fillStyle = '#e8b98a';
    ctx.beginPath(); ctx.arc(8, 0, 4.5, 0, Math.PI * 2); ctx.fill(); // head
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath(); ctx.arc(8, -1.5, 4.2, Math.PI, Math.PI * 2); ctx.fill(); // hair
    ctx.restore();
    if (p.scared > 0) {
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('!', p.x + 8, p.y - 12);
    }
  }
}

function drawPlayer(ctx, G) {
  const P = G.player;
  if (P.inCar) return; // the player is inside their car, already drawn
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(P.angle);
  const bob = Math.sin(P.bob) * 1.5;
  // Legs.
  ctx.fillStyle = '#2a2f4a';
  ctx.fillRect(-4, -4 + bob * 0.4, 8, 8);
  // Jacket — Leo's teal jacket.
  ctx.fillStyle = '#1f8a7a';
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(2, -7, 4, 14); // jacket stripe
  // Head and hair.
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath(); ctx.arc(9, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(9, -1.5, 4.8, Math.PI, Math.PI * 2); ctx.fill();
  // Pistol in hand, pointing at the aim.
  const aimLocal = P.aimAngle - P.angle;
  ctx.rotate(aimLocal);
  ctx.fillStyle = '#22242e';
  ctx.fillRect(6, -1.5, 12, 3);
  if (G.combat.muzzle > 0) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(20, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawBullets(ctx, G) {
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 2;
  for (const b of G.combat.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, G) {
  for (const pt of G.particles) {
    const frac = pt.life / pt.max;
    ctx.globalAlpha = frac;
    if (pt.kind === 'ring') {
      ctx.strokeStyle = pt.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size + (1 - frac) * 22, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * frac + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---- Full screens (title / pause / busted / wasted) ----

function panel(ctx, W, H, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
  ctx.fillRect(0, 0, W, H);
  const pw = Math.min(640, W - 60);
  const ph = 110 + lines.length * 26;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  ctx.fillStyle = 'rgba(16, 20, 30, 0.95)';
  roundRect(ctx, px, py, pw, ph, 16);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, px, py, pw, ph, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(title, W / 2, py + 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, py + 92 + i * 26));
  ctx.restore();
}

export function drawTitle(ctx, G, W, H) {
  render(ctx, G, W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 16, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  // Sun.
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.2, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 217, 74, 0.25)';
  ctx.beginPath();
  ctx.arc(W * 0.78, H * 0.2, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('PALMERA BAY', W / 2, H * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('An open-world crime story', W / 2, H * 0.3 + 40);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const intro = wrapLines(ctx, STORY.intro, W * 0.6);
  intro.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.42 + i * 22));
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillStyle = '#ffd94a';
  const start = G.save ? 'Press ENTER — Continue (saved game)' : 'Press ENTER — New Game';
  ctx.fillText(start, W / 2, H * 0.62);
  if (G.save) {
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Press N for a fresh start', W / 2, H * 0.62 + 26);
  }
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  CONTROLS.forEach((c, i) => ctx.fillText(`${c[0]} — ${c[1]}`, W / 2, H * 0.72 + i * 20));
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText('A fully original game. No part of it comes from any commercial game.', W / 2, H - 24);
  ctx.restore();
}

export function drawPause(ctx, G, W, H) {
  render(ctx, G, W, H);
  panel(ctx, W, H, 'PAUSED', [
    `Cash: $${G.cash.toLocaleString('en-US')} · Missions done: ${G.missions.done.length} of ${4}`,
    'Press P or Esc to keep playing',
    'Progress saves automatically at every mission.',
  ], '#ffd94a');
}

export function drawBusted(ctx, G, W, H) {
  render(ctx, G, W, H);
  panel(ctx, W, H, 'BUSTED', [
    'The Palmera PD hauled you in. Bail cost you $200.',
    'You wake up outside the precinct — the city is still yours.',
    'Press ENTER to get back out there.',
  ], '#4a9aff');
}

export function drawWasted(ctx, G, W, H) {
  render(ctx, G, W, H);
  panel(ctx, W, H, 'WASTED', [
    'Leo went down. The paramedics patched him up — $150 lighter.',
    'You wake up at St. Marisol Hospital.',
    'Press ENTER to get back out there.',
  ], '#e04a3c');
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
