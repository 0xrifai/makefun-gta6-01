[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/0xrifai/makefun-gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/0xrifai/makefun-gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Palmera Bay — an open-world crime story

A complete open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Everything in it is
original: the city, the characters, the vehicles, the story, the art, the sound
and the music. Nothing comes from Rockstar Games or any other commercial game.

You are **Leo Marlow**, fresh out and flat broke in Palmera Bay — a sun-soaked
city of wide avenues, a harbour, a beach and six districts to explore. Ray, the
garage man, owes you a favour. Four jobs stand between you and a clean start,
and the Palmera PD is watching the whole time.

## What is in the game

- **A city to explore** — 3,200 × 2,400 px of streets, blocks, parks, a harbour
  and a beach, with named districts (Old Town, Downtown, Marina Bay,
  Southside, The Docks, Palm Heights).
- **On foot and by car** — walk the sidewalks, steal any parked or passing car
  (press E), and drive with arcade physics: acceleration, braking, handbrake
  turns, skid smoke and crash sparks.
- **Traffic and pedestrians** — AI cars drive the road grid, stop at junctions
  and slow down for you; pedestrians stroll the sidewalks and flee gunfire.
- **Wanted level and police** — steal a car, hit a pedestrian or fire a shot
  and the stars climb. Police Interceptors chase, cut you off and ram you.
  Lose them and the heat cools off; get caught slow and you are BUSTED.
- **Missions and a story** — four missions with briefings, markers and
  objectives: steal wheels for Ray, run a crate from the docks to the Neon
  Palms Club, shake a city-wide manhunt, and a 90-second getaway to the
  airfield. Finish the story and take repeatable taxi fares for cash.
- **Combat** — aim with the mouse, shoot with a click, punch with Space.
- **HUD and minimap** — health, cash, wanted stars, objective, mission timer
  and a live minimap showing you, traffic, police and the mission marker.
- **Start screen, pause and save** — your cash, mission progress and position
  save to localStorage; continue where you left off.
- **Sound, all synthesized** — engine hum, two-tone sirens, gunshots, a
  mission jingle and a lazy bass-and-keys loop, made with WebAudio. No audio
  files, no network requests.

## How to play

Serve `game/` with any static server (for example `node serve.ts`, then open
http://localhost:8080) and play in desktop Chrome. No build step, no network.

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| Mouse | Aim (on foot) |
| Click | Shoot |
| Space | Punch / handbrake |
| E | Enter / steal car |
| Shift | Sprint |
| T | Take a taxi fare (after the story) |
| P / Esc | Pause |
| M | Mute |

## Files

- `game/index.html` — the game page (loads `src/main.js`).
- `game/src/` — the game's own source, one job per file: `config.js`
  (city and mission data), `world.js` (city generation and collision),
  `vehicles.js` (driving physics and traffic), `pedestrians.js`,
  `police.js` (wanted level and chases), `missions.js` (story and fares),
  `combat.js`, `audio.js` (synthesized sound), `hud.js` (HUD and minimap),
  `render.js` (camera, city and screens), `shots.js` (screenshot scenes),
  `main.js` (state, loop and save), `input.js`, `random.js`.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `/output/dossier.json`.
- `screenshots/` — four real renders of the game running in Chrome.

## License

MIT — see [LICENSE](LICENSE).
