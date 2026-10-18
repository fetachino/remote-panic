(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RemotePanicCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var TYPES = ["wire", "landing", "sequence", "target"];
  var COLORS = ["red", "blue", "yellow", "green"];
  var ARROWS = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function randomInt(rng, max) {
    return Math.floor(rng() * max);
  }
  function shuffled(items, rng) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = randomInt(rng, i + 1);
      var temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }
  function nextType(previous, rng) {
    var choices = TYPES.filter(function (type) {
      return type !== previous;
    });
    return choices[randomInt(rng, choices.length)];
  }
  function createRound(type, rng, number) {
    if (TYPES.indexOf(type) < 0) throw new Error("Unknown round type: " + type);
    var duration = clamp(6500 - (number - 1) * 160, 3700, 6500);
    if (type === "wire") {
      return {
        type: type,
        duration: duration,
        target: COLORS[randomInt(rng, 4)],
        colors: shuffled(COLORS, rng),
        selected: 0,
      };
    }
    if (type === "landing") {
      return {
        type: type,
        duration: duration,
        pad: 12 + randomInt(rng, 67),
        ship: 50,
      };
    }
    if (type === "sequence") {
      var length = number >= 8 ? 4 : 3;
      var pattern = [];
      for (var i = 0; i < length; i++) pattern.push(ARROWS[randomInt(rng, 4)]);
      return {
        type: type,
        duration: duration + 1400,
        pattern: pattern,
        progress: 0,
      };
    }
    return { type: type, duration: duration, phase: rng() * Math.PI * 2 };
  }
  function roundPoints(remainingMs, streak) {
    return (
      100 +
      Math.floor(Math.max(0, remainingMs) / 100) * 4 +
      Math.min(streak, 20) * 25
    );
  }
  function landingHit(ship, pad) {
    return Math.abs(ship - pad) <= 8;
  }
  function targetPosition(elapsedMs, phase, roundNumber) {
    return (
      50 +
      Math.sin(
        elapsedMs * (0.0032 + Math.min(roundNumber, 20) * 0.00009) + phase,
      ) *
        39
    );
  }
  function targetHit(position) {
    return Math.abs(position - 50) <= 6.3;
  }
  return {
    TYPES: TYPES,
    COLORS: COLORS,
    ARROWS: ARROWS,
    clamp: clamp,
    shuffled: shuffled,
    nextType: nextType,
    createRound: createRound,
    roundPoints: roundPoints,
    landingHit: landingHit,
    targetPosition: targetPosition,
    targetHit: targetHit,
  };
});
