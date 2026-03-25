/**
 * Firestore EMULATOR Seed Script
 * Usage: npm run seed (emulator must be running first)
 * SAFETY: Only connects to localhost emulator, never production.
 */

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
initializeApp({ projectId: 'finance-96f46' })
const db = getFirestore()

const SIG =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><path d="M10,40 C30,10 50,50 80,30 S120,10 150,35 S180,50 190,30" fill="none" stroke="#000" stroke-width="2"/></svg>'
  ).toString('base64')

const ago = (d: number) => Timestamp.fromDate(new Date(Date.now() - d * 86400000))
const receipt = (n: string) => ({
  fileName: n,
  storagePath: 'mock/' + Math.random().toString(36).slice(2, 8),
  url: 'https://drive.google.com/file/d/mock/view'
})

const users = [
  {
    uid: 'mock-admin-001',
    email: 'admin@example.com',
    name: 'Admin',
    displayName: '정신영',
    phone: '010-1234-5678',
    bankName: '국민은행',
    bankAccount: '123-456-789012',
    defaultCommittee: 'operations',
    signature: SIG,
    bankBookImage: '',
    bankBookPath: '',
    bankBookUrl: 'https://drive.google.com/mock',
    role: 'admin',
    projectIds: ['finance-default']
  },
  {
    uid: 'mock-approver-001',
    email: 'approver@example.com',
    name: 'Approver',
    displayName: '김민수',
    phone: '010-2345-6789',
    bankName: '신한은행',
    bankAccount: '234-567-890123',
    defaultCommittee: 'operations',
    signature: SIG,
    bankBookImage: '',
    bankBookPath: '',
    bankBookUrl: 'https://drive.google.com/mock',
    role: 'approver_ops',
    projectIds: ['finance-default']
  },
  {
    uid: 'mock-user-001',
    email: 'younghee@example.com',
    name: 'Younghee',
    displayName: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    defaultCommittee: 'operations',
    signature: '',
    bankBookImage: '',
    bankBookPath: '',
    bankBookUrl: 'https://drive.google.com/mock',
    role: 'user',
    projectIds: ['finance-default']
  },
  {
    uid: 'mock-user-002',
    email: 'junhyuk@example.com',
    name: 'Junhyuk',
    displayName: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    defaultCommittee: 'preparation',
    signature: '',
    bankBookImage: '',
    bankBookPath: '',
    bankBookUrl: 'https://drive.google.com/mock',
    role: 'user',
    projectIds: ['finance-default']
  }
]

const u1 = {
  uid: 'mock-user-001',
  name: '이영희',
  email: 'younghee@example.com'
}
const u2 = {
  uid: 'mock-user-002',
  name: '박준혁',
  email: 'junhyuk@example.com'
}
const ap1 = {
  uid: 'mock-approver-001',
  name: '김민수',
  email: 'approver@example.com'
}
const ad1 = {
  uid: 'mock-admin-001',
  name: '정신영',
  email: 'admin@example.com'
}

const projects = [
  {
    id: 'finance-default',
    name: '기본 프로젝트',
    description: '기본 자금 프로젝트',
    createdAt: ago(30),
    createdBy: ad1,
    budgetConfig: {
      totalBudget: 10000000,
      byCode: {
        5862: 2000000,
        5110: 2000000,
        5400: 3000000,
        5200: 2000000,
        4500: 1000000
      }
    },
    documentNo: 'DOC-001',
    directorApprovalThreshold: 500000,
    memberUids: users.map((u) => u.uid),
    isActive: true
  }
]

const base = {
  projectId: 'finance-default',
  session: '한국',
  rejectionReason: null,
  settlementId: null,
  originalRequestId: null
}

const requests = [
  {
    id: 'req-p1',
    ...base,
    createdAt: ago(1),
    status: 'pending',
    payee: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    date: '2025-02-15',
    committee: 'operations',
    items: [
      {
        description: 'FSY 운영위 훈련 도시락',
        budgetCode: 5400,
        amount: 568000
      },
      { description: '운영위 교통비', budgetCode: 5110, amount: 82600 }
    ],
    totalAmount: 650600,
    receipts: [receipt('lunch.jpg'), receipt('transport.pdf')],
    requestedBy: u1,
    approvedBy: null,
    approvalSignature: null,
    approvedAt: null,
    comments: '운영위 2월 훈련 비용'
  },
  {
    id: 'req-p2',
    ...base,
    createdAt: ago(2),
    status: 'pending',
    payee: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    date: '2025-02-13',
    committee: 'operations',
    items: [
      { description: '행사 자료 인쇄', budgetCode: 5200, amount: 150000 },
      { description: '문구류', budgetCode: 5200, amount: 45000 }
    ],
    totalAmount: 195000,
    receipts: [receipt('print.png')],
    requestedBy: u1,
    approvedBy: null,
    approvalSignature: null,
    approvedAt: null,
    comments: ''
  },
  {
    id: 'req-p3',
    ...base,
    createdAt: ago(1),
    status: 'pending',
    payee: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    date: '2025-02-16',
    committee: 'preparation',
    items: [
      { description: '준비위 회의실 대여', budgetCode: 5862, amount: 200000 },
      { description: '회의 다과', budgetCode: 5400, amount: 85000 }
    ],
    totalAmount: 285000,
    receipts: [receipt('room.jpg'), receipt('snack.jpg')],
    requestedBy: u2,
    approvedBy: null,
    approvalSignature: null,
    approvedAt: null,
    comments: '준비위 3차 회의'
  },
  {
    id: 'req-a1',
    ...base,
    createdAt: ago(7),
    status: 'approved',
    payee: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    date: '2025-02-08',
    committee: 'operations',
    items: [{ description: '참가자 교통비', budgetCode: 5110, amount: 320000 }],
    totalAmount: 320000,
    receipts: [receipt('bus.pdf')],
    requestedBy: u1,
    approvedBy: ap1,
    approvalSignature: SIG,
    approvedAt: ago(5),
    comments: ''
  },
  {
    id: 'req-a2',
    ...base,
    createdAt: ago(10),
    status: 'approved',
    payee: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    date: '2025-02-05',
    committee: 'preparation',
    items: [
      { description: 'T-shirts 제작', budgetCode: 5200, amount: 1200000 },
      { description: '포스터 인쇄', budgetCode: 5200, amount: 180000 }
    ],
    totalAmount: 1380000,
    receipts: [receipt('tshirt.pdf'), receipt('poster.jpg')],
    requestedBy: u2,
    approvedBy: ad1,
    approvalSignature: SIG,
    approvedAt: ago(8),
    comments: '2025 행사 물품'
  },
  {
    id: 'req-a3',
    ...base,
    createdAt: ago(6),
    status: 'approved',
    payee: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    date: '2025-02-10',
    committee: 'preparation',
    items: [
      { description: '체육관 대여', budgetCode: 5862, amount: 500000 },
      { description: '장비 대여', budgetCode: 5862, amount: 150000 }
    ],
    totalAmount: 650000,
    receipts: [receipt('facility.pdf')],
    requestedBy: u2,
    approvedBy: ap1,
    approvalSignature: SIG,
    approvedAt: ago(4),
    comments: ''
  },
  {
    id: 'req-r1',
    ...base,
    createdAt: ago(5),
    status: 'rejected',
    payee: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    date: '2025-02-10',
    committee: 'operations',
    items: [{ description: '개인 식사비', budgetCode: 5400, amount: 25000 }],
    totalAmount: 25000,
    receipts: [receipt('meal.jpg')],
    requestedBy: u1,
    approvedBy: ap1,
    approvalSignature: null,
    approvedAt: ago(4),
    rejectionReason: '개인 식사비는 환불 대상이 아닙니다.',
    comments: ''
  },
  {
    id: 'req-r2',
    ...base,
    createdAt: ago(8),
    status: 'rejected',
    payee: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    date: '2025-02-07',
    committee: 'preparation',
    items: [{ description: '숙박비', budgetCode: 5862, amount: 350000 }],
    totalAmount: 350000,
    receipts: [receipt('hotel.pdf')],
    requestedBy: u2,
    approvedBy: ad1,
    approvalSignature: null,
    approvedAt: ago(6),
    rejectionReason: '영수증 금액과 신청 금액 불일치. 확인 후 재신청.',
    comments: ''
  },
  {
    id: 'req-s1',
    ...base,
    createdAt: ago(20),
    status: 'settled',
    payee: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    date: '2025-01-25',
    committee: 'operations',
    items: [
      { description: '1월 운영위 식사', budgetCode: 5400, amount: 450000 },
      { description: '1월 운영위 교통', budgetCode: 5110, amount: 120000 }
    ],
    totalAmount: 570000,
    receipts: [receipt('jan_meal.jpg'), receipt('jan_bus.pdf')],
    requestedBy: u1,
    approvedBy: ap1,
    approvalSignature: SIG,
    approvedAt: ago(18),
    settlementId: 'stl-001',
    comments: '1월 운영위 정기회의'
  },
  {
    id: 'req-s2',
    ...base,
    createdAt: ago(22),
    status: 'settled',
    payee: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    date: '2025-01-23',
    committee: 'preparation',
    items: [
      { description: '1월 준비위 홍보물', budgetCode: 5400, amount: 280000 },
      { description: '1월 준비위 팜플렛', budgetCode: 5200, amount: 95000 }
    ],
    totalAmount: 375000,
    receipts: [receipt('jan_promo.pdf'), receipt('jan_pam.jpg')],
    requestedBy: u2,
    approvedBy: ad1,
    approvalSignature: SIG,
    approvedAt: ago(20),
    settlementId: 'stl-002',
    comments: '1월 준비위 홍보'
  }
]

const settlements = [
  {
    id: 'stl-001',
    projectId: 'finance-default',
    requestedBySignature: SIG,
    createdAt: ago(15),
    createdBy: ad1,
    payee: '이영희',
    phone: '010-3456-7890',
    bankName: '하나은행',
    bankAccount: '345-678-901234',
    session: '한국',
    committee: 'operations' as const,
    items: [
      { description: '1월 운영위 식사', budgetCode: 5400, amount: 450000 },
      { description: '1월 운영위 교통', budgetCode: 5110, amount: 120000 }
    ],
    totalAmount: 570000,
    receipts: [receipt('jan_meal.jpg'), receipt('jan_bus.pdf')],
    requestIds: ['req-s1'],
    approvedBy: ap1,
    approvalSignature: SIG
  },
  {
    id: 'stl-002',
    projectId: 'finance-default',
    requestedBySignature: SIG,
    createdAt: ago(15),
    createdBy: ad1,
    payee: '박준혁',
    phone: '010-4567-8901',
    bankName: '우리은행',
    bankAccount: '456-789-012345',
    session: '한국',
    committee: 'preparation' as const,
    items: [
      { description: '1월 준비위 홍보물', budgetCode: 5400, amount: 280000 },
      { description: '1월 준비위 팜플렛', budgetCode: 5200, amount: 95000 }
    ],
    totalAmount: 375000,
    receipts: [receipt('jan_promo.pdf'), receipt('jan_pam.jpg')],
    requestIds: ['req-s2'],
    approvedBy: ad1,
    approvalSignature: SIG
  }
]

async function seed() {
  console.log(`🔧 Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`)
  console.log('🌱 Seeding...\n')
  for (const u of users) {
    await db.collection('users').doc(u.uid).set(u)
    console.log(`  👤 ${u.displayName} (${u.role})`)
  }
  for (const p of projects) {
    const { id, ...d } = p
    await db.collection('projects').doc(id).set(d)
    console.log(`  📂 Project ${p.name}`)
  }
  for (const r of requests) {
    const { id, ...d } = r
    await db.collection('requests').doc(id).set(d)
    console.log(`  📋 ${r.payee} ${r.status} ₩${r.totalAmount.toLocaleString()}`)
  }
  for (const s of settlements) {
    const { id, ...d } = s
    await db.collection('settlements').doc(id).set(d)
    console.log(`  📊 ${s.payee} ₩${s.totalAmount.toLocaleString()}`)
  }
  await db.collection('settings').doc('global').set({ defaultProjectId: 'finance-default' })
  console.log('  💰 Settings Initialized')
  console.log('\n✅ Done! Run: npm run dev:emulator')
  process.exit(0)
}
seed().catch((e) => {
  console.error('❌', e)
  process.exit(1)
})
