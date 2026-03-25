import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from 'trust-ui-react'
import { useAuth } from '../contexts/AuthContext'
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject
} from '../hooks/queries/useProjects'
import { Project } from '../types'
import Spinner from '../components/Spinner'

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { appUser } = useAuth()
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  })

  const now = new Date()

  const getStatus = (p: Project) => {
    if (now < p.startDate) return 'upcoming'
    if (now > p.endDate) return 'expired'
    return 'active'
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-gray-100 text-gray-500',
      upcoming: 'bg-blue-100 text-blue-700'
    }
    return styles[status] || ''
  }

  const openCreate = () => {
    setEditingProject(null)
    setForm({ name: '', description: '', startDate: '', endDate: '' })
    setShowForm(true)
  }

  const openEdit = (p: Project) => {
    setEditingProject(p)
    setForm({
      name: p.name,
      description: p.description,
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate.toISOString().slice(0, 10)
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.startDate || !form.endDate || !appUser) return
    try {
      if (editingProject) {
        await updateProject.mutateAsync({
          id: editingProject.id,
          name: form.name,
          description: form.description,
          startDate: new Date(form.startDate),
          endDate: new Date(form.endDate)
        })
      } else {
        await createProject.mutateAsync({
          name: form.name,
          description: form.description,
          startDate: new Date(form.startDate),
          endDate: new Date(form.endDate),
          createdBy: { uid: appUser.uid, name: appUser.name, email: appUser.email },
          isActive: true
        })
      }
      toast({ variant: 'success', message: t('projects.projectSaved') })
      setShowForm(false)
    } catch {
      toast({ variant: 'danger', message: 'Failed to save project' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('projects.deleteProject') + '?')) return
    try {
      await deleteProject.mutateAsync(id)
      toast({ variant: 'success', message: t('projects.projectDeleted') })
    } catch {
      toast({ variant: 'danger', message: 'Failed to delete' })
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('projects.title')}</h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('projects.addProject')}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const status = getStatus(p)
          return (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="mb-3 flex items-start justify-between">
                <h3 className="font-semibold text-gray-900">{p.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(status)}`}
                >
                  {t(`projects.${status}`)}
                </span>
              </div>
              {p.description && <p className="mb-3 text-sm text-gray-500">{p.description}</p>}
              <div className="mb-4 text-xs text-gray-400">
                {t('projects.period')}: {p.startDate.toLocaleDateString()} ~{' '}
                {p.endDate.toLocaleDateString()}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('projects.editProject')}
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  {t('projects.deleteProject')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {projects.length === 0 && (
        <div className="py-16 text-center text-sm text-gray-400">{t('projects.noProjects')}</div>
      )}

      {/* Form dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-5 text-lg font-bold text-gray-900">
              {editingProject ? t('projects.editProject') : t('projects.addProject')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('projects.name')}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('projects.description')}
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('projects.startDate')}
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('projects.endDate')}
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('projects.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.startDate || !form.endDate}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {t('projects.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
