import { useState, useEffect, useCallback, useRef } from 'react'
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
import { TextField, Button, Dialog, Checkbox, useToast } from 'trust-ui-react'
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
  const [vendorBankBookFile, setVendorBankBookFile] = useState<File | null>(null)
  const [vendorBankBookError, setVendorBankBookError] = useState<string | null>(null)
  const [inlineBankBookFile, setInlineBankBookFile] = useState<File | null>(null)
  const [inlineBankBookError, setInlineBankBookError] = useState<string | null>(null)
  const [inlineSignature, setInlineSignature] = useState('')

  const showVendorOption = appUser ? canCreateVendorRequest(appUser.role, committee) : false

  const needsBankBook = !isVendorRequest && !appUser?.bankBookUrl && !appUser?.bankBookDriveUrl
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
    validItems.length > 0 &&
    validItems.every((item) => item.transportDetail?.transportType === 'car')

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
        saveDraft({ payee, phone, bankName, bankAccount, date, committee, items, comments, isVendorRequest })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [payee, phone, bankName, bankAccount, date, committee, items, comments, isVendorRequest, hasContent, submitted])

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
    if (!bankName.trim()) errs.push(t('validation.bankRequired'))
    if (!bankAccount.trim()) errs.push(t('validation.bankAccountRequired'))
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
    } else {
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
        if (bankName.trim() !== (appUser.bankName || '')) profileUpdates.bankName = bankName.trim()
        if (bankAccount.trim() !== (appUser.bankAccount || ''))
          profileUpdates.bankAccount = bankAccount.trim()

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
          : {})
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-sm text-blue-700">
            {t('form.draftRestored')}
            {draft?.savedAt && (
              <span className="text-blue-500 ml-1">
                ({new Date(draft.savedAt).toLocaleString('ko-KR')})
              </span>
            )}
          </p>
          <button
            onClick={handleClearDraft}
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap ml-3"
          >
            {t('form.draftClear')}
          </button>
        </div>
      )}

      {/* Mobile: collapsible submission checklist */}
      <div className="sm:hidden mb-4 max-w-4xl mx-auto">
        <ReviewChecklist items={SUBMISSION_CHECKLIST} stage="submission" />
      </div>

      <div className="flex gap-6 justify-center">
        <form
          onSubmit={handlePreSubmit}
          className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-4xl flex-1 min-w-0"
        >
          <h2 className="text-xl font-bold mb-1">{t('form.title')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('form.subtitle')}</p>

          {showVendorOption && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <Checkbox
                checked={isVendorRequest}
                onChange={(e) => handleVendorToggle(e.target.checked)}
                label={t('form.vendorRequest')}
              />
              <p className="text-xs text-gray-500 mt-1 ml-6">{t('form.vendorRequestHint')}</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('field.date')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
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
            <div>
              <BankSelect value={bankName} onChange={setBankName} label={t('field.bank')} required />
            </div>
            <TextField
              label={t('field.bankAccount')}
              required
              value={bankAccount}
              onChange={(e) => setBankAccount(formatBankAccount(e.target.value, bankName))}
              placeholder={t('field.bankAccount')}
              fullWidth
            />
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
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
            <div className="flex justify-end mt-3 pt-3 border-t">
              <span className="text-sm font-medium">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {vendorBankBookError && (
                <p className="text-xs text-red-600 mt-1">{vendorBankBookError}</p>
              )}
              {vendorBankBookFile && (
                <>
                  <p className="text-xs text-green-600 mt-1">
                    {vendorBankBookFile.name} ({(vendorBankBookFile.size / 1024).toFixed(0)}KB)
                  </p>
                  {vendorBankBookFile.type.startsWith('image/') && (
                    <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden inline-block">
                      <img
                        src={URL.createObjectURL(vendorBankBookFile)}
                        alt={t('form.vendorBankBook')}
                        className="max-h-48 object-contain bg-gray-50"
                      />
                    </div>
                  )}
                </>
              )}
              <p className="text-xs text-gray-400 mt-1">{t('form.vendorBankBookHint')}</p>
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

          {needsSignature && (
            <InlineSignaturePad onChange={setInlineSignature} />
          )}

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
            <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>
              {submitting ? t('common.submitting') : t('form.submitRequest')}
            </Button>
          </div>
        </form>

        {/* Desktop: sticky sidebar submission checklist */}
        <div className="hidden sm:block shrink-0">
          <ReviewChecklist items={SUBMISSION_CHECKLIST} stage="submission" />
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
          { label: t('field.bankAndAccount'), value: `${bankName} ${bankAccount}` },
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
            <p className="text-sm text-gray-500">{t('form.blockerMessage')}</p>
          </Dialog.Content>
          <Dialog.Actions>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              {t('form.continueEditing')}
            </Button>
            <Button
              variant="primary"
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
