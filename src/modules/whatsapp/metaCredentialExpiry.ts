export function earliestMetaCredentialExpiry(...values: Array<Date | undefined>) {
  const expiries = values.filter((value): value is Date => value instanceof Date);
  return expiries.length
    ? new Date(Math.min(...expiries.map(value => value.getTime())))
    : undefined;
}
