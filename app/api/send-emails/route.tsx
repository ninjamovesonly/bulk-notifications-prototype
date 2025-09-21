import { type NextRequest, NextResponse } from "next/server"

const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM = process.env.RESEND_FROM

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

    const results = []

    for (const email of emails) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM, // Must be a verified domain/sender in Resend
            to: [email],
            subject: "Bulk Message",
            text: content,
            html: `<p>${content.replace(/\n/g, "<br>")}</p>`,
          }),
        })

        const result = await response.json()

        if (response.ok) {
          results.push({ email, status: "sent", id: result.id })
        } else {
          results.push({ email, status: "failed", error: result.message })
        }
      } catch (error) {
        results.push({ email, status: "failed", error: "Network error" })
      }
    }

    const successCount = results.filter((r) => r.status === "sent").length
    const failCount = results.filter((r) => r.status === "failed").length

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error("Email sending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

