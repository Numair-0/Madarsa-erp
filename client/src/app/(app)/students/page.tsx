'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
interface S { _id: string; admissionNumber: string; name: string; fatherName: string; status: string }
export default function Students() {
  const [q, setQ] = useState(''); const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: S[]; total: number } | null>(null); const [err, setErr] = useState(''); const limit = 20;
  useEffect(() => { // debounced server-side search
    const t = setTimeout(() => { setErr(''); api<{ items: S[]; total: number }>(`/students?page=${page}&limit=${limit}${q ? `&search=${encodeURIComponent(q)}` : ''}`).then(setData).catch(e => setErr(e.message)); }, 300);
    return () => clearTimeout(t);
  }, [q, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-semibold text-navy">Students</h1><Link href="/students/new" className="btn">New admission</Link></div>
      <input className="input max-w-sm" placeholder="Search name, father, admission no." aria-label="Search students" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      <div className="card overflow-x-auto p-0"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="p-3">Adm. no.</th><th className="p-3">Name</th><th className="p-3">Father</th><th className="p-3">Status</th></tr></thead>
        <tbody>{!data ? <tr><td className="p-4 text-neutral-500" colSpan={4}>Loading…</td></tr> : data.items.length === 0 ? <tr><td className="p-4 text-neutral-500" colSpan={4}>No students found.</td></tr> :
          data.items.map(s => <tr key={s._id} className="border-t"><td className="p-3 font-mono">{s.admissionNumber}</td><td className="p-3">{s.name}</td><td className="p-3">{s.fatherName}</td><td className="p-3 capitalize">{s.status}</td></tr>)}</tbody></table></div>
      <div className="flex items-center gap-2 text-sm"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {pages}</span><button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button></div>
    </div>
  );
}
