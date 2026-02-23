import React from 'react'

interface ImportCSVPanelProps {
  title: string
  placeholder: string
  helpText: string
  csvInput: string
  onCsvInputChange: (value: string) => void
  onFileSelect: () => void
  onImport: () => void
  onCancel: () => void
  disabled?: boolean
}

function ImportCSVPanel({
  title,
  placeholder,
  helpText,
  csvInput,
  onCsvInputChange,
  onFileSelect,
  onImport,
  onCancel,
  disabled = false
}: ImportCSVPanelProps): React.ReactElement {
  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] p-4 mb-6">
      <h3 className="font-semibold text-[#050505] mb-3">{title}</h3>
      <div className="flex gap-4 mb-3">
        <button
          onClick={onFileSelect}
          className="px-4 py-2 border border-[#1877F2] text-[#1877F2] rounded-lg text-sm font-semibold hover:bg-[#E7F3FF] transition-colors"
        >
          Choose CSV File
        </button>
        <span className="text-[#65676B] text-sm self-center">{helpText}</span>
      </div>
      <textarea
        value={csvInput}
        onChange={(e) => onCsvInputChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
      />
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[#65676B] text-sm font-semibold hover:bg-[#F0F2F5] rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onImport}
          disabled={disabled || !csvInput.trim()}
          className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
        >
          Import
        </button>
      </div>
    </div>
  )
}

export default ImportCSVPanel
