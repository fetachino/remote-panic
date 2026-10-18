const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/core.js");

test("round selection avoids repeating the previous microgame", () => {
  for (const previous of core.TYPES) {
    for (const sample of [0, 0.2, 0.5, 0.9]) {
      assert.notEqual(
        core.nextType(previous, () => sample),
        previous,
      );
    }
  }
});

test("all round types create valid, increasingly urgent challenges", () => {
  for (const type of core.TYPES) {
    const early = core.createRound(type, () => 0.5, 1);
    const later = core.createRound(type, () => 0.5, 15);
    assert.equal(early.type, type);
    assert.ok(early.duration > later.duration);
    assert.ok(later.duration >= 3700);
  }
  const wires = core.createRound("wire", () => 0.5, 1);
  assert.equal(new Set(wires.colors).size, 4);
  assert.ok(wires.colors.includes(wires.target));
  assert.equal(core.createRound("sequence", () => 0.5, 8).pattern.length, 4);
});

test("landing and target hit windows reward precision", () => {
  assert.equal(core.landingHit(50, 58), true);
  assert.equal(core.landingHit(50, 59), false);
  assert.equal(core.targetHit(56), true);
  assert.equal(core.targetHit(57), false);
});

test("points reward time and streak without growing forever", () => {
  assert.ok(core.roundPoints(3000, 3) > core.roundPoints(1000, 3));
  assert.ok(core.roundPoints(1000, 4) > core.roundPoints(1000, 3));
  assert.equal(core.roundPoints(1000, 20), core.roundPoints(1000, 100));
});
