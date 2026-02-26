import React, { useState } from 'react'
import { useAtomValue } from 'jotai'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Papa from 'papaparse'
import { importParticipantsFromCSV } from '../services/firebase'
import type { CSVParticipantRow } from '../types'
import { participantsAtom } from '../stores/dataStore'
import { readFileAsText } from '../utils/fileReader'

function ImportPage(): React.ReactElement {
  const { t } = useTranslation()
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CSVParticipantRow[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const existingParticipants = useAtomValue(participantsAtom)

  const handleFileSelect = async () => {
    try {
      const content = await readFileAsText('.csv')
      if (!content) return

      setError(null)
      setResult(null)

      Papa.parse<CSVParticipantRow>(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(t('import.parsingError', { error: results.errors[0].message }))
            return
          }

          if (results.data.length > 5000) {
            setError(t('import.tooManyRows', { count: results.data.length }))
            return
          }

          // Map common column name variations
          const mappedData = results.data.map((row) => {
            const mapped: CSVParticipantRow = {
              name: row.name || row.Name || row.NAME || '',
              gender: row.gender || row.Gender || row.GENDER || '',
              age: row.age || row.Age || row.AGE || '',
              stake: row.stake || row.Stake || row.STAKE || '',
              ward: row.ward || row.Ward || row.WARD || '',
              phoneNumber:
                row.phoneNumber || row.phone_number || row.phone || row.Phone || row.PHONE || '',
              email: row.email || row.Email || row.EMAIL || '',
              groupName:
                row.groupName || row.group_name || row.group || row.Group || row.GROUP || '',
              roomNumber:
                row.roomNumber || row.room_number || row.room || row.Room || row.ROOM || ''
            }

            // Collect any additional metadata
            const knownKeys = [
              'name',
              'Name',
              'NAME',
              'gender',
              'Gender',
              'GENDER',
              'age',
              'Age',
              'AGE',
              'stake',
              'Stake',
              'STAKE',
              'ward',
              'Ward',
              'WARD',
              'phoneNumber',
              'phone_number',
              'phone',
              'Phone',
              'PHONE',
              'email',
              'Email',
              'EMAIL',
              'groupName',
              'group_name',
              'group',
              'Group',
              'GROUP',
              'roomNumber',
              'room_number',
              'room',
              'Room',
              'ROOM'
            ]
            Object.keys(row).forEach((key) => {
              if (!knownKeys.includes(key) && row[key]) {
                mapped[key] = row[key]
              }
            })

            return mapped
          })

          setPreview(mappedData.slice(0, 5))

          // Show preview, don't auto-import
          setPreview(mappedData)
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      setError(t('import.fileReadError', { error: errorMessage }))
      console.error('File read error:', err)
    }
  }

  // Helper function to create a unique key from name + gender + email
  const createMatchKey = (name: string, gender: string, email: string): string => {
    return `${name.trim().toLowerCase()}|${(gender || '').trim().toLowerCase()}|${email.trim().toLowerCase()}`
  }

  const handleImportClick = () => {
    if (preview.length === 0) return

    // Check if there are existing participants that might be updated
    // Using name + gender + email combination for duplicate detection
    const existingKeys = new Set(
      existingParticipants.map((p) => createMatchKey(p.name, p.gender || '', p.email))
    )
    const overlappingCount = preview.filter(
      (row) =>
        row.name &&
        row.email &&
        existingKeys.has(createMatchKey(row.name, row.gender || '', row.email))
    ).length

    if (overlappingCount > 0 || existingParticipants.length > 0) {
      setShowConfirmModal(true)
    } else {
      handleImport()
    }
  }

  const handleImport = async () => {
    if (preview.length === 0) return

    setShowConfirmModal(false)
    setIsImporting(true)
    setError(null)

    try {
      const importResult = await importParticipantsFromCSV(preview)
      setResult(importResult)

      setPreview([])
    } catch (err) {
      setError(t('import.importFailed'))
      console.error(err)
    } finally {
      setIsImporting(false)
    }
  }

  // Calculate potential overlaps using name + gender + email combination
  const existingMatchKeys = new Set(
    existingParticipants.map((p) => createMatchKey(p.name, p.gender || '', p.email))
  )
  const overlappingRecords = preview.filter(
    (row) =>
      row.name &&
      row.email &&
      existingMatchKeys.has(createMatchKey(row.name, row.gender || '', row.email))
  )
  const newRecords = preview.filter(
    (row) =>
      !row.name ||
      !row.email ||
      !existingMatchKeys.has(createMatchKey(row.name, row.gender || '', row.email))
  )

  const handleClearPreview = () => {
    setPreview([])
    setError(null)
    setResult(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#050505] mb-2">{t('import.title')}</h1>
          <p className="text-[#65676B]">{t('import.subtitle')}</p>
        </div>
        <Link
          to="/participants"
          className="inline-flex items-center gap-2 px-4 py-2 text-[#65676B] hover:text-[#050505] hover:bg-[#F0F2F5] rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {t('import.backToParticipants')}
        </Link>
      </div>

      {/* Existing Data Warning */}
      {existingParticipants.length > 0 && preview.length === 0 && (
        <div className="mb-6 p-4 bg-[#FFF8E1] border border-[#FFECB3] rounded-lg flex items-start gap-3">
          <svg
            className="w-5 h-5 text-[#F57C00] flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="font-semibold text-[#E65100]">{t('import.existingDataWarning')}</p>
            <p className="text-sm text-[#F57C00] mt-1">
              {t('import.existingDataDesc', { count: existingParticipants.length })}
            </p>
          </div>
        </div>
      )}

      {/* Import Zone */}
      {preview.length === 0 && (
        <div
          onClick={handleFileSelect}
          className="border-2 border-dashed border-[#DADDE1] rounded-lg p-12 text-center cursor-pointer transition-all hover:border-[#1877F2] hover:bg-[#F0F2F5] bg-white"
        >
          <div className="text-5xl mb-4">📄</div>
          <p className="text-lg font-semibold text-[#050505] mb-2">{t('import.selectFile')}</p>
          <p className="text-[#65676B] text-sm">
            {t('import.requiredColumns')}
            <br />
            {t('import.optionalColumns')}
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-[#FFEBEE] border border-[#FFCDD2] rounded-md text-[#FA383E]">
          {error}
        </div>
      )}

      {/* Success Message */}
      {result && (
        <div className="mt-4 p-4 bg-[#EFFFF6] border border-[#31A24C] rounded-md text-[#31A24C]">
          <p className="font-bold">{t('import.success')}</p>
          <p className="mt-1 font-medium">
            {t('import.created')}: {result.created} | {t('import.updated')}: {result.updated}
          </p>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#050505]">{t('import.preview')}</h2>
              <p className="text-[#65676B] text-sm">
                {preview.length} {t('import.recordsReady')}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleClearPreview}
                className="px-4 py-2 bg-[#E4E6EB] text-[#050505] rounded-md font-semibold hover:bg-[#D8DADF] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="px-6 py-2 bg-[#1877F2] text-white rounded-md font-semibold hover:bg-[#166FE5] transition-opacity disabled:opacity-50"
              >
                {isImporting ? t('import.importing') : t('import.importAll')}
              </button>
            </div>
          </div>

          {/* Preview summary with overlap warning */}
          {overlappingRecords.length > 0 && (
            <div className="mb-4 p-4 bg-[#FFF8E1] border border-[#FFECB3] rounded-lg">
              <div className="flex items-center gap-2 text-[#E65100] font-semibold mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {t('import.overlapWarning')}
              </div>
              <p className="text-sm text-[#F57C00]">
                • {t('import.newRecords', { count: newRecords.length })}
                <br />• {t('import.updateRecords', { count: overlappingRecords.length })}
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-[#DADDE1] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F0F2F5] border-b border-[#DADDE1]">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">
                      {t('common.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">
                      {t('common.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">
                      {t('common.phone')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">
                      {t('participant.ward')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">
                      {t('participant.group')}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#65676B]">
                      {t('participant.room')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, index) => (
                    <tr key={index} className="border-b border-[#DADDE1] hover:bg-[#F0F2F5]">
                      <td className="px-4 py-3 text-[#65676B] text-sm">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-[#050505]">{row.name}</td>
                      <td className="px-4 py-3 text-[#65676B]">{row.email}</td>
                      <td className="px-4 py-3 text-[#65676B]">{row.phoneNumber || '-'}</td>
                      <td className="px-4 py-3 text-[#65676B]">{row.ward || '-'}</td>
                      <td className="px-4 py-3 text-[#65676B]">{row.groupName || '-'}</td>
                      <td className="px-4 py-3 text-[#65676B]">{row.roomNumber || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 10 && (
                <div className="px-4 py-3 bg-[#F0F2F5] text-sm text-[#65676B] text-center border-t border-[#DADDE1]">
                  ...{t('import.andMore', { count: preview.length - 10 })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 bg-white rounded-lg p-6 border border-[#DADDE1] shadow-sm">
        <h3 className="font-bold text-[#050505] mb-3">{t('import.csvFormatTitle')}</h3>
        <div className="text-sm text-[#65676B] space-y-2">
          <p>
            <strong>{t('import.requiredColumnsTitle')}</strong> {t('import.requiredColumnsValue')}
          </p>
          <p>
            <strong>{t('import.optionalColumnsTitle')}</strong> {t('import.optionalColumnsValue')}
          </p>
          <p>
            <strong>{t('import.metadataNote')}</strong>
          </p>
          <p>
            <strong>{t('import.updatesNote')}</strong>
          </p>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold text-[#050505] mb-2">{t('import.exampleCSV')}</h4>
          <pre className="bg-[#F0F2F5] p-3 rounded-md border border-[#DADDE1] text-xs overflow-x-auto text-[#65676B]">
            {`name,email,phone,gender,age,ward,stake,group,room
John Doe,john@example.com,555-1234,male,25,Ward 1,Stake A,Group Alpha,101
Jane Smith,jane@example.com,555-5678,female,30,Ward 2,Stake A,Group Beta,102`}
          </pre>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#FFF3E0] rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#F57C00]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#050505]">{t('import.confirmTitle')}</h3>
                  <p className="text-sm text-[#65676B]">{t('import.confirmDesc')}</p>
                </div>
              </div>

              <div className="bg-[#F0F2F5] rounded-lg p-4 mb-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#65676B]">{t('import.currentParticipants')}:</span>
                    <span className="font-semibold text-[#050505]">
                      {existingParticipants.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65676B]">{t('import.newParticipantsToAdd')}:</span>
                    <span className="font-semibold text-[#31A24C]">{newRecords.length}</span>
                  </div>
                  {overlappingRecords.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#65676B]">{t('import.participantsToUpdate')}:</span>
                      <span className="font-semibold text-[#F57C00]">
                        {overlappingRecords.length}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-sm text-[#65676B] mb-4">
                <p className="mb-2">{t('import.overwriteWarning')}</p>
                {overlappingRecords.length > 0 && (
                  <p className="text-[#F57C00]">
                    ⚠️ {t('import.updateRecords', { count: overlappingRecords.length })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex border-t border-[#DADDE1]">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 text-[#65676B] font-semibold hover:bg-[#F0F2F5] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImport}
                className="flex-1 py-3 text-[#1877F2] font-semibold hover:bg-[#E7F3FF] transition-colors border-l border-[#DADDE1]"
              >
                {t('import.proceedImport')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportPage
