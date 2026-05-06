// Twilio SMS wrapper. Configure with:
//   TWILIO_ACCOUNT_SID=AC...
//   TWILIO_AUTH_TOKEN=...
//   TWILIO_FROM=+1234567890

export type SendSmsInput = { to: string; body: string }
export type SendSmsResult =
  | { ok: true; sid?: string }
  | { ok: false; error: string; missingConfig?: boolean }

export function smsIsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM)
}

export async function sendSms({ to, body }: SendSmsInput): Promise<SendSmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from) {
    return {
      ok: false,
      error: "Twilio no está configurado (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM).",
      missingConfig: true,
    }
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `Twilio HTTP ${res.status}: ${text || res.statusText}` }
    }

    const data = (await res.json().catch(() => ({}))) as { sid?: string }
    return { ok: true, sid: data?.sid }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
