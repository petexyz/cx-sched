// Flag artwork and favicons for the rotating banner: Belgium, the Netherlands and the United States.
// Pure functions (no DOM) so check.js can test them. app.js draws the operations onto a canvas.
(function () {
  "use strict";
  const ORDER = ["be", "nl", "us"];
  const INFO = {
    be: { name: "Belgium",       bandRatio: 0.667, flutter: false },
    nl: { name: "Netherlands",   bandRatio: 0.667, flutter: false },
    us: { name: "United States", bandRatio: 0.75,  flutter: true }    // Stars and Stripes; the free end flutters more than the pole end
  };
  const BE = ["#000000", "#fae042", "#ed2939"];                        // black, yellow, red (vertical)
  const NL = ["#ae1c28", "#ffffff", "#21468b"];                        // red, white, blue (horizontal)
  const US = { red: "#b22234", white: "#ffffff", blue: "#3c3b6e" };

  // Fifty stars in staggered rows across a canton cw x ch. Candidate layouts all sum to 50; pick the one that
  // allows the biggest stars without them touching (checking same-row, diagonal and two-rows-apart neighbours).
  const LAYOUTS = [[25, 25], [17, 16, 17], [13, 12, 13, 12], [10, 10, 10, 10, 10], [6, 5, 6, 5, 6, 5, 6, 5, 6]];
  function starLayout(cw, ch) {
    let best = null;
    LAYOUTS.forEach(rows => {
      const nMax = Math.max.apply(null, rows), equal = rows.every(n => n === rows[0]);
      const P = cw / (equal ? nMax + 0.5 : nMax), vp = ch / (rows.length + 1);
      const gap = Math.min(P, Math.sqrt(P * P / 4 + vp * vp), 2 * vp);          // nearest distance between star centres
      const r = 0.36 * gap;
      if (!best || r > best.r) {
        const stars = [];
        rows.forEach((n, k) => {
          const x0 = equal ? (k % 2 ? P : P / 2) : (n === nMax ? P / 2 : P);   // alternate rows are offset half a pitch
          for (let i = 0; i < n; i++) stars.push({ x: x0 + i * P, y: vp * (k + 1) });
        });
        best = { rows, r, stars };
      }
    });
    return best;
  }

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
      const cw = W / 3;                                                 // the blue star field is the first third, full height
      ops.push({ t: "rect", x: 0, y: 0, w: cw, h: H, c: US.blue });
      const L = starLayout(cw, H);
      L.stars.forEach(p => ops.push({ t: "star", x: p.x, y: p.y, r: L.r, c: US.white }));
    }
    return ops;
  }

  // Small SVG favicon for each flag.
  function favicon(id) {
    const open = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='";
    if (id === "be") return open + "0 0 3 2'>" + BE.map((c, i) => "<rect x='" + i + "' width='1' height='2' fill='" + c + "'/>").join("") + "</svg>";
    if (id === "nl") return open + "0 0 3 2'>" + NL.map((c, i) => "<rect y='" + (i * 2 / 3).toFixed(3) + "' width='3' height='0.667' fill='" + c + "'/>").join("") + "</svg>";
    const stripes = Array.from({ length: 13 }, (_, i) => "<rect y='" + (i * 10 / 13).toFixed(3) + "' width='19' height='0.77' fill='" + (i % 2 ? US.white : US.red) + "'/>").join("");
    const dots = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) dots.push("<circle cx='" + (1.3 + col * 1.85).toFixed(2) + "' cy='" + (2 + row * 3).toFixed(1) + "' r='0.7' fill='" + US.white + "'/>");
    return open + "0 0 19 10'>" + stripes + "<rect width='6.33' height='10' fill='" + US.blue + "'/>" + dots.join("") + "</svg>";
  }

  // A random flag index, never the one shown last time (prev: that index, or anything else if unknown).
  // rand is injectable so check.js can test it deterministically.
  function pick(prev, rand) {
    rand = rand || Math.random;
    const n = ORDER.length, skip = Number.isInteger(prev) && prev >= 0 && prev < n;
    const i = Math.min(Math.floor(rand() * (skip ? n - 1 : n)), (skip ? n - 1 : n) - 1);
    return skip && i >= prev ? i + 1 : i;
  }

  window.CXFlags = { order: ORDER, info: INFO, art, favicon, pick, starLayout };
})();
