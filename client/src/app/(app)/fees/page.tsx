'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { formatRupees, parseRupeesToPaise } from '@/lib/money';
interface S { _id: string; admissionNumber: string; name: string; fatherName: string }
interface Due { _id: string; period: string; amountPaise: number; paidPaise: number; feeStructure: { name: string } | null }
const MODES = ['cash', 'upi', 'bank', 'cheque', 'other'] as const;
export default function FeeCollection() {
  const router = useRouter();
  const [q, setQ] = useState(''); const [results, setResults] = useState<S[]>([]); const [student, setStudent] = useState<S | null>(null);
  const [dues, setDues] = useState<Due[] | null>(null); const [sel, setSel] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<(typeof MODES)[number]>('cash'); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { // debounced student search
    if (!q.trim() || student) { setResults([]); return; }
    const t = setTimeout(() => api<{ items: S[] }>(`/students?limit=5&search=${encodeURIComponent(q)}`).then(r => setResults(r.items)).catch(e => setErr(e.message)), 300);
    return () => clearTimeout(t);
  }, [q, student]);
  const pick = (s: S) => { setStudent(s); setQ(''); setSel({}); setErr(''); setDues(null); api<Due[]>(`/fees/students/${s._id}/dues`).then(setDues).catch(e => setErr(e.message)); };
  const toggle = (d: Due, on: boolean) => setSel(p => { const n = { ...p }; if (on) n[d._id] = ((d.amountPaise - d.paidPaise) / 100).toFixed(2); else delete n[d._id]; return n; });
  const lines = useMemo(() => Object.entries(sel).map(([id, v]) => ({ id, paise: parseRupeesToPaise(v), due: dues?.find(d => d._id === id) })), [sel, dues]);
  const invalid = lines.some(l => l.paise === null || l.paise <= 0 || !l.due || l.paise > l.due.amountPaise - l.due.paidPaise);
  const total = lines.reduce((a, l) => a + (l.paise ?? 0), 0);
  const submit = async () => {
    if (!student || !lines.length || invalid) return; setBusy(true); setErr('');
    try { const p = await api<{ _id: string }>('/payments', { method: 'POST', json: { studentId: student._id, mode, allocations: lines.map(l => ({ obligationId: l.id, amountPaise: l.paise })) } }); router.push(`/fees/receipt/${p._id}`); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Cannot reach server'); setBusy(false); }
  };
  return (
    <div className="max-w-3xl space-y-4"><h1 className="text-xl font-semibold text-navy">Fee collection</h1>
      {!student ? <div className="relative"><input className="input" aria-label="Find student" placeholder="Search student by name or admission no." value={q} onChange={e => setQ(e.target.value)} />
        {results.length > 0 && <ul className="card absolute z-10 mt-1 w-full p-0">{results.map(s => <li key={s._id}><button className="w-full px-3 py-2 text-left text-sm hover:bg-gold-100" onClick={() => pick(s)}><span className="font-mono">{s.admissionNumber}</span> — {s.name} <span className="text-neutral-500">s/o {s.fatherName}</span></button></li>)}</ul>}</div>
        : <div className="card flex items-center justify-between text-sm"><span><b>{student.name}</b> <span className="font-mono text-neutral-500">{student.admissionNumber}</span></span><button className="btn-ghost" onClick={() => { setStudent(null); setDues(null); setSel({}); }}>Change</button></div>}
      {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {student && (dues === null ? <p className="text-sm text-neutral-500">Loading dues…</p> : dues.length === 0 ? <p className="card text-sm text-neutral-600">No outstanding dues.</p> : (
        <div className="space-y-4"><div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="p-3"><span className="sr-only">Select</span></th><th className="p-3">Fee</th><th className="p-3">Period</th><th className="p-3 text-right">Outstanding</th><th className="p-3 text-right">Pay (₹)</th></tr></thead>
          <tbody>{dues.map(d => { const out = d.amountPaise - d.paidPaise; const on = d._id in sel; const l = lines.find(x => x.id === d._id); const bad = on && (l?.paise == null || l.paise <= 0 || l.paise > out);
            return <tr key={d._id} className="border-t"><td className="p-3"><input type="checkbox" aria-label={`Select ${d.period}`} checked={on} onChange={e => toggle(d, e.target.checked)} /></td><td className="p-3">{d.feeStructure?.name ?? '—'}</td><td className="p-3">{d.period}</td><td className="p-3 text-right">{formatRupees(out)}</td>
              <td className="p-3 text-right"><input className={`input w-28 text-right ${bad ? 'border-red-500' : ''}`} aria-label={`Amount for ${d.period}`} disabled={!on} value={sel[d._id] ?? ''} onChange={e => setSel(p => ({ ...p, [d._id]: e.target.value }))} /></td></tr>; })}</tbody></table></div>
          <div className="card flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm">Mode <select className="input w-auto" value={mode} onChange={e => setMode(e.target.value as typeof mode)}>{MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}</select></label>
            <span className="text-lg font-semibold text-navy">Total {formatRupees(total)}</span><button className="btn" disabled={busy || !lines.length || invalid} onClick={submit}>{busy ? 'Collecting…' : 'Collect & issue receipt'}</button></div></div>))}
    </div>
  );
}
