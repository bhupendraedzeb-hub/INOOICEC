# API Reference

REST API for the Invoice Platform, under `/api/v1/*`. Every resource is scoped to the caller's `Organization` — two organizations never see or touch each other's data; a request for another org's resource returns `404 Not Found`, not `403 Forbidden` (indistinguishable from non-existence).

Money and quantity fields are always strings on the wire (`"1234.50"`, up to 4 decimal places), never JSON numbers — avoids floating-point drift crossing the API boundary. All totals are recomputed server-side from line-item inputs; client-sent totals are always ignored.

## Authentication

Two methods, resolved in this order (`src/lib/auth/resolveRequestAuth.ts`):

1. **Browser session** — a NextAuth session cookie, set by signing in at `/login`. Gated by the user's `role` (`OWNER` / `ADMIN` / `STAFF`) on routes that declare `roles`.
2. **API key** — `Authorization: Bearer inv_live_...` header. Gated by the key's granted `scope` (e.g. `"invoices:write"`) on routes that declare `scope`.

A request is governed by **exactly one** gate, never both: a session actor is checked only against `roles` (its `scope`, if the route has one, is ignored); an API-key actor is checked only against `scope` (its `roles`, if the route has one, is ignored). A route that declares `roles` but no `scope` has nothing for an API key to be correctly gated on, so API keys are **rejected outright** on it — user/API-key/webhook-endpoint management and other sensitive admin actions are session-only, full stop.

### Creating an API key

`POST /api/v1/api-keys` (OWNER/ADMIN, session-only). Response:

```json
{ "id": "...", "label": "...", "key": "inv_live_AbCdEf...", "prefix": "inv_live_AbCdEf12", "scopes": [...], "createdAt": "..." }
```

The plaintext `key` is returned **exactly once**, at creation — it is hashed (argon2id) before storage and never logged or retrievable again. Losing it means generating a new key. `prefix` (the key's first 17 characters) is shown afterward in the UI for identification only — it is not a secret.

Revoke with `POST /api/v1/api-keys/:id/revoke` — revocation is permanent, there's no un-revoke.

### Scopes

One read/write pair per resource:

| Scope | Grants |
|---|---|
| `customers:read` / `customers:write` | Customers |
| `products:read` / `products:write` | Products |
| `templates:read` / `templates:write` | Invoice templates + versions |
| `invoices:read` / `invoices:write` | Invoices, PDF/preview |
| `payments:read` / `payments:write` | Payments |
| `payment_links:read` / `payment_links:write` | Payment links |
| `settings:read` / `settings:write` | Company settings |
| `receipt_templates:read` / `receipt_templates:write` | Receipt templates + versions |
| `receipts:read` | Receipts (read-only — receipts are never client-created, only auto-generated) |

No scope exists for API keys, users, or webhook endpoints — those are always session-only (OWNER/ADMIN), regardless of any scope a key holds.

## Rate limiting

Per-IP, in-memory sliding window (single-instance deployment; not shared across multiple app processes):

| Path prefix | Limit |
|---|---|
| `/api/auth/*` (login, signup) | 20 requests / 60s |
| `/api/v1/*` | 300 requests / 60s |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header (seconds).

## Errors

Every route shares one error envelope:

```json
{ "error": "Human-readable message" }
```

Validation failures (`422`) additionally include Zod's raw issues:

```json
{ "error": "Validation failed", "issues": [ { "path": ["email"], "message": "Invalid email" } ] }
```

| Status | Meaning |
|---|---|
| `401` | No valid session or API key |
| `403` | Session role, or API-key scope, doesn't permit this action |
| `404` | Not found, or belongs to a different organization (same response either way) |
| `409` | Valid request, but conflicts with the resource's current state (e.g. editing an issued invoice, double-voiding a payment) |
| `422` | Validation failure, or a business-rule rejection (e.g. overpayment) |
| `429` | Rate limited |
| `500` | Unhandled server error |

## Resources

Unless noted, list (`GET` on the collection) and detail (`GET /:id`) routes require the `:read` scope; mutating routes require `:write`. All writes are also recorded to the audit log (`AuditLog` table, visible only internally — not exposed via this API).

### Customers — `/api/v1/customers`

- `GET /` — query: `q` (search name/company/GSTIN), `includeArchived` (`"true"`/omit)
- `POST /` — body: `customerSchema` (`name` required; `companyName`, `gstin`, `pan`, `billingAddress`, `shippingAddress`, `state`, `stateCode`, `phone`, `email` all optional)
- `GET /:id`
- `PUT /:id` — same body as `POST`

`stateCode` should be the 2-digit GST state code (e.g. `"07"` for Delhi) — it's compared by plain string equality against the company's own `stateCode` to decide IGST vs. CGST+SGST on any invoice to this customer, so it must match format.

### Products — `/api/v1/products`

- `GET /` — query: `q`, `includeArchived`
- `POST /` — body: `productSchema` (`name`, `defaultRate`, `gstRate` required; `description`, `hsnSac`, `unit` optional; `defaultRate`/`gstRate` are decimal strings)
- `GET /:id`
- `PUT /:id`

Each product carries its own GST rate — selecting a product on an invoice line auto-fills its rate and GST%, independently of every other product.

### Invoices — `/api/v1/invoices`

- `GET /` — query: `q`, `status` (`DRAFT`/`ISSUED`/`CANCELLED`), `paymentStatus` (`UNPAID`/`PARTIALLY_PAID`/`PAID`/`OVERDUE`), `customerId`
- `POST /` — body: `invoiceInputSchema`:
  ```ts
  {
    templateId: string; customerId: string; dueDate?: string | null;
    notes?: string | null; terms?: string | null;
    taxType?: "AUTO" | "FORCE_IGST" | "FORCE_CGST_SGST"; // default AUTO
    pricesIncludeTax?: boolean; // default false
    items: Array<{
      productId?: string | null; description: string; hsnSac?: string | null;
      quantity: string; unit?: string | null; rate: string;
      discount?: string; gstRate: string;
    }>; // at least 1 item
  }
  ```
  Creates a `DRAFT` invoice (no invoice number yet). `taxType: "FORCE_IGST"`/`"FORCE_CGST_SGST"` overrides the automatic company-vs-customer state comparison; `pricesIncludeTax: true` treats each line's `quantity × rate` as already tax-inclusive and back-calculates the taxable base instead of adding tax on top.
- `GET /:id`
- `PUT /:id` — same body; **only while `status === "DRAFT"`** (`409` otherwise). Fully replaces line items.
- `DELETE /:id` — hard delete; **only while `DRAFT`**. Issued/cancelled invoices are never deleted, only cancelled.
- `POST /:id/issue` — reserves the invoice number (per-org, per-financial-year sequence) and pins the template's current latest version. `409` if not `DRAFT`, `422` if it has no items. Irreversible — an issued invoice's number, totals, and rendered layout are permanent even if the template is edited afterward.
- `POST /:id/cancel` — body: `{ reason: string }`. `409` if already cancelled. Status flag only, never deletes.
- `POST /:id/duplicate` — creates a new `DRAFT` copying line items and all invoice-level flags (including `taxType`/`pricesIncludeTax`) from the source, `201`.
- `GET /:id/preview` — resolved render data (layout + field values) for the live on-screen preview; safe to call any number of times, never mutates state.
- `GET /:id/pdf` — binary `application/pdf` response (`Content-Disposition: attachment`). Renders from the pinned template version if issued, or the template's current live version if still draft.

### Payments — `/api/v1/payments`

- `GET /` — query: `invoiceId`
- `POST /` — body: `createPaymentSchema` (`invoiceId`, `amount` (decimal string), `paymentDate` (ISO string), `method` (`BANK_TRANSFER`/`UPI`/`CARD`/`CASH`/`GATEWAY`/`OTHER`), `transactionRef?`, `notes?`). Invoice must be `ISSUED` (`409` otherwise). `422` if the payment would exceed the invoice's remaining balance (`OverpaymentError`). On success, a matching `Receipt` auto-generates in the background if the org has a default Active receipt template configured — this never blocks the payment itself.
- `GET /:id`
- `PUT /:id` — same body, minus `invoiceId`. `409` if the payment is already voided.
- `POST /:id/void` — body: `{ reason: string }`. Voided, never deleted (a financial record). `409` if already voided.

### Payment Links — `/api/v1/payment-links`

- `GET /` — query: `invoiceId`
- `POST /` — body: `createPaymentLinkSchema` (`invoiceId`, `amount`, `provider`, `expiresAt?`). Invoice must be `ISSUED`.
- `GET /:id`
- `POST /:id/deactivate` — `409` if already inactive/paid (state-dependent).

### Inbound payment webhook — `POST /api/v1/webhooks`

A generic, vendor-agnostic receiver for payment-gateway callbacks (not scoped under `/v1`, no session/API-key auth). Authenticated by a shared secret header instead:

```
X-Webhook-Secret: <INBOUND_WEBHOOK_SECRET env var>
```

Body:
```json
{ "token": "...", "gatewayTransactionId": "...", "amount": "500.00", "status": "success" | "failed" }
```
`token` identifies the `PaymentLink`. Idempotent — replaying the same `gatewayTransactionId` against an already-recorded payment is a no-op, safe under retries or duplicate delivery. Returns `404` if the token doesn't match any link, `409` if the link is in the wrong state (expired/deactivated/already paid), `422` for a bad amount.

### Templates (Invoice) — `/api/v1/templates`

- `GET /` — query: `q`, `status` (`DRAFT`/`ACTIVE`/`ARCHIVED`)
- `POST /` — body: `{ name, description?, thumbnailUrl?, status?, isDefault? }`
- `GET /:id` — includes `latestVersion`
- `PUT /:id` — same body as `POST`
- `DELETE /:id` — soft delete (sets `status: "ARCHIVED"`), never removes the row
- `GET /:id/versions` — full version history
- `POST /:id/versions` — body: `{ layout: TemplateDocument }` (the builder's component-tree JSON). **Always inserts a new version**, never updates an existing one — this is what makes already-issued invoices immune to later template edits.
- `POST /:id/duplicate` — `201`, copies the template's current metadata + latest version into a new template

### Receipt Templates — `/api/v1/receipt-templates`

Identical shape to Templates above, at `/api/v1/receipt-templates` (`receipt_templates:read`/`:write`), including `/:id/versions` and `/:id/duplicate`. One receipt template per org should be marked `isDefault: true` and `status: "ACTIVE"` — that's the one every new payment's receipt renders against.

### Receipts — `/api/v1/receipts`

Read-only — there is no `POST`; a `Receipt` is only ever created automatically alongside a `Payment` (see above).

- `GET /` — query: `paymentId`, `invoiceId`
- `GET /:id`
- `GET /:id/pdf` — binary `application/pdf`, same pattern as the invoice PDF route

### Company Settings — `/api/v1/settings/company`

- `GET /` — `settings:read`
- `PUT /` — a session actor must be OWNER/ADMIN; an API-key actor needs `settings:write` (same either/or gating as every other route — this one just declares both options). Body: `companySettingsSchema` — identity, address (`state`/`stateCode` — same GST-code-format requirement as customers), tax identifiers, bank details, and invoice defaults (`invoicePrefix`, `invoiceNumberFormat`, etc).

### Users — `/api/v1/users` (session-only, OWNER/ADMIN)

- `GET /` — every user in the caller's organization
- `POST /` — body: `{ name, email, password (min 8 chars), role: "OWNER"|"ADMIN"|"STAFF" }`. `409` if the email is already registered.
- `POST /:id/deactivate` — `422` if targeting your own account (can't deactivate yourself)

### API Keys — `/api/v1/api-keys` (session-only, OWNER/ADMIN)

- `GET /` — list (never returns the plaintext secret, only `prefix`)
- `POST /` — body: `{ label, scopes: ApiKeyScope[] }` — see the [Scopes](#scopes) table for valid values. Returns the plaintext key once (see [Creating an API key](#creating-an-api-key)).
- `POST /:id/revoke` — `409` if already revoked

### Webhook Endpoints — `/api/v1/webhook-endpoints` (session-only, OWNER/ADMIN)

Configures **outbound** delivery of business events to your own URL — see [Outbound Webhooks](#outbound-webhooks) below.

- `GET /`
- `POST /` — body: `{ url, label?, events: WebhookEvent[] }` (at least one event)
- `GET /:id`
- `PUT /:id` — body: `{ url, label?, events, isActive }` — also how an endpoint is deactivated (`isActive: false`); never hard-deleted, so its delivery history stays intact
- `GET /:id/deliveries` — delivery log for this endpoint

### Webhook Deliveries — `/api/v1/webhook-deliveries` (session-only, OWNER/ADMIN)

- `POST /:id/replay` — resets a `FAILED` or `EXHAUSTED` delivery back to `PENDING` with a fresh attempt count; picked up by the next delivery-worker tick, typically within seconds.

### Misc

- `GET /api/v1/ping` — auth smoke-test, returns `{ ok: true, user: {...} }`
- `GET /api/health` — unauthenticated, outside `/v1`. Checks DB connectivity. `200` `{ status: "ok", db: "connected" }` or `503` `{ status: "error", db: "unreachable" }`. Used by Docker healthchecks / uptime monitors.
- `POST /api/auth/signup` — public, unauthenticated. Body: `{ organizationName, name, email, password, confirmPassword }`. Creates a **brand-new, fully isolated Organization** and its first OWNER user — never joins an existing org. `409` if the email is already registered.

## Outbound Webhooks

Configure a `WebhookEndpoint` (above) subscribed to one or more events. Every state change matching a subscribed event enqueues a `WebhookDelivery` row per matching endpoint:

| Event | Fires when |
|---|---|
| `invoice.created` | A new invoice draft is created (also on duplicate) |
| `invoice.issued` | An invoice is issued (number assigned) |
| `invoice.updated` | A draft invoice is edited |
| `invoice.cancelled` | An invoice is cancelled |
| `payment.created` | A payment is recorded |
| `payment.updated` | A payment is edited or voided |
| `payment.completed` | An invoice's payment status transitions **into** `PAID` for the first time (not re-fired on subsequent writes while already paid) |

Delivery is idempotent per state change — the same event for the same entity at the same version is enqueued at most once, even if triggered twice.

**Payload:**
```json
{ "event": "invoice.issued", "timestamp": "2026-...", "data": { "entityType": "Invoice", "entityId": "...", "invoiceNumber": "...", ... } }
```

**Request headers** (POST to your configured `url`):
```
Content-Type: application/json
X-Webhook-Signature: sha256=<hex hmac>
X-Webhook-Timestamp: <unix ms>
X-Webhook-Event: invoice.issued
X-Webhook-Delivery-Id: <delivery id>
```

**Verifying the signature** — HMAC-SHA256 over `${timestamp}.${rawBody}` (not the body alone, so a captured signature can't be replayed against a different payload later), using the endpoint's own signing secret (shown once at creation, alongside the endpoint):

```js
const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
// compare `expected` against the X-Webhook-Signature header's value (after "sha256="), timing-safe
```

Also verify `X-Webhook-Timestamp` is recent (reject if too old) to fully close the replay window, same pattern as Stripe/GitHub webhooks.

**Retries:** on a non-2xx response or timeout (10s), retries with backoff: 1m, 5m, 15m, 1h, 3h, 6h, 12h, 24h. After 8 total attempts, the delivery moves to `EXHAUSTED` and stops retrying automatically — replay it manually via `POST /api/v1/webhook-deliveries/:id/replay`.
