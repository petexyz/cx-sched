// CX schedule 2026-27: renders the page from data.js. No framework, no build step.
// Test/preview URL parameters: ?theme=light|dark, ?today=YYYY-MM-DD, ?flagt=<ms> (draw one fixed flag frame).
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
  const state = { when: "upcoming", month: "", region: "all", view: "auto", series: new Set(Object.keys(D.series)) };
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
      if (state.when !== "upcoming") q.set("when", state.when);
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
    [["upcoming", "Upcoming"], ["all", "All (incl. finished)"], ["month", "This month"], ["30", "Next 30 days"]].forEach(([k, l]) =>
      chip(w, esc(l), () => state.when === k, () => { state.when = k; update(); }));
    monthSelect = document.createElement("select");
    monthSelect.className = "chip"; monthSelect.setAttribute("aria-label", "Pick a month");
    monthSelect.innerHTML = "<option value=''>Pick a month…</option>" + months.map(m => {
      const [y, mo] = m.split("-").map(Number); return "<option value='" + m + "'>" + MON[mo - 1] + " " + y + "</option>";
    }).join("");
    monthSelect.onchange = () => { if (monthSelect.value) { state.when = "pick"; state.month = monthSelect.value; } else state.when = "upcoming"; update(); };
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
      (list.length ? list.map(rowHtml).join("") : "<tr><td colspan='7' class='tba' data-label=''>No races match these filters.</td></tr>") + "</tbody>";
  }
  function renderCount(list) {
    const hidden = state.when === "upcoming" ? events.filter(e => passes(e, true) && finished(e)).length : 0;
    $("count").innerHTML = list.length + " of " + events.length + " races" +
      (hidden ? " &middot; " + hidden + " finished hidden <button type='button' data-showall>Show them</button>" : "");
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
  $("count").addEventListener("click", e => { if (e.target.closest("[data-showall]")) { state.when = "all"; update(); } });

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

  // ---- Waving flag: black / yellow / red. One SVG whose edges follow a travelling sine wave, with moving
  // fold shading. Runs at ~30 fps, stops while scrolled out of view or in a hidden tab, and can be paused. ----
  (function waveFlag() {
    const W = 1200, H = 96, TOP = 16, BOT = 80, AMP = 8, LAMBDA = 300, PERIOD = 2800, STEP = 33;
    const K = 2 * Math.PI / LAMBDA, OMEGA = 2 * Math.PI / PERIOD;
    $("flag").innerHTML =
      "<svg viewBox='0 0 " + W + " " + H + "' preserveAspectRatio='none'>" +
      "<defs><clipPath id='flagclip'><path id='flagpath'/></clipPath>" +
      "<linearGradient id='fold' gradientUnits='userSpaceOnUse' spreadMethod='repeat' y1='0' y2='0'>" +
      "<stop offset='0' stop-color='#000' stop-opacity='.26'/><stop offset='.5' stop-color='#fff' stop-opacity='.13'/>" +
      "<stop offset='1' stop-color='#000' stop-opacity='.26'/></linearGradient></defs>" +
      "<g clip-path='url(#flagclip)'>" +
      "<rect x='0' width='" + W / 3 + "' height='" + H + "' fill='#000'/>" +
      "<rect x='" + W / 3 + "' width='" + W / 3 + "' height='" + H + "' fill='#fae042'/>" +
      "<rect x='" + 2 * W / 3 + "' width='" + W / 3 + "' height='" + H + "' fill='#ed2939'/>" +
      "<rect width='" + W + "' height='" + H + "' fill='url(#fold)'/></g><path id='flagedge' class='edge'/></svg>";
    const path = $("flagpath"), edge = $("flagedge"), fold = $("fold");
    function draw(t) {
      const ph = OMEGA * t, top = [], bot = [];
      for (let x = 0; x <= W; x += 15) {
        const dy = AMP * Math.sin(K * x - ph);
        top.push(x + "," + (TOP + dy).toFixed(1)); bot.unshift(x + "," + (BOT + dy).toFixed(1));
      }
      const d = "M" + top.join(" L") + " L" + bot.join(" L") + " Z";
      path.setAttribute("d", d); edge.setAttribute("d", d);
      const shift = ph / K; fold.setAttribute("x1", shift); fold.setAttribute("x2", shift + LAMBDA);
    }
    const fixed = params.get("flagt");
    const stored = store.get("cx-motion");
    let motionOn = fixed === null && (stored ? stored === "on" : !reduceMq.matches);
    let inView = true, raf = 0, last = 0;
    const btn = $("motion");
    function paint() {
      btn.textContent = motionOn ? "⏸ Pause flag" : "▶ Play flag";
      btn.setAttribute("aria-label", motionOn ? "Pause the flag animation" : "Play the flag animation");
    }
    function loop(now) {
      raf = 0; if (!motionOn || !inView || document.hidden) return;
      if (now - last >= STEP) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    }
    function sync() { if (motionOn && inView && !document.hidden && !raf) raf = requestAnimationFrame(loop); }
    draw(fixed !== null ? (+fixed || 0) : 0);
    if (fixed !== null) { btn.hidden = true; return; }
    btn.onclick = () => { motionOn = !motionOn; store.set("cx-motion", motionOn ? "on" : "off"); paint(); sync(); };
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }).observe($("flag"));
    document.addEventListener("visibilitychange", sync);
    paint(); sync();
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
