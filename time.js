// Convert a venue-local wall-clock time to US Eastern, DST-aware.
// etTime("2026-10-25", "15:10", "Europe/Brussels") -> { time: "10:10 AM", dayShift: 0 }
(function () {
  // Minutes to ADD to a UTC instant to get the local wall-clock time in `tz` at that instant
  // (i.e. the timezone's offset from UTC, DST included). E.g. Europe/Brussels in winter -> 60.
  function offsetMinutes(utcMs, tz) {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    }).formatToParts(new Date(utcMs)).reduce((a, x) => (a[x.type] = x.value, a), {});
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUtc - utcMs) / 60000);
  }

  // Converts a venue-local wall-clock time to US Eastern.
  //   dateStr: "YYYY-MM-DD" (the venue's local date)   hhmm: "HH:MM" (24h, venue-local)   tz: IANA zone, e.g. "Europe/Brussels"
  // Returns { time: "10:10 AM", dayShift: 0 }, where dayShift is how many days later/earlier the Eastern date falls
  // (e.g. a late-night European race can land on the previous day in the US).
  function etTime(dateStr, hhmm, tz) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = hhmm.split(":").map(Number);
    const wall = Date.UTC(y, mo - 1, d, h, mi);
    // Two passes settle the offset around DST changes.
    let utc = wall - offsetMinutes(wall, tz) * 60000;
    utc = wall - offsetMinutes(utc, tz) * 60000;
    const et = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true
    }).format(new Date(utc));
    const etDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(utc));
    const dayShift = Math.round((Date.parse(etDay) - Date.parse(dateStr)) / 86400000);
    return { time: et.replace(/ /g, " "), dayShift };
  }

  const api = { etTime };
  if (typeof window !== "undefined") window.CXTime = api;
  if (typeof module !== "undefined") module.exports = api;
})();
