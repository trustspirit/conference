import React from 'react'
import type { GridConfig } from '../../types'

interface GridInputProps {
  config: GridConfig
  value: Record<string, string | string[]>
  onChange: (value: Record<string, string | string[]>) => void
}

function GridInput({ config, value, onChange }: GridInputProps): React.ReactElement {
  const handleRadioChange = (row: string, col: string) => {
    onChange({ ...value, [row]: col })
  }

  const handleCheckboxChange = (row: string, col: string) => {
    const current = (value[row] as string[]) || []
    const next = current.includes(col)
      ? current.filter((c) => c !== col)
      : [...current, col]
    onChange({ ...value, [row]: next })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 pr-4" />
            {config.columns.map((col, ci) => (
              <th key={ci} className="text-center py-2 px-2 font-medium text-gray-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {config.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-gray-100">
              <td className="py-2 pr-4 text-gray-700">{row}</td>
              {config.columns.map((col, ci) => (
                <td key={ci} className="text-center py-2 px-2">
                  {config.allowMultiple ? (
                    <input
                      type="checkbox"
                      checked={((value[row] as string[]) || []).includes(col)}
                      onChange={() => handleCheckboxChange(row, col)}
                      className="w-4 h-4"
                    />
                  ) : (
                    <input
                      type="radio"
                      name={`grid_${row}`}
                      checked={value[row] === col}
                      onChange={() => handleRadioChange(row, col)}
                      className="w-4 h-4"
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default GridInput
