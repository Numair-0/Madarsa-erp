'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
const schema = z.object({ name: z.string().min(2, 'Name is required'), address: z.string().optional(), phone: z.string().optional(), email: z.string().email('Invalid email').optional().or(z.literal('')),
  academicSession: z.string().optional(), receiptFooter: z.string().optional(), reportHeader: z.string().optional(), reportFooter: z.string().optional() });
type F = z.infer<typeof schema>;
const FIELDS: [keyof F, string][] = [['name', 'Madarsa name'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email'], ['academicSession', 'Academic session (e.g. 2026-27)'], ['receiptFooter', 'Receipt footer'], ['reportHeader', 'Report header'], ['reportFooter', 'Report footer']];
export default function Settings() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });
  useEffect(() => { api<F>('/settings').then(s => reset(Object.fromEntries(FIELDS.map(([k]) => [k, s[k] ?? '']))  as F)).catch(e => setMsg({ ok: false, text: e.message })); }, [reset]);
  const onSubmit = async (v: F) => {
    setMsg(null);
    try { await api('/settings', { method: 'PUT', json: Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== '' || k === 'email')) }); setMsg({ ok: true, text: 'Settings saved.' }); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Cannot reach server' }); }
  };
  return (
    <div className="max-w-2xl space-y-4"><h1 className="text-xl font-semibold text-navy">Institution settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" noValidate>
        {FIELDS.map(([k, label]) => <div key={k}><label htmlFor={k} className="mb-1 block text-sm font-medium">{label}</label><input id={k} className="input" {...register(k)} />{errors[k] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[k]?.message}</p>}</div>)}
        {msg && <p role={msg.ok ? 'status' : 'alert'} className={`rounded p-2 text-sm ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
        <button className="btn" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save settings'}</button>
      </form>
    </div>
  );
}
