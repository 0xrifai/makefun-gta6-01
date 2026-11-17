// Palmera Bay — a make.fun gta6-01 entry (Node 22, standard library only).
// The game is this directory's game/ folder, plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library, no network
// request). This program hands it in: it copies game/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json with the vendored
// make.fun library, the summary the judge reads.
//
// Serve the game locally with any static server (for example, from game/:
// `python3 -m http.server 8080`), then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program refuses to hand in a broken entry: it checks that game/index.html
// and at least one screenshot exist before it writes anything, and it prints a
// short summary of what it wrote, so a bad run fails loudly instead of
// silently producing an empty /output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly when the entry is incomplete, before anything is copied.
const indexHtml = join(here, 'game', 'index.html');
if (!existsSync(indexHtml)) throw new Error('refusing to hand in: game/index.html is missing');
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f))
  : [];
if (shots.length < 3) throw new Error(`refusing to hand in: only ${shots.length} screenshot(s), need 3 or 4`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Summary for the log: how much of the entry was handed in.
function countFiles(dir) {
  let files = 0, bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(p);
      files += sub.files; bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(p).size;
    }
  }
  return { files, bytes };
}
const game = countFiles(join(out, 'game'));
console.log(
  `Palmera Bay handed in: ${game.files} game files (${game.bytes} bytes), `
  + `${shots.length} screenshot(s) (${shots.join(', ')}), `
  + `dossier.json ${Buffer.byteLength(dossier, 'utf8')} bytes.`,
);
