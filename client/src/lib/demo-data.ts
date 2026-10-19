/**
 * Mock data for demo mode.
 *
 * All data is fictional and for demonstration purposes only.
 * Financial figures, student names, and other records are entirely fabricated.
 * Do not use this data for any real institutional purposes.
 */

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------
export interface MockStudent {
  _id: string;
  admissionNumber: string;
  name: string;
  fatherName: string;
  motherName?: string;
  dob: string;
  gender: 'male' | 'female';
  contact?: string;
  address?: string;
  status: string;
}

export const MOCK_STUDENTS: MockStudent[] = [
  { _id: 's1', admissionNumber: '2026-001', name: 'Ahmad Raza Khan', fatherName: 'Irfan Khan', motherName: 'Fatima Begum', dob: '2014-03-12', gender: 'male', contact: '9876543210', address: '12, Nai Sadak, Old City', status: 'active' },
  { _id: 's2', admissionNumber: '2026-002', name: 'Zainab Fatima', fatherName: 'Abdul Qadir', motherName: 'Rukhsar Begum', dob: '2015-07-22', gender: 'female', contact: '9876543211', address: '45, Chowk Bazaar', status: 'active' },
  { _id: 's3', admissionNumber: '2026-003', name: 'Mohammed Yusuf', fatherName: 'Naseem Ahmed', dob: '2013-11-05', gender: 'male', contact: '9876543212', address: '78, Purani Haveli', status: 'active' },
  { _id: 's4', admissionNumber: '2026-004', name: 'Ayesha Siddiqui', fatherName: 'Salman Siddiqui', motherName: 'Nargis', dob: '2014-01-18', gender: 'female', contact: '9876543213', address: '23, Darussalam Colony', status: 'active' },
  { _id: 's5', admissionNumber: '2026-005', name: 'Hamza Ali', fatherName: 'Ali Ahmed', dob: '2015-09-30', gender: 'male', contact: '9876543214', address: '56, Madina Nagar', status: 'active' },
  { _id: 's6', admissionNumber: '2026-006', name: 'Mariam Noor', fatherName: 'Noor Mohammed', motherName: 'Shabana', dob: '2013-06-14', gender: 'female', contact: '9876543215', address: '89, Talab Katta', status: 'active' },
  { _id: 's7', admissionNumber: '2025-042', name: 'Ibrahim Qureshi', fatherName: 'Rashid Qureshi', dob: '2012-12-25', gender: 'male', contact: '9876543216', address: '34, Begum Bazaar', status: 'active' },
  { _id: 's8', admissionNumber: '2025-043', name: 'Khadija Bee', fatherName: 'Anwar Hussain', motherName: 'Amina', dob: '2014-04-08', gender: 'female', contact: '9876543217', address: '67, Shah Ganj', status: 'active' },
  { _id: 's9', admissionNumber: '2025-044', name: 'Bilal Ahmed', fatherName: 'Jameel Ahmed', dob: '2013-08-19', gender: 'male', status: 'active' },
  { _id: 's10', admissionNumber: '2025-045', name: 'Safiya Khatoon', fatherName: 'Zaheer Uddin', motherName: 'Rehana', dob: '2015-02-28', gender: 'female', contact: '9876543219', address: '10, Falaknuma', status: 'active' },
  { _id: 's11', admissionNumber: '2025-046', name: 'Owais Rahman', fatherName: 'Abdur Rahman', dob: '2014-10-11', gender: 'male', contact: '9876543220', address: '43, Moghalpura', status: 'active' },
  { _id: 's12', admissionNumber: '2024-031', name: 'Sana Parveen', fatherName: 'Shabbir Hussain', dob: '2012-05-03', gender: 'female', status: 'graduated' },
  { _id: 's13', admissionNumber: '2026-007', name: 'Usman Ghani', fatherName: 'Abdul Ghani', motherName: 'Tahira', dob: '2015-11-20', gender: 'male', contact: '9876543222', address: '76, Shalibanda', status: 'active' },
  { _id: 's14', admissionNumber: '2026-008', name: 'Nadia Sultana', fatherName: 'Sultan Mohammed', dob: '2014-07-07', gender: 'female', contact: '9876543223', address: '21, Yakutpura', status: 'active' },
  { _id: 's15', admissionNumber: '2026-009', name: 'Tariq Mahmood', fatherName: 'Mahmood Ali', motherName: 'Zubaida', dob: '2013-03-15', gender: 'male', contact: '9876543224', address: '54, Dabeerpura', status: 'active' },
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const MOCK_DASHBOARD = {
  students: { total: 148, active: 142, newThisMonth: 6 },
  fees: { collectedTodayPaise: 1250000, collectedThisMonthPaise: 18750000, outstandingPaise: 4320000 },
  hostel: { totalBeds: 60, occupied: 47, vacant: 13 },
  library: { copies: 1250, issued: 84, overdue: 7 },
  inventory: { lowStockItems: 3 },
  kitchen: { pendingDemands: 2 },
  donations: { thisMonthPaise: 7500000 },
};

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------
export interface MockDue {
  _id: string;
  period: string;
  amountPaise: number;
  paidPaise: number;
  feeStructure: { name: string } | null;
}

export const MOCK_DUES: Record<string, MockDue[]> = {
  s1: [
    { _id: 'd1', period: '2026-10', amountPaise: 250000, paidPaise: 0, feeStructure: { name: 'Monthly Tuition' } },
    { _id: 'd2', period: '2026-09', amountPaise: 250000, paidPaise: 100000, feeStructure: { name: 'Monthly Tuition' } },
    { _id: 'd3', period: '2026-10', amountPaise: 50000, paidPaise: 0, feeStructure: { name: 'Hostel Mess Fee' } },
  ],
  s2: [
    { _id: 'd4', period: '2026-10', amountPaise: 250000, paidPaise: 0, feeStructure: { name: 'Monthly Tuition' } },
  ],
  s3: [
    { _id: 'd5', period: '2026-10', amountPaise: 250000, paidPaise: 0, feeStructure: { name: 'Monthly Tuition' } },
    { _id: 'd6', period: '2026-09', amountPaise: 250000, paidPaise: 0, feeStructure: { name: 'Monthly Tuition' } },
  ],
  s5: [
    { _id: 'd7', period: '2026-10', amountPaise: 250000, paidPaise: 0, feeStructure: { name: 'Monthly Tuition' } },
    { _id: 'd8', period: '2026', amountPaise: 500000, paidPaise: 0, feeStructure: { name: 'Annual Development Fund' } },
  ],
};

// ---------------------------------------------------------------------------
// Payment receipt (demo receipt for /fees/receipt/[id])
// ---------------------------------------------------------------------------
export const MOCK_PAYMENT = {
  _id: 'pay-demo-1',
  receiptNumber: 'REC-2026-0047',
  createdAt: '2026-10-18T10:30:00.000Z',
  totalPaise: 250000,
  mode: 'cash',
  status: 'paid',
  student: { name: 'Ahmad Raza Khan', fatherName: 'Irfan Khan', admissionNumber: '2026-001' },
  allocations: [
    { amountPaise: 250000, obligation: { period: '2026-10', feeStructure: { name: 'Monthly Tuition' } } },
  ],
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export const MOCK_SETTINGS = {
  name: 'Madarsa Darul Uloom Al-Falah',
  address: '123, Nai Sadak, Old City, Hyderabad — 500002',
  phone: '040-24567890',
  email: 'info@darululoomfalah.edu.in',
  academicSession: '2026-27',
  receiptFooter: 'This is a computer-generated receipt. No signature is required.',
  reportHeader: 'Madarsa Darul Uloom Al-Falah — Academic Report',
  reportFooter: 'For any queries, contact the administration office.',
};

// ---------------------------------------------------------------------------
// Mock API handler — called by api() when DEMO_MODE is true
// ---------------------------------------------------------------------------

/** Small delay to simulate network latency for realistic feel */
const delay = (ms: number = 80) => new Promise(r => setTimeout(r, ms));

/**
 * Handle an API path in demo mode. Returns the mock data that the real API
 * would return in `body.data`. Throws for unrecognized paths so the caller
 * can show a meaningful error.
 */
export async function handleDemoRequest<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  await delay();
  const method = (init.method ?? 'GET').toUpperCase();

  // ---- Auth ----
  if (path === '/auth/login' && method === 'POST') return { username: 'demo_admin', role: 'admin' } as T;
  if (path === '/auth/me') return { username: 'demo_admin', role: 'admin' } as T;
  if (path === '/auth/logout') return undefined as T;

  // ---- Dashboard ----
  if (path === '/dashboard') return MOCK_DASHBOARD as T;

  // ---- Students ----
  if (path.startsWith('/students') && method === 'GET') {
    const url = new URL(`http://x${path}`);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? '1');
    const limit = Number(url.searchParams.get('limit') ?? '20');
    const filtered = search
      ? MOCK_STUDENTS.filter(s =>
          s.name.toLowerCase().includes(search) ||
          s.fatherName.toLowerCase().includes(search) ||
          s.admissionNumber.toLowerCase().includes(search))
      : MOCK_STUDENTS;
    const start = (page - 1) * limit;
    return { items: filtered.slice(start, start + limit), total: filtered.length } as T;
  }
  if (path === '/students' && method === 'POST') {
    // Demo: pretend the student was admitted
    const body = init.json as Record<string, unknown> | undefined;
    return { _id: 'demo-new-' + Date.now(), admissionNumber: '2026-DEMO', name: body?.name ?? 'Demo Student', status: 'active' } as T;
  }

  // ---- Fees / Dues ----
  const dueMatch = path.match(/^\/fees\/students\/(\w+)\/dues$/);
  if (dueMatch) {
    const studentId = dueMatch[1];
    return (MOCK_DUES[studentId] ?? []) as T;
  }

  // ---- Payments ----
  if (path === '/payments' && method === 'POST') {
    // Demo: return a receipt ID so the UI navigates to the receipt page
    return { _id: 'pay-demo-1' } as T;
  }
  const payMatch = path.match(/^\/payments\/([\w-]+)$/);
  if (payMatch && method === 'GET') {
    return MOCK_PAYMENT as T;
  }

  // ---- Settings ----
  if (path === '/settings' && method === 'GET') return MOCK_SETTINGS as T;
  if (path === '/settings' && method === 'PUT') return MOCK_SETTINGS as T;

  // ---- Fallback: return empty/noop for unknown endpoints ----
  if (method === 'GET') return {} as T;
  return undefined as T;
}
