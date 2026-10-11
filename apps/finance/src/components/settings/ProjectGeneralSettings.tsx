import { Button, TextField, Select } from 'trust-ui-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Project, ReceiptDisplaySize } from '../../types'
import { useUpdateProject } from '../../hooks/queries/useProjects'
import { DEFAULT_PER_KM_RATE } from '../ItemRow'
import { DEFAULT_RECEIPT_DISPLAY_SIZE } from '../../lib/receiptDisplaySize'

export default function ProjectGeneralSettings({ project }: { project: Project }) {
  const { t } = useTranslation()

  const [name, setName] = useState(project.name || '')
  const [description, setDescription] = useState(project.description || '')
  const [documentNo, setDocumentNo] = useState(project.documentNo || '')
  const [threshold, setThreshold] = useState(project.directorApprovalThreshold ?? 600000)
  const [warningPct, setWarningPct] = useState(project.budgetWarningThreshold ?? 85)
  const [perKmRate, setPerKmRate] = useState(project.perKmRate ?? DEFAULT_PER_KM_RATE)
  const [ccReportTitle, setCcReportTitle] = useState(project.corporateCardReportTitle || '')
  const [receiptSize, setReceiptSize] = useState<ReceiptDisplaySize>(
    project.defaultReceiptDisplaySize ?? DEFAULT_RECEIPT_DISPLAY_SIZE
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const updateProject = useUpdateProject()

  const dirty =
    name !== (project.name || '') ||
    description !== (project.description || '') ||
    documentNo !== (project.documentNo || '') ||
    threshold !== (project.directorApprovalThreshold ?? 600000) ||
    warningPct !== (project.budgetWarningThreshold ?? 85) ||
    perKmRate !== (project.perKmRate ?? DEFAULT_PER_KM_RATE) ||
    ccReportTitle !== (project.corporateCardReportTitle || '') ||
    receiptSize !== (project.defaultReceiptDisplaySize ?? DEFAULT_RECEIPT_DISPLAY_SIZE)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        data: {
          name,
          description,
          documentNo,
          directorApprovalThreshold: threshold,
          budgetWarningThreshold: warningPct,
          perKmRate,
          ...(ccReportTitle ? { corporateCardReportTitle: ccReportTitle } : {}),
          defaultReceiptDisplaySize: receiptSize
        }
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('project.name')}</label>
        <TextField
          size="sm"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('project.description')}</label>
        <TextField
          size="sm"
          fullWidth
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('dashboard.documentNo')}</label>
        <TextField
          size="sm"
          fullWidth
          value={documentNo}
          onChange={(e) => setDocumentNo(e.target.value)}
          className="font-mono"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('project.directorThreshold')}</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">₩</span>
          <TextField
            size="sm"
            fullWidth
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value) || 0)}
            step="10000"
            min="0"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('project.directorThresholdHint')}</p>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('budget.warningThreshold')}</label>
        <div className="flex items-center gap-2">
          <TextField
            size="sm"
            fullWidth
            type="number"
            value={warningPct}
            onChange={(e) => setWarningPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            step="5"
            min="0"
            max="100"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('budget.warningThresholdHint')}</p>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('project.perKmRate')}</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">₩</span>
          <TextField
            size="sm"
            fullWidth
            type="number"
            value={perKmRate}
            onChange={(e) => setPerKmRate(Number(e.target.value) || 0)}
            step="10"
            min="0"
          />
          <span className="text-sm text-gray-500 whitespace-nowrap">/ km</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('project.perKmRateHint')}</p>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          {t('project.corporateCardReportTitle')}
        </label>
        <TextField
          size="sm"
          fullWidth
          value={ccReportTitle}
          onChange={(e) => setCcReportTitle(e.target.value)}
          placeholder={t('settlement.corporateCardReport')}
        />
        <p className="text-xs text-gray-400 mt-1">{t('project.corporateCardReportTitleHint')}</p>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('project.defaultReceiptSize')}</label>
        <Select
          size="sm"
          fullWidth
          options={[
            { value: 'normal', label: t('project.receiptSizeNormal') },
            { value: 'large', label: t('project.receiptSizeLarge') }
          ]}
          value={receiptSize}
          onChange={(v) => setReceiptSize(v as ReceiptDisplaySize)}
        />
        <p className="text-xs text-gray-400 mt-1">{t('project.defaultReceiptSizeHint')}</p>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        {saved && <span className="finance-success-text text-xs">{t('common.saved')}</span>}
      </div>
    </div>
  )
}
