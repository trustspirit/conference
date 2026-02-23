// Predefined color palette for schedule events
// These colors are designed to be visually distinct and pleasant

export const SCHEDULE_COLORS = [
  { name: 'blue', bg: '#E3F2FD', border: '#1976D2', text: '#1565C0' },
  { name: 'green', bg: '#E8F5E9', border: '#388E3C', text: '#2E7D32' },
  { name: 'purple', bg: '#F3E5F5', border: '#7B1FA2', text: '#6A1B9A' },
  { name: 'orange', bg: '#FFF3E0', border: '#F57C00', text: '#E65100' },
  { name: 'red', bg: '#FFEBEE', border: '#D32F2F', text: '#C62828' },
  { name: 'teal', bg: '#E0F2F1', border: '#00796B', text: '#00695C' },
  { name: 'pink', bg: '#FCE4EC', border: '#C2185B', text: '#AD1457' },
  { name: 'indigo', bg: '#E8EAF6', border: '#303F9F', text: '#283593' },
  { name: 'amber', bg: '#FFF8E1', border: '#FFA000', text: '#FF8F00' },
  { name: 'cyan', bg: '#E0F7FA', border: '#0097A7', text: '#00838F' },
  { name: 'lime', bg: '#F9FBE7', border: '#AFB42B', text: '#9E9D24' },
  { name: 'deepOrange', bg: '#FBE9E7', border: '#E64A19', text: '#D84315' }
] as const

export type ScheduleColorName = (typeof SCHEDULE_COLORS)[number]['name']

// Get color by index (cycles through palette)
export const getColorByIndex = (index: number) => {
  return SCHEDULE_COLORS[index % SCHEDULE_COLORS.length]
}

// Get next available color index
let colorCounter = 0
export const getNextColorIndex = (): number => {
  const index = colorCounter
  colorCounter = (colorCounter + 1) % SCHEDULE_COLORS.length
  return index
}

// Reset color counter (useful when refreshing data)
export const resetColorCounter = (): void => {
  colorCounter = 0
}

// Parse hex color to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

// Generate lighter/darker versions of a custom color
export const generateColorVariants = (
  baseColor: string
): { bg: string; border: string; text: string } => {
  const rgb = hexToRgb(baseColor)
  if (!rgb) {
    return SCHEDULE_COLORS[0] // Fallback to first color
  }

  // Generate lighter background (increase brightness)
  const bgR = Math.min(255, rgb.r + Math.round((255 - rgb.r) * 0.85))
  const bgG = Math.min(255, rgb.g + Math.round((255 - rgb.g) * 0.85))
  const bgB = Math.min(255, rgb.b + Math.round((255 - rgb.b) * 0.85))

  // Generate darker text (decrease brightness)
  const textR = Math.round(rgb.r * 0.7)
  const textG = Math.round(rgb.g * 0.7)
  const textB = Math.round(rgb.b * 0.7)

  return {
    bg: `rgb(${bgR}, ${bgG}, ${bgB})`,
    border: baseColor,
    text: `rgb(${textR}, ${textG}, ${textB})`
  }
}

// Get color styles for an event
export const getEventColorStyles = (
  color?: string,
  colorIndex?: number
): { bg: string; border: string; text: string } => {
  if (color) {
    return generateColorVariants(color)
  }

  if (colorIndex !== undefined) {
    return getColorByIndex(colorIndex)
  }

  return getColorByIndex(0)
}

// Color picker options (for manual selection)
export const COLOR_PICKER_OPTIONS = [
  '#1976D2', // Blue
  '#388E3C', // Green
  '#7B1FA2', // Purple
  '#F57C00', // Orange
  '#D32F2F', // Red
  '#00796B', // Teal
  '#C2185B', // Pink
  '#303F9F', // Indigo
  '#FFA000', // Amber
  '#0097A7', // Cyan
  '#AFB42B', // Lime
  '#E64A19' // Deep Orange
]
