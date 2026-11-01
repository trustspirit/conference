import { TextField } from 'trust-ui-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UNIQUE_BUDGET_CODES } from '../../constants/budgetCodes'
import type { ArchivedSummaryItem } from '../../hooks/queries/useProjects'
import StatusBadge from '../StatusBadge'
import { DASHBOARD_PAGE_SIZE, LoadMoreButton } from './listPaging'
import type { RequestStatus } from '../../types'

interface Props {
  items: ArchivedSummaryItem[]
  truncated?: boolean
  usdToKrwRate: number
}

/** 보존된 리포트의 코드별 상세 목록. 제출자·영수증 없이 지출 목적(품목 설명) 중심으로 보여준다. */
export default function ArchivedItemList({ items, truncated, usdToKrwRate }: Props) {
  const { t } = useTranslation()
  const [code, setCode] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [visible, setVisible] = useState(DASHBOARD_PAGE_SIZE)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(
      (i) =>
        (code === 'all' || i.budgetCode === code) &&
        (!q || (i.description ?? '').toLowerCase().includes(q))
    )
  }, [items, code, search])

  const rows = filtered.slice(0, visible)

  const renderAmount = (i: ArchivedSummaryItem) => {
    if (i.currency !== 'USD') return `₩${i.amount.toLocaleString('en-US')}`
    const usd = `$${i.amount.toLocaleString('en-US')} USD`
    return usdToKrwRate > 0
      ? `₩${Math.round(i.amount * usdToKrwRate).toLocaleString('en-US')} (${usd})`
      : usd
  }

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
      active
        ? 'bg-finance-primary text-white'
        : 'text-finance-muted hover:bg-finance-border-soft border border-finance-border-soft'
    }`

  return (
    <section className="finance-panel rounded-lg mb-6 p-4">
      <h3 className="text-sm font-semibold text-finance-primary mb-3">
        {t('archive.itemList.title')}
      </h3>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          className={chip(code === 'all')}
          onClick={() => {
            setCode('all')
            setVisible(DASHBOARD_PAGE_SIZE)
          }}
        >
          {t('dashboard.budgetCodeItemList.filterAll')}
        </button>
        {UNIQUE_BUDGET_CODES.map((c) => (
          <button
            key={c}
            className={chip(code === c)}
            onClick={() => {
              setCode(c)
              setVisible(DASHBOARD_PAGE_SIZE)
            }}
          >
            {c} · {t(`budgetCode.${c}`)}
          </button>
        ))}
      </div>
      <TextField
        size="sm"
        fullWidth
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setVisible(DASHBOARD_PAGE_SIZE)
        }}
        placeholder={t('archive.itemList.searchPlaceholder')}
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-finance-muted py-8 text-center">{t('common.noData')}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-finance-muted border-b border-finance-border-soft text-xs">
                  <th className="px-2 py-2 font-medium">{t('archive.itemList.date')}</th>
                  <th className="px-2 py-2 font-medium">{t('archive.itemList.committee')}</th>
                  <th className="px-2 py-2 font-medium">{t('archive.itemList.code')}</th>
                  <th className="px-2 py-2 font-medium">{t('archive.itemList.purpose')}</th>
                  <th className="px-2 py-2 font-medium text-right">{t('archive.itemList.amount')}</th>
                  <th className="px-2 py-2 font-medium">{t('archive.itemList.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i, idx) => (
                  <tr key={idx} className="border-b border-finance-border-soft align-top">
                    <td className="px-2 py-2 whitespace-nowrap">{i.date}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{t(`committee.${i.committee}`)}</td>
                    <td className="px-2 py-2">
                      <div className="font-semibold text-xs">
                        {i.budgetCode} · {t(`budgetCode.${i.budgetCode}`)}
                      </div>
                      {i.budgetDescKey && (
                        <div className="text-[11px] text-finance-muted">
                          {t(`budgetCode.items.${i.budgetDescKey}`)}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 min-w-[12rem]">{i.description}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap font-mono">
                      {renderAmount(i)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={i.status as RequestStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > rows.length && (
            <LoadMoreButton
              remaining={filtered.length - rows.length}
              onClick={() => setVisible((v) => v + DASHBOARD_PAGE_SIZE)}
            />
          )}
        </>
      )}
      {truncated && (
        <p className="text-xs text-finance-muted mt-3">{t('archive.itemList.truncated')}</p>
      )}
    </section>
  )
}
