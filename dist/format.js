const DAY = /^(\d{4})-(\d{2})-(\d{2})/;
/** A UTC date, so "2026-08-01" stays Aug 1 wherever the reader is. */
export function parseDay(iso) {
    const m = DAY.exec(iso);
    if (!m)
        return null;
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
/** "2026-08-01" as "Aug 1, 2026". Anything else comes back unchanged. */
export function formatDay(iso) {
    const day = parseDay(iso);
    if (!day)
        return iso;
    return day.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });
}
/** A period's start date, named at the chart's unit: "Aug 2026", "Q3 2026", "Week of Nov 2, 2026". */
export function formatPeriod(start, unit) {
    const day = parseDay(start);
    if (!day)
        return start;
    const year = day.getUTCFullYear();
    switch (unit) {
        case "Year":
            return String(year);
        case "Quarter":
            return `Q${Math.floor(day.getUTCMonth() / 3) + 1} ${year}`;
        case "Month":
            return day.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
        case "Week":
            return `Week of ${formatDay(start)}`;
        default:
            return formatDay(start);
    }
}
