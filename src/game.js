(function () {
  "use strict";
  var core = window.RemotePanicCore;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var ui = {
    menu: $("menu-screen"),
    game: $("game-screen"),
    end: $("end-screen"),
    overlay: $("pause-overlay"),
    arena: $("arena"),
    high: $("menu-high-score"),
    round: $("hud-round"),
    score: $("hud-score"),
    streak: $("hud-streak"),
    lives: $("hud-lives"),
    timer: $("timer-fill"),
    kicker: $("round-kicker"),
    title: $("round-title"),
    instruction: $("round-instruction"),
    hint: $("control-hint"),
    feedback: $("feedback"),
    feedbackTitle: $("feedback-title"),
    feedbackDetail: $("feedback-detail"),
    endScore: $("end-score"),
    endRounds: $("end-rounds"),
    endBest: $("end-best"),
    endSubtitle: $("end-subtitle"),
    sound: $("sound-button"),
  };
  var state = {
    screen: "menu",
    paused: false,
    number: 0,
    score: 0,
    streak: 0,
    lives: 3,
    cleared: 0,
    previous: "",
    round: null,
    startedAt: 0,
    pausedAt: 0,
    pauseTotal: 0,
    feedbackTimer: 0,
    raf: 0,
    sound: false,
    best: 0,
    audio: null,
  };

  function getStored(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }
  function setStored(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (e) {}
  }
  state.best = Number(getStored("remote-panic-best", "0")) || 0;
  state.sound = getStored("remote-panic-sound", "off") === "on";

  function pad(n, size) {
    return String(n).padStart(size || 2, "0");
  }
  function show(screen) {
    state.screen = screen;
    ui.menu.classList.toggle("hidden", screen !== "menu");
    ui.game.classList.toggle("hidden", screen !== "game");
    ui.end.classList.toggle("hidden", screen !== "end");
    ui.overlay.classList.add("hidden");
    ui.high.textContent = pad(state.best, 4);
  }
  function updateHud() {
    ui.round.textContent = pad(state.number);
    ui.score.textContent = pad(state.score, 4);
    ui.streak.textContent = "×" + state.streak;
    ui.lives.textContent = "♥ ".repeat(state.lives).trim() || "—";
    ui.lives.setAttribute("aria-label", state.lives + " lives remaining");
  }
  function tone(freq, duration, shape) {
    if (!state.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!state.audio) state.audio = new Ctx();
      if (state.audio.state === "suspended") state.audio.resume();
      var oscillator = state.audio.createOscillator();
      var gain = state.audio.createGain();
      oscillator.type = shape || "square";
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, state.audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        state.audio.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(state.audio.destination);
      oscillator.start();
      oscillator.stop(state.audio.currentTime + duration);
    } catch (e) {
      /* Audio is optional on TV browsers. */
    }
  }
  function start() {
    clearTimeout(state.feedbackTimer);
    cancelAnimationFrame(state.raf);
    state.number = 0;
    state.score = 0;
    state.streak = 0;
    state.lives = 3;
    state.cleared = 0;
    state.previous = "";
    state.paused = false;
    ui.feedback.classList.add("hidden");
    show("game");
    nextRound();
  }
  function nextRound() {
    state.number++;
    var type = core.nextType(state.previous, Math.random);
    state.previous = type;
    state.round = core.createRound(type, Math.random, state.number);
    state.startedAt = performance.now();
    state.pauseTotal = 0;
    ui.feedback.classList.add("hidden");
    ui.feedback.classList.remove("success", "failure");
    renderRound();
    updateHud();
    tone(440, 0.08);
    state.raf = requestAnimationFrame(tick);
  }
  function renderRound() {
    var round = state.round;
    ui.kicker.textContent = "EMERGENCY " + pad(state.number) + " / 04 TYPES";
    if (round.type === "wire") {
      ui.title.textContent = "CUT THE " + round.target.toUpperCase() + " WIRE";
      ui.instruction.textContent = "The wrong wire makes a very loud noise.";
      ui.hint.textContent = "◀ ▶ CHOOSE WIRE   •   OK CUT";
      ui.arena.innerHTML =
        '<div class="wire-stage">' +
        round.colors
          .map(function (color, index) {
            return (
              '<div class="wire ' +
              color +
              (index === round.selected ? " selected" : "") +
              '" data-wire="' +
              index +
              '"><span>' +
              (index + 1) +
              '</span><b class="wire-name">' +
              color.toUpperCase() +
              "</b></div>"
            );
          })
          .join("") +
        "</div>";
    } else if (round.type === "landing") {
      ui.title.textContent = "LAND THE UFO";
      ui.instruction.textContent = "Steer over the glowing pad, then hit OK.";
      ui.hint.textContent = "◀ ▶ STEER   •   OK LAND";
      ui.arena.innerHTML =
        '<div class="landing-stage"><div class="stars"></div><div class="landing-readout">ALTITUDE: TOO LOW</div><div class="landing-pad" id="landing-pad"></div><div class="ship" id="ship"></div></div>';
      updateLanding();
    } else if (round.type === "sequence") {
      ui.title.textContent = "CRACK THE CODE";
      ui.instruction.textContent = "Press the arrows in the order shown.";
      ui.hint.textContent = "▲ ▶ ▼ ◀   •   FOLLOW THE SEQUENCE";
      updateSequence();
    } else {
      ui.title.textContent = "TARGET LOCK";
      ui.instruction.textContent = "Hit OK when the orb crosses the center.";
      ui.hint.textContent = "OK / ENTER   •   TIME YOUR SHOT";
      ui.arena.innerHTML =
        '<div class="target-stage"><div class="target-zone"></div><div class="target-orb" id="target-orb">✕</div><div class="target-readout">SYSTEM: ARMED</div></div>';
    }
  }
  function updateWire() {
    var wires = ui.arena.querySelectorAll(".wire");
    for (var i = 0; i < wires.length; i++)
      wires[i].classList.toggle("selected", i === state.round.selected);
  }
  function updateLanding() {
    var pad = $("landing-pad"),
      ship = $("ship");
    if (pad) pad.style.left = "calc(" + state.round.pad + "% - 60px)";
    if (ship) ship.style.left = "calc(" + state.round.ship + "% - 46px)";
  }
  function updateSequence() {
    var glyph = {
      ArrowUp: "↑",
      ArrowRight: "→",
      ArrowDown: "↓",
      ArrowLeft: "←",
    };
    ui.arena.innerHTML =
      '<div class="sequence-stage"><div class="sequence-display">' +
      state.round.pattern
        .map(function (key, i) {
          return (
            '<div class="sequence-tile ' +
            (i < state.round.progress
              ? "done"
              : i === state.round.progress
                ? "next"
                : "") +
            '">' +
            glyph[key] +
            "</div>"
          );
        })
        .join("") +
      '</div><div class="sequence-progress">' +
      state.round.progress +
      " / " +
      state.round.pattern.length +
      " SIGNALS MATCHED</div></div>";
  }
  function elapsed() {
    return performance.now() - state.startedAt - state.pauseTotal;
  }
  function remaining() {
    return Math.max(0, state.round.duration - elapsed());
  }
  function tick() {
    if (
      state.screen !== "game" ||
      state.paused ||
      !ui.feedback.classList.contains("hidden")
    )
      return;
    var left = remaining();
    ui.timer.style.width = (left / state.round.duration) * 100 + "%";
    ui.timer.classList.toggle("danger", left < 1800);
    if (state.round.type === "target") {
      var orb = $("target-orb");
      if (orb)
        orb.style.left =
          "calc(" +
          core.targetPosition(elapsed(), state.round.phase, state.number) +
          "% - 37px)";
    }
    if (left <= 0) {
      resolve(false, "TIME IS UP");
      return;
    }
    state.raf = requestAnimationFrame(tick);
  }
  function resolve(success, detail) {
    if (!ui.feedback.classList.contains("hidden")) return;
    cancelAnimationFrame(state.raf);
    if (success) {
      var gained = core.roundPoints(remaining(), state.streak);
      state.score += gained;
      state.streak++;
      state.cleared++;
      ui.feedbackTitle.textContent = "NICE SAVE!";
      ui.feedbackDetail.textContent = "+" + gained + " POINTS  •  " + detail;
      ui.feedback.classList.add("success");
      tone(740, 0.14, "triangle");
      setTimeout(function () {
        tone(1100, 0.18, "triangle");
      }, 90);
    } else {
      state.lives--;
      state.streak = 0;
      ui.feedbackTitle.textContent = "PANIC!";
      ui.feedbackDetail.textContent =
        detail +
        "  •  " +
        (state.lives ? state.lives + " LIVES LEFT" : "NO LIVES LEFT");
      ui.feedback.classList.add("failure");
      tone(145, 0.3, "sawtooth");
    }
    updateHud();
    ui.feedback.classList.remove("hidden");
    state.feedbackTimer = setTimeout(function () {
      if (state.lives > 0) nextRound();
      else finish();
    }, 1200);
  }
  function finish() {
    cancelAnimationFrame(state.raf);
    if (state.score > state.best) {
      state.best = state.score;
      setStored("remote-panic-best", state.best);
    }
    ui.endScore.textContent = pad(state.score, 4);
    ui.endRounds.textContent = pad(state.cleared);
    ui.endBest.textContent = pad(state.best, 4);
    ui.endSubtitle.textContent =
      state.score === state.best && state.score > 0
        ? "NEW PERSONAL BEST. THE COUCH IS PROUD."
        : "The remote survived. Barely.";
    show("end");
  }
  function pause() {
    if (state.screen !== "game" || !ui.feedback.classList.contains("hidden"))
      return;
    state.paused = true;
    state.pausedAt = performance.now();
    cancelAnimationFrame(state.raf);
    ui.overlay.classList.remove("hidden");
    $("resume-button").focus();
  }
  function resume() {
    if (!state.paused) return;
    state.pauseTotal += performance.now() - state.pausedAt;
    state.paused = false;
    ui.overlay.classList.add("hidden");
    state.raf = requestAnimationFrame(tick);
  }
  function quit() {
    clearTimeout(state.feedbackTimer);
    cancelAnimationFrame(state.raf);
    state.paused = false;
    show("menu");
    $("start-button").focus();
  }
  function input(key) {
    if (state.paused) {
      if (key === "Enter" || key === "Escape" || key === "Back") resume();
      return;
    }
    if (state.screen === "menu") {
      if (key === "Enter") start();
      return;
    }
    if (state.screen === "end") {
      if (key === "Enter") start();
      if (key === "Escape" || key === "Back") show("menu");
      return;
    }
    if (key === "Escape" || key === "Back") {
      pause();
      return;
    }
    if (!ui.feedback.classList.contains("hidden")) return;
    var round = state.round;
    if (round.type === "wire") {
      if (key === "ArrowLeft" || key === "ArrowRight") {
        round.selected = core.clamp(
          round.selected + (key === "ArrowLeft" ? -1 : 1),
          0,
          3,
        );
        updateWire();
        tone(330, 0.035);
      } else if (key === "Enter")
        resolve(
          round.colors[round.selected] === round.target,
          round.colors[round.selected].toUpperCase() + " WIRE CUT",
        );
    } else if (round.type === "landing") {
      if (key === "ArrowLeft" || key === "ArrowRight") {
        round.ship = core.clamp(
          round.ship + (key === "ArrowLeft" ? -5 : 5),
          5,
          95,
        );
        updateLanding();
        tone(260, 0.025);
      } else if (key === "Enter")
        resolve(
          core.landingHit(round.ship, round.pad),
          "LANDING ATTEMPT COMPLETE",
        );
    } else if (round.type === "sequence") {
      if (core.ARROWS.indexOf(key) >= 0) {
        if (key !== round.pattern[round.progress])
          resolve(false, "WRONG SIGNAL");
        else {
          round.progress++;
          tone(400 + round.progress * 120, 0.08);
          if (round.progress === round.pattern.length)
            resolve(true, "CODE CRACKED");
          else updateSequence();
        }
      }
    } else if (round.type === "target" && key === "Enter") {
      resolve(
        core.targetHit(
          core.targetPosition(elapsed(), round.phase, state.number),
        ),
        "SHOT FIRED",
      );
    }
  }

  document.addEventListener("keydown", function (event) {
    var key = event.key;
    if (event.keyCode === 461 || key === "BrowserBack") key = "Back";
    if (key === " " || key === "NumpadEnter") key = "Enter";
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Enter",
        "Escape",
        "Back",
      ].indexOf(key) >= 0
    ) {
      event.preventDefault();
      input(key);
    }
  });
  ui.arena.addEventListener("click", function (event) {
    if (state.screen !== "game" || state.paused) return;
    var wire = event.target.closest("[data-wire]");
    if (wire && state.round.type === "wire") {
      state.round.selected = Number(wire.getAttribute("data-wire"));
      updateWire();
      input("Enter");
    } else if (state.round.type === "target") input("Enter");
  });
  $("start-button").addEventListener("click", start);
  $("restart-button").addEventListener("click", start);
  $("resume-button").addEventListener("click", resume);
  $("quit-button").addEventListener("click", quit);
  ui.sound.addEventListener("click", function () {
    state.sound = !state.sound;
    setStored("remote-panic-sound", state.sound ? "on" : "off");
    updateSound();
    if (state.sound) tone(660, 0.1);
  });
  function updateSound() {
    ui.sound.textContent = state.sound ? "SOUND ON" : "SOUND OFF";
    ui.sound.setAttribute(
      "aria-label",
      "Turn sound " + (state.sound ? "off" : "on"),
    );
  }
  updateSound();
  show("menu");
})();
