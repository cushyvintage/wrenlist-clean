'use client'

import { useState, useCallback } from 'react'

export type ImportPhase = 'idle' | 'fetching' | 'importing' | 'done' | 'error'

export interface ImportState {
  phase: ImportPhase
  total: number
  imported: number
  skipped: number
  errors: number
  message: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: number
}

const BATCH_SIZE = 20

/**
 * Hook for batched marketplace imports with progress tracking
 */
export function useMarketplaceImport() {
  const [state, setState] = useState<ImportState>({
    phase: 'idle',
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    message: '',
  })

  const reset = useCallback(() => {
    setState({
      phase: 'idle',
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      message: '',
    })
  }, [])

  const runImport = useCallback(async (items: any[], marketplace: string) => {
    if (!items || items.length === 0) {
      setState({
        phase: 'error',
        total: 0,
        imported: 0,
        skipped: 0,
        errors: 0,
        message: 'No items to import',
      })
      return
    }

    try {
      setState({
        phase: 'importing',
        total: items.length,
        imported: 0,
        skipped: 0,
        errors: 0,
        message: `Importing 0 of ${items.length}...`,
      })

      let totalImported = 0
      let totalSkipped = 0
      let totalErrors = 0

      // Process in batches of BATCH_SIZE
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE)
        const batchIndex = Math.floor(i / BATCH_SIZE)
        const totalBatches = Math.ceil(items.length / BATCH_SIZE)

        try {
          const response = await fetch(`/api/${marketplace}/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: batch,
              batchIndex,
              totalBatches,
            }),
          })

          if (!response.ok) {
            throw new Error(`Batch ${batchIndex + 1} failed`)
          }

          const data = await response.json()
          const result = data.data as ImportResult

          totalImported += result.imported || 0
          totalSkipped += result.skipped || 0
          totalErrors += result.errors || 0

          // Update state after each batch
          setState({
            phase: 'importing',
            total: items.length,
            imported: totalImported,
            skipped: totalSkipped,
            errors: totalErrors,
            message: `Importing ${totalImported} of ${items.length}...`,
          })
        } catch (batchError) {
          // Log batch error but continue with remaining batches
          const errorMsg = batchError instanceof Error ? batchError.message : 'Batch import failed'
          console.error(`Batch ${batchIndex + 1} error:`, errorMsg)
          totalErrors += batch.length // Count all items in failed batch as errors
        }
      }

      setState({
        phase: 'done',
        total: items.length,
        imported: totalImported,
        skipped: totalSkipped,
        errors: totalErrors,
        message: `✓ ${totalImported} imported${totalSkipped > 0 ? `, ${totalSkipped} skipped` : ''}`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      setState({
        phase: 'error',
        total: items.length,
        imported: 0,
        skipped: 0,
        errors: 0,
        message,
      })
    }
  }, [])

  const setFetching = useCallback((message: string) => {
    setState({ phase: 'fetching', total: 0, imported: 0, skipped: 0, errors: 0, message })
  }, [])

  const setDone = useCallback((imported: number, skipped: number, errors: number, total: number) => {
    setState({
      phase: 'done',
      total,
      imported,
      skipped,
      errors,
      message: `✓ ${imported} imported${skipped > 0 ? `, ${skipped} skipped` : ''}`,
    })
  }, [])

  const setError = useCallback((message: string) => {
    setState({ phase: 'error', total: 0, imported: 0, skipped: 0, errors: 0, message })
  }, [])

  const runImportProgress = useCallback((imported: number, skipped: number, errors: number, total: number) => {
    setState((prev) => ({
      ...prev,
      phase: 'importing',
      imported,
      skipped,
      errors,
      total: total || prev.total,
      message: `Importing ${imported} of ${total || prev.total}...`,
    }))
  }, [])

  return { state, runImport, reset, setFetching, setDone, setError, runImportProgress }
}
