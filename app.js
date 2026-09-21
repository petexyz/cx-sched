// CX schedule 2026-27: renders the page from data.js. No framework, no build step.
// Test/preview URL parameters: ?theme=light|dark, ?today=YYYY-MM-DD, ?flag=be|nl|us, ?flagt=<ms> (draw one fixed flag frame).
(function () {
  "use strict";
  const D = window.CX;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const STATUS = { "listed": "Listed for 2026-27", "last-season": "2025-26 holder, not confirmed", "unknown": "Unresolved" };
  const TZ = { CZE: "Europe/Prague", SCO: "Europe/London", FRA: "Europe/Paris", ESP: "Europe/Madrid", NED: "Europe/Amsterdam", BEL: "Europe/Brussels" };
  const params = new URLSearchParams(location.search);
  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---- "Today" is the date in US Eastern, the zone the page uses ----
  const etDay = d => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
  const todayParam = params.get("today") || "";
  const NOW = /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? new Date(todayParam + "T12:00:00Z") : new Date();
  const TODAY = etDay(NOW), THIS_MONTH = TODAY.slice(0, 7), PLUS30 = etDay(new Date(NOW.getTime() + 30 * 86400000));

  $("sub").textContent = "Last researched " + D.updated + ".";

  const endOf = ev => ev.e || ev.d;
  const isEurope = ev => /, [A-Z]{3}$/.test(ev.p);   // 3-letter country code; US/Canada use a 2-letter state/province
  const hasGeo = ev => !!D.geo[ev.p];
  const finished = ev => endOf(ev) < TODAY;           // struck through from the day after the last day
  const started = ev => ev.d < TODAY;                 // results links appear once a day of racing is done

  // ---- Pin/chip shapes (colour is never the only cue) ----
  const SHAPES = {
    circle: '<circle cx="10" cy="10" r="8"/>', square: '<rect x="3" y="3" width="14" height="14"/>',
    diamond: '<path d="M10 1 19 10 10 19 1 10z"/>', triangle: '<path d="M10 2 19 18H1z"/>',
    hexagon: '<path d="M10 1 18 5.5v9L10 19 2 14.5v-9z"/>',
    star: '<path d="M10 1l2.6 6.2 6.7.5-5.1 4.3 1.6 6.6L10 15.1l-5.8 3.5 1.6-6.6L.7 7.7l6.7-.5z"/>',
    cross: '<path d="M7 1h6v6h6v6h-6v6H7v-6H1V7h6z"/>'
  };
  const shape = (key, color, size, stroke) =>
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><g fill="' + color +
    '" stroke="' + (stroke || "none") + '" stroke-width="1.5">' + (SHAPES[key] || SHAPES.circle) + '</g></svg>';
  const tagHtml = k => "<span class='tag' style='background:" + D.series[k].color + "'>" + shape(D.series[k].shape, "#fff", 10) + esc(D.series[k].short) + "</span>";

  // ---- Formatting ----
  function fmtDate(d) {
    const [y, m, day] = d.split("-").map(Number);
    return DOW[new Date(Date.UTC(y, m - 1, day)).getUTCDay()] + " " + MON[m - 1] + " " + day;
  }
  function fmtRange(ev) {
    if (!ev.e) return fmtDate(ev.d);
    const [, m2, d2] = ev.e.split("-").map(Number);
    return fmtDate(ev.d) + "–" + (ev.e.slice(5, 7) === ev.d.slice(5, 7) ? d2 : MON[m2 - 1] + " " + d2);
  }
  function etFor(ev, who) {
    const t = D.times[ev.d + "|" + ev.s];
    if (!t || !t[who]) return null;
    const tz = t.tz || TZ[(ev.p.match(/([A-Z]{3})$/) || [])[1]] || "Europe/Brussels";
    return { et: CXTime.etTime(ev.d, t[who], tz), local: t[who] };
  }
  const shiftTxt = et => et.dayShift ? " (" + (et.dayShift > 0 ? "+" : "") + et.dayShift + "d)" : "";
  function timesCell(ev) {
    const w = etFor(ev, "w"), m = etFor(ev, "m");
    if (!w && !m) return "<span class='tba'>&ndash;<span class='sr'> start times not yet published</span></span>";
    const line = (r, initial, word) => r ? "<span class='tm'><span aria-hidden='true'>" + initial + " </span><span class='sr'>" + word + " </span>" +
      esc(r.et.time + shiftTxt(r.et)) + "</span>" : "";
    const locals = [w, m].filter(Boolean).map(r => r.local).join(" · ");
    return line(w, "W", "Women") + line(m, "M", "Men") + "<small>" + locals + " local</small>";
  }
  const timeText = (ev, who) => { const r = etFor(ev, who); return r ? r.et.time + " ET" : "not published"; };

  // ---- Broadcaster badge: short label per race; "?" and amber = not confirmed ----
  function bcast(ev) { return ev.b || { t: D.broadcast[ev.s].badge, s: D.broadcast[ev.s].status }; }
  function badgeHtml(ev) {
    const b = bcast(ev);
    return "<span class='bbadge " + (b.s === "listed" ? "b-listed" : "b-uncertain") + "'>" + esc(b.t) + "</span>";
  }

  // ---- The gag column: a beer and a bourbon per race ----
  function pairHtml(ev) {
    const p = (D.pairings || {})[ev.n];
    if (!p) return "<span class='tba'>&ndash;</span>";
    return "<div class='pairbox'><span class='pair'><span aria-hidden='true'>\uD83C\uDF7A </span><span class='sr'>Beer: </span>" + esc(p.beer) +
      "<br><span aria-hidden='true'>\uD83E\uDD43 </span><span class='sr'>Bourbon: </span>" + esc(p.bourbon) + "</span>" +
      (p.why ? "<small class='why'>" + esc(p.why) + "</small>" : "") + "</div>";
  }

  // ---- Links: race's own link over the series default ----
  const linksFor = ev => Object.assign({}, (D.seriesLinks || {})[ev.s], ev.l || {});
  function linksHtml(ev, withMapButton) {
    const l = linksFor(ev), out = [];
    const a = (u, text, label, tip) => "<a href='" + esc(u) + "' target='_blank' rel='noopener' aria-label='" + esc(label) + "'" +
      (tip ? " title='" + esc(tip) + "'" : "") + ">" + text + "</a>";
    if (l.site) out.push(a(l.site, "Site", "Site for " + ev.n + " (opens in a new tab)"));
    if (l.results && started(ev)) out.push(a(l.results, "Results", "Results for " + ev.n + " (opens in a new tab)"));
    if (l.yt) out.push(a(l.yt, "YouTube" + (l.ytNote ? "*" : ""), "YouTube for " + ev.n + (l.ytNote ? ". " + l.ytNote : "") + " (opens in a new tab)", l.ytNote));
    if (withMapButton && hasGeo(ev)) out.push("<button type='button' class='linkbtn' data-map='" + ev.i + "' aria-label='Show " + esc(ev.n) + " on the map'>Map</button>");
    return out.join(" &middot; ");
  }

  // ---- Filter state (can be preset from the URL) ----
  const events = D.events.map((ev, i) => Object.assign({ i }, ev)).sort((a, b) => a.d.localeCompare(b.d) || a.s.localeCompare(b.s));
  const months = [...new Set(events.map(e => e.d.slice(0, 7)))].sort();
  const state = { when: "30", month: "", region: "all", view: "auto", series: new Set(Object.keys(D.series)) };
  (function readUrl() {
    if (["all", "upcoming", "month", "30", "pick"].includes(params.get("when"))) state.when = params.get("when");
    if (/^\d{4}-\d{2}$/.test(params.get("month") || "")) state.month = params.get("month");
    if (["all", "eu", "na"].includes(params.get("region"))) state.region = params.get("region");
    if (["auto", "eu", "na", "world"].includes(params.get("view"))) state.view = params.get("view");
    if (params.get("series")) {
      const keys = params.get("series").split(",").filter(k => D.series[k]);
      if (keys.length) state.series = new Set(keys);
    }
  })();
  function writeUrl() {
    try {
      const q = new URLSearchParams();
      if (state.when !== "30") q.set("when", state.when);
      if (state.when === "pick") q.set("month", state.month);
      if (state.region !== "all") q.set("region", state.region);
      if (state.view !== "auto") q.set("view", state.view);
      if (state.series.size !== Object.keys(D.series).length) q.set("series", [...state.series].join(","));
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    } catch (e) { /* file:// or sandboxed frame */ }
  }
  function passes(ev, ignoreWhen) {
    if (!state.series.has(ev.s)) return false;
    if (state.region === "eu" && !isEurope(ev)) return false;
    if (state.region === "na" && isEurope(ev)) return false;
    if (ignoreWhen) return true;
    if (state.when === "month" && ev.d.slice(0, 7) !== THIS_MONTH && endOf(ev).slice(0, 7) !== THIS_MONTH) return false;
    if (state.when === "30" && (endOf(ev) < TODAY || ev.d > PLUS30)) return false;
    if (state.when === "upcoming" && endOf(ev) < TODAY) return false;
    if (state.when === "pick" && ev.d.slice(0, 7) !== state.month) return false;
    return true;
  }

  // ---- Filters: built once and updated in place, so keyboard focus is never lost ----
  const chips = [];
  function chip(parent, html, isOn, onclick) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.innerHTML = html;
    b.onclick = onclick; parent.appendChild(b); chips.push({ el: b, isOn });
  }
  const label = (parent, text) => parent.insertAdjacentHTML("beforeend", "<span class='lbl'>" + text + "</span>");
  let monthSelect;
  (function buildFilters() {
    const w = $("f-when"); label(w, "When");
    [["30", "Next 30 days"], ["upcoming", "Upcoming"], ["month", "This month"], ["all", "All (incl. finished)"]].forEach(([k, l]) =>
      chip(w, esc(l), () => state.when === k, () => { state.when = k; update(); }));
    monthSelect = document.createElement("select");
    monthSelect.className = "chip"; monthSelect.setAttribute("aria-label", "Pick a month");
    monthSelect.innerHTML = "<option value=''>Pick a month…</option>" + months.map(m => {
      const [y, mo] = m.split("-").map(Number); return "<option value='" + m + "'>" + MON[mo - 1] + " " + y + "</option>";
    }).join("");
    monthSelect.onchange = () => { if (monthSelect.value) { state.when = "pick"; state.month = monthSelect.value; } else state.when = "30"; update(); };
    w.appendChild(monthSelect);

    const r = $("f-region"); label(r, "Where");
    [["all", "Everywhere"], ["eu", "Europe"], ["na", "North America"]].forEach(([k, l]) =>
      chip(r, esc(l), () => state.region === k, () => { state.region = k; update(); }));

    const s = $("f-series"); label(s, "Series");
    Object.keys(D.series).forEach(k => chip(s, shape(D.series[k].shape, D.series[k].color, 12) + esc(D.series[k].short),
      () => state.series.has(k), () => { state.series.has(k) ? state.series.delete(k) : state.series.add(k); update(); }));

    const v = $("f-view"); label(v, "Map View");
    [["auto", "Auto (follow filters)"], ["eu", "Europe"], ["na", "North America"], ["world", "Both"]].forEach(([k, l]) =>
      chip(v, esc(l), () => state.view === k, () => { state.view = k; update(); }));
    v.insertAdjacentHTML("beforeend", "<small id='viewnote'></small>");
    if (matchMedia("(max-width: 640px)").matches) $("filters").open = false;   // keep phones focused on the list
  })();
  function syncFilters() {
    chips.forEach(c => c.el.setAttribute("aria-pressed", String(!!c.isOn())));
    monthSelect.value = state.when === "pick" ? state.month : "";
  }

  // ---- Calendar table (semantic; stacked cards on phones via CSS) ----
  function rowHtml(ev) {
    const cls = (finished(ev) ? "past " : "") + (hasGeo(ev) ? "mappable" : "");
    return "<tr class='" + cls + "' data-i='" + ev.i + "'>" +
      "<td class='date' data-label='Date'><span class='v'>" + esc(fmtRange(ev)) + "</span></td>" +
      "<td class='race' data-label='Race'><span class='v'>" + esc(ev.n) + (ev.note ? "<br><small>" + esc(ev.note) + "</small>" : "") + "</span>" +
        (finished(ev) ? "<span class='sr'> (finished)</span>" : "") + "<br><span class='links'>" + linksHtml(ev, true) + "</span></td>" +
      "<td class='loc' data-label='Where'><span class='v'>" + esc(ev.p) + "</span></td>" +
      "<td data-label='Series'>" + tagHtml(ev.s) + "</td>" +
      "<td class='time' data-label='Start (ET)'><div class='v'>" + timesCell(ev) + "</div></td>" +
      "<td data-label='US Broadcast'>" + badgeHtml(ev) + "</td>" +
      "<td class='pairing' data-label='Best Paired With'>" + pairHtml(ev) + "</td></tr>";
  }
  function renderCal(list) {
    $("cal").innerHTML = "<caption class='sr'>Race calendar</caption><thead><tr>" +
      ["Date", "Race", "Where", "Series", "Start (ET)", "US Broadcast", "Best Paired With"].map(h => "<th scope='col'>" + h + "</th>").join("") + "</tr></thead><tbody>" +
      (list.length ? list.map(rowHtml).join("") : "<tr><td colspan='7' class='tba' data-label=''>" + (state.when === "30" ? "No races in the next 30 days. Try Upcoming or All." : "No races match these filters.") + "</td></tr>") + "</tbody>";
  }
  function renderCount(list) {
    const finishedN = events.filter(e => passes(e, true) && finished(e)).length;
    let extra = "";
    if (state.when === "30") extra = " &middot; next 30 days <button type='button' data-when='upcoming'>Show all upcoming</button>";
    else if (state.when === "upcoming" && finishedN) extra = " &middot; " + finishedN + " finished hidden <button type='button' data-when='all'>Show them</button>";
    $("count").innerHTML = list.length + " of " + events.length + " races" + extra;
  }

  // ---- Map: keyboard-reachable pins with distinct shapes, clustered where dense ----
  let map = null, cluster = null, markers = {};
  function initMap() {
    if (typeof L === "undefined" || !L.markerClusterGroup) {
      $("map").innerHTML = "<div class='mapmsg'>The map could not load (it needs an internet connection). The table below still works.</div>";
      return;
    }
    map = L.map("map", { scrollWheelZoom: false }).setView([48, 8], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
    }).addTo(map);
    cluster = L.markerClusterGroup({ maxClusterRadius: 30, showCoverageOnHover: false });
    map.addLayer(cluster);
  }
  function pairPopup(ev) { const p = (D.pairings || {})[ev.n]; return p ? "<br>Pairs with: " + esc(p.beer) + " + " + esc(p.bourbon) : ""; }
  function popupHtml(ev) {
    return "<b>" + esc(ev.n) + "</b><br>" + esc(ev.p) + "<br>" + esc(fmtRange(ev)) + "<br>" + esc(D.series[ev.s].short) +
      "<br>Women: " + esc(timeText(ev, "w")) + "<br>Men: " + esc(timeText(ev, "m")) + "<br>US: " + esc(bcast(ev).t) + pairPopup(ev) + "<br>" + linksHtml(ev, false);
  }
  function updateMap(list) {
    if (!map) return;
    cluster.clearLayers(); markers = {};
    const all = [], eu = [], na = [];
    list.filter(hasGeo).forEach(ev => {
      const s = D.series[ev.s], ll = D.geo[ev.p];
      const m = L.marker(ll, {
        icon: L.divIcon({ className: "pin" + (finished(ev) ? " past" : ""), html: shape(s.shape, s.color, 22, "#fff"), iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -11] }),
        keyboard: true, title: ev.n + ", " + fmtRange(ev), alt: ev.n
      }).bindPopup(popupHtml(ev));
      markers[ev.i] = m; cluster.addLayer(m); all.push(ll); (isEurope(ev) ? eu : na).push(ll);
    });
    // Focus: a fixed view if chosen; otherwise the continent with most of the visible pins.
    let target = all, note = "";
    if (state.view === "eu") target = eu.length ? eu : all;
    else if (state.view === "na") target = na.length ? na : all;
    else if (state.view === "auto" && eu.length && na.length) {
      const inEu = eu.length >= na.length;
      target = inEu ? eu : na;
      note = " Focused on " + (inEu ? "Europe" : "North America") + " (" + target.length + " of " + all.length + " pins). Pick Both to see everything.";
    }
    if (!all.length) {                                             // nothing to show: don't leave the map stuck on the last view
      const keys = Object.keys(D.geo), inEu = k => /, [A-Z]{3}$/.test(k);
      const region = state.view === "na" ? "North America" : state.view === "world" ? "everything" : "Europe";
      target = keys.filter(k => region === "everything" || (region === "Europe") === inEu(k)).map(k => D.geo[k]);
      note = " No races match, so the map is showing " + region + ".";
    }
    const vn = $("viewnote"); if (vn) vn.textContent = note;
    if (target.length) map.fitBounds(L.latLngBounds(target).pad(0.2), { maxZoom: 9 });
  }
  function focusOnMap(i) {
    const m = markers[i]; if (!m || !map) return;
    $("map").scrollIntoView({ behavior: reduceMq.matches ? "auto" : "smooth", block: "center" });
    cluster.zoomToShowLayer(m, () => m.openPopup());
  }
  $("cal").addEventListener("click", e => {
    const btn = e.target.closest("[data-map]");
    if (btn) { focusOnMap(btn.dataset.map); return; }
    if (e.target.closest("a, button")) return;   // links open normally
    const tr = e.target.closest("tr[data-i]"); if (tr) focusOnMap(tr.dataset.i);
  });
  $("count").addEventListener("click", e => { const b = e.target.closest("[data-when]"); if (b) { state.when = b.dataset.when; update(); } });

  function update() {
    const list = events.filter(ev => passes(ev));
    syncFilters(); renderCount(list); renderCal(list); updateMap(list); writeUrl();
  }

  // ---- Where to watch: compact, expandable ----
  $("watch").innerHTML = Object.keys(D.series).map(k => {
    const b = D.broadcast[k];
    return "<details><summary>" + tagHtml(k) + "<span class='ws-home'>" + esc(b.primary) + "</span><span class='ws-status status-" + b.status + "'>" +
      esc(STATUS[b.status]) + "</span></summary><div class='ws-body'><p>" + esc(b.detail) + "</p><p><small>" + esc(b.fallback) + "</small></p></div></details>";
  }).join("");
  $("open").innerHTML = D.open.map(x => "<li>" + esc(x) + "</li>").join("");
  $("prices").innerHTML = "<caption class='sr'>Subscription costs</caption><thead><tr><th scope='col'>Service</th><th scope='col'>Cost</th><th scope='col'>Note</th></tr></thead><tbody>" +
    D.prices.map(p => "<tr><td data-label='Service'>" + esc(p.name) + "</td><td data-label='Cost'>" + esc(p.cost) + "</td><td data-label='Note'>" + esc(p.note) + "</td></tr>").join("") + "</tbody>";
  $("sources").innerHTML = D.sources.map(s => "<li><a href='" + esc(s[1]) + "' target='_blank' rel='noopener'>" + esc(s[0]) + "</a></li>").join("");

  // ---- Theme toggle (remembered; defaults to the system setting) ----
  (function themeToggle() {
    const root = document.documentElement, btn = $("theme"), mq = matchMedia("(prefers-color-scheme: dark)");
    const current = () => root.getAttribute("data-theme") || (mq.matches ? "dark" : "light");
    function paint() {
      const dark = current() === "dark";
      btn.textContent = dark ? "☀ Light mode" : "☾ Dark mode";
      btn.setAttribute("aria-label", "Switch to " + (dark ? "light" : "dark") + " mode");
    }
    if (!root.getAttribute("data-theme")) root.setAttribute("data-theme", current());
    btn.onclick = () => { const next = current() === "dark" ? "light" : "dark"; root.setAttribute("data-theme", next); store.set("cx-theme", next); paint(); };
    paint();
  })();

  // ---- Random flag banner: Belgium, the Netherlands, the United States (Stars and Stripes). ----
  // Each visit shows a random flag, never the same one twice in a row (remembered per browser); ?flag=be|nl|us forces one. The favicon
  // matches. The cloth is drawn on a canvas in 2 px vertical slices, each shifted along a travelling sine wave, with
  // light and shade for the folds. It flies for 5 seconds (time on screen only, ~30 fps), then freezes on its last frame.
  (function waveFlag() {
    const F = window.CXFlags;
    let id = params.get("flag");
    if (!F.order.includes(id)) {
      const n = F.pick(parseInt(store.get("cx-flag"), 10));           // random, but never the same flag twice in a row
      store.set("cx-flag", String(n));
      id = F.order[n];
    }
    document.documentElement.setAttribute("data-flag", id);
    const icon = document.querySelector("link[rel~='icon']");
    if (icon) icon.href = "data:image/svg+xml," + encodeURIComponent(F.favicon(id));

    const host = $("flag"), canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(canvas);
    const SW = 2, LAMBDA = 300, PERIOD = 2800, STEP = 33, FLY_MS = 5000;
    const K = 2 * Math.PI / LAMBDA, OMEGA = 2 * Math.PI / PERIOD, flutter = F.info[id].flutter;
    let W = 0, H = 0, BH = 0, TOP = 0, AMP = 0, dpr = 1, artCv = null, lastT = 0, edge = "rgba(0,0,0,.22)";
    // The free end of a flag flutters more than the end at the pole (used for the US banner).
    const ampAt = x => flutter ? AMP * (0.45 + 0.9 * x / W) : AMP;

    function starPath(a, cx, cy, r) {
      a.beginPath();
      for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.382 : r; a.lineTo(cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)); }
      a.closePath(); a.fill();
    }
    function build() {
      W = Math.max(1, host.clientWidth); H = Math.max(1, host.clientHeight); dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      AMP = H / 12; BH = Math.round(H * F.info[id].bandRatio); TOP = (H - BH) / 2;
      artCv = document.createElement("canvas"); artCv.width = Math.round(W * dpr); artCv.height = Math.round(BH * dpr);
      const a = artCv.getContext("2d"); a.scale(dpr, dpr);
      F.art(id, W, BH).forEach(o => { a.fillStyle = o.c; if (o.t === "rect") a.fillRect(o.x, o.y, o.w, o.h); else starPath(a, o.x, o.y, o.r); });
      draw(lastT);
    }
    // One 2 px slice of the flag: sy/sh pick the part of the artwork; c (-1..1) is the fold light/shade.
    function piece(x, y, sy, sh, c) {
      if (sh <= 0) return;
      ctx.drawImage(artCv, x * dpr, sy * dpr, SW * dpr, sh * dpr, x, y + sy, SW, sh);
      ctx.fillStyle = c > 0 ? "rgba(0,0,0," + (0.26 * c).toFixed(3) + ")" : "rgba(255,255,255," + (-0.13 * c).toFixed(3) + ")";
      ctx.fillRect(x, y + sy, SW, sh);
    }
    function line(pts) { if (!pts.length) return; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    function draw(t) {
      lastT = t; if (!artCv) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const ph = OMEGA * t, top = [], bot = [];
      for (let x = 0; x < W; x += SW) {
        const c = Math.cos(K * x - ph), y = TOP + ampAt(x) * Math.sin(K * x - ph);
        piece(x, y, 0, BH, c);
        top.push([x, y]); bot.push([x, y + BH]);
      }
      ctx.strokeStyle = edge; ctx.lineWidth = 1.6; ctx.lineJoin = "round";
      line(top); line(bot);
    }
    function readEdge() { edge = getComputedStyle(document.documentElement).getPropertyValue("--flagedge").trim() || edge; draw(lastT); }
    readEdge(); build();
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (host.clientWidth !== W || host.clientHeight !== H) build(); }).observe(host);
    else window.addEventListener("resize", build);
    new MutationObserver(readEdge).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });   // outline colour follows the theme

    const fixed = params.get("flagt");
    let inView = true, raf = 0, last = 0, prev = 0, flown = 0;
    function loop(now) {
      raf = 0;
      if (!inView || document.hidden) { prev = 0; return; }          // paused while off-screen; time does not count
      flown += prev ? Math.min(now - prev, 100) : 0; prev = now;
      if (now - last >= STEP) { last = now; draw(now); }
      if (flown < FLY_MS) raf = requestAnimationFrame(loop);        // otherwise the flag stays on its last frame
    }
    function sync() { if (flown < FLY_MS && inView && !document.hidden && !raf) raf = requestAnimationFrame(loop); }
    draw(fixed !== null ? (+fixed || 0) : 0);
    if (fixed !== null || reduceMq.matches) return;                  // preview frame, or the viewer asked for less motion
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }).observe(host);
    document.addEventListener("visibilitychange", sync);
    sync();
  })();

  // ---- Clock: your time (Eastern), Central Europe, and the browser's zone if it is neither ----
  function renderClock() {
    const d = new Date();
    // en-US prints Central European time as "GMT+2"; en-GB gives "CEST"/"CET". Use it for the zone label only.
    const zoneName = tz => new Intl.DateTimeFormat(tz.startsWith("Europe/") ? "en-GB" : "en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(d).find(p => p.type === "timeZoneName").value;
    const fmt = tz => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      .format(d).replace(/ /g, " ") + " " + zoneName(tz);
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const boxes = [["Your Time (Eastern)", fmt("America/New_York")], ["Central Europe", fmt("Europe/Brussels")]];
    if (local && local !== "America/New_York" && local !== "Europe/Brussels") boxes.push(["Your Browser's Zone", fmt(local)]);
    $("clock").innerHTML = boxes.map(b => "<div><b>" + esc(b[0]) + "</b><span>" + esc(b[1]) + "</span></div>").join("");
  }
  renderClock(); setInterval(renderClock, 15000);

  initMap();
  update();
})();
