export type Night = { sleepOn:number; wakeOn:number; };
export function basicSleepStats(nights: Night[]) {
  const durations = nights.map(n => (n.wakeOn - n.sleepOn) / 3600000);
  const avg = durations.reduce((a,b)=>a+b,0)/nights.length;
  const lateBedPct = nights.filter(n => {
    const hour = new Date(n.sleepOn).getHours();
    return hour >= 0 && hour < 2; // midnight–2am
  }).length / nights.length * 100;
  return { avgHours: +avg.toFixed(2), lateBedPct: Math.round(lateBedPct) };
}
