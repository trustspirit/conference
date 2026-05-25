import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { effectiveSystemRole } from '../hooks/useProjectRole'
import UnassignedUsersTab from '../components/SuperAdminUsersPage/UnassignedUsersTab'
import AllUsersTab from '../components/SuperAdminUsersPage/AllUsersTab'

export default function SuperAdminUsersPage() {
  const { appUser } = useAuth()
  const [tab, setTab] = useState<'unassigned' | 'all'>('unassigned')
  if (effectiveSystemRole(appUser) !== 'super_admin') return <Navigate to="/" replace />
  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Super Admin · Users</h1>
      <div className="border-b mb-4 flex gap-4">
        <button onClick={() => setTab('unassigned')} className={tab === 'unassigned' ? 'font-bold' : ''}>미할당 사용자</button>
        <button onClick={() => setTab('all')} className={tab === 'all' ? 'font-bold' : ''}>전체 사용자</button>
      </div>
      {tab === 'unassigned' ? <UnassignedUsersTab /> : <AllUsersTab />}
    </div>
  )
}
