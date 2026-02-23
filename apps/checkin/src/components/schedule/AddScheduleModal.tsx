import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSetAtom } from 'jotai'
import Modal, { ModalActions } from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import {
  createScheduleAtom,
  updateScheduleAtom,
  deleteScheduleAtom
} from '../../stores/scheduleStore'
import { COLOR_PICKER_OPTIONS, getNextColorIndex } from '../../utils/scheduleColors'
import type { ScheduleEvent } from '../../types'
import type { CreateScheduleData, UpdateScheduleData } from '../../services/firebase'

interface AddScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  editEvent?: ScheduleEvent | null
  initialDate?: Date
  initialStartTime?: string
  initialEndTime?: string
}

function AddScheduleModal({
  isOpen,
  onClose,
  editEvent,
  initialDate,
  initialStartTime,
  initialEndTime
}: AddScheduleModalProps): React.ReactElement {
  const { t } = useTranslation()
  const createSchedule = useSetAtom(createScheduleAtom)
  const updateSchedule = useSetAtom(updateScheduleAtom)
  const deleteScheduleAction = useSetAtom(deleteScheduleAtom)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form with edit data or defaults
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title)
      setDescription(editEvent.description || '')
      setDate(new Date(editEvent.startTime).toISOString().split('T')[0])
      setStartTime(
        new Date(editEvent.startTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        })
      )
      setEndTime(
        new Date(editEvent.endTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        })
      )
      setLocation(editEvent.location || '')
      setSelectedColor(editEvent.color || null)
    } else {
      const baseDate = initialDate || new Date()
      setTitle('')
      setDescription('')
      setDate(baseDate.toISOString().split('T')[0])
      setStartTime(initialStartTime || '09:00')
      setEndTime(initialEndTime || '10:00')
      setLocation('')
      setSelectedColor(null)
    }
  }, [editEvent, initialDate, initialStartTime, initialEndTime, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return

    setIsSubmitting(true)

    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const startDateTime = new Date(date)
    startDateTime.setHours(startHours, startMinutes, 0, 0)

    const endDateTime = new Date(date)
    endDateTime.setHours(endHours, endMinutes, 0, 0)

    // If end time is before start time, assume it's the next day
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1)
    }

    try {
      if (editEvent) {
        const updateData: UpdateScheduleData = {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          location: location.trim() || undefined,
          color: selectedColor || undefined
        }
        await updateSchedule({ id: editEvent.id, data: updateData })
      } else {
        const createData: CreateScheduleData = {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          location: location.trim() || undefined,
          color: selectedColor || undefined,
          colorIndex: selectedColor ? undefined : getNextColorIndex()
        }
        await createSchedule(createData)
      }
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editEvent) return

    setIsSubmitting(true)
    try {
      await deleteScheduleAction(editEvent.id)
      onClose()
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirm(false)
    }
  }

  const isEditing = !!editEvent

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t('schedule.editSchedule') : t('schedule.addSchedule')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[#050505] mb-1">
            {t('schedule.title')} <span className="text-red-500">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('schedule.titlePlaceholder')}
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-[#050505] mb-1">
            {t('common.date')} <span className="text-red-500">*</span>
          </label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#050505] mb-1">
              {t('schedule.startTime')}
            </label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#050505] mb-1">
              {t('schedule.endTime')}
            </label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-[#050505] mb-1">
            {t('schedule.location')}
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('schedule.locationPlaceholder')}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-[#050505] mb-1">
            {t('schedule.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('schedule.descriptionPlaceholder')}
            className="w-full px-3 py-2 border border-[#DADDE1] rounded-lg text-[#050505] placeholder-[#8A8D91] focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] resize-none"
            rows={3}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium text-[#050505] mb-2">
            {t('schedule.color')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedColor(null)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedColor === null
                  ? 'border-[#1877F2] ring-2 ring-[#1877F2] ring-offset-2'
                  : 'border-[#DADDE1] hover:border-[#8A8D91]'
              }`}
              title={t('schedule.autoColor')}
            >
              <span className="text-xs text-[#65676B]">A</span>
            </button>
            {COLOR_PICKER_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color
                    ? 'border-[#1877F2] ring-2 ring-[#1877F2] ring-offset-2'
                    : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <ModalActions>
          {isEditing && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
            >
              {t('common.delete')}
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!title.trim() || !date || isSubmitting}>
            {isSubmitting ? t('common.saving') : isEditing ? t('common.save') : t('common.create')}
          </Button>
        </ModalActions>
      </form>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-[#050505] mb-2">
              {t('schedule.confirmDelete')}
            </h3>
            <p className="text-[#65676B] mb-4">{t('schedule.confirmDeleteDesc')}</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting ? t('common.loading') : t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default AddScheduleModal
