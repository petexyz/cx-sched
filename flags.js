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

  // Fifty stars in staggered rows across a canton cw x ch pixels. Candidate layouts (rows of stars, all summing
  // to 50) are tried in turn; the one that allows the biggest stars without any two touching wins. "Touching"
  // is checked via the packing formula below (same-row and adjacent-row spacing; five layouts cover every case
  // that comes up between phone and desktop widths, so it does not need to be exhaustive).
  // Returns { rows: [n, n, ...], r: star radius in px, stars: [{x, y}, ...] } (x, y relative to the canton).
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

  // Drawing operations for one flag's artwork at W x H pixels (id: "be" | "nl" | "us"). Returns a flat list of:
  //   { t: "rect", x, y, w, h, c }  -- a filled rectangle
  //   { t: "star", x, y, r, c }     -- a 5-point star, centre (x, y), circumradius r
  // c is always a 6-digit hex colour. app.js turns these into canvas fill calls; check.js checks them directly.
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

  // A small inline SVG favicon for one flag (id: "be" | "nl" | "us"), as a string ready for a data: URI.
  // Belgium and the Netherlands reuse the flat colour bands; the US one is drawn in true flag proportions
  // (not the wide banner layout -- see the comment inside), so it still reads as a flag at 16 px.
  function favicon(id) {
    const open = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='";
    if (id === "be") return open + "0 0 3 2'>" + BE.map((c, i) => "<rect x='" + i + "' width='1' height='2' fill='" + c + "'/>").join("") + "</svg>";
    if (id === "nl") return open + "0 0 3 2'>" + NL.map((c, i) => "<rect y='" + (i * 2 / 3).toFixed(3) + "' width='3' height='0.667' fill='" + c + "'/>").join("") + "</svg>";
    // The real US flag (not the banner layout): 13 stripes, a canton 7 stripes tall and 0.76 of the height wide,
    // and the official nine rows of 6 and 5 stars. Drawn as one path so the favicon stays small.
    const stripes = Array.from({ length: 13 }, (_, i) => "<rect y='" + (i * 10 / 13).toFixed(3) + "' width='19' height='0.77' fill='" + (i % 2 ? US.white : US.red) + "'/>").join("");
    const cw = 7.6, ch = 10 * 7 / 13, r = 0.308;
    let d = "";
    for (let row = 0; row < 9; row++) {
      const n = row % 2 === 0 ? 6 : 5;
      for (let col = 0; col < n; col++) {
        const cx = cw * (row % 2 === 0 ? 2 * col + 1 : 2 * col + 2) / 12, cy = ch * (row + 1) / 10;
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.382 : r;
          d += (i ? "L" : "M") + (cx + rad * Math.cos(ang)).toFixed(2) + " " + (cy + rad * Math.sin(ang)).toFixed(2);
        }
        d += "Z";
      }
    }
    return open + "0 0 19 10'>" + stripes + "<rect width='" + cw + "' height='" + ch.toFixed(3) + "' fill='" + US.blue + "'/><path d='" + d + "' fill='" + US.white + "'/></svg>";
  }

  // Picks a random flag index (0..ORDER.length-1), guaranteed not to equal `prev` (the index shown last time;
  // pass anything that is not a valid index -- NaN, undefined, out of range -- to mean "unknown", in which case
  // any flag may come up). `rand` defaults to Math.random and is injectable so check.js can test this
  // deterministically with a fixed sequence.
  function pick(prev, rand) {
    rand = rand || Math.random;
    const n = ORDER.length, skip = Number.isInteger(prev) && prev >= 0 && prev < n;
    const i = Math.min(Math.floor(rand() * (skip ? n - 1 : n)), (skip ? n - 1 : n) - 1);
    return skip && i >= prev ? i + 1 : i;
  }

  window.CXFlags = { order: ORDER, info: INFO, art, favicon, pick, starLayout };
})();
