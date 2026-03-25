import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useAuth } from '../contexts/AuthContext'
import { useAllItems, useMoveItems } from '../hooks/queries/useItems'
import { useProjects } from '../hooks/queries/useProjects'
import { InventoryItem } from '../types'
import Spinner from '../components/Spinner'

export default function DanglingPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { data: allItems = [], isLoading: itemsLoading } = useAllItems()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const moveItems = useMoveItems()

  const [reassignTarget, setReassignTarget] = useState<Record<string, string>>({})

  const now = useMemo(() => new Date(), [])

  const { activeProjectIds, expiredProjects } = useMemo(() => {
    const active = projects.filter((p) => now >= p.startDate && now <= p.endDate).map((p) => p.id)
    const expired = projects.filter((p) => now > p.endDate)
    return { activeProjectIds: new Set(active), expiredProjects: expired }
  }, [projects, now])

  const danglingItems = useMemo(() => {
    return allItems.filter((item) => {
      const hasExpiredProject = item.projectIds.some((pid) => {
        const proj = projects.find((p) => p.id === pid)
        return proj && now > proj.endDate
      })
      const hasActiveProject = item.projectIds.some((pid) => activeProjectIds.has(pid))
      return hasExpiredProject && !hasActiveProject
    })
  }, [allItems, projects, activeProjectIds, now])

  const activeProjects = useMemo(
    () => projects.filter((p) => now >= p.startDate && now <= p.endDate),
    [projects, now]
  )

  const handleReassign = (item: InventoryItem) => {
    const targetId = reassignTarget[item.id]
    if (!targetId || !appUser) return
    moveItems.mutate(
      {
        itemIds: [item.id],
        targetProjectId: targetId,
        editor: { uid: appUser.uid, name: appUser.name, email: appUser.email }
      },
      {
        onSuccess: () => {
          toast({ variant: 'success', message: t('items.itemsMoved') })
          setReassignTarget((prev) => {
            const next = { ...prev }
            delete next[item.id]
            return next
          })
        }
      }
    )
  }

  if (itemsLoading || projectsLoading) return <Spinner />

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dangling.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('dangling.description')}</p>
      </div>

      {danglingItems.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-gray-500">{t('dangling.noItems')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-600">{t('items.name')}</th>
                <th className="px-4 py-3 font-semibold text-gray-600">{t('items.stock')}</th>
                <th className="px-4 py-3 font-semibold text-gray-600">{t('items.location')}</th>
                <th className="px-4 py-3 font-semibold text-gray-600">
                  {t('dangling.pastProject')}
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600">{t('dangling.reassign')}</th>
              </tr>
            </thead>
            <tbody>
              {danglingItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                  <td className="px-4 py-3">{item.stock}</td>
                  <td className="px-4 py-3 text-gray-600">{item.location}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.projectIds.map((pid) => {
                        const proj = projects.find((p) => p.id === pid)
                        const isExpired = proj && now > proj.endDate
                        return (
                          <span
                            key={pid}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              isExpired ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {proj?.name || pid.slice(0, 6)}
                          </span>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={reassignTarget[item.id] || ''}
                        onChange={(e) =>
                          setReassignTarget((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      >
                        <option value="">{t('items.moveToProject')}</option>
                        {activeProjects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleReassign(item)}
                        disabled={!reassignTarget[item.id]}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {t('dangling.reassign')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('projects.active')}</h3>
          <div className="space-y-1">
            {activeProjects.map((p) => (
              <div key={p.id} className="text-sm text-gray-600">
                {p.name}{' '}
                <span className="text-xs text-gray-400">
                  ({p.startDate.toLocaleDateString()} ~ {p.endDate.toLocaleDateString()})
                </span>
              </div>
            ))}
            {activeProjects.length === 0 && <p className="text-xs text-gray-400">—</p>}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('projects.expired')}</h3>
          <div className="space-y-1">
            {expiredProjects.map((p) => (
              <div key={p.id} className="text-sm text-gray-500">
                {p.name}{' '}
                <span className="text-xs text-gray-400">
                  ({p.startDate.toLocaleDateString()} ~ {p.endDate.toLocaleDateString()})
                </span>
              </div>
            ))}
            {expiredProjects.length === 0 && <p className="text-xs text-gray-400">—</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
