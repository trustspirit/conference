import React from 'react'
import type { LinearScaleConfig } from '../../types'

interface LinearScaleInputProps {
  config: LinearScaleConfig
  value: number | undefined
  onChange: (value: number) => void
}

function LinearScaleInput({ config, value, onChange }: LinearScaleInputProps): React.ReactElement {
  const points: number[] = []
  for (let i = config.min; i <= config.max; i++) {
    points.push(i)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        {config.minLabel && <span>{config.minLabel}</span>}
        <span className="flex-1" />
        {config.maxLabel && <span>{config.maxLabel}</span>}
      </div>
      <div className="flex items-center gap-1 justify-between">
        {points.map((point) => (
          <label key={point} className="flex flex-col items-center gap-1 cursor-pointer">
            <span className="text-xs text-gray-500">{point}</span>
            <input
              type="radio"
              checked={value === point}
              onChange={() => onChange(point)}
              className="w-5 h-5 accent-primary"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

export default LinearScaleInput
