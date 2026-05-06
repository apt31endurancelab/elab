// Thin wrapper around the Resend HTTP API. Returns { ok, error?, id? }.
// Configure with RESEND_API_KEY and (optionally) MAIL_FROM, e.g.
//   RESEND_API_KEY=re_...
//   MAIL_FROM=Endurance Lab <hola@endurancelab.cc>

export type SendEmailInput = {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
  replyTo?: string
}

export type SendEmailResult =
  | { ok: true; id?: string; provider: "resend" }
  | { ok: false; error: string; missingConfig?: boolean }

export function emailIsConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error: "RESEND_API_KEY no está configurado. Añádelo en .env.local junto con MAIL_FROM.",
      missingConfig: true,
    }
  }

  const from = process.env.MAIL_FROM || "Endurance Lab <onboarding@resend.dev>"

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        html: input.html,
        reply_to: input.replyTo,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `Resend HTTP ${res.status}: ${text || res.statusText}` }
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string }
    return { ok: true, id: data?.id, provider: "resend" }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
