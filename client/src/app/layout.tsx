import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'Madarsa ERP' };
export default function Root({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
