function isoWeek(date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day - yearStart) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${week}`;
}

export function periodKeys(now = new Date()) {
  const iso = now.toISOString();
  return { day: iso.slice(0, 10), week: isoWeek(now), month: iso.slice(0, 7) };
}

export function bump(periods, spans, kills, score) {
  const keys = periodKeys();
  for (const span of spans) {
    const current = periods[span];
    const bucket = current && current.key === keys[span] ? current : { key: keys[span], kills: 0, bestScore: 0 };
    bucket.kills += kills;
    bucket.bestScore = Math.max(bucket.bestScore, score);
    periods[span] = bucket;
  }
}

export function read(periods, span) {
  const bucket = periods?.[span];
  if (!bucket || bucket.key !== periodKeys()[span]) return {};
  return { kills: bucket.kills, bestScore: bucket.bestScore };
}
