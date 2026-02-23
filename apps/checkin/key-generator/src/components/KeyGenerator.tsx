import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { generateUniqueKey, type UserInfo } from '../utils/generateKey'

function KeyGenerator() {
  const [formData, setFormData] = useState<UserInfo>({
    lastName: '',
    firstName: '',
    birthDate: '',
  })
  const [generatedKey, setGeneratedKey] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    // 입력이 변경되면 생성된 키 초기화
    setGeneratedKey('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.lastName || !formData.firstName || !formData.birthDate) {
      alert('모든 필드를 입력해주세요.')
      return
    }

    setIsLoading(true)
    try {
      const key = await generateUniqueKey(formData)
      setGeneratedKey(key)
      setShowModal(true)
    } catch (error) {
      console.error('키 생성 실패:', error)
      alert('키 생성에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyKey = async () => {
    if (generatedKey) {
      try {
        await navigator.clipboard.writeText(generatedKey)
        alert('키가 복사되었습니다!')
      } catch (error) {
        console.error('복사 실패:', error)
      }
    }
  }

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `${formData.lastName}${formData.firstName}_${generatedKey}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const closeModal = () => {
    setShowModal(false)
  }

  // QR 코드에 저장될 데이터 (KEY:XXXXXXXX 형식)
  const qrValue = `KEY:${generatedKey}`

  return (
    <div className="key-generator">
      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="lastName">성 (Last Name)</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="예: 홍"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="firstName">이름 (First Name)</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="예: 길동"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="birthDate">생년월일</label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleInputChange}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? '생성 중...' : '키 생성하기'}
        </button>
      </form>

      {/* QR Code Modal */}
      {showModal && generatedKey && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              ×
            </button>
            
            <div className="modal-header">
              <h2>QR 코드가 생성되었습니다</h2>
              <p className="participant-name">
                {formData.lastName}{formData.firstName}
              </p>
            </div>
            
            <div className="qr-container">
              <QRCodeSVG
                id="qr-code-svg"
                value={qrValue}
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            
            <div className="key-display-modal">
              <span className="key-label">고유 키</span>
              <code className="key-code-modal">{generatedKey}</code>
            </div>
            
            <div className="modal-actions">
              <button className="action-btn copy-btn" onClick={handleCopyKey}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                키 복사
              </button>
              <button className="action-btn download-btn" onClick={handleDownloadQR}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                QR 다운로드
              </button>
            </div>
            
            <p className="modal-note">
              이 QR 코드를 스캔하면 체크인 앱에서 참가자를 바로 찾을 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default KeyGenerator
