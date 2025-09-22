"use client";

import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Mail, Phone, Send, Loader2 } from "lucide-react";

type ApiResponse = {
  success?: boolean;
  sent?: number;
  failed?: number;
  message?: string;
  error?: string;
};

async function parseApiResponse(
  response: Response
): Promise<ApiResponse | null> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return null;
  }
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

export default function BulkMessagingApp() {
  const [emails, setEmails] = useState<string[]>([""]);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([""]);
  const [emailContent, setEmailContent] = useState(
    "Are you free, I'm in an emergency meeting right now can't talk on phone and i need your attention in helping me get something's Done at the store kindly text me on here 980-260-0369 thanks . "
  );
  const [smsContent, setSmsContent] = useState(
    `Congratulations! Your phone number has been shortlisted for a £2,000,000 promotional reward. To verify and claim, please contact our team at: adamsshammal77@gmail.com. Include your full name and reference code: WIN-2025-UK.`
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const addEmailField = () => {
    setEmails([...emails, ""]);
  };

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      setEmails(emails.filter((_, i) => i !== index));
    }
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const addPhoneField = () => {
    setPhoneNumbers([...phoneNumbers, ""]);
  };

  const removePhoneField = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const updatePhoneNumber = (index: number, value: string) => {
    const newPhoneNumbers = [...phoneNumbers];
    newPhoneNumbers[index] = value;
    setPhoneNumbers(newPhoneNumbers);
  };

  const validEmails = emails.filter(
    (email) => email.trim() && email.includes("@")
  );
  const validPhoneNumbers = phoneNumbers.filter(
    (phone) => phone.trim() && phone.length >= 10
  );

  // Allow sending emails even if SMS is not ready; SMS is optional
  const canSend = validEmails.length >= 2 && !!emailContent.trim();

  const handleSend = async () => {
    if (!canSend) return;

    setIsLoading(true);
    setStatus("Sending messages...");

    const getFailureMessages = (results: unknown) => {
      if (!Array.isArray(results)) return [] as string[];

      const uniqueMessages = new Set<string>();
      for (const entry of results) {
        if (
          entry &&
          typeof entry === "object" &&
          "status" in entry &&
          (entry as { status?: string }).status === "failed" &&
          "error" in entry &&
          typeof (entry as { error?: unknown }).error === "string" &&
          (entry as { error: string }).error.trim()
        ) {
          uniqueMessages.add((entry as { error: string }).error);
        }
      }

      return Array.from(uniqueMessages);
    };

    const parseCount = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    const describeCounts = (sent: number, failed: number, label: string) => {
      if (failed > 0) {
        return `${label}: ${sent} sent, ${failed} failed`;
      }
      return `${label}: ${sent} sent successfully`;
    };

    let emailStatusMessage = "";
    let smsStatusMessage = "";

    try {
      try {
        const emailResponse = await fetch("/api/send-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emails: validEmails,
            content: emailContent,
          }),
        });

        const emailData = await emailResponse.json();
        const emailSentCount = parseCount(
          (emailData as { sent?: unknown })?.sent
        );
        const emailFailedCount = parseCount(
          (emailData as { failed?: unknown })?.failed
        );
        const emailFailures = getFailureMessages(
          (emailData as { results?: unknown })?.results
        );

        if (
          !emailResponse.ok ||
          (emailData as { success?: unknown })?.success === false
        ) {
          const errorMessage =
            typeof (emailData as { error?: unknown })?.error === "string" &&
            (emailData as { error: string }).error.trim()
              ? (emailData as { error: string }).error
              : emailFailures.join(" • ") || "Failed to send emails.";

          toast({
            title: "Email request failed",
            description: errorMessage,
            variant: "destructive",
          });
          emailStatusMessage = `Emails: ${errorMessage}`;
        } else if (emailFailedCount > 0) {
          const failureSummary =
            emailFailures.join(" • ") || "Some emails failed to send.";
          toast({
            title: "Email delivery issues",
            description: failureSummary,
            variant: "destructive",
          });
          emailStatusMessage = describeCounts(
            emailSentCount,
            emailFailedCount,
            "Emails"
          );
        } else {
          toast({
            title: "Emails sent",
            description: `Delivered ${emailSentCount} email${
              emailSentCount === 1 ? "" : "s"
            } successfully.`,
          });
          emailStatusMessage = describeCounts(
            emailSentCount,
            emailFailedCount,
            "Emails"
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unexpected error sending emails.";
        toast({
          title: "Email request error",
          description: message,
          variant: "destructive",
        });
        emailStatusMessage = `Emails: ${message}`;
        console.error("Email send error:", error);
      }

      if (validPhoneNumbers.length >= 2 && smsContent.trim()) {
        try {
          const smsResponse = await fetch("/api/send-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phoneNumbers: validPhoneNumbers,
              content: smsContent,
            }),
          });

          const smsData = await smsResponse.json();
          const smsSentCount = parseCount(
            (smsData as { sent?: unknown })?.sent
          );
          const smsFailedCount = parseCount(
            (smsData as { failed?: unknown })?.failed
          );
          const smsFailures = getFailureMessages(
            (smsData as { results?: unknown })?.results
          );

          if (
            !smsResponse.ok ||
            (smsData as { success?: unknown })?.success === false
          ) {
            const errorMessage =
              typeof (smsData as { error?: unknown })?.error === "string" &&
              (smsData as { error: string }).error.trim()
                ? (smsData as { error: string }).error
                : smsFailures.join(" • ") || "Failed to send SMS messages.";

            toast({
              title: "SMS request failed",
              description: errorMessage,
              variant: "destructive",
            });
            smsStatusMessage = `SMS: ${errorMessage}`;
          } else if (smsFailedCount > 0) {
            const failureSummary =
              smsFailures.join(" • ") || "Some SMS messages failed to send.";
            toast({
              title: "SMS delivery issues",
              description: failureSummary,
              variant: "destructive",
            });
            smsStatusMessage = describeCounts(
              smsSentCount,
              smsFailedCount,
              "SMS"
            );
          } else {
            toast({
              title: "SMS sent",
              description: `Delivered ${smsSentCount} SMS message${
                smsSentCount === 1 ? "" : "s"
              } successfully.`,
            });
            smsStatusMessage = describeCounts(
              smsSentCount,
              smsFailedCount,
              "SMS"
            );
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unexpected error sending SMS messages.";
          toast({
            title: "SMS request error",
            description: message,
            variant: "destructive",
          });
          smsStatusMessage = `SMS: ${message}`;
          console.error("SMS send error:", error);
        }
      }

      const statusParts = [emailStatusMessage, smsStatusMessage].filter(
        Boolean
      );
      setStatus(statusParts.join(" • "));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unexpected error sending messages.";
      toast({
        title: "Bulk send failed",
        description: message,
        variant: "destructive",
      });
      setStatus(`❌ Error sending messages: ${message}`);
      console.error("Send error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bulk Messaging App
          </h1>
          <p className="text-gray-600">
            Send emails and SMS messages in bulk using Resend & Twilio
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Email Section */}
          <Card className="animate-slide-in-left">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Recipients
              </CardTitle>
              <CardDescription>
                Add at least 2 email addresses ({validEmails.length}/2 minimum)
              </CardDescription>
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
              <CardDescription>
                Add at least 2 phone numbers ({validPhoneNumbers.length}/2
                minimum)
              </CardDescription>
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
                  Need at least 2 emails and email content to send. SMS is
                  optional.
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
  );
}
