// Flag artwork and favicons for the rotating banner: Belgium, the Netherlands and the United States.
// Pure functions (no DOM) so check.js can test them. app.js draws the operations onto a canvas.
(function () {
  "use strict";
  const ORDER = ["be", "nl", "us"];
  const INFO = {
    be: { name: "Belgium",       bandRatio: 0.667, streamer: false },
    nl: { name: "Netherlands",   bandRatio: 0.667, streamer: false },
    us: { name: "United States", bandRatio: 0.75,  streamer: true }   // stars and stripes, drawn as a swallowtail streamer
  };
  const BE = ["#000000", "#fae042", "#ed2939"];                        // black, yellow, red (vertical)
  const NL = ["#ae1c28", "#ffffff", "#21468b"];                        // red, white, blue (horizontal)
  const US = { red: "#b22234", white: "#ffffff", blue: "#3c3b6e" };

  // Drawing operations for the flag artwork at W x H pixels:
  //   { t: "rect", x, y, w, h, c }  and  { t: "star", x, y, r, c }
  function art(id, W, H) {
    const ops = [];
    if (id === "be") {
      BE.forEach((c, i) => ops.push({ t: "rect", x: W * i / 3, y: 0, w: W / 3 + 1, h: H, c }));
    } else if (id === "nl") {
      NL.forEach((c, i) => ops.push({ t: "rect", x: 0, y: H * i / 3, w: W, h: H / 3 + 1, c }));
    } else {
      for (let i = 0; i < 13; i++) ops.push({ t: "rect", x: 0, y: H * i / 13, w: W, h: H / 13 + 0.5, c: i % 2 ? US.white : US.red });
      const cw = 0.76 * H, ch = H * 7 / 13;                            // canton: 7 stripes tall, 0.76 of the flag's height wide
      ops.push({ t: "rect", x: 0, y: 0, w: cw, h: ch, c: US.blue });
      const r = 0.0308 * H;                                            // star size from the official proportions
      for (let row = 0; row < 9; row++) {                              // nine rows, alternating 6 and 5 stars = 50
        const n = row % 2 === 0 ? 6 : 5;
        for (let col = 0; col < n; col++) {
          const xUnit = row % 2 === 0 ? 2 * col + 1 : 2 * col + 2;     // 1,3,..,11 then 2,4,..,10 (twelfths of the canton)
          ops.push({ t: "star", x: cw * xUnit / 12, y: ch * (row + 1) / 10, r, c: US.white });
        }
      }
    }
    return ops;
  }

  // Length of the streamer's swallowtail notch, in pixels, for a banner W pixels wide.
  const notchLength = W => Math.min(90, Math.max(30, W * 0.06));

  // Small SVG favicon for each flag.
  function favicon(id) {
    const open = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='";
    if (id === "be") return open + "0 0 3 2'>" + BE.map((c, i) => "<rect x='" + i + "' width='1' height='2' fill='" + c + "'/>").join("") + "</svg>";
    if (id === "nl") return open + "0 0 3 2'>" + NL.map((c, i) => "<rect y='" + (i * 2 / 3).toFixed(3) + "' width='3' height='0.667' fill='" + c + "'/>").join("") + "</svg>";
    const stripes = Array.from({ length: 13 }, (_, i) => "<rect y='" + (i * 10 / 13).toFixed(3) + "' width='19' height='0.77' fill='" + (i % 2 ? US.white : US.red) + "'/>").join("");
    const dots = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) dots.push("<circle cx='" + (1.3 + col * 2.5).toFixed(1) + "' cy='" + (1.2 + row * 1.5).toFixed(1) + "' r='0.5' fill='" + US.white + "'/>");
    return open + "0 0 19 10'>" + stripes + "<rect width='7.6' height='5.385' fill='" + US.blue + "'/>" + dots.join("") + "</svg>";
  }

  // A random flag index, never the one shown last time (prev: that index, or anything else if unknown).
  // rand is injectable so check.js can test it deterministically.
  function pick(prev, rand) {
    rand = rand || Math.random;
    const n = ORDER.length, skip = Number.isInteger(prev) && prev >= 0 && prev < n;
    const i = Math.min(Math.floor(rand() * (skip ? n - 1 : n)), (skip ? n - 1 : n) - 1);
    return skip && i >= prev ? i + 1 : i;
  }

  window.CXFlags = { order: ORDER, info: INFO, art, favicon, pick, notchLength };
})();
