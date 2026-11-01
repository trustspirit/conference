import * as admin from 'firebase-admin'

// Aggregates dashboard statistics for a project. Shared by getDashboardStats and the
// pre-purge summary snapshot so both always report identical numbers.
export async function computeProjectStats(
  db: admin.firestore.Firestore,
  projectId: string,
  projectData: admin.firestore.DocumentData
) {
  const usdToKrwRate =
    (projectData.usdToKrwRate as number | undefined) ??
    (projectData.opsBudget?.usdToKrwRate as number | undefined) ?? 0

  const snap = await db
    .collection('requests')
    .where('projectId', '==', projectId)
    .select('status', 'totalAmount', 'totalAmountUsd', 'committee', 'items', 'date', 'createdAt')
    .get()

  let total = 0
  let pending = 0
  let reviewed = 0
  let approvedOnly = 0
  let settled = 0
  let rejected = 0
  let totalAmount = 0
  let approvedAmount = 0
  let approvedOnlyAmount = 0
  let settledAmount = 0
  let pendingAmount = 0
  let reviewedAmount = 0
  const byCommittee: Record<string, { count: number; amount: number; approvedAmount: number }> = {}
  const byBudgetCode: Record<number, { count: number; amount: number; approvedAmount: number }> = {}
  const monthlyTrend: Record<string, number> = {}
  const monthlyCount: Record<string, number> = {}
  const dailyTrend: Record<string, number> = {}
  const dailyCount: Record<string, number> = {}

  snap.forEach((doc) => {
    const d = doc.data()
    const status = d.status as string
    // When project.opsBudget.usdToKrwRate is set, USD items are converted to KRW and
    // included in all aggregations. When unset (or 0), USD items contribute 0.
    const amount = (d.totalAmount as number) || 0
    const amountUsd = (d.totalAmountUsd as number) || 0
    const effectiveAmount = amount + (usdToKrwRate > 0 ? Math.round(amountUsd * usdToKrwRate) : 0)
    const committee = (d.committee as string) || 'operations'
    const items = (d.items as { budgetCode: number; amount: number; currency?: string }[]) || []
    const date = (d.date as string) || ''

    total++
    totalAmount += effectiveAmount

    if (status === 'pending') { pending++; pendingAmount += effectiveAmount }
    else if (status === 'reviewed') { reviewed++; reviewedAmount += effectiveAmount }
    else if (status === 'approved') { approvedOnly++; approvedOnlyAmount += effectiveAmount }
    else if (status === 'settled') { settled++; settledAmount += effectiveAmount }
    else if (status === 'rejected' || status === 'force_rejected') { rejected++ }

    const isApproved = status === 'approved' || status === 'settled'
    approvedAmount = approvedOnlyAmount + settledAmount

    if (!byCommittee[committee]) byCommittee[committee] = { count: 0, amount: 0, approvedAmount: 0 }
    byCommittee[committee].count++
    byCommittee[committee].amount += effectiveAmount
    if (isApproved) byCommittee[committee].approvedAmount += effectiveAmount

    for (const item of items) {
      const code = item.budgetCode
      if (!byBudgetCode[code]) byBudgetCode[code] = { count: 0, amount: 0, approvedAmount: 0 }
      byBudgetCode[code].count++
      // When project.opsBudget.usdToKrwRate is set, USD items are converted to KRW and
      // included in all aggregations. When unset (or 0), USD items contribute 0.
      const itemCurrency = item.currency || 'KRW'
      const itemEffectiveKrw =
        itemCurrency === 'USD'
          ? (usdToKrwRate > 0 ? Math.round(item.amount * usdToKrwRate) : 0)
          : item.amount
      byBudgetCode[code].amount += itemEffectiveKrw
      if (isApproved) byBudgetCode[code].approvedAmount += itemEffectiveKrw
    }

    if (date) {
      const month = date.substring(0, 7)
      monthlyTrend[month] = (monthlyTrend[month] || 0) + effectiveAmount
      dailyTrend[date] = (dailyTrend[date] || 0) + effectiveAmount
      dailyCount[date] = (dailyCount[date] || 0) + 1
      monthlyCount[month] = (monthlyCount[month] || 0) + 1
    }
  })

  return {
    total,
    pending,
    reviewed,
    approvedOnly,
    settled,
    rejected,
    totalAmount,
    approvedAmount,
    approvedOnlyAmount,
    settledAmount,
    pendingAmount,
    reviewedAmount,
    byCommittee,
    byBudgetCode,
    monthlyTrend,
    monthlyCount,
    dailyTrend,
    dailyCount,
    usdToKrwRate
  }
}

// 대회를 삭제(soft delete)하는 즉시 버짓 리포트(대시보드 통계 + 예산 설정)를 projectSummaries에
// 저장한다. 개별 신청서/영수증/계좌 정보 등 개인 정보는 포함하지 않는다.
export async function archiveProjectSummary(
  db: admin.firestore.Firestore,
  projectId: string,
  project: admin.firestore.DocumentData
) {
  const stats = await computeProjectStats(db, projectId, project)
  await db.doc(`projectSummaries/${projectId}`).set({
    projectId,
    name: project.name ?? '',
    description: project.description ?? '',
    documentNo: project.documentNo ?? '',
    projectCreatedAt: project.createdAt ?? null,
    projectDeletedAt: project.deletedAt ?? null,
    budgetConfig: project.budgetConfig ?? null,
    opsBudget: project.opsBudget ?? null,
    memberAdminUids: Object.entries(project.memberRoles ?? {})
      .filter(([, role]) => role === 'admin')
      .map(([uid]) => uid),
    stats,
    archivedAt: admin.firestore.FieldValue.serverTimestamp()
  })
}

