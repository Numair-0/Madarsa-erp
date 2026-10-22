'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
const schema = z.object({ name: z.string().min(2, 'Name is required'), fatherName: z.string().min(2, "Father's name is required"), motherName: z.string().optional(),
  dob: z.string().min(1, 'Date of birth is required'), gender: z.enum(['male', 'female']), contact: z.string().optional(), address: z.string().optional() });
type F = z.infer<typeof schema>;
const Field = ({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) =>
  <div><label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>{children}{error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}</div>;
export default function NewAdmission() {
  const router = useRouter(); const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { gender: 'male' } });
  const onSubmit = async (v: F) => {
    setErr('');
    const body = Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '' && x !== undefined)); // server schema is strict
    try { await api('/students', { method: 'POST', json: body }); router.push('/students'); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Cannot reach server'); }
  };
  return (
    <div className="max-w-2xl space-y-4"><h1 className="text-xl font-semibold text-navy">New admission</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="card grid gap-4 sm:grid-cols-2" noValidate>
        <Field id="name" label="Student name" error={errors.name?.message}><input id="name" className="input" {...register('name')} /></Field>
        <Field id="fatherName" label="Father's name" error={errors.fatherName?.message}><input id="fatherName" className="input" {...register('fatherName')} /></Field>
        <Field id="motherName" label="Mother's name"><input id="motherName" className="input" {...register('motherName')} /></Field>
        <Field id="dob" label="Date of birth" error={errors.dob?.message}><input id="dob" type="date" className="input" {...register('dob')} /></Field>
        <Field id="gender" label="Gender"><select id="gender" className="input" {...register('gender')}><option value="male">Male</option><option value="female">Female</option></select></Field>
        <Field id="contact" label="Contact"><input id="contact" className="input" {...register('contact')} /></Field>
        <div className="sm:col-span-2"><Field id="address" label="Address"><textarea id="address" className="input" rows={2} {...register('address')} /></Field></div>
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700 sm:col-span-2">{err}</p>}
        <div className="flex gap-2 sm:col-span-2"><button className="btn" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Admit student'}</button><button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button></div>
      </form>
    </div>
  );
}
