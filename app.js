// CX schedule 2026-27: renders the entire page from data.js (via time.js for conversions and flags.js for the
// banner). No framework, no build step; everything below runs once, on load, inside a single IIFE.
//
// Layout of this file, top to bottom:
//   - small helpers (escaping, date formatting, pin shapes, the gag-pairing column, race links)
//   - filter state (When / Where / Series / Map View) -- readable from and written to the URL, so a filtered
//     view can be shared as a link; `passes()` is the one predicate both the table and the map use
//   - the calendar table and the "count" line
//   - the Leaflet map (clustered, keyboard-reachable pins)
//   - the static "Where to watch" / "Not confirmed yet" / "Subscription costs" / "Sources" sections
//   - the light/dark theme toggle
//   - the rotating flag banner (canvas-drawn cloth animation)
//   - the live clock
//
// Test/preview URL parameters: ?theme=light|dark, ?today=YYYY-MM-DD, ?flag=be|nl|us, ?flagt=<ms> (draw one fixed flag frame).
(function () {
  "use strict";
  const D = window.CX;                          // all calendar/broadcast/link data; see data.js
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));   // HTML-escape untrusted text before interpolating it into a template string
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const STATUS = { "listed": "Listed for 2026-27", "last-season": "2025-26 holder, not confirmed", "unknown": "Unresolved" };   // labels for D.broadcast[series].status, used in the "Where to watch" list
  const TZ = { CZE: "Europe/Prague", SCO: "Europe/London", FRA: "Europe/Paris", ESP: "Europe/Madrid", NED: "Europe/Amsterdam", BEL: "Europe/Brussels" };   // IANA zone per 3-letter country code in an event's `p` field, for etFor()
  const params = new URLSearchParams(location.search);   // test/preview overrides; see the file-header comment
  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  // localStorage, but safe to call where it may be unavailable (private browsing, sandboxed preview frames, etc).
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // ---- "Today" is the date in US Eastern, the zone the page uses (so "finished" and "upcoming" agree with the
  // Eastern times shown, even for a viewer elsewhere). ?today=YYYY-MM-DD previews the page as of another date. ----
  const etDay = d => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);   // -> "YYYY-MM-DD" (en-CA formats dates that way)
  const todayParam = params.get("today") || "";
  const NOW = /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? new Date(todayParam + "T12:00:00Z") : new Date();
  const TODAY = etDay(NOW), THIS_MONTH = TODAY.slice(0, 7), PLUS30 = etDay(new Date(NOW.getTime() + 30 * 86400000));

  $("sub").textContent = "Last researched " + D.updated + ".";

  // Small predicates on one event object, used throughout the rest of the file.
  const endOf = ev => ev.e || ev.d;                   // the last day of a multi-day event, or its only day
  const isEurope = ev => /, [A-Z]{3}$/.test(ev.p);    // `p` ends in a 3-letter country code; US/Canada use a 2-letter state/province
  const hasGeo = ev => !!D.geo[ev.p];                 // has map coordinates (all 50 events do; kept as a guard for future additions)
  const finished = ev => endOf(ev) < TODAY;           // struck through from the day after the last day
  const started = ev => ev.d < TODAY;                 // results links appear once a day of racing is done

  // ---- Pin/chip shapes (colour is never the only cue: colour-blind viewers and the black-and-white printed
  // page both still distinguish series by shape). Paths are drawn in a 20x20 box; `shape()` wraps one in an
  // inline SVG at any size/colour, used for map pins, series pills and the Series filter chips. ----
  const SHAPES = {
    circle: '<circle cx="10" cy="10" r="8"/>', square: '<rect x="3" y="3" width="14" height="14"/>',
    diamond: '<path d="M10 1 19 10 10 19 1 10z"/>', triangle: '<path d="M10 2 19 18H1z"/>',
    hexagon: '<path d="M10 1 18 5.5v9L10 19 2 14.5v-9z"/>',
    star: '<path d="M10 1l2.6 6.2 6.7.5-5.1 4.3 1.6 6.6L10 15.1l-5.8 3.5 1.6-6.6L.7 7.7l6.7-.5z"/>',
    cross: '<path d="M7 1h6v6h6v6h-6v6H7v-6H1V7h6z"/>'
  };
  // key: a SHAPES key (falls back to a circle if unknown); size: px; stroke: optional outline colour (used on the map, where pins need a border to stand out against tiles).
  const shape = (key, color, size, stroke) =>
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><g fill="' + color +
    '" stroke="' + (stroke || "none") + '" stroke-width="1.5">' + (SHAPES[key] || SHAPES.circle) + '</g></svg>';
  const tagHtml = k => "<span class='tag' style='background:" + D.series[k].color + "'>" + shape(D.series[k].shape, "#fff", 10) + esc(D.series[k].short) + "</span>";   // the coloured "Series" pill shown in the table and the "Where to watch" list

  // ---- Date/time formatting ----
  // fmtDate: "YYYY-MM-DD" -> "Sat Sep 19". Uses UTC internally so the weekday calculation is not affected by the
  // viewer's own timezone (a date string has no time-of-day, so there is no "correct" local instant to compare).
  function fmtDate(d) {
    const [y, m, day] = d.split("-").map(Number);
    return DOW[new Date(Date.UTC(y, m - 1, day)).getUTCDay()] + " " + MON[m - 1] + " " + day;
  }
  // "Sat Sep 19" for a one-day event, or "Sat Sep 19–20" / "Sat Sep 19–Oct 2" for a multi-day one (`ev.e`).
  function fmtRange(ev) {
    if (!ev.e) return fmtDate(ev.d);
    const [, m2, d2] = ev.e.split("-").map(Number);
    return fmtDate(ev.d) + "–" + (ev.e.slice(5, 7) === ev.d.slice(5, 7) ? d2 : MON[m2 - 1] + " " + d2);
  }
  // Looks up ev's published start time for who ("w" or "m") in D.times and converts it to Eastern.
  // Returns null if no time has been published yet for this race/day, or { et: {time, dayShift}, local: "HH:MM" }.
  function etFor(ev, who) {
    const t = D.times[ev.d + "|" + ev.s];
    if (!t || !t[who]) return null;
    const tz = t.tz || TZ[(ev.p.match(/([A-Z]{3})$/) || [])[1]] || "Europe/Brussels";
    return { et: CXTime.etTime(ev.d, t[who], tz), local: t[who] };
  }
  const shiftTxt = et => et.dayShift ? " (" + (et.dayShift > 0 ? "+" : "") + et.dayShift + "d)" : "";   // e.g. a late European race landing on the previous US calendar day
  // The Start (ET) table cell: one line per published sex ("W"/"Men" with a screen-reader-only word), or a dash if neither is published yet.
  function timesCell(ev) {
    const w = etFor(ev, "w"), m = etFor(ev, "m");
    if (!w && !m) return "<span class='tba'>&ndash;<span class='sr'> start times not yet published</span></span>";
    const line = (r, initial, word) => r ? "<span class='tm'><span aria-hidden='true'>" + initial + " </span><span class='sr'>" + word + " </span>" +
      esc(r.et.time + shiftTxt(r.et)) + "</span>" : "";
    const locals = [w, m].filter(Boolean).map(r => r.local).join(" · ");
    return line(w, "W", "Women") + line(m, "M", "Men") + "<small>" + locals + " local</small>";
  }
  const timeText = (ev, who) => { const r = etFor(ev, who); return r ? r.et.time + " ET" : "not published"; };   // plain-text version for the map popup

  // ---- Broadcaster badge: short label per race; "?" and amber = not confirmed ----
  // The series default (D.broadcast[ev.s]), unless this event has its own override (ev.b), e.g. a championship
  // hosted by a series that isn't actually who carries that one race. Returns { t: "label text", s: status }.
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
  // Merges the series default links (D.seriesLinks[ev.s]) with this event's own overrides (ev.l), so a single
  // race can have its own site without every other round of the series needing one too.
  const linksFor = ev => Object.assign({}, (D.seriesLinks || {})[ev.s], ev.l || {});
  // The "Site · Results · YouTube · Map" line shown under a race's name and in its map popup.
  // withMapButton: true in the table (each row can jump to its pin), false in the map popup (already on the map).
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
  // `events`: D.events with a stable index `i` attached (used as the key for map markers and the Map button),
  // sorted by date then series so same-day races group together.
  const events = D.events.map((ev, i) => Object.assign({ i }, ev)).sort((a, b) => a.d.localeCompare(b.d) || a.s.localeCompare(b.s));
  const months = [...new Set(events.map(e => e.d.slice(0, 7)))].sort();   // "YYYY-MM" values for the "Pick a month" dropdown
  // `state` drives everything: the table, the map, the URL and the filter chips are all derived from it, and
  // `update()` (near the bottom of this section) is the one place that re-renders all of them after a change.
  //   when: "30" | "upcoming" | "month" | "all" | "pick" (with `month` set)
  //   region: "all" | "eu" | "na" (the Where filter)         view: "world" | "auto" | "eu" | "na" (the Map View filter)
  //   series: a Set of series keys currently shown
  const state = { when: "30", month: "", region: "all", view: "world", series: new Set(Object.keys(D.series)) };
  // Reads any of the above from the URL's query string on load, so a filtered view is a shareable link (see writeUrl below).
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
  // Mirrors `state` into the URL (without adding a history entry), omitting anything at its default value so
  // the common case ("no filters touched") keeps a clean URL. The inverse of readUrl() above.
  function writeUrl() {
    try {
      const q = new URLSearchParams();
      if (state.when !== "30") q.set("when", state.when);
      if (state.when === "pick") q.set("month", state.month);
      if (state.region !== "all") q.set("region", state.region);
      if (state.view !== "world") q.set("view", state.view);
      if (state.series.size !== Object.keys(D.series).length) q.set("series", [...state.series].join(","));
      history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
    } catch (e) { /* file:// or sandboxed frame */ }
  }
  // Whether ev matches the current filters. Table rows use passes(ev); the map and the "N finished hidden"
  // count use passes(ev, true) to ignore the When filter (e.g. so "3 finished races are hidden" can be counted
  // even though the calendar itself is hiding them).
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
  const label = (parent, text) => parent.insertAdjacentHTML("beforeend", "<span class='lbl'>" + text + "</span>");   // e.g. "When", "Series" -- a group's caption
  let monthSelect;   // the <select> for "Pick a month"; kept in scope so syncFilters() can set its value
  // Builds all four filter groups once on load. Each chip's onclick mutates `state` and calls update().
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
    [["world", "Both"], ["auto", "Auto (follow filters)"], ["eu", "Europe"], ["na", "North America"]].forEach(([k, l]) =>
      chip(v, esc(l), () => state.view === k, () => { state.view = k; update(); }));
    v.insertAdjacentHTML("beforeend", "<small id='viewnote'></small>");
    if (matchMedia("(max-width: 640px)").matches) $("filters").open = false;   // keep phones focused on the list
  })();
  // Re-reads `isOn()` for every chip and updates aria-pressed (and the visible highlight it drives), and syncs
  // the month <select>. Called at the start of every update() so the chips always reflect the current state.
  function syncFilters() {
    chips.forEach(c => c.el.setAttribute("aria-pressed", String(!!c.isOn())));
    monthSelect.value = state.when === "pick" ? state.month : "";
  }

  // ---- Calendar table (semantic; stacked cards on phones via CSS -- see style.css's .stack rules, which read
  // each cell's data-label attribute to draw the label on narrow screens) ----
  // One <tr> for one race. "past" (struck through) and "mappable" (clickable, has a Map button) are CSS hooks.
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
  // Rebuilds the whole <table id="cal"> body from a filtered list of events (or an explanatory empty-state row).
  function renderCal(list) {
    $("cal").innerHTML = "<caption class='sr'>Race calendar</caption><thead><tr>" +
      ["Date", "Race", "Where", "Series", "Start (ET)", "US Broadcast", "Best Paired With"].map(h => "<th scope='col'>" + h + "</th>").join("") + "</tr></thead><tbody>" +
      (list.length ? list.map(rowHtml).join("") : "<tr><td colspan='7' class='tba' data-label=''>" + (state.when === "30" ? "No races in the next 30 days. Try Upcoming or All." : "No races match these filters.") + "</td></tr>") + "</tbody>";
  }
  // The "N of 50 races" line above the map, plus a context-specific action: "Show all upcoming" while the
  // Next-30-days filter is hiding races further out, or "Show them" while Upcoming is hiding finished races.
  function renderCount(list) {
    const finishedN = events.filter(e => passes(e, true) && finished(e)).length;
    let extra = "";
    if (state.when === "30") extra = " &middot; next 30 days <button type='button' data-when='upcoming'>Show all upcoming</button>";
    else if (state.when === "upcoming" && finishedN) extra = " &middot; " + finishedN + " finished hidden <button type='button' data-when='all'>Show them</button>";
    $("count").innerHTML = list.length + " of " + events.length + " races" + extra;
  }

  // ---- Map: keyboard-reachable pins with distinct shapes, clustered where dense ----
  let map = null, cluster = null, markers = {};   // markers: event index `i` -> its Leaflet marker, so table rows/Map buttons can find and focus one
  // Sets up the Leaflet map once on load (tiles + a marker-cluster layer). Leaves a text fallback if the Leaflet
  // libraries failed to load (no internet, CDN blocked) -- the table still works either way.
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
  const pairPopup = ev => { const p = (D.pairings || {})[ev.n]; return p ? "<br>Pairs with: " + esc(p.beer) + " + " + esc(p.bourbon) : ""; };
  // The content of a pin's Leaflet popup: everything the table row shows, condensed.
  function popupHtml(ev) {
    return "<b>" + esc(ev.n) + "</b><br>" + esc(ev.p) + "<br>" + esc(fmtRange(ev)) + "<br>" + esc(D.series[ev.s].short) +
      "<br>Women: " + esc(timeText(ev, "w")) + "<br>Men: " + esc(timeText(ev, "m")) + "<br>US: " + esc(bcast(ev).t) + pairPopup(ev) + "<br>" + linksHtml(ev, false);
  }
  // Rebuilds the map's pins from a filtered list of events and re-fits the view. Called after every filter
  // change. See the inline comments below for how it picks Europe vs North America vs everything.
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
  // Scrolls the map into view, zooms/pans to marker `i` (unclustering it if needed) and opens its popup.
  // Used by both a table row's own click and its explicit "Map" button.
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

  // The one re-render entry point: every filter chip's onclick, the month <select> and the count line's
  // "Show ..." buttons all end by calling this. Keeps the table, the map, the chip highlights and the URL in sync.
  function update() {
    const list = events.filter(ev => passes(ev));
    syncFilters(); renderCount(list); renderCal(list); updateMap(list); writeUrl();
  }

  // ---- Static sections: rendered once from data.js, never re-rendered after that ----
  // "Where to watch": one <details> per series, collapsed by default; click to expand for the detail/fallback text.
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
    const F = window.CXFlags;   // flag artwork/favicon/pick logic lives in flags.js, kept separate so it has no DOM dependency and check.js can test it directly
    // Pick which flag to show: ?flag=be|nl|us forces one; otherwise a random flag that is never the one shown
    // last time (F.pick), remembered in localStorage across visits.
    let id = params.get("flag");
    if (!F.order.includes(id)) {
      const n = F.pick(parseInt(store.get("cx-flag"), 10));           // random, but never the same flag twice in a row
      store.set("cx-flag", String(n));
      id = F.order[n];
    }
    document.documentElement.setAttribute("data-flag", id);   // available for CSS/debugging, and read by check.js-style tests
    const icon = document.querySelector("link[rel~='icon']");
    if (icon) icon.href = "data:image/svg+xml," + encodeURIComponent(F.favicon(id));

    // The banner itself is a <canvas> (not the CSS/SVG the rest of the page uses) because the US flag's stars
    // need to stay crisp at any width, which a stretched SVG viewBox would distort.
    const host = $("flag"), canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    host.appendChild(canvas);
    // SW: width in px of one drawn "slice" of cloth (smaller = smoother wave, more draw calls per frame).
    // LAMBDA/AMP: the wave's length and height in px. PERIOD: seconds for the wave to repeat (as ms).
    // STEP: minimum ms between redraws (caps the frame rate). FLY_MS: total on-screen animated time before freezing.
    const SW = 2, LAMBDA = 300, PERIOD = 2800, STEP = 33, FLY_MS = 5000;
    const K = 2 * Math.PI / LAMBDA, OMEGA = 2 * Math.PI / PERIOD, flutter = F.info[id].flutter;
    let W = 0, H = 0, BH = 0, TOP = 0, AMP = 0, dpr = 1, artCv = null, lastT = 0, edge = "rgba(0,0,0,.22)";
    // W, H: the banner element's current size in CSS px. BH: the band of cloth's height (F.info[id].bandRatio of H); TOP: its vertical offset (so it is centred).
    // dpr: devicePixelRatio, used so the canvas is crisp on retina screens. artCv: an off-screen canvas holding
    // the flat, undistorted artwork (stripes/canton/stars) at the current size; draw() samples slices from it.
    // lastT: the timestamp of the last frame drawn (so a resize or theme change can redraw at the same phase).
    // edge: the outline colour, read from the --flagedge CSS variable so it follows the light/dark theme.
    // The free end of a flag flutters more than the end at the pole (used for the US banner).
    const ampAt = x => flutter ? AMP * (0.45 + 0.9 * x / W) : AMP;

    // Draws (and fills, in whatever fillStyle is already set) a 5-point star centred at (cx, cy) with
    // circumradius r, onto 2d context `a`. Used only when building the flat artwork (artCv), once per resize.
    function starPath(a, cx, cy, r) {
      a.beginPath();
      for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.382 : r; a.lineTo(cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)); }
      a.closePath(); a.fill();
    }
    // (Re)builds the flat artwork canvas (artCv) at the banner's current size, then redraws the current frame.
    // Runs once on load and again whenever the banner is resized (see the ResizeObserver below).
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
    // Draws one 2px-wide vertical slice of cloth at wave-shifted (x, y): sy/sh select which vertical strip of
    // the flat artwork (artCv) to sample, and c (roughly -1..1, from Math.cos) tints it darker or lighter to
    // fake a fold in the cloth as it "moves" through the wave.
    function piece(x, y, sy, sh, c) {
      if (sh <= 0) return;
      ctx.drawImage(artCv, x * dpr, sy * dpr, SW * dpr, sh * dpr, x, y + sy, SW, sh);
      ctx.fillStyle = c > 0 ? "rgba(0,0,0," + (0.26 * c).toFixed(3) + ")" : "rgba(255,255,255," + (-0.13 * c).toFixed(3) + ")";
      ctx.fillRect(x, y + sy, SW, sh);
    }
    const line = pts => { if (!pts.length) return; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };   // strokes a polyline through an array of [x, y] points
    // Draws one animation frame at time t (ms, any monotonic clock -- see the calls to draw() below for what t means in each case).
    // Computes the wave's phase, then walks the banner left to right drawing SW-wide slices of cloth (piece()),
    // tracing the top/bottom edges as it goes so they can be outlined once, together, afterward.
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
    const readEdge = () => { edge = getComputedStyle(document.documentElement).getPropertyValue("--flagedge").trim() || edge; draw(lastT); };
    readEdge(); build();
    // Rebuild the artwork if the banner's box changes size (window resize, orientation change, zoom); redraw
    // (cheaper than a full rebuild) if only the theme -- and so the outline colour -- changes.
    if ("ResizeObserver" in window) new ResizeObserver(() => { if (host.clientWidth !== W || host.clientHeight !== H) build(); }).observe(host);
    else window.addEventListener("resize", build);
    new MutationObserver(readEdge).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });   // outline colour follows the theme

    // ---- Animation loop. Runs for FLY_MS of time the banner is actually visible and the tab is foregrounded,
    // then stops (the flag stays on whatever frame it was last drawn). This both keeps the page from animating
    // forever (battery, and WCAG 2.2.2 does not require a pause control below 5s) and avoids wasted work while
    // the banner is scrolled off-screen or the tab is in the background. ----
    const fixed = params.get("flagt");   // ?flagt=<ms>: draw exactly that one frame and stop (used by tests/screenshots, which cannot easily drive requestAnimationFrame)
    let inView = true, raf = 0, last = 0, prev = 0, flown = 0;
    // inView: is the banner intersecting the viewport (from the IntersectionObserver below)?
    // raf: the pending requestAnimationFrame id, or 0 if none is scheduled.
    // last: timestamp of the last actual redraw (throttles to roughly STEP ms between draws).
    // prev: timestamp of the previous loop() call, used only to measure elapsed *visible* time; reset to 0
    //       whenever the flag is not visible, so that gap is not counted toward `flown`.
    // flown: total ms flown while visible so far; the loop stops once this reaches FLY_MS.
    function loop(now) {
      raf = 0;
      if (!inView || document.hidden) { prev = 0; return; }          // paused while off-screen; time does not count
      flown += prev ? Math.min(now - prev, 100) : 0; prev = now;
      if (now - last >= STEP) { last = now; draw(now); }
      if (flown < FLY_MS) raf = requestAnimationFrame(loop);        // otherwise the flag stays on its last frame
    }
    // Starts the loop if it should be running and isn't already (called on visibility changes and once at the end).
    function sync() { if (flown < FLY_MS && inView && !document.hidden && !raf) raf = requestAnimationFrame(loop); }
    draw(fixed !== null ? (+fixed || 0) : 0);                        // always draw one frame immediately, so the flag is never blank
    if (fixed !== null || reduceMq.matches) return;                  // preview frame, or the viewer asked for less motion: never animate
    if ("IntersectionObserver" in window) new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }).observe(host);
    document.addEventListener("visibilitychange", sync);             // tab switched away/back
    sync();
  })();

  // ---- Clock: your time (Eastern), Central Europe, and the browser's zone if it is neither ----
  // Re-renders the two (or three) clock boxes from the current wall-clock time. Called once on load and then
  // every 15s (setInterval below) to keep it live without a per-second timer.
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

  // ---- Boot: set up the (empty) map, then do the first full render of everything driven by `state`. ----
  initMap();
  update();
})();
