import { type NextRequest, NextResponse } from "next/server"

// Support both naming conventions
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_FROM || process.env.TWILIO_PHONE // E.164 format, e.g. "+1234567890"
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID // e.g. "MGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

export async function POST(request: NextRequest) {
  try {
    const { phoneNumbers, content } = await request.json()

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({ error: "No phone numbers provided" }, { status: 400 })
    }

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: "Twilio credentials (SID/Auth Token) are not configured on the server" }, { status: 500 })
    }

    // Require either a Messaging Service SID or a From number
    if (!TWILIO_MESSAGING_SERVICE_SID && !TWILIO_FROM) {
      return NextResponse.json({ error: "Twilio Messaging Service SID or From number must be configured on the server" }, { status: 500 })
    }

    // If a From number is provided, basic sanity check: must be E.164 and not an MG SID
    if (!TWILIO_MESSAGING_SERVICE_SID && TWILIO_FROM) {
      const isE164 = /^\+[1-9]\d{6,14}$/.test(TWILIO_FROM)
      if (!isE164) {
        return NextResponse.json({ error: "TWILIO_FROM must be a valid E.164 phone number, e.g. +1234567890" }, { status: 500 })
      }
      if (/^MG[A-Za-z0-9]{32}$/.test(TWILIO_FROM)) {
        return NextResponse.json({ error: "TWILIO_FROM appears to be a Messaging Service SID. Set TWILIO_MESSAGING_SERVICE_SID instead." }, { status: 500 })
      }
    }

    const results: Array<{ phoneNumber: string; status: "sent" | "failed"; sid?: string; error?: string; code?: unknown }> = []

    for (const phoneNumber of phoneNumbers) {
      try {
        // Require E.164 format to avoid region mismatches that lead to 21612
        const formattedPhone = phoneNumber.replace(/\s/g, "")
        const isE164 = /^\+[1-9]\d{6,14}$/.test(formattedPhone)
        if (!isE164) {
          results.push({ phoneNumber, status: "failed", error: "Invalid phone number format. Use E.164, e.g. +441234567890" })
          continue
        }

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(
            Object.fromEntries(
              Object.entries({
                // Use Messaging Service if available; otherwise use From
                MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID || undefined,
                From: TWILIO_MESSAGING_SERVICE_SID ? undefined : TWILIO_FROM,
                To: formattedPhone,
                Body: content,
              }).filter(([, v]) => v !== undefined)
            )
          ),
        })

        const result = await response.json()

        if (response.ok) {
          results.push({ phoneNumber, status: "sent", sid: result.sid })
        } else {
          results.push({ phoneNumber, status: "failed", error: result.message || "Twilio error", code: result.code })
        }
      } catch (error) {
        results.push({ phoneNumber, status: "failed", error: "Network error" })
      }
    }

    const successCount = results.filter((r) => r.status === "sent").length
    const failCount = results.filter((r) => r.status === "failed").length
    const success = failCount === 0
    const message = success
      ? `Sent ${successCount} ${successCount === 1 ? "SMS message" : "SMS messages"} successfully.`
      : `Sent ${successCount} ${successCount === 1 ? "SMS message" : "SMS messages"} with ${failCount} failure${failCount === 1 ? "" : "s"}.`

    return NextResponse.json({
      success,
      sent: successCount,
      failed: failCount,
      message,
      results,
    })
  } catch (error) {
    console.error("SMS sending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

