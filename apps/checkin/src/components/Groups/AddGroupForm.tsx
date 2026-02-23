import React from 'react'
import { useTranslation } from 'react-i18next'

interface AddGroupFormProps {
  newGroupName: string
  onGroupNameChange: (value: string) => void
  newGroupCapacity: string
  onGroupCapacityChange: (value: string) => void
  newGroupTags: string[]
  customTagInput: string
  onCustomTagInputChange: (value: string) => void
  presetTags: string[]
  onTogglePresetTag: (tag: string) => void
  onAddCustomTag: () => void
  onRemoveTag: (tag: string) => void
  getTagLabel: (tag: string) => string
  getTagColor: (tag: string) => string
  onSubmit: () => void
  onCancel: () => void
}

function AddGroupForm({
  newGroupName,
  onGroupNameChange,
  newGroupCapacity,
  onGroupCapacityChange,
  newGroupTags,
  customTagInput,
  onCustomTagInputChange,
  presetTags,
  onTogglePresetTag,
  onAddCustomTag,
  onRemoveTag,
  getTagLabel,
  getTagColor,
  onSubmit,
  onCancel
}: AddGroupFormProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="bg-white rounded-lg border border-[#DADDE1] p-4 mb-6">
      <h3 className="font-semibold text-[#050505] mb-3">{t('group.addNewGroup')}</h3>
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
            placeholder={t('group.groupNamePlaceholder')}
            autoFocus
            className="flex-1 min-w-[150px] px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
          <input
            type="number"
            value={newGroupCapacity}
            onChange={(e) => onGroupCapacityChange(e.target.value)}
            placeholder={t('group.expectedOptional')}
            min={1}
            className="w-36 px-3 py-2 border border-[#DADDE1] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1877F2] focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
        </div>

        {/* Tags Section */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#65676B] font-medium">{t('group.tags')}:</span>
          {presetTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTogglePresetTag(tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                newGroupTags.includes(tag)
                  ? getTagColor(tag)
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {getTagLabel(tag)}
            </button>
          ))}
          <span className="text-[#DADDE1]">|</span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => onCustomTagInputChange(e.target.value)}
              placeholder={t('group.addCustomTag')}
              className="w-32 px-2 py-1 border border-[#DADDE1] rounded text-xs outline-none focus:ring-1 focus:ring-[#1877F2] focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onAddCustomTag()
                }
              }}
            />
            <button
              type="button"
              onClick={onAddCustomTag}
              disabled={!customTagInput.trim()}
              className="px-2 py-1 bg-[#E7F3FF] text-[#1877F2] rounded text-xs font-semibold hover:bg-[#D4E8FF] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +
            </button>
          </div>
        </div>

        {/* Selected Tags */}
        {newGroupTags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {newGroupTags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getTagColor(tag)}`}
              >
                {getTagLabel(tag)}
                <button type="button" onClick={() => onRemoveTag(tag)} className="hover:opacity-70">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[#65676B] text-sm font-semibold hover:bg-[#F0F2F5] rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onSubmit}
            disabled={!newGroupName.trim()}
            className="px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-semibold hover:bg-[#166FE5] transition-colors disabled:opacity-50"
          >
            {t('common.add')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddGroupForm
