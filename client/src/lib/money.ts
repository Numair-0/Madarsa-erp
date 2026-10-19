/** Display only; all arithmetic stays in integer paise on the server. */
export const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Parses "100", "100.5", "100.50" into integer paise; null if invalid. No floats. */
export const parseRupeesToPaise = (s: string): number | null => {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s.trim());
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : null;
};
