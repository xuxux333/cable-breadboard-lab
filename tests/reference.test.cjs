'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const BB = require('../dist/model.js');
const reference = require('../docs/circuit-reference.json');

function referenceGraph() {
  const pinNets = new Map(), canonical = new Map();
  const add = (ref, pin, net, alias = pin) => {
    if (!net || net.startsWith('NC')) return;
    const endpoint = `${reference.modelPartIds[ref]}.${pin}`;
    canonical.set(`${ref}.${alias}`, endpoint);
    assert(!pinNets.has(endpoint), `duplicate reference pin ${endpoint}`);
    pinNets.set(endpoint, net);
  };
  for (const [ref, chip] of Object.entries(reference.chips)) for (const [pin, net] of Object.entries(chip.pins)) add(ref, pin, net);
  for (const part of reference.passives) part.nets.forEach((net, i) => add(part.ref, String(i + 1), net));
  for (const [pin, net] of Object.entries(reference.fpga.schematicPinNets)) add('FPGA', pin, net, net);
  for (const [key, display] of Object.entries(reference.displays)) {
    const ref = `DISPLAY_${key}`;
    for (const [pin, net] of Object.entries(display.schematicPinNets)) {
      const alias = Object.entries(display.segments).find(([, value]) => value === net)?.[0] || pin;
      add(ref, pin, net, alias);
    }
  }
  return { pinNets, canonical };
}

test('document reference defines every connected endpoint and every declared connected pin once', () => {
  const { pinNets, canonical } = referenceGraph(), seen = new Set();
  assert.equal(new Set(reference.nets.map(net => net.name)).size, reference.nets.length);
  for (const net of reference.nets) for (const endpoint of net.endpoints) {
    assert(canonical.has(endpoint), `undefined reference endpoint ${endpoint}`);
    const key = canonical.get(endpoint);
    assert(!seen.has(key), `duplicate endpoint ${endpoint}`);
    seen.add(key);
    assert.equal(pinNets.get(key), net.name, endpoint);
  }
  assert.deepEqual([...seen].sort(), [...pinNets.keys()].sort());
});

test('document reference and default schematic match for all 33 components and 60 nets', () => {
  const starter = BB.createStarter(), { pinNets } = referenceGraph();
  assert.deepEqual([...new Set(Object.values(reference.modelPartIds))].sort(), starter.parts.map(part => part.id).sort());
  const actual = new Map();
  // Component identity uses stable IDs; editable ref labels do not define wiring.
  for (const part of starter.parts) for (const [pin, net] of Object.entries(part.nets || {})) if (!net.startsWith('NC')) actual.set(`${part.id}.${pin}`, net);
  assert.deepEqual([...pinNets].sort(), [...actual].sort());
  assert.equal(new Set(actual.values()).size, 60);
  assert.equal(starter.parts.length, 33);
});

test('document preserves teacher-confirmed display limits and ADC reference validation', () => {
  assert.deepEqual(reference.displayWiring.commonCathodePins, [3, 8]);
  assert.equal(reference.displayWiring.resistorPerCommonPinOhm, 1000);
  assert.equal(reference.displayWiring.totalDisplayResistors, 4);
  assert.equal(reference.displayWiring.perSegmentSeriesResistors, false);
  assert(reference.constraints.some(item => item.id === 'adc-reference' && /悬空不是接错/.test(item.detail)));
  assert.deepEqual(reference.chips.DIP.contactPairs, [[1,16],[2,15],[3,14],[4,13],[5,12],[6,11],[7,10],[8,9]]);
});
