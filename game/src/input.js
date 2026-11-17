// Keyboard and mouse input, kept in one place.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 0, mouseY: 0, mouseDown: false,
    // Edge-triggered presses, consumed by the game each frame.
    pressed: new Set(),
    anyKey: false,
  };

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
    input.anyKey = true;
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = e.clientX - r.left;
    input.mouseY = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouseDown = true; input.pressed.add('mouse0'); }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}

export function isDown(input, ...keys) {
  return keys.some((k) => input.keys.has(k));
}

export function wasPressed(input, key) {
  return input.pressed.has(key);
}

export function endFrame(input) {
  input.pressed.clear();
  input.anyKey = false;
}
