/**
 * Expense management service
 * Handles CRUD operations for business expenses
 */

import { supabase, getAuthUser } from './supabase'
import type { Expense } from '@/types'

/**
 * Create a new expense record
 */
export async function createExpense(data: {
  category: string
  amount_gbp: number
  vat_amount_gbp?: number | null
  description?: string | null
  receipt_url?: string | null
  date: string
  find_id?: string | null
}): Promise<Expense> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error
  return expense as Expense
}

/**
 * Get all expenses for current user
 */
export async function getExpenses(filters?: {
  category?: string
  from_date?: string
  to_date?: string
}): Promise<Expense[]> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.from_date) {
    query = query.gte('date', filters.from_date)
  }

  if (filters?.to_date) {
    query = query.lte('date', filters.to_date)
  }

  // Paginate to bypass Supabase's 1000-row REST cap
  const PAGE_SIZE = 1000
  const expenses: Expense[] = []
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data: page, error } = await query
      .order('date', { ascending: false })
      .range(off, off + PAGE_SIZE - 1)
    if (error) throw error
    if (!page || page.length === 0) break
    expenses.push(...(page as Expense[]))
    if (page.length < PAGE_SIZE) break
  }
  return expenses
}

/**
 * Get a single expense by ID
 */
export async function getExpenseById(id: string): Promise<Expense> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) throw error
  return data as Expense
}

/**
 * Update an expense
 */
export async function updateExpense(
  id: string,
  data: Partial<Omit<Expense, 'id' | 'user_id' | 'created_at'>>
): Promise<Expense> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { data: updated, error } = await supabase
    .from('expenses')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) throw error
  return updated as Expense
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string): Promise<void> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw error
}

/**
 * Get expense summary for tax year
 */
export async function getExpenseSummary(fromDate: string, toDate: string) {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  // Paginate to bypass Supabase's 1000-row REST cap
  const PAGE_SIZE = 1000
  const data: Array<{ category: string | null; amount_gbp: number; vat_amount_gbp: number | null }> = []
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from('expenses')
      .select('category, amount_gbp, vat_amount_gbp')
      .eq('user_id', user.id)
      .gte('date', fromDate)
      .lte('date', toDate)
      .range(off, off + PAGE_SIZE - 1)

    if (error) throw error
    if (!page || page.length === 0) break
    data.push(...(page as Array<{ category: string | null; amount_gbp: number; vat_amount_gbp: number | null }>))
    if (page.length < PAGE_SIZE) break
  }

  const summary = {
    total_amount: 0,
    total_vat: 0,
    by_category: {} as Record<string, { count: number; total: number; vat: number }>,
  }

  data.forEach((expense) => {
    summary.total_amount += expense.amount_gbp
    if (expense.vat_amount_gbp) summary.total_vat += expense.vat_amount_gbp

    const category = expense.category as string
    if (!summary.by_category[category]) {
      summary.by_category[category] = { count: 0, total: 0, vat: 0 }
    }
    summary.by_category[category].count += 1
    summary.by_category[category].total += expense.amount_gbp
    if (expense.vat_amount_gbp) {
      summary.by_category[category].vat += expense.vat_amount_gbp
    }
  })

  return summary
}
