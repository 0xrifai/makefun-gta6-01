// Palmera Bay — configuration and static data for the open world.
// All names, places, characters and story are original.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_W = 96;
export const BLOCK = 400;

// Road centre lines (a regular grid the traffic AI follows).
export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];

export const STEP = 1 / 60;

export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 1200, h: 800, tint: '#c9a06a' },
  { name: 'Downtown', x: 1200, y: 0, w: 1200, h: 1200, tint: '#7fa8c9' },
  { name: 'Marina Bay', x: 2400, y: 0, w: 800, h: 1200, tint: '#5fb8a8' },
  { name: 'Southside', x: 0, y: 1200, w: 1600, h: 1200, tint: '#c98a7f' },
  { name: 'The Docks', x: 2400, y: 1200, w: 800, h: 1200, tint: '#8a8f96' },
  { name: 'Palm Heights', x: 1600, y: 1200, w: 800, h: 1200, tint: '#a8c97f' },
];

// Named places the missions and the map use.
export const PLACES = {
  garage: { name: "Ray's Garage", x: 1000, y: 560, blurb: 'Ray fixes anything with wheels.' },
  docks: { name: 'The Docks', x: 2960, y: 1400, blurb: 'Crates, cranes and quiet deals.' },
  club: { name: 'Neon Palms Club', x: 1800, y: 960, blurb: 'The loudest door in Palmera Bay.' },
  airfield: { name: 'Solmar Airfield', x: 600, y: 160, blurb: 'Small planes, big runways.' },
  hospital: { name: 'St. Marisol Hospital', x: 1400, y: 1800, blurb: 'Where busted and wasted drivers wake up.' },
  station: { name: 'Palmera PD Precinct', x: 2200, y: 600, blurb: 'Home of the blue-and-whites.' },
  beach: { name: 'Palmera Beach', x: 600, y: 2280, blurb: 'Sun, sand and stolen convertibles.' },
};

export const PLAYER_SPAWN = { x: 1000, y: 1040 };

export const CAR_MODELS = [
  { name: 'Pinto', color: '#c94f43', top: 330, accel: 260, grip: 2.6 },
  { name: 'Comet', color: '#3f7fc9', top: 380, accel: 300, grip: 2.9 },
  { name: 'Vagabond', color: '#e0a83c', top: 300, accel: 240, grip: 2.4 },
  { name: 'Stallion GT', color: '#7a3fc9', top: 430, accel: 340, grip: 3.2 },
  { name: 'Hauler', color: '#5a6b52', top: 260, accel: 200, grip: 2.2 },
  { name: 'Sunbeam', color: '#d94f8a', top: 400, accel: 320, grip: 3.0 },
];

export const PED_NAMES = [
  'Mara', 'Tomas', 'Iris', 'Kenny', 'Luz', 'Omar', 'Pia', 'Rudy',
  'Sofia', 'Dario', 'Nina', 'Hugo', 'Celia', 'Marco', 'Ana', 'Vic',
];

export const MISSIONS = [
  {
    id: 'wheels-up',
    title: 'Mission 1 — Wheels Up',
    brief: 'Ray needs a driver with wheels. Borrow any car on the street and bring it to his garage.',
    steps: [
      { type: 'steal', text: 'Get a car — walk up to one and press E' },
      { type: 'goto', place: 'garage', text: "Drive to Ray's Garage" },
    ],
    reward: 250,
  },
  {
    id: 'the-pickup',
    title: 'Mission 2 — The Pickup',
    brief: 'A crate came in at the docks with your name on it. Grab it on foot, then run it to the Neon Palms Club.',
    steps: [
      { type: 'goto', place: 'docks', text: 'Drive to The Docks' },
      { type: 'collect', place: 'docks', text: 'Pick up the crate (walk into the marker)' },
      { type: 'goto', place: 'club', text: 'Deliver the crate to Neon Palms Club' },
    ],
    reward: 400,
  },
  {
    id: 'heat-wave',
    title: 'Mission 3 — Heat Wave',
    brief: 'Someone tipped off the precinct. The whole PD is looking for you. Shake them — get your wanted level to zero.',
    steps: [
      { type: 'wanted', level: 2, text: 'The cops are on you — lose them!' },
      { type: 'clear', text: 'Stay out of sight until the heat dies down' },
    ],
    reward: 500,
  },
  {
    id: 'the-getaway',
    title: 'Mission 4 — The Getaway',
    brief: 'One last job: the airfield, ninety seconds, and the whole city on your tail. Make it count, Leo.',
    steps: [
      { type: 'gotoTimed', place: 'airfield', time: 90, text: 'Reach Solmar Airfield in 90 seconds' },
    ],
    reward: 800,
  },
];

export const STORY = {
  hero: 'Leo Marlow',
  intro: 'Palmera Bay. Sun, salt air, and a city that never stops moving. Leo Marlow just got out, flat broke, with one name in his pocket: Ray, the garage man who owes him a favour. Four jobs stand between Leo and a clean start — if the Palmera PD lets him get there.',
};

export const CONTROLS = [
  ['W A S D', 'Move / drive'],
  ['Mouse', 'Aim (on foot)'],
  ['Click', 'Shoot'],
  ['Space', 'Punch / handbrake'],
  ['E', 'Enter / steal car'],
  ['Shift', 'Sprint'],
  ['P / Esc', 'Pause'],
  ['M', 'Mute'],
];
