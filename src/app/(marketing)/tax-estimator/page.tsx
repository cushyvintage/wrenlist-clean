'use client'

import { useState, useMemo } from 'react'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'

/**
 * UK Reseller Tax Calculator
 *
 * This is an EDUCATIONAL TOOL, not tax advice. It estimates taxable profit
 * for UK resellers based on publicly available HMRC guidance (2025/26 tax year):
 *
 *   - Personal allowance: £12,570 (0% tax)
 *   - Trading allowance: £1,000 (tax-free gross trading income)
 *   - Basic rate: 20% (£12,571 – £50,270)
 *   - Higher rate: 40% (£50,271 – £125,140)
 *   - Additional rate: 45% (over £125,140)
 *   - Class 4 NIC: 6% (£12,570 – £50,270), 2% above
 *   - Mileage: 45p/mile first 10,000, 25p/mile after (simplified expenses)
 *
 * Always shows a disclaimer. Never generates a formal SA103/SA100 document.
 */

const PERSONAL_ALLOWANCE = 12570
const TRADING_ALLOWANCE = 1000
const BASIC_RATE_CEILING = 50270
const HIGHER_RATE_CEILING = 125140
const BASIC_RATE = 0.20
const HIGHER_RATE = 0.40
const ADDITIONAL_RATE = 0.45
const CLASS4_LOWER_BAND = 0.06
const CLASS4_UPPER_BAND = 0.02
const MILEAGE_RATE_FIRST_10K = 0.45
const MILEAGE_RATE_AFTER = 0.25

interface TaxResult {
  grossSales: number
  totalExpenses: number
  mileageExpense: number
  grossProfit: number
  tradingAllowanceApplied: boolean
  taxableProfit: number
  incomeTax: number
  class4Nic: number
  totalTax: number
  netProfit: number
  effectiveRate: number
  overTradingAllowance: boolean
  overThreshold: boolean
}

function calculateTax(input: {
  salary: number
  grossSales: number
  cogs: number
  postage: number
  platformFees: number
  otherExpenses: number
  mileage: number
}): TaxResult {
  const { salary, grossSales, cogs, postage, platformFees, otherExpenses, mileage } = input

  // Mileage expense (HMRC simplified expenses rate)
  const mileageFirst10k = Math.min(mileage, 10000) * MILEAGE_RATE_FIRST_10K
  const mileageAfter = Math.max(0, mileage - 10000) * MILEAGE_RATE_AFTER
  const mileageExpense = mileageFirst10k + mileageAfter

  const totalExpenses = cogs + postage + platformFees + otherExpenses + mileageExpense
  const grossProfit = grossSales - totalExpenses

  // Trading allowance: if gross trading income ≤ £1,000, no tax due on trading
  // If gross income > £1,000, seller can claim either actual expenses OR £1,000 allowance (whichever higher)
  const allowanceVsExpenses = Math.max(TRADING_ALLOWANCE, totalExpenses)
  const useAllowance = grossSales > TRADING_ALLOWANCE && TRADING_ALLOWANCE > totalExpenses
  const taxableProfit = grossSales <= TRADING_ALLOWANCE
    ? 0
    : Math.max(0, grossSales - allowanceVsExpenses)

  // Income tax calculation — stack trading profit on top of salary
  const totalIncome = salary + taxableProfit
  const salaryAllowanceUsed = Math.min(salary, PERSONAL_ALLOWANCE)
  const remainingAllowance = Math.max(0, PERSONAL_ALLOWANCE - salaryAllowanceUsed)
  const profitAboveAllowance = Math.max(0, taxableProfit - remainingAllowance)

  // Band calculations (on trading profit only)
  let incomeTax = 0
  if (profitAboveAllowance > 0) {
    const totalAfterAllowance = totalIncome - PERSONAL_ALLOWANCE
    const basicBandStart = Math.max(0, salary - PERSONAL_ALLOWANCE)
    const basicBandAvailable = Math.max(0, BASIC_RATE_CEILING - PERSONAL_ALLOWANCE - basicBandStart)
    const higherBandStart = Math.max(0, salary - BASIC_RATE_CEILING)
    const higherBandAvailable = Math.max(0, HIGHER_RATE_CEILING - BASIC_RATE_CEILING - higherBandStart)

    const inBasic = Math.min(profitAboveAllowance, basicBandAvailable)
    const inHigher = Math.min(Math.max(0, profitAboveAllowance - inBasic), higherBandAvailable)
    const inAdditional = Math.max(0, profitAboveAllowance - inBasic - inHigher)

    incomeTax = inBasic * BASIC_RATE + inHigher * HIGHER_RATE + inAdditional * ADDITIONAL_RATE
  }

  // Class 4 NIC on self-employed profits
  let class4Nic = 0
  if (taxableProfit > PERSONAL_ALLOWANCE) {
    const nicableLower = Math.min(taxableProfit, BASIC_RATE_CEILING) - PERSONAL_ALLOWANCE
    const nicableUpper = Math.max(0, taxableProfit - BASIC_RATE_CEILING)
    class4Nic = Math.max(0, nicableLower) * CLASS4_LOWER_BAND + nicableUpper * CLASS4_UPPER_BAND
  }

  const totalTax = incomeTax + class4Nic
  const netProfit = grossProfit - totalTax
  const effectiveRate = grossProfit > 0 ? (totalTax / grossProfit) * 100 : 0

  return {
    grossSales,
    totalExpenses,
    mileageExpense,
    grossProfit,
    tradingAllowanceApplied: useAllowance,
    taxableProfit,
    incomeTax,
    class4Nic,
    totalTax,
    netProfit,
    effectiveRate,
    overTradingAllowance: grossSales > TRADING_ALLOWANCE,
    overThreshold: grossSales >= TRADING_ALLOWANCE * 30, // £30k = rough "you should definitely register" marker
  }
}

function formatGBP(n: number): string {
  return `£${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export default function TaxCalculatorPage() {
  const [salary, setSalary] = useState<string>('0')
  const [grossSales, setGrossSales] = useState<string>('5000')
  const [cogs, setCogs] = useState<string>('800')
  const [postage, setPostage] = useState<string>('400')
  const [platformFees, setPlatformFees] = useState<string>('650')
  const [otherExpenses, setOtherExpenses] = useState<string>('0')
  const [mileage, setMileage] = useState<string>('0')

  const result = useMemo(() => calculateTax({
    salary: parseFloat(salary) || 0,
    grossSales: parseFloat(grossSales) || 0,
    cogs: parseFloat(cogs) || 0,
    postage: parseFloat(postage) || 0,
    platformFees: parseFloat(platformFees) || 0,
    otherExpenses: parseFloat(otherExpenses) || 0,
    mileage: parseFloat(mileage) || 0,
  }), [salary, grossSales, cogs, postage, platformFees, otherExpenses, mileage])

  const showResults = (parseFloat(grossSales) || 0) > 0

  // Headline verdict
  let headline: { title: string; body: string; tone: 'ok' | 'warn' | 'alert' }
  if (!showResults) {
    headline = { title: 'Enter your numbers', body: 'Start with your total sales for the tax year (6 April – 5 April).', tone: 'ok' }
  } else if (!result.overTradingAllowance) {
    headline = {
      title: "You're under the £1,000 trading allowance",
      body: 'HMRC does not require you to declare this income. Keep records in case your situation changes.',
      tone: 'ok',
    }
  } else if (result.taxableProfit === 0) {
    headline = {
      title: 'No taxable profit',
      body: 'Your expenses cover your sales — but you may still need to file a Self Assessment because you are over the £1,000 trading allowance.',
      tone: 'warn',
    }
  } else if (result.totalTax === 0) {
    headline = {
      title: `${formatGBP(result.taxableProfit)} taxable profit — no tax owed`,
      body: 'Your trading profit fits within your personal allowance (£12,570). You may still need to register for Self Assessment because you are over the £1,000 trading allowance.',
      tone: 'warn',
    }
  } else {
    headline = {
      title: `Estimated tax owed: ${formatGBP(result.totalTax)}`,
      body: 'You should register for Self Assessment with HMRC and file a tax return by 31 January.',
      tone: 'alert',
    }
  }

  const toneStyles = {
    ok: 'bg-[#d4e2d2] border-[#5a7a57]/30 text-[#1e2e1c]',
    warn: 'bg-[#f6ead3] border-[#b89650]/30 text-[#5a4520]',
    alert: 'bg-[#f4d8d3] border-[#b85040]/30 text-[#5a2218]',
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-12">
        {/* HEADER */}
        <div className="text-center mb-10">
          <div className="hero-fade-1 text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-2.5">free tool · 2025/26 tax year</div>
          <h1 className="hero-fade-2 font-serif text-2xl sm:text-3xl font-normal text-[#1e2e1c] mb-2">
            UK Reseller <em className="italic">Tax Estimator</em>
          </h1>
          <p className="hero-fade-3 text-sm font-normal text-[#6b7d6a] max-w-lg mx-auto">
            Am I over the £1,000 trading allowance? Do I need to file Self Assessment? Work it out in 60 seconds.
          </p>
        </div>

        {/* 2024 HMRC NOTE */}
        <Reveal className="mb-8">
          <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-2">since january 2024</div>
            <p className="text-sm text-[#6b7d6a] leading-relaxed">
              UK marketplaces (Vinted, eBay, Etsy, Depop, Airbnb) now report seller earnings directly to HMRC under
              the new Digital Platform Reporting rules. If you earn over £1,000 in a tax year, HMRC already knows.
              This tool helps you work out what you might owe <em>before</em> you file.
            </p>
          </div>
        </Reveal>

        {/* INPUTS */}
        <Reveal delay={1}>
          <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 mb-6">
            <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-4">your numbers (tax year 6 Apr 2025 – 5 Apr 2026)</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <InputField label="Day-job salary (if any)" value={salary} onChange={setSalary} placeholder="0" hint="Gross PAYE salary from employer, before tax" />
              <InputField label="Total reselling sales" value={grossSales} onChange={setGrossSales} placeholder="5000" hint="Everything you sold — all platforms combined" />
            </div>

            <div className="text-10px font-semibold uppercase text-[#8a9e88] mb-3 mt-6">allowable expenses</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <InputField label="Cost of goods" value={cogs} onChange={setCogs} placeholder="800" hint="What you paid to source the items you sold" />
              <InputField label="Postage paid by you" value={postage} onChange={setPostage} placeholder="400" hint="Postage, packaging, labels" />
              <InputField label="Platform + payment fees" value={platformFees} onChange={setPlatformFees} placeholder="650" hint="eBay FVF, Etsy fees, Shopify, Paypal, etc." />
              <InputField label="Other expenses" value={otherExpenses} onChange={setOtherExpenses} placeholder="0" hint="Phone, storage, subscriptions (Wrenlist counts)" />
            </div>

            <div className="text-10px font-semibold uppercase text-[#8a9e88] mb-3 mt-6">business mileage</div>
            <InputField label="Miles driven for sourcing/delivery" value={mileage} onChange={setMileage} placeholder="0" prefix="" suffix="miles" hint="45p/mile first 10k, 25p/mile after (HMRC simplified expenses)" />
          </div>
        </Reveal>

        {/* HEADLINE */}
        {showResults && (
          <Reveal delay={2}>
            <div className={`rounded-lg border p-6 mb-6 ${toneStyles[headline.tone]}`}>
              <div className="font-serif text-xl font-medium mb-1">{headline.title}</div>
              <p className="text-sm opacity-80">{headline.body}</p>
            </div>
          </Reveal>
        )}

        {/* BREAKDOWN */}
        {showResults && result.overTradingAllowance && (
          <Reveal delay={3}>
            <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 mb-6">
              <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-4">breakdown</div>

              <div className="space-y-2.5 text-sm">
                <Row label="Gross sales" value={formatGBP(result.grossSales)} />
                <Row label="Allowable expenses" value={`- ${formatGBP(result.totalExpenses)}`} subtle />
                {result.mileageExpense > 0 && (
                  <Row label={`  inc. mileage (${mileage} mi @ HMRC rates)`} value={formatGBP(result.mileageExpense)} tiny />
                )}
                <Row label="Gross profit" value={formatGBP(result.grossProfit)} bold />
                {result.tradingAllowanceApplied && (
                  <div className="text-xs text-[#8a9e88] italic pl-2">
                    Trading allowance (£1,000) claimed instead of expenses — more favourable.
                  </div>
                )}
                <Row label="Taxable profit" value={formatGBP(result.taxableProfit)} bold />
                <div className="border-t border-[rgba(61,92,58,0.14)] my-3" />
                <Row label="Income tax (estimated)" value={formatGBP(result.incomeTax)} />
                <Row label="Class 4 NIC" value={formatGBP(result.class4Nic)} />
                <Row label="Total tax owed" value={formatGBP(result.totalTax)} bold />
                <div className="border-t border-[rgba(61,92,58,0.14)] my-3" />
                <Row label="Net profit (take-home)" value={formatGBP(result.netProfit)} bold highlight />
                <Row label="Effective tax rate on profit" value={`${result.effectiveRate.toFixed(1)}%`} subtle />
              </div>
            </div>
          </Reveal>
        )}

        {/* RULES REFERENCE */}
        <Reveal delay={4}>
          <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-6 mb-10">
            <div className="text-xs font-medium uppercase tracking-wider text-[#8a9e88] mb-4">how this is calculated</div>
            <ul className="space-y-2 text-xs text-[#6b7d6a] leading-relaxed">
              <li><strong className="text-[#1e2e1c]">£1,000 trading allowance</strong> — gross trading income up to £1,000/year is tax-free and does not need to be declared.</li>
              <li><strong className="text-[#1e2e1c]">£12,570 personal allowance</strong> — first £12,570 of total income (salary + profit) is tax-free.</li>
              <li><strong className="text-[#1e2e1c]">20% basic rate</strong> — income between £12,571 and £50,270.</li>
              <li><strong className="text-[#1e2e1c]">40% higher rate</strong> — income between £50,271 and £125,140.</li>
              <li><strong className="text-[#1e2e1c]">Class 4 NIC</strong> — 6% on self-employed profits £12,570–£50,270, 2% above.</li>
              <li><strong className="text-[#1e2e1c]">Mileage</strong> — 45p/mile for the first 10,000 business miles, 25p/mile after (HMRC simplified expenses).</li>
              <li><strong className="text-[#1e2e1c]">Expenses vs allowance</strong> — you can claim either your actual expenses OR the £1,000 trading allowance, whichever is more favourable. This tool picks automatically.</li>
            </ul>
          </div>
        </Reveal>

        {/* DISCLAIMER */}
        <div className="rounded-lg border border-[#b89650]/30 bg-[#f6ead3]/50 p-5 mb-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#7a5a2a] mb-2">not tax advice</div>
          <p className="text-xs text-[#5a4520] leading-relaxed">
            This calculator provides rough estimates based on HMRC published rates for the 2025/26 tax year. It is a
            record-keeping tool, not tax or accounting advice. Actual liability depends on your full financial
            situation, reliefs, student loans, pension contributions, capital allowances, and other factors not modelled here.
            Wrenlist is not an MTD-registered tax filing service. Always consult a qualified accountant for your Self
            Assessment. Figures are for guidance only and should not be relied upon for filing decisions.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center rounded-lg bg-[#d4e2d2] p-8 sm:p-10">
          <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#1e2e1c] mb-3">
            Track your profit, expenses & mileage <em className="italic">automatically</em>
          </h2>
          <p className="text-sm text-[#6b7d6a] mb-6 max-w-md mx-auto">
            Wrenlist logs every sale, every fee, every mile — so when tax season lands, your numbers are ready. Export to CSV for your accountant.
          </p>
          <a
            href="/register"
            className="inline-block bg-[#3d5c3a] text-[#f5f0e8] rounded text-xs font-medium px-8 py-3 hover:bg-[#2c4428]"
          >
            Start free — no card needed
          </a>
        </div>
      </div>

      <MarketingFooter />
    </div>
  )
}

interface InputFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  hint?: string
  prefix?: string
  suffix?: string
}

function InputField({ label, value, onChange, placeholder, hint, prefix = '£', suffix }: InputFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#1e2e1c] mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9e88] text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min="0"
          step="0.01"
          className={`w-full ${prefix ? 'pl-7' : 'pl-4'} ${suffix ? 'pr-14' : 'pr-4'} py-2.5 border border-[rgba(61,92,58,0.14)] rounded-lg bg-[#f5f0e8] text-[#1e2e1c] font-serif text-base focus:outline-none focus:border-[#5a7a57]`}
          placeholder={placeholder}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9e88] text-xs">{suffix}</span>}
      </div>
      {hint && <div className="text-10px text-[#8a9e88] mt-1 leading-tight">{hint}</div>}
    </div>
  )
}

interface RowProps {
  label: string
  value: string
  bold?: boolean
  subtle?: boolean
  tiny?: boolean
  highlight?: boolean
}

function Row({ label, value, bold, subtle, tiny, highlight }: RowProps) {
  return (
    <div className={`flex justify-between items-baseline ${tiny ? 'text-xs pl-4' : ''}`}>
      <span className={`${subtle ? 'text-[#8a9e88]' : 'text-[#6b7d6a]'} ${bold ? 'font-medium text-[#1e2e1c]' : ''}`}>{label}</span>
      <span className={`${bold ? 'font-serif text-base font-medium text-[#1e2e1c]' : 'text-[#6b7d6a]'} ${highlight ? 'text-[#5a7a57]' : ''}`}>{value}</span>
    </div>
  )
}
