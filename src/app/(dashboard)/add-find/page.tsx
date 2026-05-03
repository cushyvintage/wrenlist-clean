'use client'

import { useRef, useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import WrenIcon from '@/components/ui/WrenIcon'
import PhotoUpload from '@/components/listing/PhotoUpload'
import CategoryPicker from '@/components/listing/CategoryPicker'
import SaveAsTemplateInput from '@/components/templates/SaveAsTemplateInput'
import AutoDetectedCategoryBanner from '@/components/add-find/AutoDetectedCategoryBanner'
import PhotosAIInline from '@/components/add-find/PhotosAIInline'
import TitleDescriptionSection from '@/components/add-find/TitleDescriptionSection'
import PricingSection from '@/components/add-find/PricingSection'
import ItemDetailsSection from '@/components/add-find/ItemDetailsSection'
import MarketplaceFieldsSection from '@/components/add-find/MarketplaceFieldsSection'
import ShippingSection from '@/components/add-find/ShippingSection'
import FormHeader from '@/components/add-find/FormHeader'
import InternalDetailsSection from '@/components/add-find/InternalDetailsSection'
import StashSection from '@/components/add-find/StashSection'
import { useAddFindForm } from '@/components/add-find/useAddFindForm'
import { useAddFindHandlers } from '@/components/add-find/useAddFindHandlers'
import { useAddFindSubmit } from '@/components/add-find/useAddFindSubmit'
import PublishReadinessChecklist from '@/components/add-find/PublishReadinessChecklist'
import PublishProgressPanel from '@/components/publish/PublishProgressPanel'
import CategoryPlatformStatus from '@/components/add-find/CategoryPlatformStatus'
import { useConnectedPlatforms } from '@/hooks/useConnectedPlatforms'
import { useExtensionInfo } from '@/hooks/useExtensionInfo'
import { SessionExpiryBanner } from '@/components/layout/SessionExpiryBanner'
import Link from 'next/link'

declare const chrome: any

export default function AddFindPage() {
  const form = useAddFindForm()
  const handlers = useAddFindHandlers({
    formData: form.formData,
    setFormData: form.setFormData,
    setError: form.setError,
    setIncompleteRequiredFields: form.setIncompleteRequiredFields,
    setTemplateAppliedBanner: form.setTemplateAppliedBanner,
    setIsGeneratingDescription: form.setIsGeneratingDescription,
    setAutoDetectedCategory: form.setAutoDetectedCategory,
    setClassifyingPhotoIndex: form.setClassifyingPhotoIndex,
  })
  const { disconnected } = useConnectedPlatforms({ pollInterval: 60_000 })
  const extensionInfo = useExtensionInfo()

  // eBay publishes via server-side OAuth; every other marketplace requires
  // the Chrome extension to drive the web form. Detect the mismatch so we
  // can block Publish with a clear explanation instead of silently queuing
  // a job that will never run.
  const nonEbayPlatforms = form.formData.selectedPlatforms.filter((p) => p !== 'ebay')
  const extensionMissing = extensionInfo.detected === false
  const extensionOutdated = extensionInfo.detected === true && extensionInfo.isOutdated
  const blockedByExtension = nonEbayPlatforms.length > 0 && (extensionMissing || extensionOutdated)

  // Brand-new users have no marketplaces connected yet, so selectedPlatforms
  // is empty. Without this guard, Publish would queue a job nobody can act
  // on. Save draft still works — it just stores the find in inventory.
  const noPlatformsSelected = form.formData.selectedPlatforms.length === 0

  // After a save or publish succeeds, log what actually shipped vs what
  // Wren originally suggested. This is the most informative correction
  // signal — captures any edits the user made AFTER the apply step too.
  //
  // Uses sendBeacon so the request survives the immediate router.push
  // navigation that follows on save. Falls back to fetch + keepalive,
  // and finally a plain fetch — all silent failures by contract.
  const logFinalCorrection = (findId: string) => {
    const orig = form.originalSuggestion
    if (!orig) return
    const f = form.formData
    // Project the original suggestion to analytics-relevant fields only —
    // priceLoading is a UI render flag, not data, and shouldn't pollute
    // the jsonb blob we'll be querying later.
    const body = JSON.stringify({
      action: 'final',
      findId,
      suggestion: {
        title: orig.title,
        description: orig.description,
        category: orig.category,
        condition: orig.condition,
        suggestedQuery: orig.suggestedQuery,
        suggestedPrice: orig.suggestedPrice,
        priceReasoning: orig.priceReasoning,
        confidence: orig.confidence,
      },
      finalValues: {
        title: f.title,
        description: f.description,
        category: f.category,
        condition: f.condition,
        price: f.price,
        brand: f.brand,
      },
      confidence: orig.confidence,
      photoCount: f.photoPreviews.length,
    })
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' })
        if (navigator.sendBeacon('/api/ai/log-correction', blob)) return
      }
      fetch('/api/ai/log-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => { /* logging must not break flow */ })
    } catch { /* never throw out of a logging path */ }
  }

  const { handleSaveDraft, handlePublish } = useAddFindSubmit({
    formData: form.formData,
    fieldConfig: form.fieldConfig,
    router: form.router,
    setIsLoading: form.setIsLoading,
    setError: form.setError,
    setUploadProgress: form.setUploadProgress,
    setPublishProgress: form.setPublishProgress,
    setIncompleteRequiredFields: form.setIncompleteRequiredFields,
    onSaveSuccess: logFinalCorrection,
  })

  // Track whether photos card has scrolled out of view (for sticky AI bar on mobile)
  const photosCardRef = useRef<HTMLDivElement>(null)
  const [photosOutOfView, setPhotosOutOfView] = useState(false)
  useEffect(() => {
    const el = photosCardRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => setPhotosOutOfView(!(entries[0]?.isIntersecting ?? true)), { threshold: 0 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const scrollToPhotos = () => photosCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const handleApplyAI = (
    fields: { title?: string; description?: string; category?: string; condition?: string; price?: number },
    outcomes: Record<string, 'kept' | 'rejected'>,
  ) => {
    // Snapshot the suggestion before we clear it so we can log it. We
    // include `originalConfidence` so analytics can tell apart "Wren was
    // confident from the start" from "Wren got there after a refinement".
    const suggestionAtApply = form.aiAutoFill ? {
      title: form.aiAutoFill.title,
      description: form.aiAutoFill.description,
      category: form.aiAutoFill.category,
      condition: form.aiAutoFill.condition,
      suggestedQuery: form.aiAutoFill.suggestedQuery,
      suggestedPrice: form.aiAutoFill.suggestedPrice,
      confidence: form.aiAutoFill.confidence,
      originalConfidence: form.originalSuggestion?.confidence,
    } : null
    const photoCount = form.formData.photoPreviews.length
    const confidence = form.aiAutoFill?.confidence

    if (fields.title) handlers.handleInputChange('title', fields.title)
    if (fields.description) handlers.handleInputChange('description', fields.description)
    if (fields.category) handlers.handleInputChange('category', fields.category)
    if (fields.condition) handlers.handleInputChange('condition', fields.condition as import('@/types').FindCondition)
    if (fields.price) handlers.handleInputChange('price', fields.price)
    form.setAiAutoFill(null)
    form.setDismissedAutoFill(true)
    form.setAutoDetectedCategory(null)

    // Fire-and-forget log of what was kept vs rejected.
    if (suggestionAtApply) {
      fetch('/api/ai/log-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'applied',
          suggestion: suggestionAtApply,
          fieldOutcomes: outcomes,
          confidence,
          photoCount,
        }),
      }).catch(() => { /* logging must not break flow */ })
    }
  }

  return (
    <>
      {/* Publish progress panel */}
      {form.publishProgress && (
        <PublishProgressPanel
          progress={form.publishProgress}
          onClose={() => {
            form.setPublishProgress(null)
            form.router.push('/finds?published=true')
          }}
        />
      )}

      {/* Session expiry warning */}
      <div className="max-w-2xl mx-auto">
        <SessionExpiryBanner disconnected={disconnected} />
      </div>

      {/* Error message */}
      {form.error && !form.publishProgress && (
        <div className="max-w-2xl mx-auto mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 px-4 py-3">
          {form.error}
        </div>
      )}

      {/* Single-column form */}
      <div className="max-w-2xl mx-auto space-y-6 pb-24">
        {/* Header: title, template, platform chips, sourcing trip */}
        <FormHeader
          selectedPlatforms={form.formData.selectedPlatforms}
          onPlatformToggle={handlers.handlePlatformToggle}
          onSelectTemplate={handlers.handleApplyTemplate}
          sourcingTripName={form.sourcingTripName}
          onClearSourcingTrip={() => {
            form.setFormData((prev) => ({ ...prev, sourcingTripId: null }))
            form.setSourcingTripName(null)
          }}
          templateAppliedBanner={form.templateAppliedBanner}
          onDismissTemplateBanner={() => form.setTemplateAppliedBanner(null)}
        />

        {/* Photos — AI identification lives inline here */}
        <div ref={photosCardRef} className="bg-white rounded-lg border border-sage/14 p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-semibold text-ink">Photos</h3>
          </div>
          <PhotoUpload
            photos={form.formData.photos}
            photoPreviews={form.formData.photoPreviews}
            onAddPhotos={handlers.handleAddPhotos}
            onReplacePhotos={handlers.handleReplacePhotos}
            onRemovePhoto={handlers.handleRemovePhoto}
            onReorder={handlers.handleReorderPhotos}
            onSetMain={handlers.handleSetMainPhoto}
            onBulkRemove={handlers.handleBulkRemovePhotos}
            onUpdatePhoto={handlers.handleUpdatePhoto}
            selectedPlatforms={form.formData.selectedPlatforms}
          />
          <PhotosAIInline
            photoCount={form.formData.photoPreviews.length}
            isIdentifying={form.isIdentifying}
            aiAutoFill={form.aiAutoFill}
            dismissed={form.dismissedAutoFill}
            hasTitle={!!form.formData.title}
            hasDescription={!!form.formData.description}
            hasCategory={!!form.formData.category}
            hasPrice={!!form.formData.price}
            onAnalyse={() => {
              form.setDismissedAutoFill(false)
              form.setAiAutoFill(null)
              form.identifyPhotos()
            }}
            onApply={handleApplyAI}
            onDismiss={() => {
              form.setDismissedAutoFill(true)
              form.setAiAutoFill(null)
            }}
            onRefine={form.refinePhotos}
            isRefining={form.isRefining}
            refineError={form.refineError}
            onClearRefineError={() => form.setRefineError(null)}
            isRefined={form.isRefined}
            onResetToOriginal={form.resetToOriginal}
          />
        </div>

        <AutoDetectedCategoryBanner
          autoDetectedCategory={form.autoDetectedCategory}
          hasCategory={!!form.formData.category}
          dismissedAutoDetection={form.dismissedAutoDetection}
          onApply={(cat) => {
            handlers.handleInputChange('category', cat)
            form.setAutoDetectedCategory(null)
          }}
          onDismiss={() => form.setDismissedAutoDetection(true)}
        />

        <TitleDescriptionSection
          title={form.formData.title}
          description={form.formData.description}
          category={form.formData.category}
          titleCharLimit={handlers.titleCharLimit}
          descriptionCharLimit={handlers.descriptionCharLimit}
          incompleteRequiredFields={form.incompleteRequiredFields}
          isGeneratingDescription={form.isGeneratingDescription}
          isbnLookupOpen={form.isbnLookupOpen}
          selectedPlatforms={form.formData.selectedPlatforms}
          onTitleChange={(v) => handlers.handleInputChange('title', v)}
          onDescriptionChange={(v) => handlers.handleInputChange('description', v)}
          onGenerateDescription={handlers.handleGenerateDescription}
          onIsbnLookupOpenChange={form.setIsbnLookupOpen}
          onAuthorFill={(platform, author) => handlers.handlePlatformFieldChange(platform, 'author', author)}
          onIsbnFill={(platform, isbn) => handlers.handlePlatformFieldChange(platform, 'isbn', isbn)}
        />

        {/* Category */}
        <div className={`bg-white rounded-lg border p-6 ${
          form.incompleteRequiredFields.has('category') ? 'border-amber-400' : 'border-sage/14'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <label className="block text-sm font-semibold text-ink">Category</label>
            {form.incompleteRequiredFields.has('category') && (
              <span className="text-xs text-amber-600">Required — complete before publishing</span>
            )}
          </div>
          <CategoryPicker
            value={form.formData.category}
            onChange={(value) => handlers.handleInputChange('category', value)}
            selectedPlatforms={form.formData.selectedPlatforms}
          />
          <CategoryPlatformStatus
            category={form.formData.category}
            selectedPlatforms={form.formData.selectedPlatforms}
          />
        </div>

        <PricingSection
          price={form.formData.price}
          platformPrices={form.formData.platformPrices}
          selectedPlatforms={form.formData.selectedPlatforms}
          incompleteRequiredFields={form.incompleteRequiredFields}
          costPrice={form.formData.costPrice}
          onPriceChange={(v) => handlers.handleInputChange('price', v)}
          onPlatformPriceChange={handlers.handlePlatformPriceChange}
          onCostPriceChange={(v) => handlers.handleInputChange('costPrice', v)}
        />

        <ItemDetailsSection
          brand={form.formData.brand}
          condition={form.formData.condition}
          quantity={form.formData.quantity}
          selectedPlatforms={form.formData.selectedPlatforms}
          fieldConfig={form.fieldConfig}
          incompleteRequiredFields={form.incompleteRequiredFields}
          onBrandChange={(v) => handlers.handleInputChange('brand', v)}
          onConditionChange={(v) => handlers.handleInputChange('condition', v)}
          onQuantityChange={(v) => handlers.handleInputChange('quantity', v)}
        />

        <MarketplaceFieldsSection
          selectedPlatforms={form.formData.selectedPlatforms}
          category={form.formData.category}
          fieldConfig={form.fieldConfig}
          platformFields={form.formData.platformFields}
          onSharedFieldChange={handlers.handleSharedFieldChange}
          onPlatformFieldChange={handlers.handlePlatformFieldChange}
        />

        <ShippingSection
          shippingWeight={form.formData.shippingWeight}
          shippingDimensions={form.formData.shippingDimensions}
          onWeightChange={(v) => handlers.handleInputChange('shippingWeight', v)}
          onDimensionChange={handlers.handleDimensionChange}
        />

        <StashSection
          stashId={form.formData.stashId}
          onChange={(id) => form.setFormData((prev) => ({ ...prev, stashId: id }))}
        />

        <InternalDetailsSection
          sku={form.formData.sku}
          internalNote={form.formData.internalNote}
          category={form.formData.category}
          onSkuChange={(v) => handlers.handleInputChange('sku', v)}
          onInternalNoteChange={(v) => handlers.handleInputChange('internalNote', v)}
          onRegenerateSKU={handlers.handleRegenerateSKU}
        />

        {/* Save as Template */}
        {!form.showSaveAsTemplate ? (
          <button
            onClick={() => form.setShowSaveAsTemplate(true)}
            className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
          >
            <Bookmark className="inline-block w-3 h-3 mr-1 -mt-0.5" /> Save this as a template →
          </button>
        ) : (
          <div className="bg-white rounded-lg border border-sage/14 p-4 sm:p-6">
            <SaveAsTemplateInput
              formData={form.formData}
              onSaveSuccess={() => form.setShowSaveAsTemplate(false)}
              onClose={() => form.setShowSaveAsTemplate(false)}
            />
          </div>
        )}
      </div>

      {/* Extension-required banner — shown when the user has selected a
          non-eBay platform but the Chrome extension is missing or out of
          date. Without this a user could fill the form, click Publish,
          queue a job the extension can't pick up, and watch a spinner
          forever. eBay publishes via server OAuth so those don't need
          the extension. */}
      {blockedByExtension && (
        <div className="max-w-2xl mx-auto mb-3 px-4 py-3 rounded-lg border" style={{ backgroundColor: 'rgba(217,169,56,.12)', borderColor: 'rgba(217,169,56,.3)', color: '#92700C' }}>
          <p className="text-sm font-medium mb-1">
            {extensionMissing ? 'Chrome extension required to publish to ' : 'Extension needs updating to publish to '}
            {nonEbayPlatforms.map((p) => (p.charAt(0).toUpperCase() + p.slice(1))).join(', ')}
          </p>
          <p className="text-xs">
            {extensionMissing
              ? 'eBay publishes through Wrenlist directly, but every other marketplace needs our Chrome extension to drive the listing form.'
              : 'Restart Chrome to auto-update, or reinstall the extension. eBay publishing still works in the meantime.'}
            {' '}
            <Link href="/platform-connect" className="underline font-medium">Go to Platform Connect →</Link>
          </p>
        </div>
      )}

      {/* Sticky Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-sage/14 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <button onClick={() => form.router.back()} className="text-sm text-sage-lt hover:text-sage transition-colors">
            ← Back
          </button>
          <PublishReadinessChecklist
            selectedPlatforms={form.formData.selectedPlatforms}
            category={form.formData.category}
            fieldConfig={form.fieldConfig}
            platformFields={form.formData.platformFields}
            title={form.formData.title}
            price={form.formData.price}
            photoCount={form.formData.photos.length}
            platformPrices={form.formData.platformPrices}
          />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              disabled={form.isLoading || !form.formData.title.trim()}
              title={!form.formData.title.trim() ? 'Add a title first' : undefined}
              className="flex-1 sm:flex-none px-4 py-2 text-sm border border-sage/14 rounded hover:bg-cream-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {form.isLoading ? 'Saving...' : 'Save draft'}
            </button>
            <button
              onClick={handlePublish}
              disabled={form.isLoading || blockedByExtension || noPlatformsSelected}
              title={
                noPlatformsSelected
                  ? 'Connect a marketplace first, or use Save draft'
                  : blockedByExtension
                    ? extensionMissing
                      ? 'Install the Chrome extension to publish to non-eBay marketplaces'
                      : 'Extension is out of date — restart Chrome to update'
                    : undefined
              }
              className="flex-1 sm:flex-none px-4 py-2 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {form.isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Publishing...
                </>
              ) : 'Publish'}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky AI bar — mobile only, appears when AI has results and photos card has scrolled off screen */}
      {form.aiAutoFill && !form.dismissedAutoFill && photosOutOfView && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-white border-t border-sage/14 sm:hidden">
          <button
            type="button"
            onClick={scrollToPhotos}
            className="w-full rounded-lg bg-sage text-white text-sm px-4 py-3 flex items-center justify-center gap-2"
          >
            <WrenIcon size="sm" /> Wren has suggestions — tap to view
          </button>
        </div>
      )}
    </>
  )
}
