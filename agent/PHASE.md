# Invoice Platform — Development Phases

## Project Goal

Build a private, self-hosted **Visual Invoice Template Builder + Invoice Generator** for internal team use.

Core architecture:

**Template → Template Version → Invoice Data → Renderer → PDF**

The system must also expose an internal REST API so LeadSquared, payment systems, LMS, website, and other internal applications can create and update invoices without directly accessing the database.

> **Status:** Phases 0–7 are done (see `✅ Done` markers below). Detailed
> per-phase notes — what was built, how it was verified, and any
> implementation deviations from this spec — live in `plan.md` at the repo
> root, not in this file. This file stays the original phase spec.

---

# Phase 0 — Project Assessment & Foundation ✅ Done

## Objective
Understand the existing repository before making major changes.

### Tasks
- Inspect existing project structure.
- Identify current frontend/backend/database setup.
- Identify existing authentication.
- Identify existing PDF/rendering functionality.
- Identify existing database models and migrations.
- Identify deployment/Docker configuration.
- Identify reusable components.
- Check package versions and build scripts.
- Confirm whether PostgreSQL and Prisma are already configured.
- Confirm the safest architecture for incremental development.

### Rules
- Do not rewrite the project unnecessarily.
- Do not remove working functionality.
- Do not introduce duplicate infrastructure.
- Do not make destructive database changes.
- Document important findings.

### Deliverable
Create/update a short technical assessment before major implementation.

---

# Phase 1 — Core Application Foundation ✅ Done

## Objective
Create the stable base of the internal invoice platform.

### Modules
- Authentication
- Users
- Roles/permissions
- Application settings
- Database
- API foundation
- Audit logging foundation

### Required
- PostgreSQL
- Prisma ORM
- TypeScript
- Environment-based configuration
- Secure password hashing
- Request validation
- Error handling
- API versioning: `/api/v1`
- Basic rate limiting
- Structured logging

### Initial entities
- User
- Role
- CompanySettings
- AuditLog
- ApiKey

### Deliverable
Application can authenticate users and provide a protected `/api/v1` API.

---

# Phase 2 — Company & Business Settings ✅ Done

## Objective
Configure the business information used throughout invoices.

### Company fields
- Company name
- Logo
- Address
- GSTIN
- PAN
- State
- State code
- Phone
- Email
- Website

### Bank fields
- Bank name
- Account holder
- Account number
- IFSC
- Branch
- UPI ID

### Invoice defaults
- Currency
- Invoice prefix
- Payment terms
- Default notes
- Default terms
- Tax defaults

### Deliverable
Company settings can be created, edited, validated, and used by invoice templates.

---

# Phase 3 — Customers & Products ✅ Done

## Objective
Create reusable master data for invoice generation.

## Customers

Fields:
- Name
- Company
- GSTIN
- PAN
- Billing address
- Shipping address
- State
- State code
- Phone
- Email

Features:
- Create
- Edit
- Search
- View
- Archive
- Select while creating invoice

## Products / Services

Fields:
- Name
- Description
- HSN/SAC
- Default rate
- GST rate
- Unit

Features:
- Create
- Edit
- Search
- Archive
- Select while creating invoice

### Deliverable
Invoice creation can auto-populate customer and product information.

---

# Phase 4 — Template Data Model ✅ Done

## Objective
Build the template system before building the visual editor.

### Architecture

```text
Template
   ↓
TemplateVersion
   ↓
Layout JSON
```

### Requirements
- Template name
- Description
- Thumbnail/preview
- Created by
- Updated by
- Status
- Version number
- Created/updated timestamps

### Layout JSON

Example:

```json
{
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margins": {
      "top": 30,
      "right": 30,
      "bottom": 30,
      "left": 30
    }
  },
  "components": [
    {
      "id": "header_1",
      "type": "invoice_header",
      "x": 40,
      "y": 40,
      "width": 515,
      "height": 100,
      "locked": false,
      "props": {}
    }
  ]
}
```

### Important rule
Issued invoices must reference the exact `TemplateVersion` used when they were generated.

Editing a template later must never change an old invoice.

---

# Phase 5 — Visual Template Builder ✅ Done

## Objective
Build the main drag-and-drop invoice editor.

## Layout

```text
┌────────────────────────────────────────────────────┐
│ Undo | Redo | Zoom | Preview | Save               │
├──────────────┬──────────────────────┬──────────────┤
│ Components   │                      │ Properties   │
│              │      A4 Canvas       │              │
│ Text         │                      │ Position     │
│ Image        │                      │ Size         │
│ Logo         │                      │ Font         │
│ Divider      │                      │ Color        │
│ Shape        │                      │ Border       │
│ QR Code      │                      │ Padding      │
│ Header       │                      │ Visibility   │
│ Customer     │                      │ Lock         │
│ Items Table  │                      │              │
│ Totals       │                      │              │
└──────────────┴──────────────────────┴──────────────┘
```

## Components

### Basic
- Text
- Image
- Logo
- Divider
- Shape
- QR Code

### Invoice
- Invoice Header
- Business Details
- Customer Details
- Invoice Details
- Invoice Items Table
- Tax Summary
- Totals
- Payment Details
- Signature
- Terms & Conditions
- Notes
- Footer

## Editor actions
- Drag
- Drop
- Move
- Resize
- Select
- Delete
- Duplicate
- Undo
- Redo
- Lock/unlock
- Alignment
- Preview
- Save
- Duplicate template

## Component properties
- X/Y position
- Width/height
- Font
- Font size
- Weight
- Alignment
- Text color
- Background
- Border
- Padding
- Margin
- Visibility
- Lock state

### Deliverable
A user can visually build and save an invoice template without manually writing JSON or HTML.

---

# Phase 6 — Dynamic Fields ✅ Done

## Objective
Connect visual template components to invoice data.

Users should select dynamic fields from a UI instead of manually typing template syntax.

## Business fields
- Logo
- Name
- Address
- GSTIN
- PAN
- Phone
- Email
- Website

## Customer fields
- Name
- Company
- GSTIN
- PAN
- Address
- Shipping address
- State
- State code
- Phone
- Email

## Invoice fields
- Invoice number
- Invoice date
- Due date
- PO number
- Reference
- Invoice status

## Totals
- Subtotal
- Discount
- Taxable amount
- CGST
- SGST
- IGST
- Tax total
- Round off
- Grand total
- Paid amount
- Balance

## Payment
- Bank name
- Account number
- IFSC
- Branch
- UPI ID

### Deliverable
Template components render real invoice data correctly.

---

# Phase 7 — Invoice Items Table ✅ Done

## Objective
Create the specialized dynamic invoice table.

### Default columns

| Column |
|---|
| # |
| Item |
| Description |
| HSN/SAC |
| Quantity |
| Unit |
| Rate |
| Discount |
| GST % |
| Tax Amount |
| Amount |

### Requirements
- Add/remove columns
- Reorder columns
- Configure widths
- Configure alignment
- Dynamic rows
- Auto-expand
- Multiple pages
- Repeat table header on new pages
- Long descriptions
- Large item lists

### Deliverable
Invoice tables work correctly for both short and multi-page invoices.

---

# Phase 8 — GST & Calculation Engine

## Objective
Create a centralized backend calculation engine.

## Support
- CGST
- SGST
- IGST
- GST %
- HSN/SAC
- Discount
- Taxable amount
- Tax amount
- Round-off
- Grand total

## Example

Same-state:

```text
Subtotal       ₹50,000
CGST 9%         ₹4,500
SGST 9%         ₹4,500
Grand Total    ₹59,000
```

Inter-state:

```text
Subtotal       ₹50,000
IGST 18%        ₹9,000
Grand Total    ₹59,000
```

### Critical rules
- Backend is the source of truth.
- Never trust frontend totals.
- Recalculate all monetary values server-side.
- Use decimal-safe arithmetic.
- Avoid JavaScript floating-point calculations for financial totals.

### Deliverable
All invoice totals are calculated consistently through one backend engine.

---

# Phase 9 — Invoice Creation & Management

## Objective
Build the complete invoice workflow.

### Invoice statuses
- Draft
- Issued
- Cancelled

### Payment statuses
- Unpaid
- Partially Paid
- Paid
- Overdue

### Features
- Create invoice
- Edit draft
- Preview
- Issue invoice
- Cancel invoice
- Duplicate invoice
- Search
- Filter
- View invoice
- Generate PDF

### Invoice numbering
Support configurable formats such as:

```text
INV-2026-0001
INV-2026-0002
```

Rules:
- Unique invoice numbers
- Configurable prefix
- Financial year support
- Starting number
- Do not consume final numbers for preview

### Deliverable
Team can create, issue, view, search, and manage invoices.

---

# Phase 10 — Payment Tracking

## Objective
Track payments against invoices.

## Payment record

Fields:
- Invoice ID
- Amount
- Payment date
- Payment method
- Transaction/reference ID
- Notes
- Created timestamp
- Updated timestamp

## Payment methods
- Bank Transfer
- UPI
- Card
- Cash
- Payment Gateway
- Other

## Features
- Add payment
- Edit payment
- Void/delete according to permissions
- Payment history
- Payment timeline
- Automatic payment status
- Balance calculation

### Important rule

Payment status should be derived from payment records:

```text
Paid = total paid >= invoice total
Partially Paid = paid > 0 and paid < invoice total
Unpaid = paid = 0
Overdue = unpaid/partial + past due date
```

### Deliverable
Invoice payment state is always consistent with payment records.

---

# Phase 11 — Payment Links

## Objective
Support payment collection through generated payment links.

### Link statuses
- Active
- Paid
- Expired
- Deactivated

### Requirements
- Multiple links per invoice
- Configurable amount
- Partial payment support
- Installment support
- Expiration
- Deactivation
- Payment gateway reference
- Payment callback/webhook

### Security
Payment callbacks must be idempotent.

The same gateway transaction must never create duplicate payment records.

### Deliverable
Payment links can be generated, tracked, expired, and connected to invoice payments.

---

# Phase 12 — PDF Rendering

## Objective
Generate production-quality PDFs.

## Recommended renderer
- Chromium
- Puppeteer or Playwright

## Requirements
- A4
- High quality
- Exact template rendering
- Multi-page support
- Page breaks
- Margins
- Dynamic item rows
- Repeated headers
- Header/footer
- Logo
- QR code
- Fonts
- Print-safe layout

### Important architecture

```text
Template JSON
      ↓
Renderer
      ↓
HTML/CSS
      ↓
Chromium
      ↓
PDF
```

Preview and PDF should use the same rendering logic as much as possible.

### Deliverable
Generated PDFs visually match the template preview.

---

# Phase 13 — Invoice Dashboard

## Objective
Create the main operational dashboard.

## Summary cards
- Total invoices
- Total invoiced amount
- Paid amount
- Unpaid amount
- Partially paid amount
- Overdue amount

## Recent invoices
Show:
- Invoice number
- Customer
- Date
- Total
- Paid
- Balance
- Payment status
- Invoice status
- Actions

## Filters
- All
- Paid
- Unpaid
- Partially Paid
- Overdue
- Cancelled

### Deliverable
Team can quickly understand invoice and payment status from one dashboard.

---

# Phase 14 — REST API

## Objective
Allow internal systems to use the invoice platform programmatically.

## Templates

```text
GET    /api/v1/templates
POST   /api/v1/templates
GET    /api/v1/templates/:id
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id
POST   /api/v1/templates/:id/duplicate
```

## Invoices

```text
GET    /api/v1/invoices
POST   /api/v1/invoices
GET    /api/v1/invoices/:id
PUT    /api/v1/invoices/:id
DELETE /api/v1/invoices/:id
POST   /api/v1/invoices/:id/issue
GET    /api/v1/invoices/:id/pdf
GET    /api/v1/invoices/:id/preview
```

## Customers

```text
GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PUT    /api/v1/customers/:id
```

## Products

```text
GET    /api/v1/products
POST   /api/v1/products
PUT    /api/v1/products/:id
```

## Payments

```text
GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/payments/:id
```

### API authentication

Use:

```text
Authorization: Bearer inv_live_xxxxxxxxx
```

API keys should be:
- Hashed where practical
- Labeled
- Revocable
- Timestamped
- Permission/scoped where useful

### Deliverable
Internal systems can create and manage invoices through the API.

---

# Phase 15 — Webhooks & Integrations

## Objective
Allow the invoice system to notify other internal systems.

## Events

```text
invoice.created
invoice.issued
invoice.updated
invoice.cancelled

payment.created
payment.updated
payment.completed
```

## Requirements
- Webhook endpoint configuration
- Signing secret
- HMAC signature
- Retry mechanism
- Delivery logs
- Failure tracking
- Idempotency
- Replay/retry capability

### Integration principle

```text
LeadSquared
Payment System
LMS
Website
      ↓
Invoice API
      ↓
Invoice Database
```

Other systems should use the API instead of writing directly to the invoice database.

### Deliverable
Invoice events can reliably reach connected internal systems.

---

# Phase 16 — Security & Audit

## Objective
Make the application safe for internal production use.

### Security
- Authentication
- Authorization
- Password hashing
- Input validation
- Output validation
- Rate limiting
- API key security
- CSRF protection where applicable
- Secure file handling
- Secure headers
- Environment variables
- No secrets in Git
- Parameterized SQL/ORM

### Audit events
Track:
- Invoice created
- Invoice edited
- Invoice issued
- Invoice cancelled
- Payment added
- Payment edited
- Payment voided
- Template created
- Template updated
- Template version created

Audit data:
- User
- Action
- Entity
- Entity ID
- Timestamp
- Metadata

### Important rule
Issued invoices should not be hard deleted.

Prefer cancellation/soft deletion.

---

# Phase 17 — Testing & Quality

## Objective
Verify that the system works reliably before production use.

## Unit tests
- GST calculations
- Discounts
- Round-off
- Payment calculations
- Invoice numbering
- Status calculations
- Template validation

## Integration tests
- Invoice API
- Payment API
- Template API
- Authentication
- Webhooks
- PDF generation

## UI tests
- Login
- Dashboard
- Template builder
- Invoice creation
- Invoice issue
- Payment entry
- PDF preview/download

## PDF tests
Test:
- One-page invoice
- Multi-page invoice
- Large item list
- Long descriptions
- GST
- Discounts
- Logo
- QR code
- Header/footer
- Page breaks

### Deliverable
A repeatable test suite and production-readiness checklist.

---

# Phase 18 — Deployment

## Objective
Deploy the private system safely.

### Recommended
- Docker
- PostgreSQL
- Application container
- Persistent storage
- Reverse proxy
- HTTPS

### Requirements
- `.env`
- `.env.example`
- Database migrations
- Database backup
- Restore procedure
- Log rotation
- Health check
- Monitoring
- Production build

### Deliverable
The application can be deployed and restored reliably on the internal/self-hosted environment.

---

# Phase 19 — Production Hardening

## Objective
Prepare for real internal usage.

### Checklist
- Backup verified
- Restore verified
- HTTPS verified
- Authentication verified
- API authentication verified
- Permissions verified
- Audit logging verified
- PDF rendering verified
- Payment idempotency verified
- Webhook retries verified
- Invoice numbering verified
- Template versioning verified
- Old invoices remain unchanged after template edits
- No secrets committed
- Error handling verified
- Database migrations verified

---

# V1 Scope

V1 should include:

- Authentication
- Company settings
- Customers
- Products/services
- Template gallery
- My Templates
- Visual template builder
- Dynamic fields
- Invoice items table
- GST engine
- Invoice creation
- Invoice numbering
- Invoice statuses
- Payment tracking
- Payment links
- PDF generation
- Dashboard
- REST API
- API keys
- Webhooks
- Audit logs
- Docker deployment

---

# Post-V1

Possible later modules:

- Quotation
- Estimate
- Proforma Invoice
- Credit Note
- Debit Note
- Bill of Supply
- Delivery Challan
- Receipt
- Recurring invoices
- Email delivery
- WhatsApp delivery
- Advanced reports
- Payment gateway expansion
- Advanced role permissions
- Bulk invoice generation
- Import/export
- Accounting integrations

Do not build these before the V1 foundation is stable unless explicitly required.

---

# Development Rules

1. Inspect before changing.
2. Do not break existing functionality.
3. Prefer incremental changes.
4. Keep modules separated.
5. Keep business logic in backend services.
6. Keep GST calculations centralized.
7. Never trust frontend monetary totals.
8. Use decimal-safe monetary calculations.
9. Templates and invoice data must remain separate.
10. Every issued invoice must preserve its template version.
11. Do not hard delete issued invoices.
12. API must not expose database credentials.
13. Never commit secrets.
14. Use migrations for schema changes.
15. Add tests for important financial logic.
16. Keep the UI clean and professional.
17. Avoid unnecessary infrastructure.
18. Do not build SaaS billing or tenant management.
19. Do not add Free/Premium template distinctions.
20. Do not copy Oreko code or branding; use only the general product concept as inspiration.

---

# Agent Execution Order

Agents should implement phases in this order:

```text
Phase 0
  ↓
Phase 1
  ↓
Phase 2
  ↓
Phase 3
  ↓
Phase 4
  ↓
Phase 5
  ↓
Phase 6
  ↓
Phase 7
  ↓
Phase 8
  ↓
Phase 9
  ↓
Phase 10
  ↓
Phase 11
  ↓
Phase 12
  ↓
Phase 13
  ↓
Phase 14
  ↓
Phase 15
  ↓
Phase 16
  ↓
Phase 17
  ↓
Phase 18
  ↓
Phase 19
```

Each phase should be completed and verified before moving to the next major phase.

For every phase, the coding agent should report:

1. What was inspected.
2. What was changed.
3. Files created/modified.
4. Database changes.
5. API changes.
6. Tests added.
7. Tests executed.
8. Any known issues.
9. Recommended next phase.

