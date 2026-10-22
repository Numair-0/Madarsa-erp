'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api, ApiError } from '@/lib/api';
const schema = z.object({ username: z.string().min(1, 'Username is required'), password: z.string().min(1, 'Password is required') });
type F = z.infer<typeof schema>;
export default function Login() {
  const router = useRouter(); const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({ resolver: zodResolver(schema) });
  const onSubmit = async (v: F) => { setErr(''); try { await api('/auth/login', { method: 'POST', json: v }); router.replace('/dashboard'); } catch (e) { setErr(e instanceof ApiError ? e.message : 'Cannot reach server'); } };
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-sm space-y-4" noValidate>
        <div><h1 className="text-xl font-semibold text-navy">Madarsa ERP</h1><p className="text-sm text-neutral-500">Sign in to continue</p></div>
        <div><label htmlFor="u" className="mb-1 block text-sm font-medium">Username</label><input id="u" className="input" autoComplete="username" {...register('username')} />{errors.username && <p role="alert" className="mt-1 text-xs text-red-600">{errors.username.message}</p>}</div>
        <div><label htmlFor="p" className="mb-1 block text-sm font-medium">Password</label><input id="p" type="password" className="input" autoComplete="current-password" {...register('password')} />{errors.password && <p role="alert" className="mt-1 text-xs text-red-600">{errors.password.message}</p>}</div>
        {err && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        <button className="btn w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
