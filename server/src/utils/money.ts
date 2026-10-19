/** All money is integer paise. */
export const toPaise = (rupees: string | number): number => {
  const s = String(rupees).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${s}`);
  const [r, p = ''] = s.split('.');
  return Number(r) * 100 + Number(p.padEnd(2, '0'));
};
export const formatRupees = (paise: number): string => {
  if (!Number.isSafeInteger(paise)) throw new Error('Paise must be an integer');
  const sign = paise < 0 ? '-' : '';
  const a = Math.abs(paise);
  return `${sign}₹${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
};
export const sumPaise = (xs: number[]): number => xs.reduce((a, b) => {
  if (!Number.isSafeInteger(b)) throw new Error('Paise must be an integer');
  return a + b;
}, 0);
