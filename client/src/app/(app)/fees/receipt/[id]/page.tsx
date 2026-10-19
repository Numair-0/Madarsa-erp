'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatRupees } from '@/lib/money';
interface P { receiptNumber: string; createdAt: string; totalPaise: number; mode: string; status: string;
  student: { name: string; fatherName: string; admissionNumber: string };
  allocations: { amountPaise: number; obligation: { period: string; feeStructure: { name: string } | null } | null }[] }
export default function Receipt({ params }: { params: { id: string } }) {
  const [p, setP] = useState<P | null>(null); const [err, setErr] = useState(''); const [inst, setInst] = useState<{ name?: string; address?: string; receiptFooter?: string }>({});
  useEffect(() => { api<P>(`/payments/${params.id}`).then(setP).catch(e => setErr(e.message)); }, [params.id]);
  useEffect(() => { api<typeof inst>('/settings').then(setInst).catch(() => undefined); }, []);
  if (err) return <p role="alert" className="text-sm text-red-700">{err}</p>;
  if (!p) return <p className="text-sm text-neutral-500">Loading…</p>;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="print:hidden"><button className="btn" onClick={() => window.print()}>Print receipt</button></div>
      <article className="card space-y-3 print:border-0 print:shadow-none" aria-label="Fee receipt">
        <header className="border-b pb-2 text-center"><h1 className="text-lg font-semibold text-navy">{inst.name ?? 'Madarsa'}</h1>{inst.address && <p className="text-xs text-neutral-500">{inst.address}</p>}<p className="text-sm">Fee Receipt {p.status === 'reversed' && <b className="text-red-700">(REVERSED)</b>}</p></header>
        <dl className="grid grid-cols-2 gap-1 text-sm"><dt className="text-neutral-500">Receipt no.</dt><dd className="font-mono">{p.receiptNumber}</dd><dt className="text-neutral-500">Date</dt><dd>{new Date(p.createdAt).toLocaleDateString('en-IN')}</dd>
          <dt className="text-neutral-500">Student</dt><dd>{p.student.name} ({p.student.admissionNumber})</dd><dt className="text-neutral-500">Father</dt><dd>{p.student.fatherName}</dd><dt className="text-neutral-500">Mode</dt><dd className="uppercase">{p.mode}</dd></dl>
        <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-neutral-500"><th className="py-1">Fee</th><th>Period</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{p.allocations.map((a, i) => <tr key={i} className="border-b"><td className="py-1">{a.obligation?.feeStructure?.name ?? '—'}</td><td>{a.obligation?.period}</td><td className="text-right">{formatRupees(a.amountPaise)}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan={2} className="pt-2 font-semibold">Total</td><td className="pt-2 text-right font-semibold">{formatRupees(p.totalPaise)}</td></tr></tfoot></table>
        {inst.receiptFooter && <footer className="border-t pt-2 text-center text-xs text-neutral-500">{inst.receiptFooter}</footer>}
      </article>
    </div>
  );
}
