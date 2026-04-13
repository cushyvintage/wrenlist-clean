'use client'

import PhotoUpload from '@/components/listing/PhotoUpload'
import CategoryPicker from '@/components/listing/CategoryPicker'
import SaveAsTemplateInput from '@/components/templates/SaveAsTemplateInput'
import AutoDetectedCategoryBanner from '@/components/add-find/AutoDetectedCategoryBanner'
import AIAutoFillBanner, { type AIAutoFillResult } from '@/components/add-find/AIAutoFillBanner'
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
import { SessionExpiryBanner } from '@/components/layout/SessionExpiryBanner'

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
  const { handleSaveDraft, handlePublish } = useAddFindSubmit({
    formData: form.formData,
    fieldConfig: form.fieldConfig,
    router: form.router,
    setIsLoading: form.setIsLoading,
    setError: form.setError,
    setUploadProgress: form.setUploadProgress,
    setPublishProgress: form.setPublishProgress,
  })

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

        {/* AI Auto-Fill banner */}
        {form.aiAutoFill && !form.dismissedAutoFill ? (
          <AIAutoFillBanner
            data={form.aiAutoFill}
            hasTitle={!!form.formData.title}
            hasDescription={!!form.formData.description}
            hasCategory={!!form.formData.category}
            hasCondition={true}
            hasPrice={!!form.formData.price}
            onApply={(fields: AIAutoFillResult) => {
              if (fields.title) handlers.handleInputChange('title', fields.title)
              if (fields.description) handlers.handleInputChange('description', fields.description)
              if (fields.category) handlers.handleInputChange('category', fields.category)
              if (fields.condition) handlers.handleInputChange('condition', fields.condition)
              if (fields.price) handlers.handleInputChange('price', fields.price)
              form.setAiAutoFill(null)
              form.setDismissedAutoFill(true)
              form.setAutoDetectedCategory(null)
            }}
            onDismiss={() => {
              form.setDismissedAutoFill(true)
              form.setAiAutoFill(null)
            }}
          />
        ) : form.isIdentifying ? (
          <div className="rounded-lg border border-sage/10 bg-sage/5 p-4 text-sm text-sage-dim flex items-center gap-2">
            <span className="animate-pulse">⏳</span> AI is identifying your item...
          </div>
        ) : (
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
        )}

        {/* Photos */}
        <div className="bg-white rounded-lg border border-sage/14 p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-semibold text-ink">Photos</h3>
            {form.formData.photoPreviews.length > 0 && !form.formData.category && (
              <button
                type="button"
                onClick={() => form.formData.photoPreviews[0] && handlers.handleClassifyPhoto(0)}
                disabled={form.classifyingPhotoIndex === 0}
                className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline underline-offset-2"
              >
                {form.classifyingPhotoIndex === 0 ? '⏳ Identifying...' : '🔍 Identify item'}
              </button>
            )}
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
        </div>

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
            💾 Save this as a template →
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
              disabled={form.isLoading}
              className="flex-1 sm:flex-none px-4 py-2 text-sm border border-sage/14 rounded hover:bg-cream-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {form.isLoading ? 'Saving...' : 'Save draft'}
            </button>
            <button
              onClick={handlePublish}
              disabled={form.isLoading}
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
    </>
  )
}
