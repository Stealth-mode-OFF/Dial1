export const formatMinutesSeconds = (totalSeconds: number) => {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const computeZonedUtc = (
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string,
) => {
  const utcGuess = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));
  const asLocal = new Date(utcGuess.toLocaleString('en-US', { timeZone }));
  const offset = utcGuess.getTime() - asLocal.getTime();
  return new Date(utcGuess.getTime() + offset);
};

export const computeSequenceIso = (delayDays: number, sequenceTime: string, timeZone: string) => {
  const [hhRaw, mmRaw] = sequenceTime.split(':');
  const hh = Math.max(0, Math.min(23, Number(hhRaw) || 9));
  const mm = Math.max(0, Math.min(59, Number(mmRaw) || 0));

  const now = new Date();
  const nowZoned = new Date(now.toLocaleString('en-US', { timeZone }));
  const targetZoned = new Date(nowZoned);
  targetZoned.setDate(targetZoned.getDate() + delayDays);
  const y = targetZoned.getFullYear();
  const m = targetZoned.getMonth() + 1;
  const d = targetZoned.getDate();
  return computeZonedUtc(y, m, d, hh, mm, timeZone).toISOString();
};

export const formatSequenceWhen = (iso: string, timeZone: string) =>
  new Date(iso).toLocaleString('cs-CZ', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

