export function summarize(stats:{avgHours:number; lateBedPct:number}) {
  const risk = stats.avgHours < 6.5 ? "elevated" : (stats.avgHours < 7 ? "moderate" : "low");
  return `Avg sleep ${stats.avgHours}h. Late bedtimes on ${stats.lateBedPct}% of nights. Circadian misalignment risk: ${risk}.`;
}
