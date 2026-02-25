import { Chart, ChartConfiguration, ChartType } from 'chart.js'
import type { SurveyField, SurveyResponse } from '../types'
import {
  getDailyRegistrationCounts,
  getOptionDistribution,
  getCheckboxDistribution,
  getScaleDistribution,
  getStakeDistribution,
} from './statsUtils'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']

export interface ChartImage {
  fieldId: string
  label: string
  imageDataUrl: string
  subtitle?: string
}

export function renderChartToImage(
  config: ChartConfiguration,
  width: number = 600,
  height: number = 400,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const mergedOptions = {
    ...config.options,
    responsive: false,
    animation: false as const,
  }

  const chart = new Chart(canvas, {
    ...config,
    options: mergedOptions,
  })

  const base64 = chart.toBase64Image('image/png')
  chart.destroy()

  return base64
}

export function buildDailyTrendImage(
  responses: SurveyResponse[],
  width?: number,
  height?: number,
): string {
  const dailyData = getDailyRegistrationCounts(responses, 14)

  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: dailyData.labels,
      datasets: [
        {
          data: dailyData.data,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  }

  return renderChartToImage(config, width, height)
}

export function buildChartImagesForFields(
  selectedFields: SurveyField[],
  responses: SurveyResponse[],
  width?: number,
  height?: number,
): ChartImage[] {
  const results: ChartImage[] = []

  for (const field of selectedFields) {
    // Gender field — always Pie
    if (field.participantField === 'gender') {
      const options = field.options && field.options.length > 0 ? field.options : ['male', 'female', 'other']
      const dist = getOptionDistribution(responses, field.id, options)
      const config: ChartConfiguration<'pie'> = {
        type: 'pie',
        data: {
          labels: dist.labels,
          datasets: [{ data: dist.data, backgroundColor: COLORS.slice(0, dist.labels.length) }],
        },
        options: {
          plugins: { legend: { position: 'bottom' } },
        },
      }
      results.push({
        fieldId: field.id,
        label: field.label,
        imageDataUrl: renderChartToImage(config, width, height),
      })
      continue
    }

    if (field.type === 'radio' || field.type === 'dropdown') {
      const options = field.options || []
      const dist = getOptionDistribution(responses, field.id, options)
      const chartType: 'pie' | 'doughnut' = options.length > 6 ? 'doughnut' : 'pie'
      const config: ChartConfiguration<typeof chartType> = {
        type: chartType,
        data: {
          labels: dist.labels,
          datasets: [{ data: dist.data, backgroundColor: COLORS.slice(0, dist.labels.length) }],
        },
        options: {
          plugins: { legend: { position: 'bottom' } },
        },
      }
      results.push({
        fieldId: field.id,
        label: field.label,
        imageDataUrl: renderChartToImage(config, width, height),
      })
      continue
    }

    if (field.type === 'checkbox') {
      const options = field.options || []
      const dist = getCheckboxDistribution(responses, field.id, options)
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: dist.labels,
          datasets: [{ data: dist.data, backgroundColor: COLORS[0] }],
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      }
      results.push({
        fieldId: field.id,
        label: field.label,
        imageDataUrl: renderChartToImage(config, width, height),
      })
      continue
    }

    if (field.type === 'linear_scale') {
      const min = field.linearScale?.min ?? 1
      const max = field.linearScale?.max ?? 5
      const dist = getScaleDistribution(responses, field.id, min, max)
      const config: ChartConfiguration<'bar'> = {
        type: 'bar',
        data: {
          labels: dist.labels,
          datasets: [{ data: dist.data, backgroundColor: COLORS[0] }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        },
      }
      results.push({
        fieldId: field.id,
        label: field.label,
        imageDataUrl: renderChartToImage(config, width, height),
        subtitle: `Average: ${dist.average.toFixed(2)}`,
      })
      continue
    }

    if (field.type === 'church_info') {
      const dist = getStakeDistribution(responses, field.id)
      const config: ChartConfiguration<'doughnut'> = {
        type: 'doughnut',
        data: {
          labels: dist.labels,
          datasets: [{ data: dist.data, backgroundColor: COLORS.slice(0, dist.labels.length) }],
        },
        options: {
          plugins: { legend: { position: 'bottom' } },
        },
      }
      results.push({
        fieldId: field.id,
        label: field.label,
        imageDataUrl: renderChartToImage(config, width, height),
      })
      continue
    }
  }

  return results
}
