import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UNIQUE_BUDGET_CODES } from '../../constants/budgetCodes'
import { useUpdateProject } from '../../hooks/queries/useProjects'

interface BudgetConfig {
  totalBudget: number
  byCode: Record<number, number>
}

export default function BudgetSettingsSection({
  project
}: {
  project: { id: string; budgetConfig: BudgetConfig; documentNo: string }
}) {
  const { t } = useTranslation()
  const updateProject = useUpdateProject()
  const budget = project.budgetConfig ?? { totalBudget: 0, byCode: {} }
  const docNo = project.documentNo ?? ''

  const [editingBudget, setEditingBudget] = useState(false)
  const [tempBudget, setTempBudget] = useState<BudgetConfig>(budget)
  const [savingBudget, setSavingBudget] = useState(false)
  const [editingDocNo, setEditingDocNo] = useState(false)
  const [tempDocNo, setTempDocNo] = useState(docNo)
  const [savingDocNo, setSavingDocNo] = useState(false)

  const handleSaveBudget = () => {
    setSavingBudget(true)
    updateProject.mutate(
      { projectId: project.id, data: { budgetConfig: tempBudget } },
      {
        onSuccess: () => {
          setEditingBudget(false)
          setSavingBudget(false)
        },
        onError: () => {
          setSavingBudget(false)
        }
      }
    )
  }

  const handleSaveDocNo = () => {
    setSavingDocNo(true)
    updateProject.mutate(
      { projectId: project.id, data: { documentNo: tempDocNo } },
      {
        onSuccess: () => {
          setEditingDocNo(false)
          setSavingDocNo(false)
        },
        onError: () => {
          setSavingDocNo(false)
        }
      }
    )
  }

  return (
    <>
      <div className="finance-panel rounded-lg p-4 sm:p-6">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[#002C5F]">{t('dashboard.budgetSettings')}</h3>
          {!editingBudget ? (
            <button
              onClick={() => {
                setTempBudget(budget)
                setEditingBudget(true)
              }}
              className="text-sm text-[#002C5F] hover:text-[#001F43]"
            >
              {t('common.edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingBudget(false)}
                className="text-sm text-[#667085] hover:text-[#111827]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveBudget}
                disabled={savingBudget}
                className="finance-primary-button text-sm px-3 py-1 rounded disabled:bg-gray-400"
              >
                {savingBudget ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm text-[#667085] mb-1">{t('dashboard.totalBudget')}</label>
          {editingBudget ? (
            <input
              type="number"
              value={tempBudget.totalBudget || ''}
              onChange={(e) =>
                setTempBudget({
                  ...tempBudget,
                  totalBudget: parseInt(e.target.value) || 0
                })
              }
              className="border border-[#D8DDE5] rounded px-3 py-2 text-sm w-full sm:w-48 focus:border-[#002C5F] focus:outline-none"
              placeholder="0"
            />
          ) : (
            <p className="text-sm font-medium">
              {'\u20A9'}
              {budget.totalBudget.toLocaleString()}
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-sm">
            <thead className="border-b border-[#D8DDE5] bg-[#F8FAFC]">
              <tr>
                <th className="text-left py-2">Code</th>
                <th className="text-left py-2">{t('field.comments')}</th>
                <th className="text-right py-2">{t('dashboard.allocatedBudget')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF0F4]">
              {UNIQUE_BUDGET_CODES.map((code) => (
                <tr key={code}>
                  <td className="py-2 font-mono">{code}</td>
                  <td className="py-2 text-[#667085]">{t(`budgetCode.${code}`)}</td>
                  <td className="py-2 text-right">
                    {editingBudget ? (
                      <input
                        type="number"
                        value={tempBudget.byCode[code] || ''}
                        onChange={(e) =>
                          setTempBudget({
                            ...tempBudget,
                            byCode: {
                              ...tempBudget.byCode,
                              [code]: parseInt(e.target.value) || 0
                            }
                          })
                        }
                        className="border border-[#D8DDE5] rounded px-2 py-1 text-sm w-full sm:w-36 text-right focus:border-[#002C5F] focus:outline-none"
                        placeholder="0"
                      />
                    ) : (
                      <span>
                        {budget.byCode[code]
                          ? `\u20A9${budget.byCode[code].toLocaleString()}`
                          : '-'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {(() => {
              const cb = editingBudget ? tempBudget : budget
              const codeTotal = Object.values(cb.byCode).reduce((s, v) => s + (v || 0), 0)
              const diff = codeTotal - cb.totalBudget
              const hasTotal = cb.totalBudget > 0
              return (
                <tfoot className="border-t border-[#D8DDE5]">
                  <tr>
                    <td colSpan={2} className="py-2 text-right font-medium">
                      {t('dashboard.codeTotal')}
                    </td>
                    <td className="py-2 text-right font-bold">
                      {'\u20A9'}
                      {codeTotal.toLocaleString()}
                    </td>
                  </tr>
                  {hasTotal && diff !== 0 && (
                    <tr>
                      <td colSpan={2} className="py-2 text-right font-medium">
                        {t('dashboard.difference')}
                      </td>
                      <td
                        className={`py-2 text-right font-bold ${diff > 0 ? 'text-[#A43F3F]' : 'text-[#007FA8]'}`}
                      >
                        {diff > 0 ? '+' : ''}
                        {`\u20A9${diff.toLocaleString()}`}
                      </td>
                    </tr>
                  )}
                  {hasTotal && diff === 0 && (
                    <tr>
                      <td colSpan={2} className="py-2 text-right font-medium">
                        {t('dashboard.difference')}
                      </td>
                      <td className="py-2 text-right font-bold text-[#007FA8]">{'\u20A9'}0</td>
                    </tr>
                  )}
                </tfoot>
              )
            })()}
          </table>
        </div>
      </div>
      <div className="finance-panel rounded-lg p-4 mt-6 sm:p-6">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[#002C5F]">
            {t('dashboard.documentNoSettings')}
          </h3>
          {!editingDocNo ? (
            <button
              onClick={() => {
                setTempDocNo(docNo)
                setEditingDocNo(true)
              }}
              className="text-sm text-[#002C5F] hover:text-[#001F43]"
            >
              {t('common.edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditingDocNo(false)}
                className="text-sm text-[#667085] hover:text-[#111827]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSaveDocNo}
                disabled={savingDocNo}
                className="finance-primary-button text-sm px-3 py-1 rounded disabled:bg-gray-400"
              >
                {savingDocNo ? t('common.saving') : t('common.save')}
              </button>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm text-[#667085] mb-1">{t('dashboard.documentNo')}</label>
          {editingDocNo ? (
            <input
              type="text"
              value={tempDocNo}
              onChange={(e) => setTempDocNo(e.target.value)}
              className="border border-[#D8DDE5] rounded px-3 py-2 text-sm w-full font-mono focus:border-[#002C5F] focus:outline-none"
              placeholder="KOR01-6762808-5xxx-KYSA2025KOR"
            />
          ) : (
            <p className="text-sm font-mono font-medium">{docNo || t('dashboard.notSet')}</p>
          )}
          <p className="text-xs text-[#667085] mt-1">{t('dashboard.documentNoHint')}</p>
        </div>
      </div>
    </>
  )
}
