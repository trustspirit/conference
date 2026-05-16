import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useBlocker } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../hooks/queries/queryKeys'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useCreateRequest, useMyRequests } from '../hooks/queries/useRequests'
import { useUploadReceipts } from '../hooks/queries/useCloudFunctions'
import { RequestItem, Receipt, Committee } from '../types'
import Layout from '../components/Layout'
import ProcessingOverlay from '../components/ProcessingOverlay'
import ItemRow from '../components/ItemRow'
import ErrorAlert from '../components/ErrorAlert'
import FileUpload from '../components/FileUpload'
import CommitteeSelect from '../components/CommitteeSelect'
import ConfirmModal from '../components/ConfirmModal'
import { useTranslation } from 'react-i18next'
import { TextField, Button, Dialog, Select, useToast } from 'trust-ui-react'
import { formatPhone, formatBankAccount, fileToBase64 } from '../lib/utils'
import { validateBankBookFile } from '../lib/utils'
import { captureAndUploadRouteMaps } from '../lib/captureRouteMap'
import { canCreateVendorRequest } from '../lib/roles'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'
import InlineSignaturePad from '../components/InlineSignaturePad'
import InlineBankBookUpload from '../components/InlineBankBookUpload'
import BankSelect from '../components/BankSelect'
import ReviewChecklist from '../components/ReviewChecklist'
import { SUBMISSION_CHECKLIST } from '../constants/reviewChecklist'
import BankBookPreview from '../components/BankBookPreview'

const DRAFT_KEY = 'request-form-draft'
const emptyItem = (): RequestItem => ({ description: '', budgetCode: 0, amount: 0 })

interface DraftData {
  payee: string
  phone: string
  bankName: string
  bankAccount: string
  date: string
  committee: Committee
  items: RequestItem[]
  comments: string
  isVendorRequest?: boolean
  isCorporateCard?: boolean
  savedAt: string
}

function loadDraft(): DraftData | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveDraft(data: Omit<DraftData, 'savedAt'>) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }))
}

function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
}

export default function RequestFormPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user, appUser, updateAppUser } = useAuth()
  const { currentProject } = useProject()
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const createRequest = useCreateRequest()
  const uploadReceiptsMutation = useUploadReceipts()
  const { data: myRequests = [] } = useMyRequests(currentProject?.id, user?.uid)

  const [draft] = useState(loadDraft)

  const [payee, setPayee] = useState(draft?.payee || appUser?.displayName || appUser?.name || '')
  const [phone, setPhone] = useState(draft?.phone || appUser?.phone || '')
  const [bankName, setBankName] = useState(draft?.bankName || appUser?.bankName || '')
  const [bankAccount, setBankAccount] = useState(draft?.bankAccount || appUser?.bankAccount || '')
  const [date, setDate] = useState(draft?.date || new Date().toISOString().slice(0, 10))
  const [session] = useState('한국')
  const [committee, setCommittee] = useState<Committee>(
    draft?.committee || appUser?.defaultCommittee || 'operations'
  )
  const [items, setItems] = useState<RequestItem[]>(
    draft?.items?.length ? draft.items : [emptyItem()]
  )
  const [files, setFiles] = useState<File[]>([])
  const [comments, setComments] = useState(draft?.comments || '')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(!!draft)
  const [isVendorRequest, setIsVendorRequest] = useState(draft?.isVendorRequest || false)
  const [isCorporateCard, setIsCorporateCard] = useState(draft?.isCorporateCard || false)
  const [vendorBankBookFile, setVendorBankBookFile] = useState<File | null>(null)
  const [vendorBankBookError, setVendorBankBookError] = useState<string | null>(null)
  const [inlineBankBookFile, setInlineBankBookFile] = useState<File | null>(null)
  const [inlineBankBookError, setInlineBankBookError] = useState<string | null>(null)
  const [inlineSignature, setInlineSignature] = useState('')

  const vendorBankBookPreviewUrl = useMemo(
    () => (vendorBankBookFile ? URL.createObjectURL(vendorBankBookFile) : null),
    [vendorBankBookFile]
  )
  useEffect(() => {
    return () => {
      if (vendorBankBookPreviewUrl) URL.revokeObjectURL(vendorBankBookPreviewUrl)
    }
  }, [vendorBankBookPreviewUrl])

  const showRequestTypeDropdown = appUser ? canCreateVendorRequest(appUser.role, committee) : false

  const needsBankBook =
    !isVendorRequest && !isCorporateCard && !appUser?.bankBookUrl && !appUser?.bankBookDriveUrl
  const needsSignature = !isVendorRequest && !appUser?.signature

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    onConfirm: () => void
    message: string
  }>({ open: false, onConfirm: () => {}, message: '' })
  const closeConfirm = () => setConfirmDialog((prev) => ({ ...prev, open: false }))

  const miniMapRefs = useRef(new Map<number, HTMLDivElement>())
  const routePathsRef = useRef(new Map<number, number[]>())

  // Re-format account number when bank changes
  const bankNameMounted = useRef(false)
  useEffect(() => {
    if (!bankNameMounted.current) {
      bankNameMounted.current = true
      return
    }
    if (bankName && bankAccount) setBankAccount(formatBankAccount(bankAccount, bankName))
  }, [bankName]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const validItems = items.filter((item) => item.description && item.amount > 0)
  const onlyCarTransport =
    items.some((item) => item.transportDetail?.transportType === 'car') &&
    items
      .filter((item) => item.budgetCode > 0)
      .every((item) => item.transportDetail?.transportType === 'car')

  // Check if form has meaningful content (beyond defaults)
  const hasContent = useCallback(() => {
    const hasItems = items.some((item) => item.description || item.amount > 0)
    const hasComments = comments.trim().length > 0
    return hasItems || hasComments
  }, [items, comments])

  // Auto-save draft on changes
  useEffect(() => {
    if (submitted) return
    const timer = setTimeout(() => {
      if (hasContent()) {
        saveDraft({
          payee,
          phone,
          bankName,
          bankAccount,
          date,
          committee,
          items,
          comments,
          isVendorRequest,
          isCorporateCard
        })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [
    payee,
    phone,
    bankName,
    bankAccount,
    date,
    committee,
    items,
    comments,
    isVendorRequest,
    isCorporateCard,
    hasContent,
    submitted
  ])

  // Block navigation when form has content (except to /settings)
  const blocker = useBlocker(({ nextLocation }) => {
    if (submitted) return false // Allow after successful submission
    if (submitting) return false // Allow during submission (navigate after submit)
    if (showConfirm) return true // Block while confirm modal is open
    if (nextLocation.pathname === '/settings') return false
    return hasContent()
  })

  // Browser tab close / refresh warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasContent() && !submitted) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasContent, submitted])

  const handleClearDraft = () => {
    clearDraft()
    setPayee(appUser?.displayName || appUser?.name || '')
    setPhone(appUser?.phone || '')
    setBankName(appUser?.bankName || '')
    setBankAccount(appUser?.bankAccount || '')
    setDate(new Date().toISOString().slice(0, 10))
    setCommittee(appUser?.defaultCommittee || 'operations')
    setItems([emptyItem()])
    setComments('')
    setFiles([])
    setIsVendorRequest(false)
    setIsCorporateCard(false)
    setVendorBankBookFile(null)
    setVendorBankBookError(null)
    setInlineBankBookFile(null)
    setInlineBankBookError(null)
    setInlineSignature('')
    setShowDraftBanner(false)
  }

  const handleVendorToggle = (checked: boolean) => {
    setIsVendorRequest(checked)
    if (checked) {
      setPayee('')
      setPhone('')
      setBankName('')
      setBankAccount('')
      setCommittee('preparation')
      setInlineBankBookFile(null)
      setInlineBankBookError(null)
      setInlineSignature('')
    } else {
      setPayee(appUser?.displayName || appUser?.name || '')
      setPhone(appUser?.phone || '')
      setBankName(appUser?.bankName || '')
      setBankAccount(appUser?.bankAccount || '')
      setCommittee(appUser?.defaultCommittee || 'operations')
      setVendorBankBookFile(null)
      setVendorBankBookError(null)
    }
  }

  const requestType = isCorporateCard ? 'corporate_card' : isVendorRequest ? 'vendor' : 'regular'

  const handleRequestTypeChange = (type: 'regular' | 'vendor' | 'corporate_card') => {
    if (type === 'vendor') {
      handleVendorToggle(true)
      setIsCorporateCard(false)
    } else if (type === 'corporate_card') {
      if (isVendorRequest) handleVendorToggle(false)
      setIsCorporateCard(true)
    } else {
      if (isVendorRequest) handleVendorToggle(false)
      setIsCorporateCard(false)
    }
  }

  const updateItem = (index: number, item: RequestItem) => {
    const next = [...items]
    next[index] = item
    setItems(next)
  }

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index)
    setItems(next.length > 0 ? next : [emptyItem()])
  }

  const addItem = () => {
    if (items.length < 10) setItems([...items, emptyItem()])
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!payee.trim()) errs.push(t('validation.payeeRequired'))
    if (!phone.trim()) errs.push(t('validation.phoneRequired'))
    if (!isCorporateCard) {
      if (!bankName.trim()) errs.push(t('validation.bankRequired'))
      if (!bankAccount.trim()) errs.push(t('validation.bankAccountRequired'))
    }
    if (!date) errs.push(t('validation.dateRequired'))
    if (validItems.length === 0) errs.push(t('validation.itemsRequired'))
    const missingBudgetCode = validItems.some((item) => !item.budgetCode)
    if (missingBudgetCode) errs.push(t('validation.budgetCodeRequired'))
    // Transport detail validation for items with transport detail
    const transportItems = validItems.filter((item) => item.transportDetail)
    for (const ti of transportItems) {
      const d = ti.transportDetail
      if (!d?.transportType) {
        errs.push(t('validation.transportTypeRequired'))
        break
      }
      if (!d?.tripType) {
        errs.push(t('validation.transportTripTypeRequired'))
        break
      }
      if (!d?.departure?.trim()) {
        errs.push(t('validation.transportDepartureRequired'))
        break
      }
      if (!d?.destination?.trim()) {
        errs.push(t('validation.transportDestinationRequired'))
        break
      }
      if (d.transportType === 'car' && !d.distanceKm) {
        errs.push(t('validation.transportDistanceRequired'))
        break
      }
    }
    if (!onlyCarTransport && files.length === 0) errs.push(t('validation.receiptsRequired'))
    // Signature validation
    if (isVendorRequest) {
      if (!appUser?.signature) errs.push(t('validation.signatureRequired'))
    } else {
      if (!appUser?.signature && !inlineSignature) errs.push(t('validation.signatureRequired'))
    }
    // Bank book validation
    if (isVendorRequest) {
      if (!vendorBankBookFile) errs.push(t('validation.vendorBankBookRequired'))
    } else if (!isCorporateCard) {
      if (!appUser?.bankBookUrl && !appUser?.bankBookDriveUrl && !inlineBankBookFile)
        errs.push(t('validation.bankBookRequired'))
    }
    return errs
  }

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors([])

    // Check for duplicate amount in active requests
    const currentTotal = validItems.reduce((sum, item) => sum + item.amount, 0)
    const duplicate = myRequests.find(
      (r) => r.totalAmount === currentTotal && (r.status === 'pending' || r.status === 'approved')
    )
    if (duplicate) {
      setConfirmDialog({
        open: true,
        message: t('validation.duplicateAmount', {
          amount: currentTotal.toLocaleString(),
          date: duplicate.date
        }),
        onConfirm: () => {
          closeConfirm()
          setShowConfirm(true)
        }
      })
      return
    }

    setShowConfirm(true)
  }

  const handleSubmit = async () => {
    if (!user || !appUser || !currentProject) return
    setShowConfirm(false)
    setSubmitting(true)

    try {
      let receipts: Receipt[] = []
      if (files.length > 0) {
        const fileData = await Promise.all(
          files.map(async (f) => ({
            name: f.name,
            data: await fileToBase64(f)
          }))
        )
        receipts = await uploadReceiptsMutation.mutateAsync({
          files: fileData,
          committee,
          projectId: currentProject!.id
        })
      }

      // Capture and upload route maps
      const hasCarTransport = validItems.some(
        (item) =>
          item.transportDetail?.transportType === 'car' &&
          item.transportDetail.departureCoord &&
          item.transportDetail.destinationCoord
      )
      let finalItems = validItems
      if (hasCarTransport) {
        const { items: capturedItems, failedCount } = await captureAndUploadRouteMaps(
          validItems,
          routePathsRef.current,
          committee,
          currentProject!.id
        )
        finalItems = capturedItems
        if (failedCount > 0) {
          toast({
            variant: 'info',
            message: t('form.routeMapCaptureFailed', { count: failedCount })
          })
        }
      }

      // Upload vendor bank book if applicable
      let vendorBankBookPath: string | undefined
      let vendorBankBookUrl: string | undefined
      if (isVendorRequest && vendorBankBookFile) {
        const data = await fileToBase64(vendorBankBookFile)
        const uploadFn = httpsCallable<
          { file: { name: string; data: string } },
          { fileName: string; storagePath: string; url: string }
        >(functions, 'uploadVendorBankBook')
        const result = await uploadFn({ file: { name: vendorBankBookFile.name, data } })
        vendorBankBookPath = result.data.storagePath
        vendorBankBookUrl = result.data.url
      }

      if (!isVendorRequest) {
        const profileUpdates: Record<string, string> = {}
        if (phone.trim() !== (appUser.phone || '')) profileUpdates.phone = phone.trim()
        if (!isCorporateCard) {
          if (bankName.trim() !== (appUser.bankName || ''))
            profileUpdates.bankName = bankName.trim()
          if (bankAccount.trim() !== (appUser.bankAccount || ''))
            profileUpdates.bankAccount = bankAccount.trim()
        }

        // Inline bank book upload → profile sync
        if (inlineBankBookFile) {
          const bbData = await fileToBase64(inlineBankBookFile)
          const uploadFn = httpsCallable<
            { file: { name: string; data: string } },
            { fileName: string; storagePath: string; url: string }
          >(functions, 'uploadBankBookV2')
          const result = await uploadFn({ file: { name: inlineBankBookFile.name, data: bbData } })
          profileUpdates.bankBookPath = result.data.storagePath
          profileUpdates.bankBookUrl = result.data.url
          profileUpdates.bankBookImage = ''
        }

        // Inline signature → profile sync
        if (inlineSignature && !appUser?.signature) {
          profileUpdates.signature = inlineSignature
        }

        if (Object.keys(profileUpdates).length > 0) {
          await updateAppUser(profileUpdates)
          queryClient.invalidateQueries({ queryKey: queryKeys.users.all() })
        }
      }

      await createRequest.mutateAsync({
        projectId: currentProject!.id,
        status: 'pending',
        payee,
        phone,
        bankName,
        bankAccount,
        date,
        session,
        committee,
        items: finalItems,
        totalAmount: finalItems.reduce((sum, item) => sum + item.amount, 0),
        receipts,
        requestedBy: {
          uid: user.uid,
          name: appUser.displayName || appUser.name,
          email: appUser.email
        },
        requestedBySignature: isVendorRequest
          ? appUser.signature || null
          : inlineSignature || appUser.signature || null,
        reviewedBy: null,
        reviewedAt: null,
        approvedBy: null,
        approvalSignature: null,
        approvedAt: null,
        rejectionReason: null,
        settlementId: null,
        originalRequestId: null,
        comments,
        ...(isVendorRequest
          ? {
              isVendorRequest: true,
              vendorBankBookPath,
              vendorBankBookUrl
            }
          : {}),
        ...(isCorporateCard ? { isCorporateCard: true } : {})
      })

      setSubmitted(true)
      clearDraft()
      navigate('/my-requests')
    } catch (err) {
      console.error(err)
      toast({ variant: 'danger', message: t('form.submitFailed') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      {/* Draft restored banner */}
      {showDraftBanner && (
        <div className="finance-panel-soft mx-auto mb-4 flex max-w-4xl flex-col gap-2 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#002C5F]">
            {t('form.draftRestored')}
            {draft?.savedAt && (
              <span className="text-[#667085] ml-1">
                ({new Date(draft.savedAt).toLocaleString('ko-KR')})
              </span>
            )}
          </p>
          <button
            onClick={handleClearDraft}
            className="self-end whitespace-nowrap text-xs text-[#002C5F] hover:text-[#001F43] sm:ml-3 sm:self-auto"
          >
            {t('form.draftClear')}
          </button>
        </div>
      )}

      {/* Mobile: collapsible submission checklist */}
      <div className="sm:hidden mb-4 max-w-4xl mx-auto">
        <ReviewChecklist
          items={SUBMISSION_CHECKLIST}
          stage="submission"
          excludeKeys={isCorporateCard ? ['bankBookNameMatches', 'bankBookCorrect'] : undefined}
        />
      </div>

      <div className="flex gap-6 justify-center">
        <form
          onSubmit={handlePreSubmit}
          className="finance-panel rounded-lg p-4 sm:p-6 max-w-4xl flex-1 min-w-0"
        >
          <h2 className="text-xl font-bold text-[#002C5F] mb-1">{t('form.title')}</h2>
          <p className="text-sm text-[#667085] mb-6">{t('form.subtitle')}</p>

          {showRequestTypeDropdown && (
            <div className="mb-4">
              <Select
                options={[
                  { value: 'regular', label: t('form.requestTypeRegular') },
                  { value: 'vendor', label: t('form.requestTypeVendor') },
                  { value: 'corporate_card', label: t('form.requestTypeCorporateCard') }
                ]}
                value={requestType}
                onChange={(v) =>
                  handleRequestTypeChange(v as 'regular' | 'vendor' | 'corporate_card')
                }
                label={t('form.requestType')}
                fullWidth
              />
            </div>
          )}

          <ErrorAlert errors={errors} title={t('form.checkErrors')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <TextField
              label={t('field.payee')}
              required
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
              fullWidth
            />
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">
                {t('field.date')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-[#D8DDE5] rounded px-3 py-2 text-sm focus:border-[#002C5F] focus:outline-none"
              />
            </div>
            <TextField
              label={t('field.phone')}
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="010-0000-0000"
              fullWidth
            />
            <TextField label={t('field.session')} value={session} disabled fullWidth />
            {!isCorporateCard && (
              <div>
                <BankSelect
                  value={bankName}
                  onChange={setBankName}
                  label={t('field.bank')}
                  required
                />
              </div>
            )}
            {!isCorporateCard && (
              <TextField
                label={t('field.bankAccount')}
                required
                value={bankAccount}
                onChange={(e) => setBankAccount(formatBankAccount(e.target.value, bankName))}
                placeholder={t('field.bankAccount')}
                fullWidth
              />
            )}
            <div className="sm:col-span-2">
              {isVendorRequest ? (
                <TextField
                  label={t('field.committee')}
                  value={t('committee.preparation')}
                  disabled
                  fullWidth
                />
              ) : (
                <CommitteeSelect value={committee} onChange={setCommittee} />
              )}
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-[#002C5F]">
                {t('field.items')} <span className="text-red-500">*</span>
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addItem}
                disabled={items.length >= 10}
              >
                {t('form.addItem')}
              </Button>
            </div>
            <p className="text-xs text-[#667085] mb-3">{t('form.itemsHint')}</p>
            <div className="space-y-2">
              {items.map((item, i) => (
                <ItemRow
                  key={i}
                  index={i}
                  item={item}
                  onChange={updateItem}
                  onRemove={removeItem}
                  canRemove={items.length > 1}
                  perKmRate={currentProject?.perKmRate}
                  miniMapRef={(el) => {
                    if (el) miniMapRefs.current.set(i, el)
                    else miniMapRefs.current.delete(i)
                  }}
                  onRoutePathChange={(path) => {
                    if (path) routePathsRef.current.set(i, path)
                    else routePathsRef.current.delete(i)
                  }}
                />
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t border-[#EDF0F4]">
              <span className="text-sm font-semibold text-[#111827]">
                {t('field.totalAmount')}: ₩{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <FileUpload
            files={files}
            onFilesChange={setFiles}
            required={!onlyCarTransport}
            disabled={onlyCarTransport}
          />

          {isVendorRequest && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#374151] mb-1">
                {t('form.vendorBankBook')} <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  if (f) {
                    const err = validateBankBookFile(f)
                    if (err) {
                      setVendorBankBookError(err)
                      setVendorBankBookFile(null)
                      e.target.value = ''
                      return
                    }
                  }
                  setVendorBankBookError(null)
                  setVendorBankBookFile(f)
                }}
                className="w-full text-sm text-[#667085] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#E8EEF5] file:text-[#002C5F] hover:file:bg-[#DCE6F0]"
              />
              {vendorBankBookError && (
                <p className="text-xs text-red-600 mt-1">{vendorBankBookError}</p>
              )}
              {vendorBankBookFile && (
                <>
                  <p className="text-xs text-green-600 mt-1">
                    {vendorBankBookFile.name} ({(vendorBankBookFile.size / 1024).toFixed(0)}KB)
                  </p>
                  {vendorBankBookPreviewUrl && (
                    <div className="mt-2 border border-[#D8DDE5] rounded-lg overflow-hidden inline-block">
                      <BankBookPreview
                        url={vendorBankBookPreviewUrl}
                        alt={t('form.vendorBankBook')}
                        maxHeight="max-h-48"
                        className="object-contain bg-[#F6F7F9]"
                        isPdf={vendorBankBookFile.type === 'application/pdf'}
                      />
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-[#667085] mt-1">{t('form.vendorBankBookHint')}</p>
            </div>
          )}

          {needsBankBook && (
            <InlineBankBookUpload
              file={inlineBankBookFile}
              error={inlineBankBookError}
              onFileChange={setInlineBankBookFile}
              onErrorChange={setInlineBankBookError}
            />
          )}

          {needsSignature && <InlineSignaturePad onChange={setInlineSignature} />}

          <div className="mb-6">
            <TextField
              label={t('field.comments')}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              className="finance-primary-button w-full sm:w-auto"
              disabled={submitting}
              loading={submitting}
            >
              {submitting ? t('common.submitting') : t('form.submitRequest')}
            </Button>
          </div>
        </form>

        {/* Desktop: sticky sidebar submission checklist */}
        <div className="hidden sm:block shrink-0">
          <ReviewChecklist
            items={SUBMISSION_CHECKLIST}
            stage="submission"
            excludeKeys={isCorporateCard ? ['bankBookNameMatches', 'bankBookCorrect'] : undefined}
          />
        </div>
      </div>

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title={t('form.confirmTitle')}
        items={[
          { label: t('field.payee'), value: payee },
          { label: t('field.date'), value: date },
          ...(!isCorporateCard
            ? [{ label: t('field.bankAndAccount'), value: `${bankName} ${bankAccount}` }]
            : []),
          { label: t('field.committee'), value: t(`committee.${committee}`) }
        ]}
        totalAmount={validItems.reduce((sum, item) => sum + item.amount, 0)}
        confirmLabel={t('form.confirmSubmit')}
        requestItems={validItems}
        receiptFiles={files}
      />

      <ProcessingOverlay open={submitting} text={t('common.processingMessage')} />

      <Dialog open={confirmDialog.open} onClose={closeConfirm} size="sm">
        <Dialog.Title onClose={closeConfirm}>{t('common.confirm')}</Dialog.Title>
        <Dialog.Content>
          <p>{confirmDialog.message}</p>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="outline" onClick={closeConfirm}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={confirmDialog.onConfirm}>
            {t('common.confirm')}
          </Button>
        </Dialog.Actions>
      </Dialog>

      {/* 페이지 이동 확인 모달 */}
      {blocker.state === 'blocked' && (
        <Dialog open onClose={() => blocker.reset?.()} size="sm">
          <Dialog.Title onClose={() => blocker.reset?.()} showClose>
            {t('form.blockerTitle')}
          </Dialog.Title>
          <Dialog.Content>
            <p className="text-sm text-[#667085]">{t('form.blockerMessage')}</p>
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              {t('form.continueEditing')}
            </Button>
            <Button
              variant="primary"
              className="finance-primary-button w-full sm:w-auto"
              onClick={() => {
                clearDraft()
                blocker.proceed?.()
              }}
            >
              {t('form.leavePage')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </Layout>
  )
}
