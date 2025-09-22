import { type NextRequest, NextResponse } from "next/server"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM || "Logistics App <no-reply@swiftifylogistics.online>"

function buildEmailHtml(message: string) {
  const safe = (message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const withBreaks = safe.replace(/\n/g, "<br>")
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Message</title>
      <style>
        body { margin:0; padding:0; background:#f6f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; }
        .preheader { display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0; overflow:hidden; mso-hide:all; }
        .container { max-width: 560px; margin: 0 auto; background:#ffffff; border-radius:12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .header { padding: 24px; border-bottom:1px solid #eef0f4; }
        .header h1 { margin:0; font-size:18px; color:#111827; }
        .content { padding: 24px; color:#111827; line-height:1.6; font-size:15px; }
        .footer { padding: 16px 24px 24px; color:#6b7280; font-size:12px; }
        .badge { display:inline-block; padding:4px 8px; border-radius:999px; background:#eef2ff; color:#3730a3; font-weight:600; font-size:12px; }
      </style>
    </head>
    <body>
      <span class="preheader">Important: quick assistance requested</span>
      <div style="padding: 24px;">
        <div class="container">
          <div class="header">
            <span class="badge">Notification</span>
            <h1>Quick assistance requested</h1>
          </div>
          <div class="content">
            <div>${withBreaks}</div>
          </div>
          <div class="footer">
            <div>This message was sent via Bulk Messaging App.</div>
          </div>
        </div>
      </div>
    </body>
  </html>`
}

export async function POST(request: NextRequest) {
  try {
    const { emails, content } = await request.json()

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided" }, { status: 400 })
    }

    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "No content provided" }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured on the server" }, { status: 500 })
    }

    if (!RESEND_FROM) {
      return NextResponse.json({ error: "RESEND_FROM is not configured on the server" }, { status: 500 })
    }

    // Single API call with all recipients to avoid rate limits
    const results: Array<{ email: string; status: "sent" | "failed"; id?: string; error?: string }> = []
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM, // Must be a verified domain/sender in Resend
          to: emails, // send to all in one request
          subject: "Quick assistance requested",
          text: content,
          html: buildEmailHtml(content),
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Mark all as sent; Resend returns a single id for the request
        for (const email of emails) {
          results.push({ email, status: "sent", id: result.id })
        }
      } else {
        // Mark all as failed with the same error message
        for (const email of emails) {
          results.push({ email, status: "failed", error: result.message || "Unknown error" })
        }
      }
    } catch (error) {
      for (const email of emails) {
        results.push({ email, status: "failed", error: "Network error" })
      }
    }

    const successCount = results.filter((r) => r.status === "sent").length
    const failCount = results.filter((r) => r.status === "failed").length
    const success = failCount === 0
    const message = success
      ? `Sent ${successCount} ${successCount === 1 ? "email" : "emails"} successfully.`
      : `Sent ${successCount} ${successCount === 1 ? "email" : "emails"} with ${failCount} failure${failCount === 1 ? "" : "s"}.`

    return NextResponse.json({
      success,
      sent: successCount,
      failed: failCount,
      message,
      results,
    })
  } catch (error) {
    console.error("Email sending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

