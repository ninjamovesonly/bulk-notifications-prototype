"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Mail, Phone, Send, Loader2 } from "lucide-react"

export default function BulkMessagingApp() {
  const [emails, setEmails] = useState<string[]>([""])
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""])
  const [emailContent, setEmailContent] = useState(
    "Are you free, I'm in an emergency meeting right now can't talk on phone and i need your attention in helping me get something's Done at the store kindly text me  on here 980-260-0369 thanks . "
  )
  const [smsContent, setSmsContent] = useState(
    "I'm in an emergency meeting right now can't talk on phone and i need your attention in helping me get something's Done right away can you?"
  )
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>("")

  const addEmailField = () => {
    setEmails([...emails, ""])
  }

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index))
    }
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const addPhoneField = () => {
    setPhoneNumbers([...phoneNumbers, ""])
  }

  const removePhoneField = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))
    }
  }

  const updatePhoneNumber = (index: number, value: string) => {
    const newPhoneNumbers = [...phoneNumbers]
    newPhoneNumbers[index] = value
    setPhoneNumbers(newPhoneNumbers)
  }

  const validEmails = emails.filter((email) => email.trim() && email.includes("@"))
  const validPhoneNumbers = phoneNumbers.filter((phone) => phone.trim() && phone.length >= 10)

  // Allow sending emails even if SMS is not ready; SMS is optional
  const canSend = validEmails.length >= 2 && !!emailContent.trim()

  const handleSend = async () => {
    if (!canSend) return

    setIsLoading(true)
    setStatus("Sending messages...")

    try {
      // Send emails
      const emailResponse = await fetch("/api/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emails: validEmails,
          content: emailContent,
        }),
      })

      // Send SMS only if we have enough phone numbers and content
      let smsAttempted = false
      let smsOk = false
      if (validPhoneNumbers.length >= 2 && smsContent.trim()) {
        smsAttempted = true
        const smsResponse = await fetch("/api/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumbers: validPhoneNumbers,
            content: smsContent,
          }),
        })
        smsOk = smsResponse.ok
      }

      if (!emailResponse.ok) {
        setStatus("❌ Failed to send emails. Check server logs for details.")
      } else if (smsAttempted && !smsOk) {
        setStatus(`✅ Emails sent to ${validEmails.length} recipients. ⚠️ SMS had failures.`)
      } else if (smsAttempted && smsOk) {
        setStatus(`✅ Successfully sent ${validEmails.length} emails and ${validPhoneNumbers.length} SMS messages!`)
      } else {
        setStatus(`✅ Successfully sent ${validEmails.length} emails.`)
      }
    } catch (error) {
      setStatus("❌ Error sending messages. Please try again.")
      console.error("Send error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Bulk Messaging App</h1>
          <p className="text-gray-600">Send emails and SMS messages in bulk using Resend & Twilio</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Email Section */}
          <Card className="animate-slide-in-left">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Recipients
              </CardTitle>
              <CardDescription>Add at least 2 email addresses ({validEmails.length}/2 minimum)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {emails.map((email, index) => (
                <div key={index} className="flex gap-2 animate-fade-in">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => updateEmail(index, e.target.value)}
                    className="flex-1"
                  />
                  {emails.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                      className="shrink-0 hover:bg-red-50 hover:border-red-200"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addEmailField}
                className="w-full hover:bg-blue-50 hover:border-blue-200 bg-transparent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Email
              </Button>
            </CardContent>
          </Card>

          {/* Phone Section */}
          <Card className="animate-slide-in-right">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-green-600" />
                Phone Numbers
              </CardTitle>
              <CardDescription>Add at least 2 phone numbers ({validPhoneNumbers.length}/2 minimum)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {phoneNumbers.map((phone, index) => (
                <div key={index} className="flex gap-2 animate-fade-in">
                  <Input
                    type="tel"
                    placeholder="Enter phone number (+1234567890)"
                    value={phone}
                    onChange={(e) => updatePhoneNumber(index, e.target.value)}
                    className="flex-1"
                  />
                  {phoneNumbers.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removePhoneField(index)}
                      className="shrink-0 hover:bg-red-50 hover:border-red-200"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addPhoneField}
                className="w-full hover:bg-green-50 hover:border-green-200 bg-transparent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Phone Number
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Message Content */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="animate-slide-in-left">
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>Message to send via email</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your email message here..."
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Card className="animate-slide-in-right">
            <CardHeader>
              <CardTitle>SMS Content</CardTitle>
              <CardDescription>Message to send via SMS</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter your SMS message here..."
                value={smsContent}
                onChange={(e) => setSmsContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* Send Button & Status */}
        <Card className="animate-slide-in-up">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Button
                onClick={handleSend}
                disabled={!canSend || isLoading}
                size="lg"
                className="px-8 py-3 text-lg font-semibold transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send Messages
                  </>
                )}
              </Button>

              {!canSend && !isLoading && (
                <p className="text-sm text-gray-500">
                  Need at least 2 emails and email content to send. SMS is optional.
                </p>
              )}

              {status && (
                <div className="p-4 rounded-lg bg-gray-50 border animate-fade-in">
                  <p className="text-sm font-medium">{status}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
