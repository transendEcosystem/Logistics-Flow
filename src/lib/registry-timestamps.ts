export function registryTimestampMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object') {
    if ('toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
    const seconds = 'seconds' in value ? value.seconds : '_seconds' in value ? value._seconds : undefined;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) return seconds * 1000;
  }
  const parsed = typeof value === 'string' || typeof value === 'number'
    ? new Date(value).getTime()
    : value instanceof Date ? value.getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}
