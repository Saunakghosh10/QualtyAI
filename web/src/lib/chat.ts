/** Chat helpers shared by the order rooms. */

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Messages grouped by the local day they were sent, oldest first, labelled like a phone chat. */
export function messageDays<T extends { createdAt: string }>(messages: T[], now = new Date()) {
  const today = dayKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = dayKey(y);
  const days: { key: string; label: string; items: T[] }[] = [];
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const key = dayKey(d);
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      const label =
        key === today
          ? "Today"
          : key === yesterday
            ? "Yesterday"
            : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/^(\w+) /, "$1, ");
      day = { key, label, items: [] };
      days.push(day);
    }
    day.items.push(m);
  }
  return days;
}
