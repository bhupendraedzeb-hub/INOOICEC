# AGENTS.md

## Project: Private Invoice Generator & Template Platform

### 1. Project Goal

Build a private, self-hosted invoice management platform for internal business use.

The system must provide:

1. A visual invoice template builder.
2. A template gallery.
3. User-created/custom templates.
4. Invoice creation using any saved template.
5. Dynamic invoice fields/components.
6. GST/tax calculations suitable for Indian invoices.
7. PDF generation from templates.
8. Invoice/payment tracking.
9. Paid, unpaid, partially paid, overdue and cancelled states.
10. An internal REST API so other existing systems can create invoices and record payments.
11. A clean visual dashboard for internal users.

This is NOT a SaaS product.

Do NOT implement:
- Subscription plans
- Free/Premium template tiers
- Public template marketplace
- Tenant billing
- SaaS onboarding
- Public developer monetization

The application is private and self-hosted.

---

## 2. Core Product Principle

Keep these three concepts separate:

TEMPLATE = visual design/layout

INVOICE DATA = business/customer/item/payment data

RENDERER = combines template + invoice data and generates the final PDF

Architecture:

Template JSON
+
Invoice JSON
+
Calculation Engine
        |
        v
Template Renderer
        |
        v
HTML Preview / PDF

Changing a template must NOT modify invoice business data.

Changing a template later must NOT change previously generated invoices.

---

## 3. Recommended Architecture

Use a modular architecture.

Frontend:
- React / Next.js
- TypeScript
- Responsive UI
- Visual drag-and-drop template builder

Backend:
- Next.js API routes or modular Node.js API
- TypeScript
- REST API

Database:
- PostgreSQL

ORM:
- Prisma

PDF:
- HTML/CSS rendering using Chromium/Puppeteer or Playwright
- A4-first design
- Support multi-page invoices

Deployment:
- Docker
- Environment variables
- Production-ready logging
- Database migrations

Do not introduce unnecessary infrastructure.

---

## 4. Main Modules

### Dashboard

Show:
- Total invoices
- Total invoiced amount
- Paid amount
- Unpaid amount
- Partially paid amount
- Overdue amount
- Recent invoices

### Templates

- Template gallery
- My Templates
- Create Template
- Edit Template
- Duplicate Template
- Delete Template
- Preview Template
- Set default template

No Free/Premium categorization.

### Template Builder

Visual drag-and-drop editor.

Components should include:

CONTENT:
- Text
- Image
- Logo
- Divider
- Shape
- QR Code

INVOICE:
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

Components must support properties such as:
- Position
- Width
- Height
- Font
- Font size
- Font weight
- Alignment
- Color
- Background
- Border
- Padding
- Margin
- Visibility
- Locked/unlocked

Do not build a generic unrestricted page editor if an invoice-specific component system can solve the requirement.

---

## 5. Dynamic Fields

Templates must support dynamic fields.

Examples:

Business:
- business.logo
- business.name
- business.address
- business.gstin
- business.phone
- business.email
- business.website

Customer:
- customer.name
- customer.company
- customer.gstin
- customer.address
- customer.shipping_address
- customer.phone
- customer.email

Invoice:
- invoice.number
- invoice.date
- invoice.due_date
- invoice.po_number
- invoice.reference
- invoice.status

Amounts:
- totals.subtotal
- totals.discount
- totals.taxable_amount
- totals.cgst
- totals.sgst
- totals.igst
- totals.tax_total
- totals.round_off
- totals.grand_total
- totals.paid
- totals.balance

Payment:
- payment.bank_name
- payment.account_number
- payment.ifsc
- payment.upi

Do not expose raw template syntax to normal users unless useful. The visual builder should provide these as selectable/drag-and-drop fields.

---

## 6. Invoice Items Table

The invoice items table is a special dynamic component.

Possible columns:
- #
- Item
- Description
- HSN/SAC
- Quantity
- Unit
- Rate
- Discount
- GST %
- Tax amount
- Amount

The table must:
- Dynamically add/remove rows.
- Expand automatically.
- Support many items.
- Continue onto additional pages.
- Preserve headers on additional PDF pages where possible.
- Allow configurable columns.
- Calculate amounts from invoice data.

---

## 7. GST / Tax Engine

Support Indian invoice calculations.

At minimum:
- CGST
- SGST
- IGST
- GST percentage
- HSN/SAC
- Taxable amount
- Tax amount
- Discount
- Round-off
- Grand total

Same-state example:

Subtotal ₹50,000
CGST 9% ₹4,500
SGST 9% ₹4,500
Total ₹59,000

Inter-state example:

Subtotal ₹50,000
IGST 18% ₹9,000
Total ₹59,000

Tax logic must be centralized in the backend.

Never trust totals sent by the frontend.

Backend must recalculate:
- Line totals
- Discounts
- Taxable amount
- GST
- Grand total
- Paid amount
- Balance

Use decimal-safe money calculations. Do not use floating point arithmetic for monetary calculations.

---

## 8. Invoice Status vs Payment Status

Keep these separate.

Invoice Status:
- Draft
- Issued
- Cancelled

Payment Status:
- Unpaid
- Partially Paid
- Paid
- Overdue

Example:

Invoice Status: Issued
Payment Status: Partially Paid

Total: ₹59,000
Paid: ₹25,000
Balance: ₹34,000

Payment status must be derived from actual payment records where possible.

---

## 9. Payments

A payment record should contain at least:

- Invoice ID
- Amount
- Payment date
- Payment method
- Transaction/reference ID
- Notes
- Created timestamp

Payment methods can include:
- Bank Transfer
- UPI
- Card
- Cash
- Payment Gateway
- Other

Support multiple payments against one invoice.

Example:

Invoice total: ₹59,000

Payment 1: ₹25,000
Payment 2: ₹20,000
Payment 3: ₹14,000

Final status:
Paid

Never allow total recorded payments to exceed the invoice balance unless an explicit overpayment feature is later implemented.

---

## 10. Payment Links

Keep the architecture ready for payment links.

A payment link may have:
- Invoice ID
- Amount
- Provider
- External payment ID
- Status
- Expiry
- Created timestamp

Statuses:
- Active
- Paid
- Expired
- Deactivated

Payment-link processing must be idempotent.

A payment success webhook must not create duplicate payment records.

---

## 11. Invoice Numbering

Support configurable numbering.

Example:

INV-2026-0001

Settings:
- Prefix
- Financial year
- Starting number
- Number format

Invoice numbers must be unique.

Do not generate invoice numbers on every preview.

Generate/reserve the final number only at the appropriate invoice issuance stage.

---

## 12. PDF Generation

PDF output is a core feature.

Requirements:
- A4
- High-quality output
- Exact template rendering
- Multi-page support
- Correct margins
- Correct page breaks
- Dynamic item rows
- Header/footer support
- Logo support
- QR code support

The browser preview and PDF should use the same rendering source wherever practical.

Do not create one layout for preview and a completely different layout for PDF.

---

## 13. Template Versioning

Templates must be versioned.

Example:

Template:
EdZeb Invoice

Version 1
Version 2
Version 3

When an invoice is issued/generated, preserve the template version used by that invoice.

Old invoices must never visually change because the template was edited later.

Recommended model:

Template
  -> TemplateVersion
      -> Layout JSON

Invoice
  -> TemplateVersion ID

---

## 14. Template Data Model

Use a structured JSON layout.

Conceptual example:

{
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margins": {}
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

Do not store only rendered HTML as the source of truth.

The layout must remain editable.

---

## 15. Template Builder Rules

The builder must support:

- Drag
- Drop
- Move
- Resize
- Select
- Delete
- Duplicate
- Undo
- Redo
- Lock
- Unlock
- Alignment
- Preview
- Save
- Duplicate template

Avoid implementing unnecessary animation.

Invoice templates prioritize:
- Accuracy
- Printability
- Consistency
- Ease of editing

over visual effects.

---

## 16. Company Settings

Company profile should support:

- Company name
- Logo
- Address
- GSTIN
- PAN
- Phone
- Email
- Website
- State
- State code

Bank details:
- Bank name
- Account holder
- Account number
- IFSC
- Branch
- UPI ID

Default invoice settings:
- Currency
- Tax settings
- Invoice prefix
- Payment terms
- Default notes
- Default terms and conditions

---

## 17. Customers

Customer database:

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

Creating an invoice should allow selecting an existing customer.

Selecting a customer should automatically populate customer details.

---

## 18. Products / Services

Optional reusable catalog.

Fields:
- Name
- Description
- HSN/SAC
- Default rate
- GST rate
- Unit

Selecting a product should populate invoice item defaults.

---

## 19. Internal REST API

The API is important even though this is an internal application.

External/internal systems should NOT directly write to the database.

They should use the API.

Example:

POST /api/v1/invoices

{
  "template_id": "template_123",
  "customer": {
    "name": "ABC Pvt Ltd",
    "gstin": "06XXXXXXXXXX"
  },
  "items": [
    {
      "name": "Service",
      "quantity": 1,
      "rate": 50000,
      "gst_rate": 18
    }
  ]
}

Response:

{
  "success": true,
  "invoice_id": "inv_123",
  "invoice_number": "INV-2026-0001",
  "pdf_url": "...",
  "public_url": "..."
}

---

## 20. API Endpoints

Initial API:

GET    /api/v1/templates
POST   /api/v1/templates
GET    /api/v1/templates/:id
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id
POST   /api/v1/templates/:id/duplicate

GET    /api/v1/invoices
POST   /api/v1/invoices
GET    /api/v1/invoices/:id
PUT    /api/v1/invoices/:id
DELETE /api/v1/invoices/:id
POST   /api/v1/invoices/:id/issue
GET    /api/v1/invoices/:id/pdf
GET    /api/v1/invoices/:id/preview

GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/:id
PUT    /api/v1/customers/:id

GET    /api/v1/products
POST   /api/v1/products
PUT    /api/v1/products/:id

GET    /api/v1/payments
POST   /api/v1/payments
GET    /api/v1/payments/:id

Keep API versioning from day one.

---

## 21. API Authentication

Use API keys for integrations.

Example:

Authorization: Bearer inv_live_xxxxxxxxx

API keys should:
- Be hashed in database where practical.
- Never be stored as plain text after creation.
- Support revoke.
- Have a name/label.
- Have created/last-used timestamps.
- Be scoped to permitted operations if practical.

Never expose secret API keys in frontend code.

---

## 22. Webhooks

Prepare for:

- invoice.created
- invoice.issued
- invoice.updated
- invoice.cancelled
- payment.created
- payment.updated
- payment.completed

Webhook delivery must support:
- Retry
- Signature verification
- Idempotency
- Delivery logs

---

## 23. Integration Example

The platform should support workflows such as:

Payment System
  -> Invoice API
  -> Invoice created
  -> PDF generated
  -> Payment recorded
  -> LeadSquared updated

Other possible integrations:
- CRM
- ERP
- Website
- LMS
- Payment gateway
- Internal admin systems

Do not hard-code the invoice system specifically for LeadSquared.

Build a generic API.

---

## 24. Security

Minimum requirements:

- Authentication
- Authorization
- Secure password hashing
- CSRF protection where applicable
- Input validation
- Output validation
- Rate limiting for API
- API key authentication
- Audit logging for important financial actions
- Secure file handling
- No secrets committed to Git
- Environment variables for credentials
- SQL injection protection through ORM/parameterization

Financial records must not be silently deleted.

Prefer soft deletion or cancellation for issued invoices.

---

## 25. Audit Log

Track important actions:

- Invoice created
- Invoice edited
- Invoice issued
- Invoice cancelled
- Payment added
- Payment edited
- Payment deleted/voided
- Template created
- Template updated
- Template version created

Record:
- User
- Action
- Entity
- Entity ID
- Timestamp
- Relevant metadata

---

## 26. UI Principles

The UI should be:
- Clean
- Fast
- Professional
- Simple
- Responsive

Avoid unnecessary complexity.

Invoice creation should be easy for a non-technical staff member.

Recommended invoice builder layout:

LEFT:
Form/data entry

CENTER:
Live invoice preview

RIGHT:
Optional contextual properties/settings

Template builder:

LEFT:
Components

CENTER:
A4 canvas

RIGHT:
Properties

---

## 27. Important UX Rules

When creating an invoice:

1. Select template.
2. Select/create customer.
3. Enter invoice details.
4. Add items.
5. System calculates taxes/totals.
6. Preview.
7. Save as draft or issue.
8. Generate PDF.
9. Record/share payment information.

Allow changing the template before issuing.

Changing template must preserve invoice data.

---

## 28. Do Not Overbuild V1

V1 should focus on:

- Authentication
- Dashboard
- Company settings
- Customers
- Products/services
- Template gallery
- Visual template builder
- Template saving/versioning
- Invoice builder
- GST calculations
- PDF generation
- Invoice history
- Payment records
- Paid/unpaid/partial/overdue
- Internal REST API
- API key authentication

Do NOT start with:
- SaaS billing
- Subscription management
- Public marketplace
- Multi-tenant billing
- Accounting ledger
- Full ERP
- Advanced analytics
- Complex automation engine

---

## 29. Development Rules

Before coding:

1. Inspect the existing repository.
2. Do not overwrite existing working functionality without understanding it.
3. Identify the current stack.
4. Create a technical plan.
5. Identify reusable components.
6. Propose database schema.
7. Confirm architecture internally before major implementation.

While coding:

- TypeScript strict mode where applicable.
- Small modular components.
- Reusable services.
- Centralized calculation logic.
- Centralized PDF rendering.
- Centralized template schema.
- Validate all API input.
- Use database transactions for financial operations.
- Use migrations.
- Add tests for calculations and payment states.

After coding:

- Run lint.
- Run type checking.
- Run unit tests.
- Run build.
- Test PDF generation.
- Test multi-page invoices.
- Test GST calculations.
- Test partial payments.
- Test duplicate payment webhook/idempotency.
- Test template changes do not alter old invoices.
- Test API authentication.

Never claim a feature is working without actually testing it.

---

## 30. Critical Business Rules

1. Invoice totals are calculated server-side.
2. Payment balance is calculated from payment records.
3. Paid invoice cannot accidentally become unpaid because of a UI change.
4. Issued invoice should not be hard-deleted.
5. Old invoice template versions must remain immutable.
6. Payment webhook processing must be idempotent.
7. Invoice numbers must be unique.
8. Money calculations must use decimal-safe arithmetic.
9. PDF must use the invoice's stored template version.
10. Preview must not unexpectedly issue an invoice or consume an invoice number.
11. API clients must never receive another integration's secrets.
12. Templates and invoice data must remain separate.

---

## 31. Definition of Done for V1

V1 is complete only when an internal user can:

1. Log in.
2. Configure company details.
3. Create a template visually.
4. Save the template.
5. Duplicate/edit the template.
6. Create a customer.
7. Create a product/service.
8. Select a template.
9. Create an invoice.
10. Add multiple items.
11. Calculate CGST/SGST/IGST.
12. Preview the invoice.
13. Save draft.
14. Issue invoice.
15. Generate A4 PDF.
16. View invoice history.
17. Record full payment.
18. Record multiple/partial payments.
19. See unpaid/partial/paid/overdue state.
20. Use API to create an invoice.
21. Use API to record a payment.
22. Retrieve the generated PDF through API.
23. Confirm old invoices remain unchanged after template edits.

---

## 32. Agent Working Behavior

You are working on a real existing codebase.

IMPORTANT:
- Do not rewrite the entire project unless explicitly instructed.
- Do not replace working infrastructure unnecessarily.
- Do not introduce a new framework just because it is preferred.
- First inspect the repository and existing architecture.
- Preserve working features.
- Make incremental changes.
- Keep database migrations reversible where practical.
- Explain breaking changes before making them.
- Never hard-code secrets.
- Never commit .env files.
- Never use fake API responses as a substitute for implementation.
- Never leave TODO placeholders for core functionality.

When requirements are ambiguous, choose the simplest implementation consistent with this document and clearly report the assumption.

---

## 33. First Agent Task

Before implementing features, produce:

1. Repository/stack assessment.
2. Existing architecture summary.
3. Proposed folder structure.
4. Database ERD/schema proposal.
5. Template JSON schema proposal.
6. API architecture.
7. PDF rendering approach.
8. Template-builder technology recommendation based on the existing stack.
9. Risks/limitations.
10. Step-by-step implementation plan.

Do not start a large rewrite before this assessment.

After the assessment, implement V1 incrementally.
