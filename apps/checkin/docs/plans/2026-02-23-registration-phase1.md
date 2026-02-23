# Registration Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 별도 웹 앱으로 참가자 등록 폼을 구축하고, 같은 Firebase Firestore를 공유하여 checkin 앱에서 등록 데이터를 바로 사용할 수 있게 한다.

**Architecture:** Vite + React SPA를 `/Users/young/Documents/Workspace/registration`에 생성. 같은 Firebase 프로젝트의 Firestore를 공유하고, 공개 등록 페이지(`/register/:surveyId`)는 인증 없이 접근 가능하며, 관리자 페이지(`/admin`)는 Firebase Auth(Google)로 보호한다. 제출 시 participants 컬렉션에 자동 추가 + 개인 코드 발급.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Firebase (Firestore, Auth, Hosting), Jotai, React Router DOM 7

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles/global.css`
- Create: `.env.example`
- Create: `.gitignore`

**Step 1: Create project directory and initialize**

```bash
mkdir -p /Users/young/Documents/Workspace/registration
cd /Users/young/Documents/Workspace/registration
pnpm init
```

**Step 2: Install dependencies**

```bash
pnpm add react react-dom react-router-dom firebase jotai
pnpm add -D typescript vite @vitejs/plugin-react @tailwindcss/vite tailwindcss @types/react @types/react-dom @types/node
```

**Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "types": ["node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Registration</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 6: Create src/styles/global.css**

```css
@import "tailwindcss";
```

**Step 7: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**Step 8: Create src/App.tsx**

```tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<div className="p-8 text-center text-lg">Registration App</div>} />
    </Routes>
  )
}

export default App
```

**Step 9: Create .env.example and .gitignore**

`.env.example`:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

`.gitignore`:
```
node_modules/
dist/
.env
.env.local
.firebase/
*.log
.DS_Store
```

**Step 10: Add scripts to package.json**

Add to package.json:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

**Step 11: Verify dev server starts**

```bash
cd /Users/young/Documents/Workspace/registration
pnpm dev
```

Expected: Dev server starts at http://localhost:5173, shows "Registration App"

**Step 12: Init git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold registration project"
```

---

### Task 2: Firebase config and auth service

**Files:**
- Create: `src/services/firebase/config.ts`
- Create: `src/services/firebase/auth.ts`
- Create: `src/services/firebase/index.ts`
- Create: `src/stores/authStore.ts`
- Create: `src/env.d.ts`

**Step 1: Create src/env.d.ts**

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

**Step 2: Create src/services/firebase/config.ts**

```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore, Timestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

export const SURVEYS_COLLECTION = 'surveys'
export const SURVEY_RESPONSES_COLLECTION = 'survey_responses'
export const PARTICIPANTS_COLLECTION = 'participants'

export const convertTimestamp = (timestamp: Timestamp | Date | undefined): Date => {
  if (!timestamp) return new Date()
  if (timestamp instanceof Timestamp) return timestamp.toDate()
  return timestamp
}
```

**Step 3: Create src/services/firebase/auth.ts**

```typescript
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { app } from './config'

export const auth = getAuth(app)

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export const signOut = (): Promise<void> => {
  return firebaseSignOut(auth)
}

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

export type { User }
```

**Step 4: Create src/services/firebase/index.ts**

```typescript
export { db, app, SURVEYS_COLLECTION, SURVEY_RESPONSES_COLLECTION, PARTICIPANTS_COLLECTION, convertTimestamp } from './config'
export { signInWithGoogle, signOut, onAuthChange, auth } from './auth'
export type { User } from './auth'
```

**Step 5: Create src/stores/authStore.ts**

```typescript
import { atom } from 'jotai'
import type { User } from 'firebase/auth'

export const authUserAtom = atom<User | null>(null)
export const authLoadingAtom = atom<boolean>(true)
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Firebase config and auth service"
```

---

### Task 3: Types and survey service

**Files:**
- Create: `src/types/index.ts`
- Create: `src/services/surveys.ts`
- Create: `src/services/responses.ts`

**Step 1: Create src/types/index.ts**

```typescript
export interface Survey {
  id: string
  title: string
  description: string
  isActive: boolean
  createdAt: Date
  createdBy: string
}

export interface SurveyResponse {
  id: string
  surveyId: string
  personalCode: string
  participantId: string
  email: string
  data: RegistrationData
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationData {
  name: string
  email: string
  phoneNumber?: string
  gender?: string
  age?: string
  stake?: string
  ward?: string
}

export interface Participant {
  id: string
  name: string
  email: string
  phoneNumber: string
  gender: string
  age: string
  stake: string
  ward: string
  groupId?: string
  groupName?: string
  roomId?: string
  roomNumber?: string
  checkIns: CheckIn[]
  createdAt: Date
  updatedAt: Date
  searchKeys: string[]
  metadata?: Record<string, string>
}

export interface CheckIn {
  timestamp: Date
  type: 'check-in' | 'check-out'
  by: string
}
```

**Step 2: Create src/services/surveys.ts**

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, SURVEYS_COLLECTION, convertTimestamp } from './firebase'
import type { Survey } from '../types'

export const getAllSurveys = async (): Promise<Survey[]> => {
  const q = query(collection(db, SURVEYS_COLLECTION), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      title: data.title,
      description: data.description || '',
      isActive: data.isActive ?? true,
      createdAt: convertTimestamp(data.createdAt),
      createdBy: data.createdBy || ''
    }
  })
}

export const getSurveyById = async (id: string): Promise<Survey | null> => {
  const docSnap = await getDoc(doc(db, SURVEYS_COLLECTION, id))
  if (!docSnap.exists()) return null
  const data = docSnap.data()
  return {
    id: docSnap.id,
    title: data.title,
    description: data.description || '',
    isActive: data.isActive ?? true,
    createdAt: convertTimestamp(data.createdAt),
    createdBy: data.createdBy || ''
  }
}

export const createSurvey = async (title: string, description: string, createdBy: string): Promise<Survey> => {
  const surveysRef = collection(db, SURVEYS_COLLECTION)
  const newRef = doc(surveysRef)
  const now = Timestamp.now()
  await setDoc(newRef, {
    title,
    description,
    isActive: true,
    createdAt: now,
    createdBy
  })
  return {
    id: newRef.id,
    title,
    description,
    isActive: true,
    createdAt: now.toDate(),
    createdBy
  }
}

export const updateSurvey = async (id: string, data: Partial<Pick<Survey, 'title' | 'description' | 'isActive'>>): Promise<void> => {
  await updateDoc(doc(db, SURVEYS_COLLECTION, id), data)
}

export const deleteSurvey = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, SURVEYS_COLLECTION, id))
}
```

**Step 3: Create src/services/responses.ts**

```typescript
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db, SURVEY_RESPONSES_COLLECTION, PARTICIPANTS_COLLECTION, convertTimestamp } from './firebase'
import type { SurveyResponse, RegistrationData } from '../types'

const generatePersonalCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

const generateSearchKeys = (name: string, email: string): string[] => {
  const keys: string[] = []
  const normalized = name.toLowerCase().trim()
  for (let i = 1; i <= normalized.length; i++) {
    keys.push(normalized.substring(0, i))
  }
  if (email) {
    const emailLower = email.toLowerCase().trim()
    for (let i = 1; i <= emailLower.length; i++) {
      keys.push(emailLower.substring(0, i))
    }
  }
  return keys
}

export const submitRegistration = async (
  surveyId: string,
  data: RegistrationData
): Promise<{ personalCode: string; responseId: string }> => {
  const personalCode = generatePersonalCode()
  const now = Timestamp.now()

  // 1. Create participant in shared collection
  const participantsRef = collection(db, PARTICIPANTS_COLLECTION)
  const participantRef = doc(participantsRef)
  await setDoc(participantRef, {
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber || '',
    gender: data.gender || '',
    age: data.age || '',
    stake: data.stake || '',
    ward: data.ward || '',
    groupId: '',
    groupName: '',
    roomId: '',
    roomNumber: '',
    checkIns: [],
    createdAt: now,
    updatedAt: now,
    searchKeys: generateSearchKeys(data.name, data.email),
    metadata: { registrationSurveyId: surveyId, personalCode }
  })

  // 2. Create survey response
  const responsesRef = collection(db, SURVEY_RESPONSES_COLLECTION)
  const responseRef = doc(responsesRef)
  await setDoc(responseRef, {
    surveyId,
    personalCode,
    participantId: participantRef.id,
    email: data.email,
    data,
    createdAt: now,
    updatedAt: now
  })

  return { personalCode, responseId: responseRef.id }
}

export const getResponseByCode = async (
  surveyId: string,
  personalCode: string
): Promise<SurveyResponse | null> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('surveyId', '==', surveyId),
    where('personalCode', '==', personalCode)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  const d = docSnap.data()
  return {
    id: docSnap.id,
    surveyId: d.surveyId,
    personalCode: d.personalCode,
    participantId: d.participantId,
    email: d.email,
    data: d.data,
    createdAt: convertTimestamp(d.createdAt),
    updatedAt: convertTimestamp(d.updatedAt)
  }
}

export const updateRegistration = async (
  responseId: string,
  participantId: string,
  data: RegistrationData
): Promise<void> => {
  const now = Timestamp.now()

  // Update survey response
  await updateDoc(doc(db, SURVEY_RESPONSES_COLLECTION, responseId), {
    data,
    email: data.email,
    updatedAt: now
  })

  // Update participant
  await updateDoc(doc(db, PARTICIPANTS_COLLECTION, participantId), {
    name: data.name,
    email: data.email,
    phoneNumber: data.phoneNumber || '',
    gender: data.gender || '',
    age: data.age || '',
    stake: data.stake || '',
    ward: data.ward || '',
    updatedAt: now,
    searchKeys: generateSearchKeys(data.name, data.email)
  })
}

export const getResponsesBySurvey = async (surveyId: string): Promise<SurveyResponse[]> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    where('surveyId', '==', surveyId),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => {
    const d = docSnap.data()
    return {
      id: docSnap.id,
      surveyId: d.surveyId,
      personalCode: d.personalCode,
      participantId: d.participantId,
      email: d.email,
      data: d.data,
      createdAt: convertTimestamp(d.createdAt),
      updatedAt: convertTimestamp(d.updatedAt)
    }
  })
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add types, survey service, and registration response service"
```

---

### Task 4: Public registration page

**Files:**
- Create: `src/pages/RegisterPage.tsx`
- Create: `src/components/RegistrationForm.tsx`
- Create: `src/pages/RegisterSuccessPage.tsx`
- Modify: `src/App.tsx`

**Step 1: Create src/components/RegistrationForm.tsx**

```tsx
import React, { useState } from 'react'
import type { RegistrationData } from '../types'

interface RegistrationFormProps {
  initialData?: RegistrationData
  onSubmit: (data: RegistrationData) => Promise<void>
  isLoading: boolean
  submitLabel: string
}

function RegistrationForm({ initialData, onSubmit, isLoading, submitLabel }: RegistrationFormProps): React.ReactElement {
  const [form, setForm] = useState<RegistrationData>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    phoneNumber: initialData?.phoneNumber || '',
    gender: initialData?.gender || '',
    age: initialData?.age || '',
    stake: initialData?.stake || '',
    ward: initialData?.ward || ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            name="age"
            value={form.age}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stake</label>
          <input
            name="stake"
            value={form.stake}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
          <input
            name="ward"
            value={form.ward}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !form.name || !form.email}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? 'Submitting...' : submitLabel}
      </button>
    </form>
  )
}

export default RegistrationForm
```

**Step 2: Create src/pages/RegisterPage.tsx**

```tsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getSurveyById } from '../services/surveys'
import { submitRegistration, getResponseByCode, updateRegistration } from '../services/responses'
import RegistrationForm from '../components/RegistrationForm'
import type { Survey, SurveyResponse } from '../types'

function RegisterPage(): React.ReactElement {
  const { surveyId } = useParams<{ surveyId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editCode = searchParams.get('code')

  const [survey, setSurvey] = useState<Survey | null>(null)
  const [existingResponse, setExistingResponse] = useState<SurveyResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return
      try {
        const s = await getSurveyById(surveyId)
        if (!s || !s.isActive) {
          setError('This survey is not available.')
          setLoading(false)
          return
        }
        setSurvey(s)

        if (editCode) {
          const resp = await getResponseByCode(surveyId, editCode)
          if (resp) {
            setExistingResponse(resp)
          } else {
            setError('Invalid personal code.')
          }
        }
      } catch {
        setError('Failed to load survey.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId, editCode])

  const handleSubmit = async (data: typeof import('../types').RegistrationData extends infer T ? T extends { name: string } ? T : never : never) => {
    if (!surveyId) return
    setSubmitting(true)
    try {
      if (existingResponse) {
        await updateRegistration(existingResponse.id, existingResponse.participantId, data)
        navigate(`/register/${surveyId}/success?code=${existingResponse.personalCode}&updated=true`)
      } else {
        const result = await submitRegistration(surveyId, data)
        navigate(`/register/${surveyId}/success?code=${result.personalCode}`)
      }
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey?.title}</h1>
          {survey?.description && (
            <p className="text-gray-600">{survey.description}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6">
          <RegistrationForm
            initialData={existingResponse?.data}
            onSubmit={handleSubmit}
            isLoading={submitting}
            submitLabel={existingResponse ? 'Update' : 'Register'}
          />
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
```

Note: The `handleSubmit` type annotation above is verbose. In practice, just use `RegistrationData` type:

```tsx
import type { RegistrationData } from '../types'
// ...
const handleSubmit = async (data: RegistrationData) => {
```

**Step 3: Create src/pages/RegisterSuccessPage.tsx**

```tsx
import React from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

function RegisterSuccessPage(): React.ReactElement {
  const { surveyId } = useParams<{ surveyId: string }>()
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  const updated = searchParams.get('updated')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {updated ? 'Updated!' : 'Registered!'}
        </h1>
        <p className="text-gray-600 mb-6">
          {updated
            ? 'Your registration has been updated successfully.'
            : 'Your registration has been submitted successfully.'}
        </p>

        {code && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700 mb-2 font-medium">Your Personal Code</p>
            <p className="text-3xl font-mono font-bold text-blue-900 tracking-wider">{code}</p>
            <p className="text-xs text-blue-600 mt-2">
              Save this code! You can use it to edit your registration later.
            </p>
          </div>
        )}

        <a
          href={`/register/${surveyId}?code=${code}`}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Edit my registration
        </a>
      </div>
    </div>
  )
}

export default RegisterSuccessPage
```

**Step 4: Update src/App.tsx with routes**

```tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import RegisterSuccessPage from './pages/RegisterSuccessPage'

function App(): React.ReactElement {
  return (
    <Routes>
      <Route path="/register/:surveyId" element={<RegisterPage />} />
      <Route path="/register/:surveyId/success" element={<RegisterSuccessPage />} />
    </Routes>
  )
}

export default App
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add public registration page with form and success screen"
```

---

### Task 5: Admin pages — auth guard, survey list, survey detail

**Files:**
- Create: `src/components/AdminAuthGuard.tsx`
- Create: `src/components/AdminLoginPage.tsx`
- Create: `src/pages/admin/SurveyListPage.tsx`
- Create: `src/pages/admin/SurveyDetailPage.tsx`
- Create: `src/components/CreateSurveyModal.tsx`
- Modify: `src/App.tsx`

**Step 1: Create src/components/AdminLoginPage.tsx**

```tsx
import React, { useState } from 'react'
import { signInWithGoogle } from '../services/firebase'

function AdminLoginPage(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
        <p className="text-gray-600 mb-6">Sign in to manage surveys</p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  )
}

export default AdminLoginPage
```

**Step 2: Create src/components/AdminAuthGuard.tsx**

```tsx
import React, { useEffect } from 'react'
import { useAtom } from 'jotai'
import { authUserAtom, authLoadingAtom } from '../stores/authStore'
import { onAuthChange } from '../services/firebase'
import AdminLoginPage from './AdminLoginPage'

function AdminAuthGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const [user, setUser] = useAtom(authUserAtom)
  const [loading, setLoading] = useAtom(authLoadingAtom)

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AdminLoginPage />

  return <>{children}</>
}

export default AdminAuthGuard
```

**Step 3: Create src/components/CreateSurveyModal.tsx**

```tsx
import React, { useState } from 'react'

interface CreateSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (title: string, description: string) => Promise<void>
}

function CreateSurveyModal({ isOpen, onClose, onCreate }: CreateSurveyModalProps): React.ReactElement | null {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setIsCreating(true)
    try {
      await onCreate(title.trim(), description.trim())
      setTitle('')
      setDescription('')
      onClose()
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create Survey</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSurveyModal
```

**Step 4: Create src/pages/admin/SurveyListPage.tsx**

```tsx
import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAtomValue } from 'jotai'
import { authUserAtom } from '../../stores/authStore'
import { getAllSurveys, createSurvey, deleteSurvey, updateSurvey } from '../../services/surveys'
import { signOut } from '../../services/firebase'
import CreateSurveyModal from '../../components/CreateSurveyModal'
import type { Survey } from '../../types'

function SurveyListPage(): React.ReactElement {
  const user = useAtomValue(authUserAtom)
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const loadSurveys = async () => {
    try {
      const data = await getAllSurveys()
      setSurveys(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSurveys() }, [])

  const handleCreate = async (title: string, description: string) => {
    await createSurvey(title, description, user?.displayName || user?.email || '')
    await loadSurveys()
  }

  const handleToggleActive = async (survey: Survey) => {
    await updateSurvey(survey.id, { isActive: !survey.isActive })
    await loadSurveys()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this survey?')) return
    await deleteSurvey(id)
    await loadSurveys()
  }

  const copyLink = (surveyId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${surveyId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 h-14 flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-600">Registration Admin</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.displayName || user?.email}</span>
          <button onClick={() => signOut()} className="text-sm text-gray-500 hover:text-gray-700">
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Surveys</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            + New Survey
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No surveys yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {surveys.map((survey) => (
              <div key={survey.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                <div className="flex-1">
                  <Link to={`/admin/survey/${survey.id}`} className="font-semibold text-gray-900 hover:text-blue-600">
                    {survey.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    {survey.isActive ? '🟢 Active' : '⏸ Inactive'} · {survey.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyLink(survey.id)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded" title="Copy link">
                    Copy Link
                  </button>
                  <button onClick={() => handleToggleActive(survey)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">
                    {survey.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(survey.id)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateSurveyModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      </main>
    </div>
  )
}

export default SurveyListPage
```

**Step 5: Create src/pages/admin/SurveyDetailPage.tsx**

```tsx
import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSurveyById } from '../../services/surveys'
import { getResponsesBySurvey } from '../../services/responses'
import type { Survey, SurveyResponse } from '../../types'

function SurveyDetailPage(): React.ReactElement {
  const { surveyId } = useParams<{ surveyId: string }>()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<SurveyResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!surveyId) return
      try {
        const [s, r] = await Promise.all([
          getSurveyById(surveyId),
          getResponsesBySurvey(surveyId)
        ])
        setSurvey(s)
        setResponses(r)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [surveyId])

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/register/${surveyId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Survey not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 h-14 flex items-center gap-4">
        <Link to="/admin" className="text-blue-600 hover:underline font-medium">← Back</Link>
        <h1 className="text-xl font-bold text-gray-900">{survey.title}</h1>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-gray-600">{survey.description || 'No description'}</p>
            <p className="text-sm text-gray-400 mt-1">
              {survey.isActive ? '🟢 Active' : '⏸ Inactive'} · {responses.length} responses
            </p>
          </div>
          <button onClick={copyLink} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            Copy Registration Link
          </button>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-4">Responses</h2>

        {responses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No responses yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ward</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((resp, index) => (
                    <tr key={resp.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{resp.data.name}</td>
                      <td className="px-4 py-3 text-gray-600">{resp.data.email}</td>
                      <td className="px-4 py-3 text-gray-600">{resp.data.phoneNumber || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{resp.data.ward || '-'}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-500">{resp.personalCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{resp.createdAt.toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SurveyDetailPage
```

**Step 6: Update src/App.tsx with admin routes**

```tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import RegisterSuccessPage from './pages/RegisterSuccessPage'
import AdminAuthGuard from './components/AdminAuthGuard'
import SurveyListPage from './pages/admin/SurveyListPage'
import SurveyDetailPage from './pages/admin/SurveyDetailPage'

function App(): React.ReactElement {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/register/:surveyId" element={<RegisterPage />} />
      <Route path="/register/:surveyId/success" element={<RegisterSuccessPage />} />

      {/* Admin routes (auth required) */}
      <Route path="/admin" element={<AdminAuthGuard><SurveyListPage /></AdminAuthGuard>} />
      <Route path="/admin/survey/:surveyId" element={<AdminAuthGuard><SurveyDetailPage /></AdminAuthGuard>} />
    </Routes>
  )
}

export default App
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add admin pages for survey management"
```

---

### Task 6: Firebase Hosting config and GitHub Actions

**Files:**
- Create: `firebase.json`
- Create: `firestore.rules`
- Create: `.firebaserc`
- Create: `.github/workflows/deploy.yml`

**Step 1: Create firebase.json**

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Note: Firestore rules are managed from the checkin project, not here. This project only needs hosting.

**Step 2: Create .firebaserc**

```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```

**Step 3: Create .github/workflows/deploy.yml**

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm exec vite build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
```

**Step 4: Update Firestore rules in checkin project**

Update `/Users/young/Documents/Workspace/checkin/firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Surveys: public read, authenticated write
    match /surveys/{surveyId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Survey responses: public create/read/update, authenticated delete
    match /survey_responses/{responseId} {
      allow create: if true;
      allow read, update: if true;
      allow delete: if request.auth != null;
    }

    // Participants: public create, authenticated for everything else
    match /participants/{participantId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // All other collections: authenticated only
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Firebase Hosting config and GitHub Actions deploy"
```

---

### Task 7: Verify build

**Step 1: Create .env with Firebase config (same values as checkin)**

**Step 2: Run dev server**

```bash
pnpm dev
```

Verify:
- `/register/some-id` shows "This survey is not available" (no survey exists yet)
- `/admin` shows Google login page
- After login, shows empty survey list
- Create a survey, copy link, open in incognito → registration form works
- Submit → success page with personal code

**Step 3: Run build**

```bash
pnpm build
```

Verify: builds without errors.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any build issues"
```
