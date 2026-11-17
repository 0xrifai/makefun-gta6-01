// HUD: health, cash, wanted stars, objective, mission banner, speed — and the minimap.
import { WORLD_W, WORLD_H, MISSIONS } from './config.js';
import { missionMarker, currentObjective, missionTitle } from './missions.js';

export function drawHUD(ctx, G, W, H) {
  const P = G.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: health bar and cash.
  ctx.fillStyle = 'rgba(10, 12, 18, 0.62)';
  roundRect(ctx, 14, 12, 208, 66, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('LEO MARLOW', 26, 34);
  ctx.fillStyle = '#2a2f3a';
  roundRect(ctx, 26, 42, 150, 12, 6);
  ctx.fill();
  const hpFrac = Math.max(0, P.health / 100);
  ctx.fillStyle = hpFrac > 0.5 ? '#4ac96a' : hpFrac > 0.25 ? '#e0a83c' : '#e04a3c';
  roundRect(ctx, 26, 42, 150 * hpFrac, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#7dff9a';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`$${G.cash.toLocaleString('en-US')}`, 26, 72);

  // Top-right: wanted stars.
  ctx.fillStyle = 'rgba(10, 12, 18, 0.62)';
  roundRect(ctx, W - 218, 12, 204, 40, 10);
  ctx.fill();
  ctx.font = '22px system-ui, sans-serif';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < G.police.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 200 + i * 38, 42);
  }

  // Top-centre: current objective.
  const obj = currentObjective(G.missions);
  ctx.font = 'bold 15px system-ui, sans-serif';
  const ow = ctx.measureText(obj).width;
  ctx.fillStyle = 'rgba(10, 12, 18, 0.62)';
  roundRect(ctx, W / 2 - ow / 2 - 14, 12, ow + 28, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(obj, W / 2 - ow / 2, 35);
  // Mission title above the objective.
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  const mt = missionTitle(G.missions);
  ctx.fillText(mt, W / 2 - ctx.measureText(mt).width / 2, 62);

  // Mission timer, when one is running.
  if (G.missions.timer > 0 && G.missions.index < MISSIONS.length) {
    ctx.font = 'bold 26px system-ui, sans-serif';
    const t = `⏱ ${Math.ceil(G.missions.timer)}s`;
    ctx.fillStyle = G.missions.timer < 15 ? '#ff6a5a' : '#ffffff';
    ctx.fillText(t, W / 2 - ctx.measureText(t).width / 2, 96);
  }

  // Centre mission banner.
  const b = G.missions.banner;
  if (b) {
    const a = Math.min(1, b.t);
    ctx.globalAlpha = a;
    ctx.font = 'bold 34px system-ui, sans-serif';
    const tw = ctx.measureText(b.title).width;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.7)';
    roundRect(ctx, W / 2 - tw / 2 - 24, H * 0.3 - 44, tw + 48, 92, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.fillText(b.title, W / 2 - tw / 2, H * 0.3);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    const lines = wrapText(ctx, b.sub, W * 0.6);
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2 - ctx.measureText(line).width / 2, H * 0.3 + 24 + i * 20);
    });
    ctx.globalAlpha = 1;
  }

  // Bust progress: the cuffs are closing in.
  if (G.police.bustProgress > 0.1) {
    const frac = G.police.bustProgress / 1.6;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.7)';
    roundRect(ctx, W / 2 - 130, H - 120, 260, 34, 10);
    ctx.fill();
    ctx.fillStyle = '#4a7de0';
    roundRect(ctx, W / 2 - 120, H - 111, 240 * frac, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('BUSTED?', W / 2 - 28, H - 98);
  }

  // Bottom-right: speed and car health while driving; controls hint on foot.
  if (P.inCar && P.car) {
    ctx.fillStyle = 'rgba(10, 12, 18, 0.62)';
    roundRect(ctx, W - 168, H - 96, 154, 82, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    const kmh = Math.round(Math.abs(P.car.speed) * 0.32);
    ctx.fillText(`${kmh}`, W - 150, H - 56);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('km/h', W - 96, H - 56);
    ctx.fillText(P.car.model.name, W - 150, H - 30);
    ctx.fillStyle = '#2a2f3a';
    roundRect(ctx, W - 150, H - 24, 120, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#4a7de0';
    roundRect(ctx, W - 150, H - 24, 120 * Math.max(0, (P.carHealth ?? 100) / 100), 8, 4);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(10, 12, 18, 0.55)';
    ctx.font = '13px system-ui, sans-serif';
    const hint = 'WASD move · Mouse aim · Click shoot · Space punch · E enter car · Shift sprint';
    const hw = ctx.measureText(hint).width;
    roundRect(ctx, W - hw - 34, H - 44, hw + 20, 30, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(hint, W - hw - 24, H - 24);
  }

  // Toasts (bottom-centre).
  if (G.toast) {
    ctx.globalAlpha = Math.min(1, G.toast.t);
    ctx.font = 'bold 15px system-ui, sans-serif';
    const tw = ctx.measureText(G.toast.text).width;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.7)';
    roundRect(ctx, W / 2 - tw / 2 - 14, H - 52, tw + 28, 32, 9);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(G.toast.text, W / 2 - tw / 2, H - 30);
    ctx.globalAlpha = 1;
  }

  drawMinimap(ctx, G, W, H);
  ctx.restore();
}

function wrapText(ctx, text, maxW) {
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

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The minimap: a live top-down view of the whole city in the corner.
export function drawMinimap(ctx, G, W, H) {
  const size = 190;
  const mapH = size * (WORLD_H / WORLD_W);
  const x0 = 14, y0 = H - mapH - 14;
  const scale = size / WORLD_W;
  const sy = mapH / WORLD_H;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 12, 18, 0.72)';
  roundRect(ctx, x0 - 6, y0 - 6, size + 12, mapH + 12, 12);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x0, y0, size, mapH);
  ctx.clip();
  // Ground and water.
  ctx.fillStyle = '#3a5a3a';
  ctx.fillRect(x0, y0, size, mapH);
  ctx.fillStyle = '#2a6a8a';
  ctx.fillRect(x0 + 3080 * scale, y0, size - 3080 * scale, mapH);
  // Parks.
  ctx.fillStyle = '#4a7a3a';
  for (const park of G.city.parks) ctx.fillRect(x0 + park.x * scale, y0 + park.y * sy, park.w * scale, park.h * sy);
  // Buildings.
  ctx.fillStyle = '#8a7a6a';
  for (const b of G.city.buildings) ctx.fillRect(x0 + b.x * scale, y0 + b.y * sy, Math.max(1, b.w * scale), Math.max(1, b.h * sy));
  // Roads.
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 4;
  for (const rx of [200, 600, 1000, 1400, 1800, 2200, 2600, 3000]) {
    ctx.beginPath(); ctx.moveTo(x0 + rx * scale, y0); ctx.lineTo(x0 + rx * scale, y0 + mapH); ctx.stroke();
  }
  for (const ry of [200, 600, 1000, 1400, 1800, 2200]) {
    ctx.beginPath(); ctx.moveTo(x0, y0 + ry * sy); ctx.lineTo(x0 + size, y0 + ry * sy); ctx.stroke();
  }
  // Mission marker.
  const marker = missionMarker(G.missions);
  if (marker) {
    const pulse = 3 + Math.sin(G.time * 5) * 1.5;
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(x0 + marker.x * scale, y0 + marker.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x0 + marker.x * scale, y0 + marker.y * sy, pulse + 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Traffic dots.
  ctx.fillStyle = '#e8e8e8';
  for (const car of G.cars) {
    if (car.dead || car.parked) continue;
    ctx.fillRect(x0 + car.x * scale - 1, y0 + car.y * sy - 1, 2.5, 2.5);
  }
  // Police dots.
  ctx.fillStyle = '#4a9aff';
  for (const cop of G.police.cars) {
    if (cop.dead) continue;
    ctx.beginPath();
    ctx.arc(x0 + cop.x * scale, y0 + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const P = G.player;
  ctx.save();
  ctx.translate(x0 + P.x * scale, y0 + P.y * sy);
  ctx.rotate(P.inCar && P.car ? P.car.angle : P.angle);
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}
