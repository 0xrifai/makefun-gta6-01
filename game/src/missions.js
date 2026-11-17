// Missions and story: Leo Marlow's four jobs across Palmera Bay, plus a
// repeatable taxi fare once the story is done.
import { MISSIONS, PLACES } from './config.js';
import { dist } from './random.js';

export function createMissions() {
  return {
    index: 0, // which story mission is active (MISSIONS.length = story done)
    step: 0,
    active: null, // the current step object, enriched with a target point
    timer: 0,
    armed: false,
    done: [],
    fare: null, // repeatable taxi fare {from, to, pay, timer}
    banner: null, // {title, sub, t} shown on screen
    toast: null,
  };
}

export function missionTitle(m) {
  if (m.index >= MISSIONS.length) return 'Free Roam';
  return MISSIONS[m.index].title;
}

export function currentObjective(m) {
  if (m.fare) return `Fare: drive your passenger to ${m.fare.toName} ($${m.fare.pay})`;
  if (m.index >= MISSIONS.length) return 'Free roam — press T for a taxi fare';
  const mission = MISSIONS[m.index];
  const step = mission.steps[m.step];
  return step ? step.text : '';
}

function stepTarget(m) {
  const mission = MISSIONS[m.index];
  if (!mission) return null;
  const step = mission.steps[m.step];
  if (!step || !step.place) return null;
  return PLACES[step.place];
}

export function missionMarker(m) {
  if (m.fare) return { x: m.fare.to.x, y: m.fare.to.y, label: m.fare.toName };
  const t = stepTarget(m);
  if (!t) return null;
  return { x: t.x, y: t.y, label: t.name };
}

export function startMission(m, index) {
  m.index = index;
  m.step = 0;
  m.timer = 0;
  m.armed = false;
  const mission = MISSIONS[index];
  m.banner = { title: mission.title, sub: mission.brief, t: 5 };
}

export function advanceStep(m, G) {
  const mission = MISSIONS[m.index];
  m.step += 1;
  if (m.step >= mission.steps.length) {
    // Mission complete.
    G.cash += mission.reward;
    m.done.push(mission.id);
    m.banner = { title: 'Mission Complete', sub: `${mission.title} — +$${mission.reward}`, t: 4 };
    G.audio.jingle();
    m.index += 1;
    m.step = 0;
    if (m.index < MISSIONS.length) {
      startMission(m, m.index);
    } else {
      m.banner = { title: 'Story Complete', sub: 'Palmera Bay is yours, Leo. Free roam — press T for taxi fares.', t: 6 };
    }
  }
}

export function startFare(m, G) {
  const spots = Object.values(PLACES).filter((p) => dist(p.x, p.y, G.player.x, G.player.y) > 500);
  const to = spots[Math.floor(G.rng() * spots.length)];
  m.fare = { to, toName: to.name, pay: 60 + Math.floor(G.rng() * 90), timer: 75 };
  m.banner = { title: 'Taxi Fare', sub: `A passenger hops in — take them to ${to.name}.`, t: 3 };
  G.audio.blip();
}

export function stepMissions(m, dt, G) {
  if (m.banner) {
    m.banner.t -= dt;
    if (m.banner.t <= 0) m.banner = null;
  }
  if (m.index >= MISSIONS.length) {
    // Repeatable fare.
    if (m.fare) {
      m.fare.timer -= dt;
      if (dist(G.player.x, G.player.y, m.fare.to.x, m.fare.to.y) < 70) {
        G.cash += m.fare.pay;
        m.banner = { title: 'Fare Complete', sub: `+$${m.fare.pay} — nice driving.`, t: 3 };
        G.audio.jingle();
        m.fare = null;
      } else if (m.fare.timer <= 0) {
        m.banner = { title: 'Fare Lost', sub: 'The passenger gave up and walked.', t: 3 };
        m.fare = null;
      }
    }
    return;
  }

  const mission = MISSIONS[m.index];
  const step = mission.steps[m.step];
  if (!step) return;
  const P = G.player;

  if (step.type === 'steal') {
    if (P.inCar) advanceStep(m, G);
  } else if (step.type === 'goto' || step.type === 'gotoTimed') {
    const place = PLACES[step.place];
    if (step.type === 'gotoTimed') {
      if (m.timer === 0) m.timer = step.time;
      m.timer -= dt;
      if (m.timer <= 0) {
        // Out of time: the job fails, but the story goes on from the start of the mission.
        m.banner = { title: 'Too Slow', sub: 'The airfield run failed — try the mission again.', t: 4 };
        G.audio.fail();
        m.step = 0;
        m.timer = 0;
        return;
      }
    }
    if (dist(P.x, P.y, place.x, place.y) < 80) advanceStep(m, G);
  } else if (step.type === 'collect') {
    const place = PLACES[step.place];
    if (!P.inCar && dist(P.x, P.y, place.x, place.y) < 60) {
      G.audio.pickup();
      advanceStep(m, G);
    }
  } else if (step.type === 'wanted') {
    if (!m.armed) {
      // The tip-off: the heat arrives all at once.
      G.police.wanted = Math.max(G.police.wanted, step.level);
      G.police.heat = 0;
      m.armed = true;
    }
    if (G.police.wanted === 0) advanceStep(m, G);
  } else if (step.type === 'clear') {
    if (G.police.wanted === 0) advanceStep(m, G);
  }
}
