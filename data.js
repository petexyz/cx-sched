// Edit this file to update the guide. app.js renders everything from here.
// Last researched: 2026-09-20.
//
// broadcast.status:
//   "listed"     = the broadcaster has published a 2026-27 event page
//   "last-season"= carried it in 2025-26, no 2026-27 announcement found
//   "unknown"    = no US information found
// broadcast.<series>.badge = the short label shown on each race row (trailing "?" = not confirmed).
// An event can override it with  b: { t: "text", s: "status" }.

window.CX = {
  updated: "2026-09-20",

  series: {
    wc:   { name: "UCI World Cup",     short: "World Cup",   color: "#c8102e", shape: "circle", note: "12 rounds, Nov 27 – Jan 24. Top-tier UCI series." },
    sp:   { name: "Superprestige",     short: "Superprestige", color: "#0b6fb8", shape: "square", note: "8 Belgian rounds, Oct 25 – Jan 2 (Telenet title sponsor)." },
    x2o:  { name: "X²O Badkamers Trofee", short: "X²O Trofee", color: "#237a3f", shape: "diamond", note: "8 rounds, Nov 1 – Feb 14 (Golazo)." },
    hg:   { name: "HG Cross",          short: "HG Cross",    color: "#a85a14", shape: "triangle", note: "Formerly Exact Cross. 7 rounds, Oct 11 – Feb 13 (Golazo)." },
    champ:{ name: "Championships",     short: "Championships", color: "#6b3fa0", shape: "hexagon", note: "European, Pan-American and World Championships." },
    nat:  { name: "National championships", short: "Nationals", color: "#a0306b", shape: "star", note: "US, Canadian, Belgian and Dutch national championships." },
    us:   { name: "US UCI calendar",   short: "US",          color: "#5a6570", shape: "cross", note: "8 US UCI events (USCX and others). Pan-Ams and US Nationals are listed under Championships and Nationals." }
  },

  // What a US viewer can use, per series.
  broadcast: {
    wc: {
      badge: "FloBikes",
      primary: "FloBikes",
      status: "listed",
      detail: "FloBikes has published its 2026-27 page for Round 1 (Ostrava) and has carried the World Cup in the US for several seasons. HBO Max does not carry it.",
      fallback: "UCI YouTube streams rounds only where no local broadcaster has the rights, and US access has been inconsistent. Treat it as a bonus."
    },
    sp: {
      badge: "FloBikes or HBO Max?",
      primary: "FloBikes or HBO Max (unresolved)",
      status: "unknown",
      detail: "Conflicting signals. HBO Max carried it in 2025-26, but FloBikes has published 2026-27 pages for Overijse and Heusden. Their dates are off from the official calendar (Oct 26 vs Oct 25; Dec 23 vs Dec 25 in Zolder), so they may be placeholders.",
      fallback: "Check both services the week before Overijse (Oct 25)."
    },
    x2o: {
      badge: "HBO Max?",
      primary: "HBO Max (2025-26 rights holder)",
      status: "last-season",
      detail: "HBO Max streamed it in 2025-26. No US announcement found for 2026-27, and no FloBikes 2026-27 pages. FloBikes carried it in 2023-24, so it could move back.",
      fallback: "Sporza (Belgium) is free-to-air through at least 2028 but geo-blocked from the US."
    },
    hg: {
      badge: "HBO Max?",
      primary: "HBO Max (2025-26 rights holder)",
      status: "last-season",
      detail: "Formerly Exact Cross. HBO Max streamed it in 2025-26 (its site showed Maldegem, Feb 4). No US announcement found for 2026-27 under the new name.",
      fallback: "Sporza (Belgium), geo-blocked from the US."
    },
    champ: {
      badge: "FloBikes?",
      primary: "FloBikes for Worlds; Euros unknown",
      status: "unknown",
      detail: "FloBikes streamed the 2026 Worlds in Hulst (USA Cycling's how-to-watch pointed to it); HBO Max does not carry Worlds. No FloBikes page yet for Ostend 2027, and no US information for the Euros.",
      fallback: "UCI YouTube carries Worlds on the same conditions as the World Cup."
    },
    nat: {
      badge: "Unknown",
      primary: "Unknown for all four",
      status: "unknown",
      detail: "US: USA Cycling says select races will stream online, platform not named. Canada, Belgium and the Netherlands: no US information found. The Belgian and Dutch races normally air on Sporza and NOS, which are geo-blocked outside those countries.",
      fallback: "Check USA Cycling (cxnats.usacycling.org) for the US stream, and FloBikes the week of the Belgian and Dutch races."
    },
    us: {
      badge: "YouTube (CXTV)?",
      primary: "YouTube (event streams)",
      status: "last-season",
      detail: "CXTV streamed the USCX races in full on YouTube in 2025; 2026 streams are not posted yet. Links are collected at uscx.us/livestream-media.",
      fallback: "Coverage varies by promoter."
    }
  },

  // Cost reference as reported in 2025-26 guides. Verify before subscribing.
  prices: [
    { name: "FloBikes", cost: "$29.99/mo or $149.99/yr", note: "Carries World Cup and Worlds." },
    { name: "HBO Max", cost: "$18.49/mo (Standard)", note: "Live sports needs Standard or Premium. HBO Max's own cyclocross page also mentions a sports add-on, so confirm at signup." },
    { name: "UCI YouTube", cost: "Free", note: "Only where no local rights holder exists." }
  ],

  // Elite calendar. date = first day, end = optional last day.
  events: [
    // --- US ---
    { d: "2026-09-19", e: "2026-09-20", n: "Rochester Cyclocross (USCX)", p: "Rochester, NY", s: "us", c: "C1/C2", l: {"site": "https://rochestercyclocross.com/", "results": "https://rochestercyclocross.com/?page_id=70", "yt": "https://www.youtube.com/@WideAnglePodium", "ytNote": "CXTV streamed this race in full in 2025; 2026 streams not yet posted"} },
    { d: "2026-09-26", e: "2026-09-27", n: "Virginia's Blue Ridge Go Cross (USCX)", p: "Roanoke, VA", s: "us", c: "C1/C2", l: {"site": "https://gocrossrace.com", "yt": "https://www.youtube.com/@WideAnglePodium", "ytNote": "CXTV streamed this race in full in 2025; 2026 streams not yet posted"} },
    { d: "2026-10-03", e: "2026-10-04", n: "Charm City Cross (USCX)", p: "Baltimore, MD", s: "us", c: "C1/C2", l: {"site": "https://www.charmcitycross.com/", "results": "https://cyclocross24.com/race/charm-city-cross/", "yt": "https://www.youtube.com/@WideAnglePodium", "ytNote": "CXTV streamed this race in full in 2025; 2026 streams not yet posted"} },
    { d: "2026-10-17", e: "2026-10-18", n: "Kings CX", p: "Deerfield Twp, OH", s: "us", c: "C1/C2", l: {"site": "https://www.kingscx.com/"} },
    { d: "2026-10-24", e: "2026-10-25", n: "Major Taylor Cross Cup", p: "Indianapolis, IN", s: "us", c: "C2", l: {"site": "https://indycycloplex.com/cross", "results": "https://cyclocross24.com/race/major-taylor-cross-cup/"} },
    { d: "2026-10-31", e: "2026-11-01", n: "Cycle-Smart Northampton", p: "Northampton, MA", s: "us", c: "C2", l: {"site": "https://www.nohocx.com/", "results": "https://cyclocross24.com/race/northampton/"} },
    { d: "2026-11-07", e: "2026-11-08", n: "Pan-American Championships / DCCX", p: "Washington, DC", s: "champ", b: { t: "YouTube (CXTV)?", s: "last-season" }, c: "CC/C2", l: {"site": "https://www.panamcxdc.com/", "results": "https://cyclocross24.com/race/pan-american-championships/", "yt": "https://www.youtube.com/@WideAnglePodium", "ytNote": "CXTV covered the 2025 USCX and Pan-Am races; 2026 not confirmed"} },
    { d: "2026-11-14", e: "2026-11-15", n: "Boulder Cup", p: "Boulder, CO", s: "us", c: "C1/C2", l: {"site": "https://boulderjuniorcycling.org/boulder-cup/", "results": "https://cyclocross24.com/race/us-open-cyclocross/"} },
    { d: "2026-11-21", e: "2026-11-22", n: "North Carolina Grand Prix", p: "Hendersonville, NC", s: "us", c: "C2", l: {"site": "https://www.nccyclocross.com/NCGP", "results": "https://cyclocross24.com/race/north-carolina-grand-prix/"} },
    { d: "2026-12-12", e: "2026-12-13", n: "USA Cycling National Championships", p: "Fayetteville, AR", s: "nat", c: "CN", note: "Event runs Dec 9–13. Elite races on the weekend.", l: {"site": "https://cxnats.usacycling.org/", "results": "https://cyclocross24.com/race/usa-national-championships/"} },

    // --- HG Cross ---
    { d: "2026-10-11", n: "HG Cross Dendermonde", p: "Dendermonde, BEL", s: "hg", l: {"site": "https://hgcross.be/dendermonde/", "results": "https://hgcross.be/dendermonde/"} },
    { d: "2026-10-17", n: "Berencross", p: "Meulebeke, BEL", s: "hg", l: {"site": "https://hgcross.be/meulebeke/", "results": "https://hgcross.be/meulebeke/"} },
    { d: "2026-10-24", n: "HG Cross Heerderstrand", p: "Heerde, NED", s: "hg", l: {"site": "https://hgcross.be/heerde/", "results": "https://hgcross.be/heerde/"} },
    { d: "2026-11-21", n: "Rapencross", p: "Lokeren, BEL", s: "hg", l: {"site": "https://hgcross.be/lokeren/", "results": "https://hgcross.be/lokeren/"} },
    { d: "2026-12-17", n: "Zilvermeercross", p: "Mol, BEL", s: "hg", l: {"site": "https://hgcross.be/mol/", "results": "https://hgcross.be/mol/"} },
    { d: "2027-02-03", n: "Parkcross", p: "Maldegem, BEL", s: "hg", l: {"site": "https://hgcross.be/maldegem/", "results": "https://hgcross.be/maldegem/"} },
    { d: "2027-02-13", n: "Waaslandcross", p: "Sint-Niklaas, BEL", s: "hg", l: {"site": "https://hgcross.be/sint-niklaas/", "results": "https://hgcross.be/sint-niklaas/"} },

    // --- Superprestige ---
    { d: "2026-10-25", n: "Vlaamse Druivencross", p: "Overijse, BEL", s: "sp", r: 1, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/overijse"} },
    { d: "2026-11-05", n: "Middelkerke (evening, Halloween theme)", p: "Middelkerke, BEL", s: "sp", r: 2, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/middelkerke"} },
    { d: "2026-11-11", n: "Jaarmarktcross", p: "Niel, BEL", s: "sp", r: 3, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/niel"} },
    { d: "2026-11-14", n: "Aardbeiencross", p: "Merksplas, BEL", s: "sp", r: 4, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/merksplas"} },
    { d: "2026-12-06", n: "Ruddervoorde", p: "Ruddervoorde, BEL", s: "sp", r: 5, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/ruddervoorde"} },
    { d: "2026-12-25", n: "Christmas cross", p: "Heusden-Zolder, BEL", s: "sp", r: 6, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/heusden-zolder"} },
    { d: "2026-12-30", n: "Diegem", p: "Diegem, BEL", s: "sp", r: 7, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/diegem"} },
    { d: "2027-01-02", n: "Gullegem", p: "Gullegem, BEL", s: "sp", r: 8, l: {"site": "https://www.superprestigecyclocross.be/en/calendar/2026-2027/gullegem"} },

    // --- X2O ---
    { d: "2026-11-01", n: "Koppenbergcross", p: "Oudenaarde, BEL", s: "x2o", r: 1, l: {"site": "https://koppenbergcross.be/"} },
    { d: "2026-11-15", n: "Bollekescross", p: "Hamme-Zogge, BEL", s: "x2o", r: 2 },
    { d: "2026-11-22", n: "Be-Mine Cross", p: "Beringen, BEL", s: "x2o", r: 3 },
    { d: "2026-12-22", n: "Plage Cross", p: "Hofstade, BEL", s: "x2o", r: 4 },
    { d: "2026-12-23", n: "Azencross", p: "Loenhout, BEL", s: "x2o", r: 5 },
    { d: "2027-01-01", n: "GP Sven Nys", p: "Baal, BEL", s: "x2o", r: 6 },
    { d: "2027-02-07", n: "Krawatencross", p: "Lille, BEL", s: "x2o", r: 7 },
    { d: "2027-02-14", n: "Brussels Universities Cross", p: "Brussels, BEL", s: "x2o", r: 8 },

    // --- World Cup ---
    { d: "2026-11-27", n: "World Cup #1", p: "Ostrava, CZE", s: "wc", r: 1 },
    { d: "2026-11-29", n: "World Cup #2", p: "Tábor, CZE", s: "wc", r: 2 },
    { d: "2026-12-13", n: "World Cup #3", p: "Glasgow, SCO", s: "wc", r: 3 },
    { d: "2026-12-19", n: "World Cup #4", p: "Antwerp, BEL", s: "wc", r: 4 },
    { d: "2026-12-20", n: "World Cup #5", p: "Koksijde, BEL", s: "wc", r: 5 },
    { d: "2026-12-26", n: "World Cup #6", p: "Gavere, BEL", s: "wc", r: 6 },
    { d: "2026-12-27", n: "World Cup #7", p: "Namur, BEL", s: "wc", r: 7 },
    { d: "2026-12-29", n: "World Cup #8", p: "Besançon, FRA", s: "wc", r: 8 },
    { d: "2027-01-03", n: "World Cup #9", p: "Zonhoven, BEL", s: "wc", r: 9 },
    { d: "2027-01-17", n: "World Cup #10", p: "Benidorm, ESP", s: "wc", r: 10 },
    { d: "2027-01-23", n: "World Cup #11", p: "Hamme, BEL", s: "wc", r: 11 },
    { d: "2027-01-24", n: "World Cup #12 (finale)", p: "Hoogerheide, NED", s: "wc", r: 12 },

    // --- National championships ---
    { d: "2026-10-31", e: "2026-11-01", n: "Canadian Championships", p: "Oro-Medonte, ON", s: "nat", l: {"site": "https://cyclingcanada.ca/event/2026-canadian-cyclo-cross-championships-hardwood-cross/", "results": "https://cyclingcanada.ca/event/2026-canadian-cyclo-cross-championships-hardwood-cross/"} },
    { d: "2027-01-09", e: "2027-01-10", n: "Belgian Championships (BK)", p: "Bilzen-Hoeselt, BEL", s: "nat", l: {"site": "https://www.belgiancycling.be/disciplines/veldrijden/belgische-kampioenschappen/bk-veldrijden-elite-u23-juniors-u17", "results": "https://cyclocross24.com/race/belgium-national-championships/"} },
    { d: "2027-01-09", e: "2027-01-10", n: "Dutch Championships (NK)", p: "Gemert, NED", s: "nat", note: "KNWU lists Jan 9-10; elite race believed to be Jan 10 (secondary source).", l: {"site": "https://www.knwu.nl/nieuws/nk-veldrijden-2027-naar-gemert", "results": "https://cyclocross24.com/race/netherlands-national-championships/"} },

    // --- Championships ---
    { d: "2026-11-07", e: "2026-11-08", n: "European Championships", p: "Zeddam, NED", s: "champ", b: { t: "Unknown", s: "unknown" }, l: {"site": "https://ek2026.nl/en/", "results": "https://cyclocross24.com/race/european-championships/"} },
    { d: "2027-01-29", e: "2027-01-31", n: "World Championships", p: "Ostend, BEL", s: "champ", l: {"site": "https://www.flandersclassics.be/en/news/flanders-classics-2027-cyclo-cross-world-championships-toerisme-oostende-vzw", "results": "https://cyclocross24.com/race/world-championships/", "yt": "https://www.youtube.com/channel/UCloqTh1nPpW13LCntQglS-Q", "ytNote": "UCI streams only where no local rights holder; may be blocked in the US"} }
  ],

  // Things I could not confirm, shown at the bottom of the page.
  open: [
    "Who holds US rights to the Superprestige, X²O Trofee and HG Cross for 2026-27 (HBO Max held them in 2025-26).",
    "Whether FloBikes will carry the Euros or the Ostend Worlds.",
    "How to stream the US, Canadian, Belgian and Dutch Nationals from the US.",
    "2026-27 national championship dates for France, Switzerland, Great Britain, Italy, Germany, Czechia and others (last season most fell in early-to-mid January).",
    "Start times for the World Cup, Worlds, Euros, most X²O and HG Cross rounds, and all US races. Ostrava (Nov 27) is a night race.",
    "Current subscription prices."
  ],

  sources: [
    ["UCI World Cup 2026-27 calendar", "https://www.ucicyclocrossworldcup.com/en/news/discover-the-calendar-of-the-2026-2027-uci-cyclo-cross-world-cup"],
    ["Superprestige 2026-27 calendar", "https://www.superprestigecyclocross.be/en/news/discover-the-calendar-for-the-2026-2027-telenet-superprestige"],
    ["X²O Trofee 2026-27 calendar (Veldritkrant)", "https://www.veldritkrant.be/nieuws/2026-02-02/veldritkalender-x-o-badkamers-trofee-2026-2027"],
    ["HG Cross 2026-27 calendar (Veldritkrant)", "https://www.veldritkrant.be/nieuws/2026-02-02/veldritkalender-exact-cross-2026-2027"],
    ["UEC cyclo-cross page (Euros 2026)", "https://www.uec.ch/en/cyclocross"],
    ["2027 Worlds, Ostend (Wikipedia)", "https://en.wikipedia.org/wiki/2027_UCI_Cyclo-cross_World_Championships"],
    ["FloBikes: 2026 World Cup #1 Ostrava", "https://www.flobikes.com/articles/16169642-how-to-watch-2026-uci-cyclocross-world-cup-race-1-ostrava-czh-cycling"],
    ["FloBikes: 2026 Superprestige Overijse", "https://www.flobikes.com/articles/15255588-how-to-watch-2026-cyclocross-superprestige-overijse-cycling"],
    ["FloBikes: 2023-24 deal (all series)", "https://www.flobikes.com/articles/11631347-flobikes-broadcasts-exact-cross-superprestige-x2o-trofee-cyclocross-races"],
    ["HBO Max cyclo-cross page", "https://www.hbomax.com/rs/en/sports/2026-2-4/6921b6af-61b9-5d68-9ea3-7e1e44067d02"],
    ["Cyclingnews: how to watch 2025-26 cyclocross", "https://www.cyclingnews.com/features/how-to-watch-the-2025-26-cyclocross-season/"],
    ["Domestique: 2025-26 cyclocross on TV", "https://www.domestiquecycling.com/en/news/how-to-watch-the-2025-2026-cyclocross-season/"],
    ["2026 US UCI calendar (CX Hairs)", "https://cxhairs.substack.com/p/2026-united-states-uci-cyclocross"],
    ["USCX livestream links", "https://uscx.us/livestream-media/"],
    ["USA Cycling Nationals", "https://cxnats.usacycling.org/"],
    ["Belgian Championships 2027 (Belgian Cycling)", "https://www.belgiancycling.be/disciplines/veldrijden/belgische-kampioenschappen/bk-veldrijden-elite-u23-juniors-u17"],
    ["Dutch Championships 2027 (KNWU)", "https://www.knwu.nl/nieuws/nk-veldrijden-2027-naar-gemert"],
    ["Canadian Championships 2026 (Cycling Canada)", "https://cyclingcanada.ca/news/discover-the-2026-canadian-championships-calendar/"]
  ]
};

// Elite start times as published by each organizer, in LOCAL time at the venue.
// Key = "<first-day date>|<series>". tz defaults to Europe/Brussels.
// Eastern-time conversion is done in time.js, so daylight-saving gaps are handled
// (Europe ends DST Oct 25 2026, the US ends Nov 1 2026).
// Races with no entry here have no published timetable yet.
CX.times = {
  "2026-10-25|sp":  { w: "13:40", m: "15:10" },
  "2026-11-05|sp":  { w: "18:15", m: "20:15" },
  "2026-11-11|sp":  { w: "13:40", m: "15:10" },
  "2026-11-14|sp":  { w: "13:40", m: "15:10" },
  "2026-12-06|sp":  { w: "13:40", m: "15:10" },
  "2026-12-25|sp":  { w: "13:40", m: "15:10" },
  "2026-12-30|sp":  { w: "18:30", m: "20:00" },
  "2027-01-02|sp":  { w: "12:30", m: "15:10" },
  "2026-11-01|x2o": { w: "13:45", m: "15:00" },
  "2026-10-17|hg":  { w: "13:45", m: "15:00" }
};

// Approximate town-centre coordinates [lat, lng] for every venue, keyed by the
// event's `p` string. Added from general geographic knowledge, NOT from a cited source;
// good enough for a map pin, not for navigation.
CX.geo = {
  "Overijse, BEL": [50.775, 4.535],       "Middelkerke, BEL": [51.185, 2.820],
  "Niel, BEL": [51.108, 4.335],           "Merksplas, BEL": [51.357, 4.868],
  "Ruddervoorde, BEL": [51.075, 3.185],   "Heusden-Zolder, BEL": [51.030, 5.310],
  "Diegem, BEL": [50.890, 4.440],         "Gullegem, BEL": [50.854, 3.231],
  "Oudenaarde, BEL": [50.845, 3.605],     "Hamme-Zogge, BEL": [51.097, 4.135],
  "Beringen, BEL": [51.050, 5.226],       "Hofstade, BEL": [50.985, 4.495],
  "Loenhout, BEL": [51.395, 4.650],       "Baal, BEL": [50.985, 4.720],
  "Lille, BEL": [51.245, 4.820],          "Brussels, BEL": [50.850, 4.350],
  "Dendermonde, BEL": [51.028, 4.101],    "Meulebeke, BEL": [50.950, 3.290],
  "Heerde, NED": [52.390, 6.040],         "Lokeren, BEL": [51.100, 3.995],
  "Mol, BEL": [51.190, 5.115],            "Maldegem, BEL": [51.210, 3.440],
  "Sint-Niklaas, BEL": [51.165, 4.140],   "Ostrava, CZE": [49.835, 18.292],
  "Tábor, CZE": [49.414, 14.658],         "Glasgow, SCO": [55.868, -4.290],
  "Antwerp, BEL": [51.220, 4.400],        "Koksijde, BEL": [51.100, 2.650],
  "Gavere, BEL": [50.930, 3.660],         "Namur, BEL": [50.467, 4.867],
  "Besançon, FRA": [47.240, 6.024],       "Zonhoven, BEL": [50.990, 5.370],
  "Benidorm, ESP": [38.540, -0.131],      "Hamme, BEL": [51.097, 4.135],
  "Hoogerheide, NED": [51.420, 4.310],    "Zeddam, NED": [51.930, 6.230],
  "Ostend, BEL": [51.225, 2.920],         "Bilzen-Hoeselt, BEL": [50.875, 5.520],
  "Gemert, NED": [51.560, 5.690],

  // North America
  "Rochester, NY": [43.157, -77.609],     "Roanoke, VA": [37.271, -79.941],
  "Baltimore, MD": [39.290, -76.612],     "Deerfield Twp, OH": [39.330, -84.280],
  "Indianapolis, IN": [39.768, -86.158],  "Northampton, MA": [42.325, -72.641],
  "Washington, DC": [38.907, -77.037],    "Boulder, CO": [40.015, -105.271],
  "Hendersonville, NC": [35.320, -82.461],"Fayetteville, AR": [36.063, -94.157],
  "Oro-Medonte, ON": [44.600, -79.560]
};

// Link defaults per series; an event's own `l` overrides these.
//   site    = the race's or series' own website
//   results = where results are (shown once a race has started)
//   yt      = YouTube channel that streams the FULL race (only where there is evidence of that)
//   ytNote  = caveat shown next to the YouTube link
// The Belgian series (Superprestige, X²O, HG Cross) are on Sporza / Play Sports, not YouTube, so have no yt.
CX.seriesLinks = {
  wc:  { site: "https://www.ucicyclocrossworldcup.com/en", results: "https://cyclocross24.com/standings/uci-world-cup/",
         yt: "https://www.youtube.com/channel/UCloqTh1nPpW13LCntQglS-Q", ytNote: "UCI streams only where no local rights holder; may be blocked in the US" },
  sp:  { results: "https://sporza.be/nl/categorie/wielrennen/veldrijden/superprestige-veldrijden/" },
  x2o: { site: "https://x2otrofee.be/", results: "https://sporza.be/nl/categorie/wielrennen/veldrijden/dvv-veldrijden/" }
};
