import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'

interface QRCodeDisplayProps {
  participantId: string
  participantName: string
  size?: number
  showDownload?: boolean
  showPrint?: boolean
}

function QRCodeDisplay({
  participantId,
  participantName,
  size = 180,
  showDownload = true,
  showPrint = true
}: QRCodeDisplayProps): React.ReactElement {
  const { t } = useTranslation()

  // QR 코드에 저장될 데이터
  const qrData = JSON.stringify({
    type: 'checkin',
    id: participantId,
    v: 1 // version for future compatibility
  })

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${participantId}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = size * 2
      canvas.height = size * 2
      ctx?.drawImage(img, 0, 0, size * 2, size * 2)

      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR_${participantName.replace(/\s+/g, '_')}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handlePrint = () => {
    const svg = document.getElementById(`qr-${participantId}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${participantName} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .instructions {
              font-size: 14px;
              color: #666;
              margin-top: 10px;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="name">${participantName}</div>
            <div class="qr-code">${svgData}</div>
            <div class="instructions">체크인 시 QR 코드를 스캔해 주세요</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg border border-[#DADDE1]">
        <QRCodeSVG
          id={`qr-${participantId}`}
          value={qrData}
          size={size}
          level="M"
          includeMargin={true}
        />
      </div>

      {(showDownload || showPrint) && (
        <div className="flex items-center gap-2 mt-3">
          {showDownload && (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#65676B] hover:text-[#1877F2] hover:bg-[#F0F2F5] rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              {t('qr.download')}
            </button>
          )}
          {showPrint && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#65676B] hover:text-[#1877F2] hover:bg-[#F0F2F5] rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              {t('qr.print')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default QRCodeDisplay
