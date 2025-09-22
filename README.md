# Bulk Messaging App

This project provides a simple UI for delivering notifications to many recipients over email or SMS.

## API responses

Both `/api/send-emails` and `/api/send-sms` return a JSON payload shaped like:

```
{
  "success": boolean,
  "sent": number,
  "failed": number,
  "message": string,
  "results": Array<...>
}
```

The `success` flag is `true` only when no recipients fail (`failed === 0`). When one or more recipients cannot be reached the request still returns `200 OK`, but `success` becomes `false` so callers can distinguish partial failures. A human-readable `message` summarises the send attempt alongside the per-recipient `results` array.

| Endpoint | Success message | Partial failure message |
| --- | --- | --- |
| `/api/send-emails` | `Sent N email(s) successfully.` | `Sent N email(s) with M failure(s).` |
| `/api/send-sms` | `Sent N SMS message(s) successfully.` | `Sent N SMS message(s) with M failure(s).` |

Clients should inspect the `success` flag (rather than HTTP status) to determine whether every recipient was contacted successfully.
