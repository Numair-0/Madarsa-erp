'use client';
import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { formatRupees } from '@/lib/money';
interface D { students?: { total: number; active: number; newThisMonth: number }; fees?: { collectedTodayPaise: number; collectedThisMonthPaise: number; outstandingPaise: number };
  hostel?: { totalBeds: number; occupied: number; vacant: number }; library?: { copies: number; issued: number; overdue: number }; inventory?: { lowStockItems: number };
  kitchen?: { pendingDemands: number }; donations?: { thisMonthPaise: number } }
const Stat = ({ label, value }: { label: string; value: string | number }) => <div className="card"><div className="text-xs uppercase text-neutral-500">{label}</div><div className="mt-1 text-2xl font-semibold text-navy">{value}</div></div>;
export default function Dashboard() {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState('');
  const load = () => { setErr(''); api<D>('/dashboard').then(setD).catch(e => setErr(e.message)); };
  useEffect(load, []);
  if (err) return <div className="card text-sm text-red-700">{err} <button className="btn-ghost ml-2" onClick={load}>Retry</button></div>;
  if (!d) return <p className="text-sm text-neutral-500">Loading…</p>;
  return (
    <div className="space-y-6"><h1 className="text-xl font-semibold text-navy">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.students && <><Stat label="Total students" value={d.students.total} /><Stat label="Active students" value={d.students.active} /><Stat label="New this month" value={d.students.newThisMonth} /></>}
        {d.fees && <><Stat label="Collected today" value={formatRupees(d.fees.collectedTodayPaise)} /><Stat label="Outstanding dues" value={formatRupees(d.fees.outstandingPaise)} /></>}
        {d.hostel && <Stat label="Hostel occupied / vacant" value={`${d.hostel.occupied} / ${d.hostel.vacant}`} />}
        {d.library && <Stat label="Books issued (overdue)" value={`${d.library.issued} (${d.library.overdue})`} />}
        {d.inventory && <Stat label="Low-stock items" value={d.inventory.lowStockItems} />}
        {d.kitchen && <Stat label="Pending demands" value={d.kitchen.pendingDemands} />}
        {d.donations && <Stat label="Donations this month" value={formatRupees(d.donations.thisMonthPaise)} />}
      </div>
      {d.fees && <div className="card h-64"><div className="mb-2 text-sm font-medium">Fees (₹)</div><ResponsiveContainer width="100%" height="90%"><BarChart data={[{ n: 'Today', v: d.fees.collectedTodayPaise / 100 }, { n: 'This month', v: d.fees.collectedThisMonthPaise / 100 }, { n: 'Outstanding', v: d.fees.outstandingPaise / 100 }]}><XAxis dataKey="n" /><YAxis /><Tooltip /><Bar dataKey="v" fill="#B8923A" /></BarChart></ResponsiveContainer></div>}
    </div>
  );
}
