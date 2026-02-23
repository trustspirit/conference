import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import { addToastAtom } from '../../stores/toastStore'
import { getAdmins, addAdmin, removeAdmin, type AdminEntry } from '../../services/admins'
import { Button, Input, Spinner } from '../../components/ui'
import AdminNavbar from '../../components/admin/AdminNavbar'

function AdminManagePage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToast = useSetAtom(addToastAtom)
  const [admins, setAdmins] = useState<AdminEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  const load = async () => {
    try {
      const list = await getAdmins()
      setAdmins(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    try {
      await addAdmin(email)
      setEmail('')
      await load()
      addToast({ message: t('adminManage.added'), type: 'success' })
    } catch {
      addToast({ message: t('adminManage.addFailed'), type: 'error' })
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (adminEmail: string) => {
    if (!confirm(t('adminManage.removeConfirm', { email: adminEmail }))) return
    await removeAdmin(adminEmail)
    await load()
    addToast({ message: t('adminManage.removed'), type: 'success' })
  }

  if (loading) return <Spinner />

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />

      <main className="max-w-lg mx-auto p-6 space-y-6">
        {/* Add admin */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('adminManage.addTitle')}</h2>
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('adminManage.emailPlaceholder')}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !email.trim()}>
              {adding ? t('common.loading') : t('adminManage.add')}
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-2">{t('adminManage.addHint')}</p>
        </div>

        {/* Admin list */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            {t('adminManage.listTitle')} ({admins.length})
          </h2>
          {admins.length === 0 ? (
            <p className="text-sm text-gray-400">{t('adminManage.noAdmins')}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <li key={admin.email} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-700">{admin.email}</span>
                  <Button variant="danger" size="sm" onClick={() => handleRemove(admin.email)}>
                    {t('common.delete')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminManagePage
