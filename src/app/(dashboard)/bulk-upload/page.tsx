'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CATEGORY_MAP } from '@/data/marketplace-category-map'
import type { FindCondition } from '@/types'

interface CsvRow {
  [key: string]: string | undefined
}

interface ParsedFind {
  title: string
  description: string
  category: string
  brand: string
  condition: FindCondition
  asking_price_gbp: number | null
  cost_gbp: number | null
  sku?: string
  errors: string[]
}

interface ImportResult {
  success: boolean
  findId?: string
  error?: string
}

const VALID_CONDITIONS: FindCondition[] = ['excellent', 'good', 'fair']
const VALID_CATEGORIES = Object.keys(CATEGORY_MAP)

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields
}

function parseCSV(csvText: string): CsvRow[] {
  const lines = csvText.split('\n')
  if (lines.length === 0) return []

  const headerLine = lines[0] || ''
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue

    const values = parseCSVLine(line)
    const row: CsvRow = {}

    headers.forEach((header, idx) => {
      const val = values[idx]
      if (val) {
        row[header] = val.trim()
      }
    })

    rows.push(row)
  }

  return rows
}

function validateRow(row: CsvRow): ParsedFind {
  const errors: string[] = []

  const title = row.title?.trim() || ''
  const description = row.description?.trim() || ''
  const category = (row.category?.trim() || '').toLowerCase()
  const brand = row.brand?.trim() || ''
  const condition = (row.condition?.trim() || '').toLowerCase()
  const price = row.price?.trim() || ''
  const costPrice = row.cost_price?.trim() || ''
  const sku = row.sku?.trim()

  if (!title) errors.push('Missing title')
  if (!category) {
    errors.push('Missing category')
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.push(`Invalid category: ${category}`)
  }
  if (!condition) {
    errors.push('Missing condition')
  } else if (!VALID_CONDITIONS.includes(condition as FindCondition)) {
    errors.push(`Invalid condition: ${condition}`)
  }
  if (!price) {
    errors.push('Missing price')
  }

  let asking_price_gbp: number | null = null
  let cost_gbp: number | null = null

  if (price) {
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push(`Invalid price: ${price}`)
    } else {
      asking_price_gbp = priceNum
    }
  }

  if (costPrice) {
    const costNum = parseFloat(costPrice)
    if (isNaN(costNum) || costNum < 0) {
      errors.push(`Invalid cost_price: ${costPrice}`)
    } else {
      cost_gbp = costNum
    }
  }

  return {
    title,
    description,
    category,
    brand,
    condition: condition as FindCondition,
    asking_price_gbp,
    cost_gbp,
    sku,
    errors,
  }
}

export default function BulkUploadPage() {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedFind[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      const rows = parseCSV(text)
      const validated = rows.map(validateRow)
      setParsedRows(validated)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.name.endsWith('.csv')) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      const rows = parseCSV(text)
      const validated = rows.map(validateRow)
      setParsedRows(validated)
    }
    reader.readAsText(file)
  }, [])

  const handleImport = useCallback(async () => {
    setIsImporting(true)
    setImportProgress(0)
    setImportResults([])

    const results: ImportResult[] = []

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i]
    if (!row) continue


      if (row.errors.length > 0) {
        results.push({
          success: false,
          error: row.errors.join('; '),
        })
        setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100))
        continue
      }

      try {
        const response = await fetch('/api/finds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: row.title,
            description: row.description,
            category: row.category,
            brand: row.brand,
            condition: row.condition,
            asking_price_gbp: row.asking_price_gbp,
            cost_gbp: row.cost_gbp,
            sku: row.sku || undefined,
            status: 'draft',
            source_type: 'bulk_upload',
            source_name: 'CSV import',
            platform_fields: {},
          }),
        })

        if (response.ok) {
          const data = await response.json()
          results.push({
            success: true,
            findId: data.data?.id,
          })
        } else {
          const error = await response.json()
          results.push({
            success: false,
            error: error.message || 'Failed to create find',
          })
        }
      } catch (err) {
        results.push({
          success: false,
          error: err instanceof Error ? err.message : 'Network error',
        })
      }

      setImportProgress(Math.round(((i + 1) / parsedRows.length) * 100))
    }

    setImportResults(results)
    setIsImporting(false)
    setShowResults(true)
  }, [parsedRows])

  const successCount = importResults.filter(r => r.success).length
  const skipCount = importResults.filter(r => !r.success).length
  const validCount = parsedRows.filter(r => r.errors.length === 0).length

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-sage/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Bulk Import Finds</h1>
            <p className="text-sm text-sage mt-1">Import multiple finds from a CSV file</p>
          </div>
        </div>

        {!showResults ? (
          <div className="space-y-6">
            <div className="bg-white border border-sage/20 rounded-lg p-6">
              <h2 className="font-semibold mb-3">CSV Format</h2>
              <p className="text-sm text-sage mb-4">Your CSV file should have these columns:</p>
              <code className="block bg-cream p-4 rounded text-xs overflow-x-auto whitespace-pre">
{`title,description,category,brand,condition,price,cost_price,sku
"Victorian Doulton jug","Blue transfer...","ceramics","Royal Doulton","good",25,5,WL-CER-001`}
              </code>
              <div className="mt-4 text-sm">
                <p className="font-semibold mb-2">Required: title, category, condition, price</p>
                <p className="text-sage">Optional: description, brand, cost_price, sku</p>
              </div>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-sage/30 rounded-lg p-8 text-center cursor-pointer hover:bg-cream/50"
            >
              <Upload className="w-12 h-12 text-sage/50 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Drag and drop CSV here</h3>
              <p className="text-sm text-sage mb-4">or</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="px-4 py-2 bg-sage text-cream rounded-lg font-semibold hover:bg-sage/80 cursor-pointer inline-block">
                  Select CSV
                </span>
              </label>
            </div>

            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Preview ({parsedRows.length} finds)</h2>

                <div className="overflow-x-auto border border-sage/20 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-cream border-b border-sage/20">
                      <tr>
                        <th className="px-4 py-2 text-left">✓</th>
                        <th className="px-4 py-2 text-left">Title</th>
                        <th className="px-4 py-2 text-left">Category</th>
                        <th className="px-4 py-2 text-left">Price</th>
                        <th className="px-4 py-2 text-left">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="border-t border-sage/20">
                          <td className="px-4 py-2">
                            {row.errors.length === 0 ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                          </td>
                          <td className="px-4 py-2">{row.title}</td>
                          <td className="px-4 py-2">{row.category}</td>
                          <td className="px-4 py-2">{row.asking_price_gbp ? `£${row.asking_price_gbp}` : '-'}</td>
                          <td className="px-4 py-2 text-red-600 text-xs">{row.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleImport}
                  disabled={isImporting || validCount === 0}
                  className="w-full px-4 py-3 bg-sage text-cream rounded-lg font-semibold hover:bg-sage/80 disabled:bg-sage/50"
                >
                  {isImporting ? `Importing... ${importProgress}%` : `Import ${validCount} Finds`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-cream border border-sage/20 rounded-lg p-6">
              <div>
                <h2 className="text-lg font-semibold">Import Complete</h2>
                <p className="text-sm text-sage mt-1">{successCount} imported • {skipCount} skipped</p>
              </div>
              <button
                onClick={() => router.push('/inventory')}
                className="px-4 py-2 bg-sage text-cream rounded-lg font-semibold hover:bg-sage/80"
              >
                Go to Inventory
              </button>
            </div>

            {successCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-900 mb-3">✓ Imported ({successCount})</h3>
                <div className="text-sm text-green-800 space-y-1">
                  {importResults.filter(r => r.success).slice(0, 3).map((_, i) => (
                    <div key={i}>{parsedRows[i]?.title}</div>
                  ))}
                  {successCount > 3 && <div className="font-semibold">+{successCount - 3} more</div>}
                </div>
              </div>
            )}

            {skipCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="font-semibold text-red-900 mb-3">✗ Skipped ({skipCount})</h3>
                <div className="text-sm text-red-800 space-y-1">
                  {importResults.filter(r => !r.success).slice(0, 3).map((r, i) => (
                    <div key={i}>{r.error}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setCsvText('')
                setParsedRows([])
                setImportResults([])
                setShowResults(false)
              }}
              className="w-full px-4 py-3 bg-cream border border-sage/20 rounded-lg font-semibold hover:bg-cream/80"
            >
              Import Another File
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
