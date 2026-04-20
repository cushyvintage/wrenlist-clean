/**
 * Classifies marketplace publish failures so the app can render actionable UI
 * instead of a raw error string. Shared by the queue handler for any
 * marketplace that returns structured error data (right now: Vinted).
 *
 * Returned shape is deliberately simple so it round-trips through the
 * /api/marketplace/publish-queue POST without needing a schema migration —
 * stored in product_marketplace_data.fields.last_error_context.
 */

export type PublishErrorCode =
  | "auth_expired"       // user needs to re-login to marketplace
  | "captcha_required"   // human needs to complete a captcha at action_url
  | "validation_error"   // listing data rejected (field-level details in fields[])
  | "photo_upload_failed" // photos didn't upload (often transient)
  | "rate_limited"       // too many requests — back off
  | "server_error"       // marketplace 5xx, generally transient
  | "unknown";

export interface PublishErrorFieldIssue {
  field: string;
  message: string;
}

export interface PublishErrorContext {
  code: PublishErrorCode;
  summary: string;              // one-line human-readable message
  actionUrl?: string;           // for captcha, re-auth, etc.
  fields?: PublishErrorFieldIssue[]; // for validation_error
}

interface ClassifierInput {
  httpStatus?: number;
  needsLogin?: boolean;
  captchaUrl?: string;
  /** result.message from the marketplace client */
  message?: string;
  /** The marketplace's raw response body (already parsed if JSON, else string) */
  internalErrors?: unknown;
}

/**
 * Best-effort Vinted error classifier. Works off whatever shape the Vinted
 * client surfaced — which is sometimes the outer envelope, sometimes a
 * stringified inner JSON, sometimes both nested.
 */
export function classifyVintedError(input: ClassifierInput): PublishErrorContext {
  const { httpStatus, needsLogin, captchaUrl, message, internalErrors } = input;

  // Try to unwrap whatever structure internalErrors holds. Vinted returns
  // either a flat error envelope or nests the real body as a stringified JSON
  // inside errors[].value (we've seen both).
  const root = unwrap(internalErrors);
  const innerErrors = Array.isArray(root?.errors) ? root.errors : [];
  const firstInner = innerErrors.length > 0 ? unwrap(firstInnerValue(innerErrors[0])) : null;
  const combinedCode = root?.code ?? firstInner?.code ?? root?.message_code ?? firstInner?.message_code;
  const combinedMsg = firstInner?.message ?? root?.message ?? message;

  // --- auth ---
  if (
    needsLogin ||
    httpStatus === 401 ||
    combinedCode === 100 ||
    combinedCode === "100" ||
    combinedCode === "invalid_authentication_token"
  ) {
    return {
      code: "auth_expired",
      summary: "Your Vinted session has expired. Log in to Vinted in your browser and try again.",
    };
  }

  // --- captcha ---
  if (captchaUrl || /captcha/i.test(String(root?.url ?? "")) || /captcha/i.test(String(message ?? ""))) {
    const url = captchaUrl ?? String(root?.url ?? "") ?? extractCaptchaUrl(String(message ?? ""));
    return {
      code: "captcha_required",
      summary:
        "Vinted is asking you to complete a captcha before we can list for you. Click the button below to complete it, then come back and we'll retry.",
      actionUrl: url || undefined,
    };
  }

  // --- rate limit ---
  if (httpStatus === 429) {
    return {
      code: "rate_limited",
      summary: "Vinted is throttling listings for this account. Pause briefly and retry in a few minutes.",
    };
  }

  // --- validation (400 with errors[{field, value}]) ---
  const validationFields = extractValidationFields(root) ?? extractValidationFields(firstInner);
  if (validationFields.length > 0 || combinedCode === 99 || combinedCode === "validation_error") {
    const photoIssue = validationFields.find((f) => f.field === "photos");
    if (photoIssue) {
      return {
        code: "photo_upload_failed",
        summary: `Vinted rejected the photos: ${photoIssue.message}. This is usually temporary — try again in a moment.`,
        fields: validationFields,
      };
    }
    const summary = validationFields.length > 0
      ? `Vinted rejected ${validationFields.length === 1 ? "a field" : "some fields"}: ${validationFields.map((f) => `${f.field} — ${f.message}`).join("; ")}`
      : "Vinted rejected the listing data. Check the item details and try again.";
    return { code: "validation_error", summary, fields: validationFields };
  }

  // --- server error ---
  if (
    (typeof httpStatus === "number" && httpStatus >= 500) ||
    combinedCode === 105 ||
    combinedCode === "server_error" ||
    /server error/i.test(String(combinedMsg ?? ""))
  ) {
    return {
      code: "server_error",
      summary: "Vinted is having a wobble. We'll retry automatically — no action needed.",
    };
  }

  // --- fallback ---
  return {
    code: "unknown",
    summary: String(combinedMsg ?? message ?? "Publish failed for an unknown reason."),
  };
}

// ---------------------------------------------------------------------------

type MaybeRecord = Record<string, unknown> | null | undefined;

function unwrap(v: unknown): Record<string, unknown> | null {
  if (!v) return null;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof v === "object") return v as Record<string, unknown>;
  return null;
}

function firstInnerValue(entry: unknown): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "object" && "value" in (entry as Record<string, unknown>)) {
    const value = (entry as { value: unknown }).value;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function extractValidationFields(body: MaybeRecord): PublishErrorFieldIssue[] {
  if (!body || !Array.isArray(body.errors)) return [];
  const out: PublishErrorFieldIssue[] = [];
  for (const e of body.errors as Array<unknown>) {
    if (!e || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    const field = typeof rec.field === "string" ? rec.field : null;
    const value = typeof rec.value === "string" ? rec.value : null;
    // Skip wrapper rows that just carry nested JSON
    if (field && value && !looksLikeJson(value)) {
      out.push({ field, message: value });
    }
  }
  return out;
}

function looksLikeJson(s: string): boolean {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}

function extractCaptchaUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s]*captcha[^\s]*/i);
  return m ? m[0] : null;
}
