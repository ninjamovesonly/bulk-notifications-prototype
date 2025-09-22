import { type NextRequest, NextResponse } from "next/server"

// Support both naming conventions
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM = process.env.TWILIO_FROM || process.env.TWILIO_PHONE // E.164 format, e.g. "+1234567890"

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

    if (!TWILIO_FROM) {
      return NextResponse.json({ error: "Twilio From number is not configured on the server" }, { status: 500 })
    }

    const results = []

    for (const phoneNumber of phoneNumbers) {
      try {
        // Format phone number (basic formatting - you might want to enhance this)
        const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+1${phoneNumber.replace(/\D/g, "")}`

        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: TWILIO_FROM,
            To: formattedPhone,
            Body: content,
          }),
        })

        const result = await response.json()

        if (response.ok) {
          results.push({ phoneNumber, status: "sent", sid: result.sid })
        } else {
          results.push({ phoneNumber, status: "failed", error: result.message })
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

