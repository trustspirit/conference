import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, Link, useBlocker } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../hooks/queries/queryKeys'
import { useAuth } from '../contexts/AuthContext'
import { useProject } from '../contexts/ProjectContext'
import { useRequest, useCreateRequest } from '../hooks/queries/useRequests'
import { useUploadReceipts } from '../hooks/queries/useCloudFunctions'
import { RequestItem, Receipt, Committee } from '../types'
import Layout from '../components/Layout'
import ProcessingOverlay from '../components/ProcessingOverlay'
import ItemRow from '../components/ItemRow'
import FileUpload from '../components/FileUpload'
import CommitteeSelect from '../components/CommitteeSelect'
import ConfirmModal from '../components/ConfirmModal'
import { formatPhone, formatBankAccount, fileToBase64 } from '../lib/utils'
import { captureAndUploadRouteMaps } from '../lib/captureRouteMap'
import BankSelect from '../components/BankSelect'
import ErrorAlert from '../components/ErrorAlert'
import InlineSignaturePad from '../components/InlineSignaturePad'
import InlineBankBookUpload from '../components/InlineBankBookUpload'
import Spinner from '../components/Spinner'
import { useTranslation } from 'react-i18next'
import { TextField, Button, Checkbox, useToast, Dialog } from 'trust-ui-react'
import { validateBankBookFile } from '../lib/utils'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@conference/firebase'

const emptyItem = (): RequestItem => ({ description: '', budgetCode: 0, amount: 0 })

export default function ResubmitPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const { user, appUser, updateAppUser } = useAuth()
  const { currentProject } = useProject()
  const navigate = useNavigate()

  const { data: original, isLoading: loading } = useRequest(id)
  const queryClient = useQueryClient()
  const createRequest = useCreateRequest()
  const uploadReceiptsMutation = useUploadReceipts()

  const [payee, setPayee] = useState('')
  const [phone, setPhone] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [date, setDate] = useState('')
  const [session] = useState('한국')
  const [committee, setCommittee] = useState<Committee>('operations')
  const [items, setItems] = useState<RequestItem[]>([emptyItem()])
  const [files, setFiles] = useState<File[]>([])
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [isVendorRequest, setIsVendorRequest] = useState(false)
  const [isCorporateCard, setIsCorporateCard] = useState(false)
  const [vendorBankBookFile, setVendorBankBookFile] = useState<File | null>(null)
  const [vendorBankBookError, setVendorBankBookError] = useState<string | null>(null)
  const [inlineBankBookFile, setInlineBankBookFile] = useState<File | null>(null)
  const [inlineBankBookError, setInlineBankBookError] = useState<string | null>(null)
  const [inlineSignature, setInlineSignature] = useState('')
  const miniMapRefs = useRef(new Map<number, HTMLDivElement>())
  const routePathsRef = useRef(new Map<number, number[]>())

  useEffect(() => {
    if (!original) return
    setPayee(original.payee)
    setPhone(original.phone)
    setBankName(original.bankName)
    setBankAccount(original.bankAccount)
    setDate(original.date)
    setCommittee(original.committee)
    setItems(original.items.length > 0 ? original.items : [emptyItem()])
    setComments(original.comments)
    setIsVendorRequest(original.isVendorRequest || false)
    setIsCorporateCard(original.isCorporateCard || false)
  }, [original])

  // Re-format account number when bank changes
  const bankNameMounted = useRef(false)
  useEffect(() => {
    if (!bankNameMounted.current) {
      bankNameMounted.current = true
      return
    }
    if (bankName && bankAccount) setBankAccount(formatBankAccount(bankAccount, bankName))
  }, [bankName]) // eslint-disable-line react-hooks/exhaustive-deps

  const needsBankBook = !isVendorRequest && !isCorporateCard && !appUser?.bankBookUrl && !appUser?.bankBookDriveUrl
  const needsSignature = !isVendorRequest && !appUser?.signature

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const validItems = items.filter((item) => item.description && item.amount > 0)
  const onlyCarTransport =
    items.some((item) => item.transportDetail?.transportType === 'car') &&
    items.filter((item) => item.budgetCode > 0).every((item) => item.transportDetail?.transportType === 'car')

  const hasChanges = (): boolean => {
    if (!original) return false
    if (payee !== original.payee) return true
    if (phone !== original.phone) return true
    if (bankName !== original.bankName) return true
    if (bankAccount !== original.bankAccount) return true
    if (date !== original.date) return true
    if (committee !== original.committee) return true
    if (comments !== original.comments) return true
    if (files.length > 0) return true
    // Compare items field by field
    if (original.items.length !== validItems.length) return true
    const itemsChanged = validItems.some((curr, i) => {
      const orig = original.items[i]
      return (
        curr.description !== orig.description ||
        curr.budgetCode !== orig.budgetCode ||
        curr.amount !== orig.amount ||
        JSON.stringify(curr.transportDetail) !== JSON.stringify(orig.transportDetail)
      )
    })
    if (itemsChanged) return true
    return false
  }

  const hasContent = useCallback(() => {
    if (!original) return false
    if (payee !== original.payee) return true
    if (phone !== original.phone) return true
    if (bankName !== original.bankName) return true
    if (bankAccount !== original.bankAccount) return true
    if (date !== original.date) return true
    if (committee !== original.committee) return true
    if (comments !== original.comments) return true
    if (files.length > 0) return true
    if (vendorBankBookFile !== null) return true
    if (inlineBankBookFile !== null) return true
    if (inlineSignature !== '') return true
    const validItems = items.filter((item) => item.description && item.amount > 0)
    if (original.items.length !== validItems.length) return true
    const itemsChanged = validItems.some((curr, i) => {
      const orig = original.items[i]
      return curr.description !== orig.description || curr.budgetCode !== orig.budgetCode || curr.amount !== orig.amount || JSON.stringify(curr.transportDetail) !== JSON.stringify(orig.transportDetail)
    })
    return itemsChanged
  }, [original, payee, phone, bankName, bankAccount, date, committee, comments, files, vendorBankBookFile, inlineBankBookFile, inlineSignature, items])

  const blocker = useBlocker(({ nextLocation }) => {
    if (submitting) return false
    if (showConfirm) return true
    if (nextLocation.pathname.startsWith('/request/')) return false
    return hasContent()
  })

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasContent()) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasContent])

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
    // receipts: use new files or keep original (not required for car-only transport)
    if (!onlyCarTransport && files.length === 0 && (!original?.receipts || original.receipts.length === 0)) {
      errs.push(t('validation.receiptsRequired'))
    }
    // Signature validation
    if (isVendorRequest) {
      if (!appUser?.signature) errs.push(t('validation.signatureRequired'))
    } else {
      if (!appUser?.signature && !inlineSignature) errs.push(t('validation.signatureRequired'))
    }
    // Bank book validation
    if (isVendorRequest) {
      if (!vendorBankBookFile && !original?.vendorBankBookUrl)
        errs.push(t('validation.vendorBankBookRequired'))
    } else if (!isCorporateCard) {
      if (!appUser?.bankBookUrl && !appUser?.bankBookDriveUrl && !inlineBankBookFile)
        errs.push(t('validation.bankBookRequired'))
    }
    if (!hasChanges()) errs.push(t('validation.noChanges'))
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
    setShowConfirm(true)
  }

  const handleSubmit = async () => {
    if (!user || !appUser || !original || !currentProject) return
    setShowConfirm(false)
    setSubmitting(true)

    try {
      let receipts: Receipt[] = []
      if (files.length > 0) {
        const fileData = await Promise.all(
          files.map(async (f) => ({ name: f.name, data: await fileToBase64(f) }))
        )
        receipts = await uploadReceiptsMutation.mutateAsync({
          files: fileData,
          committee,
          projectId: currentProject.id
        })
      } else if (!onlyCarTransport) {
        receipts = original.receipts
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

        // Delete old route map files where departure/destination changed
        const oldMapPaths: string[] = []
        for (let i = 0; i < original.items.length; i++) {
          const oldDetail = original.items[i].transportDetail
          const newDetail = finalItems[i]?.transportDetail
          if (!oldDetail?.routeMapImage?.storagePath) continue
          const changed =
            !newDetail ||
            oldDetail.departure !== newDetail.departure ||
            oldDetail.destination !== newDetail.destination
          if (changed) oldMapPaths.push(oldDetail.routeMapImage.storagePath)
        }
        if (oldMapPaths.length > 0) {
          const deleteFiles = httpsCallable<{ paths: string[] }>(functions, 'deleteStorageFiles')
          deleteFiles({ paths: oldMapPaths }).catch(() => {})
        }
      }

      let vendorBankBookPath = original?.vendorBankBookPath
      let vendorBankBookUrl = original?.vendorBankBookUrl
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
          if (bankName.trim() !== (appUser.bankName || '')) profileUpdates.bankName = bankName.trim()
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
        projectId: currentProject.id,
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
          ? (appUser.signature || null)
          : (inlineSignature || appUser.signature || null),
        reviewedBy: null,
        reviewedAt: null,
        approvedBy: null,
        approvalSignature: null,
        approvedAt: null,
        rejectionReason: null,
        settlementId: null,
        originalRequestId: original.id,
        comments,
        ...(isVendorRequest
          ? {
              isVendorRequest: true,
              vendorBankBookPath,
              vendorBankBookUrl
            }
          : {}),
        isCorporateCard: isCorporateCard || undefined
      })

      navigate('/my-requests')
    } catch (err) {
      console.error(err)
      toast({ variant: 'danger', message: t('form.submitFailed') })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <Layout>
        <Spinner />
      </Layout>
    )
  if (!original)
    return (
      <Layout>
        <p className="text-gray-500">{t('detail.notFound')}</p>
      </Layout>
    )
  if (
    original.status !== 'rejected' &&
    original.status !== 'cancelled' &&
    original.status !== 'force_rejected'
  )
    return (
      <Layout>
        <p className="text-gray-500">{t('approval.rejectedOnly')}</p>
      </Layout>
    )
  if (original.requestedBy.uid !== user?.uid)
    return (
      <Layout>
        <p className="text-gray-500">{t('detail.notFound')}</p>
      </Layout>
    )
  if (original.projectId !== currentProject?.id)
    return (
      <Layout>
        <p className="text-gray-500">{t('detail.notFound')}</p>
      </Layout>
    )

  return (
    <Layout>
      {/* 반려 사유 표시 */}
      {original.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-4xl mx-auto">
          <h3 className="text-sm font-medium text-red-800 mb-1">{t('approval.rejectionReason')}</h3>
          <p className="text-sm text-red-700">{original.rejectionReason}</p>
        </div>
      )}

      <form
        onSubmit={handlePreSubmit}
        className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-4xl mx-auto"
      >
        <h2 className="text-xl font-bold mb-1">{t('approval.resubmitTitle')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('approval.resubmitDescription')}</p>

        {original?.isVendorRequest && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <Checkbox checked={true} onChange={() => {}} label={t('form.vendorRequest')} disabled />
            <p className="text-xs text-gray-500 mt-1 ml-6">{t('form.vendorRequestHint')}</p>
          </div>
        )}

        <ErrorAlert errors={errors} />

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
            fullWidth
          />
          <TextField label={t('field.session')} value={session} disabled fullWidth />
          {!isCorporateCard && (
            <div>
              <BankSelect value={bankName} onChange={setBankName} label={t('field.bank')} required />
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
          existingCount={onlyCarTransport ? 0 : original.receipts.length}
          existingLabel={`${t('field.receipts')} ${original.receipts.length} - existing kept. Upload new to replace.`}
          existingFiles={onlyCarTransport ? [] : original.receipts.map((r) => ({ url: r.url, fileName: r.fileName }))}
        />

        {isVendorRequest && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.vendorBankBook')} <span className="text-red-500">*</span>
            </label>
            {original?.vendorBankBookUrl && !vendorBankBookFile && (
              <p className="text-xs text-green-600 mb-1">{t('form.vendorBankBookExisting')}</p>
            )}
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
            {vendorBankBookFile ? (
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
            ) : (
              original?.vendorBankBookUrl && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden inline-block">
                  <img
                    src={original.vendorBankBookUrl}
                    alt={t('form.vendorBankBook')}
                    className="max-h-48 object-contain bg-gray-50"
                  />
                </div>
              )
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

        <div className="flex items-center justify-between">
          <Link to={`/request/${original.id}`} className="text-sm text-gray-500 hover:underline">
            {t('approval.originalRequest')}
          </Link>
          <Button type="submit" variant="primary" disabled={submitting} loading={submitting}>
            {submitting ? t('common.submitting') : t('approval.resubmit')}
          </Button>
        </div>
      </form>

      <ProcessingOverlay open={submitting} text={t('common.processingMessage')} />

      <ConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title={t('approval.resubmitTitle')}
        items={[{ label: t('field.payee'), value: payee }]}
        totalAmount={validItems.reduce((sum, item) => sum + item.amount, 0)}
        confirmLabel={t('approval.resubmitConfirm')}
        requestItems={validItems}
        receiptFiles={files.length > 0 ? files : undefined}
      />

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
            <Button variant="primary" onClick={() => blocker.proceed?.()}>
              {t('form.leavePage')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      )}
    </Layout>
  )
}
