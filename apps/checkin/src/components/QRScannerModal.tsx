import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAtomValue, useSetAtom } from 'jotai'
import { participantsAtom } from '../stores/dataStore'
import { addToastAtom } from '../stores/toastStore'
import { userNameAtom } from '../stores/userStore'
import {
  checkInParticipant,
  checkOutParticipant,
  getParticipantById,
  searchParticipants
} from '../services/firebase'
import { writeAuditLog } from '../services/auditLog'
import type { Participant } from '../types'
import { CheckInStatus } from '../types'
import { getCheckInStatusFromParticipant } from './CheckInStatusBadge'
import { isValidParticipantKey } from '../utils/generateParticipantKey'

interface QRScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onCheckInSuccess?: () => void
}

interface ScannedParticipant {
  participant: Participant
  status: CheckInStatus
}

function QRScannerModal({
  isOpen,
  onClose,
  onCheckInSuccess
}: QRScannerModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const participants = useAtomValue(participantsAtom)
  const addToast = useSetAtom(addToastAtom)
  const userName = useAtomValue(userNameAtom)

  const [isScanning, setIsScanning] = useState(false)
  const [scannedParticipant, setScannedParticipant] = useState<ScannedParticipant | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'qr-scanner-container'

  // Start scanner
  const startScanner = async () => {
    setError(null)
    setCameraError(null)
    setScannedParticipant(null)

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        onScanSuccess,
        () => {} // onScanFailure - ignore continuous failures
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Failed to start scanner:', err)
      setCameraError(err instanceof Error ? err.message : t('qr.cameraError'))
    }
  }

  // Stop scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        if (state === Html5QrcodeScannerState.SCANNING) {
          await scannerRef.current.stop()
        }
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  // Handle successful scan
  const onScanSuccess = async (decodedText: string) => {
    // Pause scanning while processing
    if (scannerRef.current) {
      try {
        await scannerRef.current.pause()
      } catch {
        // Ignore pause errors
      }
    }

    try {
      // Parse QR data
      let participantId: string | null = null
      let searchKey: string | null = null

      try {
        const qrData = JSON.parse(decodedText)
        if (qrData.type === 'checkin' && qrData.id) {
          participantId = qrData.id
        }
      } catch {
        // Try simple format: CHECKIN:id
        if (decodedText.startsWith('CHECKIN:')) {
          participantId = decodedText.substring(8)
        }
        // Try KEY:XXXXXXXX format (from key-generator)
        else if (decodedText.startsWith('KEY:')) {
          const key = decodedText.substring(4)
          if (isValidParticipantKey(key)) {
            searchKey = key
          }
        }
        // Try direct key format (8 char alphanumeric)
        else if (isValidParticipantKey(decodedText)) {
          searchKey = decodedText
        }
      }

      let participant: Participant | undefined

      // Search by participant ID
      if (participantId) {
        participant = participants.find((p) => p.id === participantId)
        // If not in local state, try fetching from Firebase
        if (!participant) {
          participant = (await getParticipantById(participantId)) || undefined
        }
      }
      // Search by unique key
      else if (searchKey) {
        const searchResults = await searchParticipants(searchKey)
        if (searchResults.length > 0) {
          participant = searchResults[0]
        }
      }

      if (!participantId && !searchKey) {
        setError(t('qr.invalidQRCode'))
        resumeScanning()
        return
      }

      if (!participant) {
        setError(t('qr.participantNotFound'))
        resumeScanning()
        return
      }

      // Get check-in status
      const status = getCheckInStatusFromParticipant(participant.checkIns)

      setScannedParticipant({ participant, status })
      setError(null)

      // Play success sound
      playSound('success')
    } catch (err) {
      console.error('Error processing QR code:', err)
      setError(t('qr.scanError'))
      resumeScanning()
    }
  }

  // Resume scanning
  const resumeScanning = () => {
    setScannedParticipant(null)
    if (scannerRef.current) {
      try {
        scannerRef.current.resume()
      } catch {
        // If resume fails, restart scanner
        startScanner()
      }
    }
  }

  // Handle check-in
  const handleCheckIn = async () => {
    if (!scannedParticipant) return

    setIsProcessing(true)
    const { participant, status } = scannedParticipant

    try {
      if (status === CheckInStatus.CheckedIn) {
        // Check out
        const activeCheckIn = participant.checkIns.find((ci) => !ci.checkOutTime)
        if (activeCheckIn) {
          await checkOutParticipant(participant.id, activeCheckIn.id)
          await writeAuditLog(
            userName || 'Unknown',
            'check_out',
            'participant',
            participant.id,
            participant.name
          )
          addToast({ type: 'success', message: t('toast.checkOutSuccess') })
          playSound('checkout')
        }
      } else {
        // Check in
        await checkInParticipant(participant.id)
        await writeAuditLog(
          userName || 'Unknown',
          'check_in',
          'participant',
          participant.id,
          participant.name
        )
        addToast({ type: 'success', message: t('toast.checkInSuccess') })
        playSound('checkin')
      }

      onCheckInSuccess?.()

      // Continue scanning
      setTimeout(() => {
        resumeScanning()
      }, 1000)
    } catch (err) {
      console.error('Check-in error:', err)
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : t('toast.actionFailed')
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Navigate to participant detail
  const handleViewDetails = () => {
    if (scannedParticipant) {
      stopScanner()
      onClose()
      navigate(`/participant/${scannedParticipant.participant.id}`)
    }
  }

  // Play sound effect
  const playSound = (type: 'success' | 'checkin' | 'checkout' | 'error') => {
    // Create audio context for sound effects
    try {
      const audioContext = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      switch (type) {
        case 'success':
        case 'checkin':
          oscillator.frequency.value = 880
          oscillator.type = 'sine'
          gainNode.gain.value = 0.3
          break
        case 'checkout':
          oscillator.frequency.value = 440
          oscillator.type = 'sine'
          gainNode.gain.value = 0.3
          break
        case 'error':
          oscillator.frequency.value = 220
          oscillator.type = 'square'
          gainNode.gain.value = 0.2
          break
      }

      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.15)
    } catch {
      // Ignore audio errors
    }
  }

  // Initialize scanner when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanner()
      }, 100)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DADDE1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E7F3FF] rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[#1877F2]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#050505]">{t('qr.scanTitle')}</h2>
              <p className="text-sm text-[#65676B]">{t('qr.scanSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F0F2F5] transition-colors"
          >
            <svg
              className="w-5 h-5 text-[#65676B]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
          {!scannedParticipant ? (
            <>
              {/* Scanner Container */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Scanning overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#1877F2] rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#1877F2] rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#1877F2] rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#1877F2] rounded-br-lg" />

                      {/* Scanning line animation */}
                      <div className="absolute inset-x-2 h-0.5 bg-[#1877F2] animate-scan" />
                    </div>
                  </div>
                )}

                {/* Camera error */}
                {cameraError && (
                  <div className="absolute inset-0 bg-[#F0F2F5] flex flex-col items-center justify-center p-6 text-center">
                    <svg
                      className="w-16 h-16 text-[#FA383E] mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-[#050505] font-medium mb-2">{t('qr.cameraAccessDenied')}</p>
                    <p className="text-sm text-[#65676B] mb-4">{cameraError}</p>
                    <button
                      onClick={startScanner}
                      className="px-4 py-2 bg-[#1877F2] text-white rounded-lg font-medium hover:bg-[#166FE5] transition-colors"
                    >
                      {t('qr.retryCamera')}
                    </button>
                  </div>
                )}
              </div>

              {/* Error message */}
              {error && (
                <div className="mt-4 p-3 bg-[#FFEBEE] border border-[#FA383E]/20 rounded-lg">
                  <p className="text-sm text-[#FA383E] font-medium">{error}</p>
                </div>
              )}

              {/* Instructions */}
              <p className="text-center text-sm text-[#65676B] mt-4">{t('qr.scanInstructions')}</p>
            </>
          ) : (
            /* Scanned Participant Info */
            <div className="text-center">
              <div
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  scannedParticipant.status === CheckInStatus.CheckedIn
                    ? 'bg-[#EFFFF6]'
                    : 'bg-[#E7F3FF]'
                }`}
              >
                <svg
                  className={`w-8 h-8 ${
                    scannedParticipant.status === CheckInStatus.CheckedIn
                      ? 'text-[#31A24C]'
                      : 'text-[#1877F2]'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-[#050505] mb-1">
                {scannedParticipant.participant.name}
              </h3>
              <p className="text-sm text-[#65676B] mb-4">{scannedParticipant.participant.email}</p>

              {/* Participant details */}
              <div className="bg-[#F0F2F5] rounded-lg p-4 mb-4 text-left">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {scannedParticipant.participant.groupName && (
                    <div>
                      <span className="text-[#65676B]">{t('participant.group')}:</span>
                      <span className="ml-2 font-medium text-[#050505]">
                        {scannedParticipant.participant.groupName}
                      </span>
                    </div>
                  )}
                  {scannedParticipant.participant.roomNumber && (
                    <div>
                      <span className="text-[#65676B]">{t('participant.room')}:</span>
                      <span className="ml-2 font-medium text-[#050505]">
                        {scannedParticipant.participant.roomNumber}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#65676B]">{t('participant.payment')}:</span>
                    <span
                      className={`ml-2 font-medium ${
                        scannedParticipant.participant.isPaid ? 'text-[#31A24C]' : 'text-[#FA383E]'
                      }`}
                    >
                      {scannedParticipant.participant.isPaid
                        ? t('participant.paid')
                        : t('participant.unpaid')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#65676B]">{t('common.status')}:</span>
                    <span
                      className={`ml-2 font-medium ${
                        scannedParticipant.status === CheckInStatus.CheckedIn
                          ? 'text-[#31A24C]'
                          : 'text-[#65676B]'
                      }`}
                    >
                      {scannedParticipant.status === CheckInStatus.CheckedIn
                        ? t('participant.checkedIn')
                        : t('participant.notCheckedIn')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={resumeScanning}
                  className="flex-1 px-4 py-2.5 border border-[#DADDE1] text-[#050505] rounded-lg font-medium hover:bg-[#F0F2F5] transition-colors"
                >
                  {t('qr.scanAgain')}
                </button>
                <button
                  onClick={handleCheckIn}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    scannedParticipant.status === CheckInStatus.CheckedIn
                      ? 'bg-[#65676B] hover:bg-[#505254]'
                      : 'bg-[#1877F2] hover:bg-[#166FE5]'
                  }`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    </span>
                  ) : scannedParticipant.status === CheckInStatus.CheckedIn ? (
                    t('participant.checkOut')
                  ) : (
                    t('participant.checkIn')
                  )}
                </button>
              </div>

              <button
                onClick={handleViewDetails}
                className="mt-3 text-sm text-[#1877F2] hover:underline font-medium"
              >
                {t('qr.viewDetails')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scanning animation styles */}
      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default QRScannerModal
