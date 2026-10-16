'use strict';

// Contract checks for a physical wiring editor. These assert observable electrical
// behavior with independent fixtures instead of rebuilding its union-find graph.
const test = require('node:test');
const assert = require('node:assert/strict');
const BB = require('../dist/model.js');

const empty = () => ({ schema: 'cable-breadboard/v1', version: 1, parts: [], wires: [] });
const jumper = (id, a, b, bends = []) => ({ id, a, b, bends, color: '#224466' });
const connected = (result, first, second) => result.uf.find(first) === result.uf.find(second);
const node = (hole) => BB.holeMap.get(hole).group;
const at = (type, id, hole, nets = {}, extra = {}) => {
  const h = BB.holeMap.get(hole);
  const trial = { id, ref: id, type, x: h.x, y: h.y, rotation: 0, nets, ...extra };
  return BB.snapPart(trial, h.x, h.y);
};

test('each terminal row joins its own five holes, across all four modules', () => {
  const result = BB.analyze(empty());
  for (let bank = 0; bank < 4; bank++) {
    for (const row of [0, 10, 31, 62]) {
      assert(connected(result, node(`b${bank}-${row}-0`), node(`b${bank}-${row}-4`)));
      assert(connected(result, node(`b${bank}-${row}-5`), node(`b${bank}-${row}-9`)));
      assert(!connected(result, node(`b${bank}-${row}-4`), node(`b${bank}-${row}-5`)));
    }
  }
});

test('adjacent rows and separate terminal modules remain isolated', () => {
  const result = BB.analyze(empty());
  assert(!connected(result, node('b0-10-0'), node('b0-11-0')));
  assert(!connected(result, node('b0-10-0'), node('b1-10-0')));
  assert(!connected(result, node('b0-10-0'), node('r0-0-10')));
});

test('rail five-hole visual spacing does not break conductivity', () => {
  const result = BB.analyze(empty());
  assert(connected(result, node('r0-0-4'), node('r0-0-5')));
  assert(connected(result, node('r0-0-19'), node('r0-0-20')));
  assert(connected(result, node('t0-4'), node('t0-5')));
});

test('rail midpoint, polarity, separate rails and top-rail midpoint stay isolated', () => {
  const result = BB.analyze(empty());
  assert(!connected(result, node('r0-0-24'), node('r0-0-25')));
  assert(!connected(result, node('r0-0-0'), node('r0-1-0')));
  assert(!connected(result, node('r0-0-0'), node('r1-0-0')));
  assert(!connected(result, node('t0-24'), node('t0-25')));
  assert(!connected(result, node('t0-0'), node('t1-0')));
});

test('a physical jumper bridges a rail midpoint', () => {
  const state = empty();
  state.wires.push(jumper('W1', { hole: 'r0-0-24' }, { hole: 'r0-0-25' }));
  const result = BB.analyze(state);
  assert(connected(result, node('r0-0-0'), node('r0-0-49')));
});

test('wire crossing and coincident bend points do not create junctions', () => {
  const state = empty();
  const crossing = { x: 200, y: 600 };
  state.wires.push(jumper('W1', { hole: 'b0-0-0' }, { hole: 'b0-10-0' }, [crossing]));
  state.wires.push(jumper('W2', { hole: 'b0-5-0' }, { hole: 'b0-15-0' }, [crossing]));
  const result = BB.analyze(state);
  assert(connected(result, node('b0-0-0'), node('b0-10-0')));
  assert(connected(result, node('b0-5-0'), node('b0-15-0')));
  assert(!connected(result, node('b0-0-0'), node('b0-5-0')));
});

test('connecting +5V directly to GND is reported as a power short', () => {
  const state = empty();
  state.wires.push(jumper('W1', { post: 'v5' }, { post: 'gnd' }));
  const result = BB.analyze(state);
  assert(result.shorts.some((issue) => issue.text.includes('+5V') && issue.text.includes('GND')));
});

test('a resistor separates its terminals and is not an ideal power short', () => {
  const state = empty();
  const resistor = at('resistor', 'R1', 'b0-0-0', { 1: '+5V', 2: 'GND' });
  state.parts.push(resistor);
  state.wires.push(jumper('W1', { post: 'v5' }, { hole: 'b0-0-1' }));
  state.wires.push(jumper('W2', { post: 'gnd' }, { hole: 'b0-3-1' }));
  const result = BB.analyze(state);
  assert.equal(result.shorts.length, 0);
  assert.equal(result.opens.length, 0);
  assert(!connected(result, BB.endpointNode({ part: 'R1', pin: '1' }, state), BB.endpointNode({ part: 'R1', pin: '2' }, state)));
});

test('socket occupancy is the same for wire endpoints specified as a pin or a hole', () => {
  const state = empty();
  const resistor = at('resistor', 'R1', 'b0-0-0');
  state.parts.push(resistor);
  const firstPin = BB.pins(resistor).find((pin) => pin.n === '1');
  const pinHole = BB.nearest(firstPin.x, firstPin.y, 1);
  state.wires.push(jumper('W1', { part: 'R1', pin: '1' }, { hole: 'b0-10-0' }));
  const fromPin = BB.analyze(state);
  state.wires[0].a = { hole: pinHole.id };
  const fromHole = BB.analyze(state);
  assert.equal(fromPin.issues.filter((issue) => issue.hole === pinHole.id).length,
    fromHole.issues.filter((issue) => issue.hole === pinHole.id).length);
});

test('the starter project is mounted, has no electrical errors, and connects 555 to FPGA17', () => {
  const state = BB.createStarter();
  const result = BB.analyze(state);
  assert.equal(state.parts.length, 33);
  assert(state.parts.every(BB.mounted));
  assert.equal(result.shorts.length, 0);
  assert.equal(result.opens.length, 0);
  assert.equal(result.clock, true);
  const timer = state.parts.find((part) => part.type === 'timer');
  const fpga = state.parts.find((part) => part.type === 'fpga');
  assert(connected(result, BB.endpointNode({ part: timer.id, pin: '3' }, state), BB.endpointNode({ part: fpga.id, pin: '17' }, state)));
});

test('removing the physical clock jumper opens clk and removes clock continuity', () => {
  const state = BB.createStarter();
  const wire = state.wires.find((wire) => wire.net === 'clk');
  assert(wire, 'starter should contain an explicit clock jumper');
  state.wires = state.wires.filter((candidate) => candidate.id !== wire.id);
  const result = BB.analyze(state);
  assert.equal(result.clock, false);
  assert(result.opens.some((issue) => issue.net === 'clk'));
});

test('each display common pin has its own 1k ground branch and no direct ground jumper', () => {
  const state = BB.createStarter();
  const result = BB.analyze(state);
  const ep = (id, pin) => result.uf.find(BB.endpointNode({ part: id, pin: String(pin) }, state));
  const ground = result.uf.find('post:gnd');
  for (const [display, prefix] of [['DS1', 'T'], ['DS2', 'U']]) {
    for (const pin of [3, 8]) {
      const resistorId = `R${prefix}C${pin}`;
      const resistor = state.parts.find(p => p.id === resistorId);
      assert(resistor, `${display}.${pin} needs its own resistor`);
      assert.equal(resistor.type, 'resistor');
      assert.equal(resistor.value, '1kΩ');
      assert.equal(ep(display, pin), ep(resistorId, 1));
      assert.equal(ep(resistorId, 2), ground);
      assert.notEqual(ep(display, pin), ground, 'a jumper must not bypass the resistor');
    }
  }
  assert.equal(state.parts.filter(p => /^R[TU]C[38]$/.test(p.id)).length, 4);
});

test('CD4511 outputs connect directly to all seven display segments without series resistors', () => {
  const state = BB.createStarter();
  const result = BB.analyze(state);
  const decoderPins = {a:13, b:12, c:11, d:10, e:9, f:15, g:14};
  const displayPins = {a:1, b:2, c:4, d:5, e:6, f:7, g:9};
  const ep = (part, pin) => BB.endpointNode({part, pin:String(pin)}, state);
  for (const [decoder, display, prefix] of [['U4','DS1','T'], ['U5','DS2','U']]) {
    for (const segment of 'abcdefg') {
      assert(connected(result, ep(decoder, decoderPins[segment]), ep(display, displayPins[segment])));
      assert(!state.parts.some(p => p.type === 'resistor' && Object.values(p.nets || {}).includes(`${prefix}_${segment}`)));
    }
  }
  assert(!state.parts.some(p => /^R[UT][1-7]$/.test(p.id)));
});

test('moving the clock jumper to another physical row opens clk', () => {
  const state = BB.createStarter();
  const wire = state.wires.find((wire) => wire.net === 'clk');
  wire.a = { hole: 'b0-62-0' };
  const result = BB.analyze(state);
  assert.equal(result.clock, false);
  assert(result.opens.some((issue) => issue.net === 'clk'));
});

test('moving the 555 does not drag socket-anchored wires along with it', () => {
  const state = BB.createStarter();
  const timer = state.parts.find((part) => part.type === 'timer');
  timer.y += 14;
  const result = BB.analyze(state);
  assert.equal(result.clock, false);
  assert(result.opens.some((issue) => issue.net === 'clk'));
});

test('DIP toggles close only their own contact pair and reopening disconnects it', () => {
  const state = BB.createStarter();
  const dip = state.parts.find((part) => part.type === 'dip8');
  const ep = (pin) => BB.endpointNode({ part: dip.id, pin: String(pin) }, state);
  let result = BB.analyze(state);
  assert(!connected(result, ep(1), ep(16)));
  dip.switches[0] = true;
  result = BB.analyze(state);
  assert(connected(result, ep(1), ep(16)));
  assert(!connected(result, ep(2), ep(15)));
  dip.switches[0] = false;
  result = BB.analyze(state);
  assert(!connected(result, ep(1), ep(16)));
});

test('closed selector contacts can share the +5V source without false short reports', () => {
  const state = BB.createStarter();
  state.parts.find((part) => part.type === 'dip8').switches = Array(8).fill(true);
  assert.equal(BB.analyze(state).shorts.length, 0);
});

test('a direct accidental selector-to-selector jumper is reported when contacts are OFF', () => {
  const state = BB.createStarter();
  const dip = state.parts.find((part) => part.type === 'dip8');
  state.wires.push(jumper('bad-selector-jumper', { part: dip.id, pin: '1' }, { part: dip.id, pin: '2' }));
  const result = BB.analyze(state);
  assert(result.shorts.some((issue) => issue.text.includes('SEL_A') && issue.text.includes('SEL_B')));
});

test('import round-trips a project as an independent copy', () => {
  const state = BB.createStarter();
  const imported = BB.validateFile(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(imported, state);
  imported.parts[0].x += 14;
  assert.notEqual(imported.parts[0].x, state.parts[0].x);
});

test('import rejects invalid schemas, oversized projects, duplicate ids and nonfinite coordinates', () => {
  assert.throws(() => BB.validateFile({ parts: [], wires: [] }));
  const tooMany = empty();
  tooMany.parts = Array.from({ length: 201 }, (_, i) => at('resistor', `R${i}`, 'b0-0-0'));
  assert.throws(() => BB.validateFile(tooMany));
  const duplicate = empty();
  duplicate.parts = [at('resistor', 'R1', 'b0-0-0'), at('resistor', 'R1', 'b0-1-0')];
  assert.throws(() => BB.validateFile(duplicate));
  const infinity = empty();
  infinity.parts = [at('resistor', 'R1', 'b0-0-0')];
  infinity.parts[0].x = Infinity;
  assert.throws(() => BB.validateFile(infinity));
});

test('import rejects unknown endpoints, duplicate wire ids, invalid bends and unsafe colors', () => {
  for (const mutate of [
    (state) => { state.wires[0].a = { hole: 'not-a-hole' }; },
    (state) => { state.wires[1].id = state.wires[0].id; },
    (state) => { state.wires[0].bends = [{ x: NaN, y: 0 }]; },
    (state) => { state.wires[0].color = 'url(javascript:bad)'; },
    (state) => { state.wires[0].a = { part: 'missing', pin: '1' }; },
    (state) => { state.wires[0].a = { part: 'U1', pin: '99' }; },
  ]) {
    const state = BB.createStarter();
    mutate(state);
    assert.throws(() => BB.validateFile(state));
  }
});

test('import rejects unknown component types including inherited object properties', () => {
  for (const type of ['unobtainium', '__proto__', 'constructor', 'toString']) {
    const state = empty();
    state.parts.push({ id: 'BAD', ref: 'BAD', type, x: 120, y: 278, rotation: 0 });
    assert.throws(() => BB.validateFile(state), `unknown component type ${type}`);
  }
});

test('import rejects non-string net names before analysis can crash', () => {
  const state = empty();
  state.parts.push(at('resistor', 'R1', 'b0-0-0', { 1: 123, 2: 'GND' }));
  assert.throws(() => BB.validateFile(state));
});

test('import rejects contradictory endpoint kinds instead of silently choosing one', () => {
  const state = empty();
  state.wires.push(jumper('W1', { hole: 'missing', post: 'gnd' }, { post: 'v5' }));
  assert.throws(() => BB.validateFile(state));
});
