"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeProjectStats = computeProjectStats;
exports.archiveProjectSummary = archiveProjectSummary;
const admin = __importStar(require("firebase-admin"));
// Aggregates dashboard statistics for a project. Shared by getDashboardStats and the
// pre-purge summary snapshot so both always report identical numbers.
async function computeProjectStats(db, projectId, projectData) {
    const usdToKrwRate = projectData.usdToKrwRate ??
        projectData.opsBudget?.usdToKrwRate ?? 0;
    const snap = await db
        .collection('requests')
        .where('projectId', '==', projectId)
        .select('status', 'totalAmount', 'totalAmountUsd', 'committee', 'items', 'date', 'createdAt')
        .get();
    let total = 0;
    let pending = 0;
    let reviewed = 0;
    let approvedOnly = 0;
    let settled = 0;
    let rejected = 0;
    let totalAmount = 0;
    let approvedAmount = 0;
    let approvedOnlyAmount = 0;
    let settledAmount = 0;
    let pendingAmount = 0;
    let reviewedAmount = 0;
    const byCommittee = {};
    const byBudgetCode = {};
    const monthlyTrend = {};
    const monthlyCount = {};
    const dailyTrend = {};
    const dailyCount = {};
    snap.forEach((doc) => {
        const d = doc.data();
        const status = d.status;
        // When project.opsBudget.usdToKrwRate is set, USD items are converted to KRW and
        // included in all aggregations. When unset (or 0), USD items contribute 0.
        const amount = d.totalAmount || 0;
        const amountUsd = d.totalAmountUsd || 0;
        const effectiveAmount = amount + (usdToKrwRate > 0 ? Math.round(amountUsd * usdToKrwRate) : 0);
        const committee = d.committee || 'operations';
        const items = d.items || [];
        const date = d.date || '';
        total++;
        totalAmount += effectiveAmount;
        if (status === 'pending') {
            pending++;
            pendingAmount += effectiveAmount;
        }
        else if (status === 'reviewed') {
            reviewed++;
            reviewedAmount += effectiveAmount;
        }
        else if (status === 'approved') {
            approvedOnly++;
            approvedOnlyAmount += effectiveAmount;
        }
        else if (status === 'settled') {
            settled++;
            settledAmount += effectiveAmount;
        }
        else if (status === 'rejected' || status === 'force_rejected') {
            rejected++;
        }
        const isApproved = status === 'approved' || status === 'settled';
        approvedAmount = approvedOnlyAmount + settledAmount;
        if (!byCommittee[committee])
            byCommittee[committee] = { count: 0, amount: 0, approvedAmount: 0 };
        byCommittee[committee].count++;
        byCommittee[committee].amount += effectiveAmount;
        if (isApproved)
            byCommittee[committee].approvedAmount += effectiveAmount;
        for (const item of items) {
            const code = item.budgetCode;
            if (!byBudgetCode[code])
                byBudgetCode[code] = { count: 0, amount: 0, approvedAmount: 0 };
            byBudgetCode[code].count++;
            // When project.opsBudget.usdToKrwRate is set, USD items are converted to KRW and
            // included in all aggregations. When unset (or 0), USD items contribute 0.
            const itemCurrency = item.currency || 'KRW';
            const itemEffectiveKrw = itemCurrency === 'USD'
                ? (usdToKrwRate > 0 ? Math.round(item.amount * usdToKrwRate) : 0)
                : item.amount;
            byBudgetCode[code].amount += itemEffectiveKrw;
            if (isApproved)
                byBudgetCode[code].approvedAmount += itemEffectiveKrw;
        }
        if (date) {
            const month = date.substring(0, 7);
            monthlyTrend[month] = (monthlyTrend[month] || 0) + effectiveAmount;
            dailyTrend[date] = (dailyTrend[date] || 0) + effectiveAmount;
            dailyCount[date] = (dailyCount[date] || 0) + 1;
            monthlyCount[month] = (monthlyCount[month] || 0) + 1;
        }
    });
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
    };
}
// 리포트에 보존할 항목 상세에 포함되는 상태 (프론트 BUDGET_COUNTED_STATUSES와 동일).
const SUMMARY_ITEM_STATUSES = ['reviewed', 'approved', 'settled'];
// 문서 1MB 제한을 넘지 않도록 하는 안전 상한.
const MAX_SUMMARY_ITEMS = 5000;
// 코드별 상세 목록용 항목 스냅샷. 제출자/수취인/계좌/영수증/이동 상세 등은 의도적으로 제외한다.
async function buildSummaryItems(db, projectId) {
    const snap = await db
        .collection('requests')
        .where('projectId', '==', projectId)
        .where('status', 'in', SUMMARY_ITEM_STATUSES)
        .select('status', 'committee', 'items', 'date')
        .get();
    const items = [];
    for (const doc of snap.docs) {
        const d = doc.data();
        for (const item of d.items || []) {
            items.push({
                date: d.date || '',
                committee: d.committee || 'operations',
                budgetCode: item.budgetCode,
                budgetDescKey: item.budgetDescKey ?? null,
                description: item.description ?? '',
                amount: item.amount || 0,
                currency: item.currency || 'KRW',
                status: d.status
            });
        }
    }
    items.sort((a, b) => b.date.localeCompare(a.date));
    return { items: items.slice(0, MAX_SUMMARY_ITEMS), itemsTruncated: items.length > MAX_SUMMARY_ITEMS };
}
// 대회를 삭제(soft delete)하는 즉시 버짓 리포트(대시보드 통계 + 예산 설정)를 projectSummaries에
// 저장한다. 개별 신청서/영수증/계좌 정보 등 개인 정보는 포함하지 않는다.
async function archiveProjectSummary(db, projectId, project) {
    const [stats, { items, itemsTruncated }] = await Promise.all([
        computeProjectStats(db, projectId, project),
        buildSummaryItems(db, projectId)
    ]);
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
        items,
        itemsTruncated,
        archivedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}
//# sourceMappingURL=projectSummary.js.map