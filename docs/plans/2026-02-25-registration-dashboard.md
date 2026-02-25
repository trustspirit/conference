# Registration Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add statistics dashboards to the registration admin — a global overview on the survey list page, and per-survey field-level analytics on the survey detail page.

**Architecture:** Two new components (`DashboardOverview` and `SurveyStats`) render chart.js visualizations from existing `Survey` and `SurveyResponse` data already fetched by the parent pages. A shared utility `statsUtils.ts` computes aggregations. No new API calls or Firestore queries needed.

**Tech Stack:** chart.js 4.x, react-chartjs-2 5.x (same as checkin app), existing Tailwind CSS styling patterns.

---

### Task 1: Install chart.js dependencies

**Files:**
- Modify: `apps/registration/package.json`

**Step 1: Install packages**

Run: `cd /Users/young/Documents/Workspace/conference && pnpm add chart.js react-chartjs-2 --filter=@conference/registration`

**Step 2: Verify build**

Run: `pnpm turbo build --filter=@conference/registration`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add apps/registration/package.json pnpm-lock.yaml
git commit -m "feat(registration): add chart.js dependencies for dashboard"
```

---

### Task 2: Create stats utility functions

**Files:**
- Create: `apps/registration/src/utils/statsUtils.ts`

This utility takes `SurveyResponse[]` and `SurveyField[]` and produces chart-ready data structures.

**Functions to implement:**

```typescript
import type { SurveyField, SurveyResponse } from '../types'

/** Count responses per day for the last N days */
export function getDailyRegistrationCounts(
  responses: SurveyResponse[],
  days: number
): { labels: string[]; data: number[] }

/** Count option frequency for radio/dropdown fields */
export function getOptionDistribution(
  responses: SurveyResponse[],
  fieldId: string,
  options: string[]
): { labels: string[]; data: number[] }

/** Count checkbox multi-select frequencies */
export function getCheckboxDistribution(
  responses: SurveyResponse[],
  fieldId: string,
  options: string[]
): { labels: string[]; data: number[] }

/** Get linear scale distribution and average */
export function getScaleDistribution(
  responses: SurveyResponse[],
  fieldId: string,
  min: number,
  max: number
): { labels: string[]; data: number[]; average: number }

/** Get church_info stake distribution */
export function getStakeDistribution(
  responses: SurveyResponse[],
  fieldId: string
): { labels: string[]; data: number[] }

/** Collect text responses for short_text/long_text */
export function getTextResponses(
  responses: SurveyResponse[],
  fieldId: string
): string[]

/** Get today's response count */
export function getTodayCount(responses: SurveyResponse[]): number

/** Get chartable fields (exclude section, date, time, short_text, long_text) */
export function getChartableFields(fields: SurveyField[]): SurveyField[]

/** Get text fields (short_text, long_text) */
export function getTextFields(fields: SurveyField[]): SurveyField[]
```

**Implementation details:**
- `getDailyRegistrationCounts`: iterate responses, bucket by `createdAt.toLocaleDateString()`, fill missing days with 0
- `getOptionDistribution`: count occurrences of each option value in `response.data[fieldId]`
- `getCheckboxDistribution`: same but handle arrays (checkbox values are `string[]`)
- `getScaleDistribution`: create buckets for min..max, count occurrences, compute average
- `getStakeDistribution`: extract `stake` from `response.data[fieldId]` (which is `{stake, ward}` object), count by stake
- `getTextResponses`: collect non-empty string values, most recent first
- `getTodayCount`: count responses where `createdAt` is today

**Step 1: Create file with all functions**

**Step 2: Verify build**

Run: `pnpm turbo build --filter=@conference/registration`

**Step 3: Commit**

```bash
git add apps/registration/src/utils/statsUtils.ts
git commit -m "feat(registration): add stats utility functions for dashboard"
```

---

### Task 3: Create KPI card component

**Files:**
- Create: `apps/registration/src/components/admin/StatCard.tsx`

A simple card showing a number with a label. Reuse across both dashboards.

```tsx
interface StatCardProps {
  label: string
  value: number | string
  icon?: React.ReactNode
  color?: string // tailwind color class like 'text-blue-600'
}
```

Style: white bg, rounded-xl, shadow-sm, border. Number is large (text-3xl font-bold), label is small text-sm text-gray-500 below.

**Step 1: Create component**

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add apps/registration/src/components/admin/StatCard.tsx
git commit -m "feat(registration): add StatCard component"
```

---

### Task 4: Create DashboardOverview component (global summary)

**Files:**
- Create: `apps/registration/src/components/admin/DashboardOverview.tsx`

**Props:**
```typescript
interface DashboardOverviewProps {
  surveys: Survey[]
  responseCounts: Record<string, number>  // surveyId -> count
}
```

**Layout:**
1. **KPI row** (4 StatCards): Total Surveys, Total Responses, Active Surveys, Today's Responses
2. **Daily trend** (Line chart): Last 14 days combined registration counts
3. **Per-survey comparison** (Horizontal bar chart): Response count per survey

**Chart.js setup:** Register required chart components (CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend) at module level.

**Note:** This component needs response counts AND the daily data. The parent (`SurveyListPage`) currently only fetches surveys. We'll need to add a lightweight query to get response counts — add a new service function `getResponseCountsBySurvey()` that fetches all responses grouped by surveyId. Alternatively, fetch all responses and group client-side (simpler since the data set is small for a conference).

**Step 1: Create component**

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add apps/registration/src/components/admin/DashboardOverview.tsx
git commit -m "feat(registration): add DashboardOverview component"
```

---

### Task 5: Create SurveyStats component (per-survey analytics)

**Files:**
- Create: `apps/registration/src/components/admin/SurveyStats.tsx`

**Props:**
```typescript
interface SurveyStatsProps {
  survey: Survey
  responses: SurveyResponse[]
}
```

**Layout:**
1. **KPI row**: Total Responses, Today, (Average per day if > 7 days of data)
2. **Daily registration trend**: Line chart
3. **Field-by-field charts** (auto-generated based on field type):
   - `radio` / `dropdown` → Pie chart (or Doughnut if > 6 options)
   - `checkbox` → Horizontal bar chart
   - `linear_scale` → Vertical bar chart + average indicator
   - `church_info` → Doughnut chart (stake distribution)
   - `short_text` / `long_text` → Scrollable response list (max-h-64, overflow-y-auto)
   - `gender` participantField → Pie chart
4. Each chart section has a title (field label) and is wrapped in a white card

**Chart color palette:** Use a consistent palette array shared across charts:
```typescript
const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
]
```

**Step 1: Create component**

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add apps/registration/src/components/admin/SurveyStats.tsx
git commit -m "feat(registration): add SurveyStats component"
```

---

### Task 6: Add service function to fetch all responses

**Files:**
- Modify: `apps/registration/src/services/responses.ts`

Add `getAllResponses()` function that fetches all `survey_responses` documents (used by the global dashboard). This is an admin-only call — the data set is small for a conference context.

```typescript
export const getAllResponses = async (): Promise<SurveyResponse[]> => {
  const q = query(
    collection(db, SURVEY_RESPONSES_COLLECTION),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(mapResponseDoc)
}
```

Extract the existing response mapping logic into a reusable `mapResponseDoc` helper to DRY up `getResponsesBySurvey` and `getAllResponses`.

**Step 1: Refactor and add function**

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add apps/registration/src/services/responses.ts
git commit -m "feat(registration): add getAllResponses service function"
```

---

### Task 7: Integrate DashboardOverview into SurveyListPage

**Files:**
- Modify: `apps/registration/src/pages/admin/SurveyListPage.tsx`

**Changes:**
1. Import `DashboardOverview` and `getAllResponses`
2. Add state for `allResponses`
3. Fetch responses alongside surveys in `useEffect`
4. Compute `responseCounts` record from responses (group by surveyId)
5. Render `<DashboardOverview>` above the survey list

**Step 1: Modify SurveyListPage**

**Step 2: Verify build and visual check**

Run: `pnpm turbo build --filter=@conference/registration`

**Step 3: Commit**

```bash
git add apps/registration/src/pages/admin/SurveyListPage.tsx
git commit -m "feat(registration): integrate dashboard overview into survey list"
```

---

### Task 8: Integrate SurveyStats into SurveyDetailPage

**Files:**
- Modify: `apps/registration/src/pages/admin/SurveyDetailPage.tsx`

**Changes:**
1. Import `SurveyStats`
2. Add a tab or toggle to switch between "Statistics" and "Responses" views
3. Render `<SurveyStats survey={survey} responses={responses} />` in the statistics view
4. Keep existing `<ResponseTable>` in the responses view

Use a simple button group for the toggle (Statistics | Responses), defaulting to Statistics.

**Step 1: Modify SurveyDetailPage**

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add apps/registration/src/pages/admin/SurveyDetailPage.tsx
git commit -m "feat(registration): integrate survey stats into detail page"
```

---

### Task 9: Add i18n translations

**Files:**
- Modify: `apps/registration/src/i18n/locales/ko.json`
- Modify: `apps/registration/src/i18n/locales/en.json`

Add translations under a new `"dashboard"` key:

```json
{
  "dashboard": {
    "totalSurveys": "총 설문",
    "totalResponses": "총 응답",
    "activeSurveys": "활성 설문",
    "todayResponses": "오늘 등록",
    "dailyTrend": "일별 등록 추이",
    "surveyComparison": "설문별 응답 수",
    "avgPerDay": "일 평균",
    "statistics": "통계",
    "responses": "응답 목록",
    "average": "평균",
    "noChartData": "차트 데이터가 없습니다",
    "textResponses": "응답 목록",
    "noTextResponses": "응답이 없습니다"
  }
}
```

English equivalents:
```json
{
  "dashboard": {
    "totalSurveys": "Total Surveys",
    "totalResponses": "Total Responses",
    "activeSurveys": "Active Surveys",
    "todayResponses": "Today",
    "dailyTrend": "Daily Registration Trend",
    "surveyComparison": "Responses by Survey",
    "avgPerDay": "Avg/Day",
    "statistics": "Statistics",
    "responses": "Responses",
    "average": "Average",
    "noChartData": "No chart data available",
    "textResponses": "Response List",
    "noTextResponses": "No responses yet"
  }
}
```

**Step 1: Add translations**

**Step 2: Verify build**

**Step 3: Commit**

```bash
git add apps/registration/src/i18n/locales/ko.json apps/registration/src/i18n/locales/en.json
git commit -m "feat(registration): add dashboard i18n translations"
```

---

### Task 10: Final build verification and cleanup

**Step 1: Full build**

Run: `pnpm turbo build --filter=@conference/registration`

**Step 2: Check for unused imports**

Run through TypeScript type checking: `cd apps/registration && pnpm typecheck`

**Step 3: Final commit if any cleanup needed**

---

## File Summary

| Action | File |
|--------|------|
| Create | `src/utils/statsUtils.ts` |
| Create | `src/components/admin/StatCard.tsx` |
| Create | `src/components/admin/DashboardOverview.tsx` |
| Create | `src/components/admin/SurveyStats.tsx` |
| Modify | `src/services/responses.ts` (add `getAllResponses`) |
| Modify | `src/pages/admin/SurveyListPage.tsx` (add dashboard) |
| Modify | `src/pages/admin/SurveyDetailPage.tsx` (add stats tab) |
| Modify | `src/i18n/locales/ko.json` (dashboard keys) |
| Modify | `src/i18n/locales/en.json` (dashboard keys) |
| Modify | `package.json` (chart.js deps) |
