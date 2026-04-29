'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/plausible'

/**
 * WaitlistModal — pre-launch signup capture, styled to match the landing page
 * (sage/cream palette, serif headline, indie tone). Two-step flow:
 *
 *   step 1 → name + email only. Submitting saves the row immediately so the
 *            user is on the list even if they bail before step 2.
 *   step 2 → optional profile (platforms, pain point, stage, scale, blocker).
 *            Skippable. Either path lands on the confirmation view with the
 *            referral link + share buttons.
 */

const PLATFORMS = [
  { id: 'vinted', label: 'Vinted' },
  { id: 'ebay', label: 'eBay' },
  { id: 'etsy', label: 'Etsy' },
  { id: 'depop', label: 'Depop' },
  { id: 'poshmark', label: 'Poshmark' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'whatnot', label: 'Whatnot' },
  { id: 'other', label: 'Other' },
]

const PAIN_POINTS = [
  { id: 'relisting', label: 'Relisting manually across apps' },
  { id: 'category', label: 'Category & field confusion' },
  { id: 'time', label: 'Time it takes to list' },
  { id: 'shipping', label: 'Shipping & logistics' },
  { id: 'other', label: 'Something else' },
]

const STAGES = [
  { id: 'hobby', label: 'Hobby seller' },
  { id: 'side_hustle', label: 'Side hustle' },
  { id: 'full_time', label: 'Full-time reseller' },
]

const SCALES = [
  { id: 'under_10', label: 'Under 10 / month' },
  { id: '10_to_50', label: '10–50 / month' },
  { id: '50_plus', label: '50+ / month' },
]

interface WaitlistModalProps {
  open: boolean
  onClose: () => void
  /** Optional referral code captured from URL query string. */
  referralCode?: string | null
}

interface SignupResult {
  email: string
  referralUrl: string
  referralCode: string
  alreadyOnList?: boolean
}

type Step = 'signup' | 'profile' | 'confirmation'

export function WaitlistModal({ open, onClose, referralCode }: WaitlistModalProps) {
  const [step, setStep] = useState<Step>('signup')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [painPoint, setPainPoint] = useState<string | null>(null)
  const [stage, setStage] = useState<string | null>(null)
  const [scale, setScale] = useState<string | null>(null)
  const [blocker, setBlocker] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SignupResult | null>(null)
  const [copied, setCopied] = useState(false)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // Reset state when modal is closed (after a delay so the close animation finishes)
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setStep('signup')
      setEmail('')
      setName('')
      setPlatforms([])
      setPainPoint(null)
      setStage(null)
      setScale(null)
      setBlocker('')
      setError(null)
      setResult(null)
      setCopied(false)
      setSubmitting(false)
    }, 200)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  // Step 1 — capture the row with just name + email so they're definitely on
  // the list even if they bail before answering the profile questions.
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError(null)

    if (!email.trim() || !name.trim()) {
      setError('Email and name are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          ref: referralCode || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }
      const signup: SignupResult = {
        email: email.trim(),
        referralUrl: data.referralUrl,
        referralCode: data.referralCode,
        alreadyOnList: data.alreadyOnList,
      }
      setResult(signup)
      trackEvent('WaitlistStep1Submitted', {
        alreadyOnList: signup.alreadyOnList ? 'yes' : 'no',
      })

      // Skip the profile step for users we already had on the list — they've
      // most likely already given us this data once. Send them straight to
      // the share screen.
      setStep(signup.alreadyOnList ? 'confirmation' : 'profile')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2 — enrich the existing row with optional profile data.
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !result) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/waitlist/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: result.email,
          platforms,
          pain_point: painPoint,
          business_stage: stage,
          scale,
          blocker: blocker.trim() || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setError(data.error || "Couldn't save those answers. Try again or skip.")
        setSubmitting(false)
        return
      }
      trackEvent('WaitlistStep2Submitted')
      setStep('confirmation')
    } catch {
      setError('Network error. Try again or skip.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkipProfile = () => {
    trackEvent('WaitlistStep2Skipped')
    setStep('confirmation')
  }

  const copyReferral = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can fail in some browsers — fall through silently.
    }
  }

  const headerLabel =
    step === 'confirmation' ? "you're in" : step === 'profile' ? '30 seconds (optional)' : 'join the waitlist'
  const headerHeadline =
    step === 'confirmation' ? (
      <>
        Welcome to the <em className="italic text-[#5a7a57]">flock</em>.
      </>
    ) : step === 'profile' ? (
      <>
        Help us <em className="italic text-[#5a7a57]">build for you</em>.
      </>
    ) : (
      <>
        Be first when <em className="italic text-[#5a7a57]">Wrenlist</em> opens up.
      </>
    )

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-4 py-6 sm:py-10 overflow-y-auto"
      style={{ backgroundColor: 'rgba(30, 46, 28, 0.55)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#f5f0e8] border border-[rgba(61,92,58,0.22)] rounded-lg shadow-2xl w-full max-w-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 sm:px-8 py-5 border-b border-[rgba(61,92,58,0.14)]">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-1">
              {headerLabel}
            </p>
            <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#1e2e1c] leading-tight">
              {headerHeadline}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#527050] hover:text-[#1e2e1c] transition-colors text-xl leading-none ml-4 -mt-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 sm:px-8 py-6">
          {step === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-[#4a6147]">
                We're putting the finishing touches on the Chrome extension and waiting on the store review. Drop your name and email below — you'll lock in Founding Flock pricing and we'll invite you to the beta first.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Your name" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dom"
                    required
                    maxLength={80}
                    className="w-full px-3 py-2.5 text-sm border border-[rgba(61,92,58,0.22)] rounded bg-white focus:outline-none focus:border-[#5a7a57]"
                  />
                </Field>
                <Field label="Email" required>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="w-full px-3 py-2.5 text-sm border border-[rgba(61,92,58,0.22)] rounded bg-white focus:outline-none focus:border-[#5a7a57]"
                  />
                </Field>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </div>
              )}

              {referralCode && (
                <div className="text-xs text-[#5a7a57] bg-[#d4e2d2] border border-[#5a7a57]/20 rounded px-3 py-2">
                  Joined via a friend's invite — you'll both jump the beta queue.
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#3d5c3a] text-[#f5f0e8] px-6 py-3 text-xs font-medium uppercase tracking-widest hover:bg-[#2c4428] disabled:opacity-60 disabled:cursor-not-allowed rounded"
              >
                {submitting ? 'Saving…' : 'Save my spot →'}
              </button>

              <p className="text-xs text-[#527050] leading-relaxed">
                We'll email you a couple of times before beta opens. Reply to any email or
                unsubscribe at any point — no funny business.
              </p>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="flex flex-col gap-5">
              <p className="text-sm leading-relaxed text-[#4a6147]">
                You're on the list. Want us to build the right things first? Tell us a bit about how you sell — takes 30 seconds.
              </p>

              <Field label="Where do you sell now?" hint="Tick any that apply">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const active = platforms.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          active
                            ? 'bg-[#3d5c3a] text-[#f5f0e8] border-[#3d5c3a]'
                            : 'bg-white text-[#4a6147] border-[rgba(61,92,58,0.22)] hover:border-[#5a7a57]'
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Biggest frustration with selling right now?">
                <Pills options={PAIN_POINTS} selected={painPoint} onSelect={setPainPoint} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="How do you sell?">
                  <Pills options={STAGES} selected={stage} onSelect={setStage} small />
                </Field>
                <Field label="Volume">
                  <Pills options={SCALES} selected={scale} onSelect={setScale} small />
                </Field>
              </div>

              <Field
                label="Anything else holding you back?"
                hint="Optional — just a sentence is fine"
              >
                <textarea
                  value={blocker}
                  onChange={(e) => setBlocker(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="What's the one thing that, if fixed, would make selling easier?"
                  className="w-full px-3 py-2.5 text-sm border border-[rgba(61,92,58,0.22)] rounded bg-white focus:outline-none focus:border-[#5a7a57] resize-none"
                />
              </Field>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={handleSkipProfile}
                  className="text-xs font-medium text-[#5a7a57] underline hover:text-[#3d5c3a]"
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-none bg-[#3d5c3a] text-[#f5f0e8] px-6 py-3 text-xs font-medium uppercase tracking-widest hover:bg-[#2c4428] disabled:opacity-60 disabled:cursor-not-allowed rounded"
                >
                  {submitting ? 'Saving…' : 'Save & continue →'}
                </button>
              </div>
            </form>
          )}

          {step === 'confirmation' && result && (
            <ConfirmationView result={result} copied={copied} onCopy={copyReferral} />
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#1e2e1c]">
        {label}
        {required && <span className="text-[#5a7a57] ml-0.5">*</span>}
      </span>
      {hint && <span className="text-xs text-[#527050]">{hint}</span>}
      {children}
    </label>
  )
}

function Pills({
  options,
  selected,
  onSelect,
  small,
}: {
  options: { id: string; label: string }[]
  selected: string | null
  onSelect: (id: string | null) => void
  small?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(active ? null : opt.id)}
            className={`${small ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-full border transition-colors ${
              active
                ? 'bg-[#3d5c3a] text-[#f5f0e8] border-[#3d5c3a]'
                : 'bg-white text-[#4a6147] border-[rgba(61,92,58,0.22)] hover:border-[#5a7a57]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ConfirmationView({
  result,
  copied,
  onCopy,
}: {
  result: SignupResult
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-[#4a6147]">
        {result.alreadyOnList
          ? 'Looks like you were already on the list — no problem, here is your share link again:'
          : "You're on the list. Look out for an email from me (Dom) in a moment — it'll explain what we're building and why."}
      </p>

      <div className="bg-[#ede8de] border border-[rgba(61,92,58,0.18)] rounded-lg p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-[#527050] mb-2">
          Bring a friend, both win
        </p>
        <p className="text-sm leading-relaxed text-[#4a6147] mb-3">
          Share this link. When a fellow reseller signs up, you both jump the beta queue and get
          a lifetime discount when paid plans launch.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={result.referralUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 px-3 py-2 text-xs bg-white border border-[rgba(61,92,58,0.22)] rounded font-mono text-[#3a3a3a]"
          />
          <button
            onClick={onCopy}
            className="bg-[#3d5c3a] text-[#f5f0e8] px-4 py-2 text-xs font-medium uppercase tracking-widest hover:bg-[#2c4428] rounded whitespace-nowrap"
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <ShareLink
          label="Share on X"
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Joined the waitlist for Wrenlist — a tool that crossposts your reselling inventory across marketplaces and auto-delists on sale. Get early access:")}&url=${encodeURIComponent(result.referralUrl)}`}
        />
        <ShareLink
          label="Share via WhatsApp"
          href={`https://wa.me/?text=${encodeURIComponent(`Thought you'd like this — Wrenlist crossposts reselling inventory across marketplaces and auto-delists on sale. Early access here: ${result.referralUrl}`)}`}
        />
        <ShareLink
          label="Email a friend"
          href={`mailto:?subject=${encodeURIComponent('You should join the Wrenlist waitlist')}&body=${encodeURIComponent(`Hey — I just signed up for Wrenlist, a tool for resellers that crossposts your inventory and auto-delists on sale. Use my link and we both jump the beta queue:\n\n${result.referralUrl}`)}`}
        />
      </div>
    </div>
  )
}

function ShareLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#5a7a57] underline hover:text-[#3d5c3a]"
    >
      {label}
    </a>
  )
}
