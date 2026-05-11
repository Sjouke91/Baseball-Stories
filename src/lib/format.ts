export const toFixed3 = (value: number): string => value.toFixed(3);

export const toFixed2 = (value: number): string => {
  if (!Number.isFinite(value)) return '-';
  return value.toFixed(2);
};

export const uid = (): string => {
  return typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
