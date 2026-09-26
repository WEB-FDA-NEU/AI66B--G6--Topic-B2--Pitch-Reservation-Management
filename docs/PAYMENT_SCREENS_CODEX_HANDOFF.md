# Pitch Point — Payment & Financial Screens Codex Handoff

> Owner: **Luong The Hieu**  
> Domain: **Payment & Financial**  
> Milestone: **Milestone 2 functional frontend prototype**  
> Technology: plain HTML, page-scoped CSS, vanilla JavaScript, shared mock state  
> Financial scope: **simulation only — no real money or payment gateway**

This file is an **execution brief**, not only a planning document. Codex must inspect the current repository and then implement the complete Payment & Financial domain described here: S09, S14, S23, S32, the required Finance service, and every safe integration point whose source and target are already ready.

## 1. Mandatory instructions for Codex

Before inspecting or changing code, read completely:

1. `AGENTS.md`
2. `docs/PITCH_POINT_CONTEXT.md`
3. `docs/SCREEN_MAP.md`
4. This file

The current working branch is the source of truth. Preserve the current authentication foundation, storage contract, shared components, data schemas, and user changes.

### Execution mode: implement now

The coordinator explicitly authorizes Codex to complete all four assigned screens in this coding run. After the initial repository inspection, Codex must continue directly to implementation. Do not stop after presenting a plan and do not ask to split the four screens into separate tasks.

Codex is authorized to:

- create or complete all 12 canonical page files for S09, S14, S23, and S32;
- create or complete `frontend/js/services/finance-service.js`;
- make the smallest backward-compatible state initialization or schema extension required by Finance while continuing to use only `pitch-point:state:v1`;
- make minimal integration-only edits to an existing dependent screen when the readiness rules in Section 15 are satisfied;
- run and fix tests for the four screens and their ready connections.

Codex is not authorized to redesign another member's screen, replace the authentication foundation, create a second storage key, duplicate another domain's data, or broadly refactor shared components.

Before editing, briefly report:

- current branch and working-tree status;
- that S09, S14, S23, and S32 are all being implemented;
- exact files to modify;
- shared files to read only;
- input/output IC contracts;
- DC shared-state contracts;
- applicable Business Rules;
- dependencies on screens or services owned by other members;
- any shared-service/schema change that appears necessary.

This report is an inspection checkpoint, not a request for permission. Continue coding immediately unless a genuine blocking conflict would require replacing a protected shared contract or discarding current user work.

Do not merge or copy another branch wholesale. Do not overwrite current authentication or shared state merely to make old page code compile.

## 2. Assigned screens and canonical files

| ID | Screen | Access | Priority | Official route | Canonical static files |
|---|---|---|---|---|---|
| S09 | Mock Payment | Customer/Auth | P0 | `/user/payment` | `payment.html`, `css/payment.css`, `js/pages/payment.js` |
| S14 | Payment History | Customer/Auth | P1 | `/user/payments` | `payment-history.html`, `css/payment-history.css`, `js/pages/payment-history.js` |
| S23 | Revenue Dashboard | Manager | P1 | `/manager/revenue` | `manager-revenue.html`, `css/manager-revenue.css`, `js/pages/manager-revenue.js` |
| S32 | Booking, Refund & Financial Management | Admin | P0 | `/admin/bookings` | `admin-finance.html`, `css/admin-finance.css`, `js/pages/admin-finance.js` |

The normal screen scope is exactly one HTML/CSS/JavaScript trio. Another member's page files may be changed only for the minimal connection described in Section 15 and only after that connection passes the readiness checklist.

The Finance domain also owns this shared service, and this execution brief authorizes Codex to create or complete it:

```text
frontend/js/services/finance-service.js
```

If Finance data is missing, make only the smallest backward-compatible extension to the existing state initialization. Preserve existing records and keys. Do not change another domain service contract unless integration cannot otherwise work; if that rare case occurs, record the exact blocker instead of inventing a competing contract.

### Required deliverables in this run

By the end of this task, the repository must contain:

1. Functional S09, S14, S23, and S32 HTML/CSS/JavaScript trios.
2. One reusable Finance service used by all four page scripts.
3. Compatible mock Finance state or initialization when the current project does not yet supply it.
4. Role guards, input parsing, loading/empty/error/success states, and persistent simulated state behavior.
5. Every ready dependency connected with the exact Screen Map parameter.
6. Every dependency that is not ready documented as waiting, with this domain's side already prepared.
7. Browser and regression test results covering the four screens and ready integrations.

## 3. Domain responsibility boundary

### Finance owns

- simulated Customer and Manager balances;
- payment validation related to balance and payment state;
- successful payment transaction records;
- failed-payment result without balance deduction;
- refund transaction records;
- Customer payment/refund history;
- Manager revenue, balance, and financial summaries;
- Admin financial monitoring and eligible refund processing;
- financial consistency and payment/refund uniqueness.

### Finance does not own

- creating the booking hold or booking draft;
- selecting a pitch/date/slot;
- deciding general booking availability;
- booking page presentation outside S09/S14/S23/S32;
- pitch ownership CRUD;
- pitch suspension decisions;
- user/manager suspension decisions;
- message or notification page implementation;
- redesigning or implementing the business logic of S07, S08, S10, S11, S12, S22, S28, S29, S34, or S36.

Cross-domain actions must use approved services and the readiness/minimal-edit rules in Section 15. A ready connection may be completed in this coding run.

## 4. Shared architecture that must be preserved

### 4.1 Authentication and authorization

Use the current shared chain:

```text
frontend/mock/users.json
  → storage-service.js
  → auth-service.js
  → access-control.js
  → page script
  → domain service ownership/policy validation
```

Canonical roles:

```text
customer
manager
admin
```

Guest means there is no session; `guest` is not a stored role.

Required guards:

| Screen | Required guard |
|---|---|
| S09 | active Customer/Auth account |
| S14 | active Customer/Auth account; suspended Customer retains historical access |
| S23 | active Manager |
| S32 | active Admin |

Rules:

- Run the access check before rendering protected records or binding privileged actions.
- Guest access follows IC-08 to S05 Login with an approved local `returnTo`.
- Wrong role or restricted access follows IC-09 to S39 Access Denied.
- Header/sidebar visibility is presentation only and does not replace the page guard.
- Never trust role, identity, balance, or ownership from a query parameter, form field, DOM attribute, or page-specific storage value.

### 4.2 One shared store

All cross-screen state uses the approved storage contract:

```text
pitch-point:state:v1
```

Only `storage-service.js` may directly access the reserved localStorage key.

Page scripts and `finance-service.js` must use the approved storage API. Do not create keys such as:

```text
payments
payment_history
manager_revenue
admin_refunds
current_balance
app_transactions
```

Do not store a second copy of bookings, balances, or transactions for each screen.

### 4.3 Existing state must be inspected, not guessed

Before implementing Finance, Codex must inspect the current state schema and service APIs for:

```text
session
users
pitches
availability
bookingDrafts
bookings
transactions
notifications
activities
```

Do not add a new top-level collection or change record fields just because this handoff uses a conceptual name. If a required field is missing, stop and propose the smallest schema change with all affected consumers.

## 5. Canonical financial model

### 5.1 Booking states

```text
Pending
Confirmed
Completed
Cancelled
```

### 5.2 Payment states

```text
Pending
Paid
Refunded
Cancelled
```

Terminal states:

- Booking `Completed` and `Cancelled` cannot return to an earlier state.
- Payment `Refunded` and `Cancelled` cannot return to `Paid` or `Pending`.

### 5.3 Transaction concepts

Every successful simulated payment/refund transaction must be linked to stable IDs for:

- booking;
- customer;
- pitch;
- manager;
- transaction itself.

Use the current schema. If the schema is not yet defined, propose a contract equivalent to:

```js
{
  id: 'T001',
  type: 'payment', // or 'refund'
  status: 'completed',
  amount: 420000,
  bookingId: 'B001',
  customerId: 'U001',
  pitchId: 'P001',
  managerId: 'M001',
  createdAt: '2026-09-30T18:00:00.000Z',
  reason: null,
  relatedTransactionId: null
}
```

This is a proposed shape, not permission to replace an existing canonical schema.

### 5.4 Core formulas

For an authorized Manager and selected period:

```text
gross revenue = sum(successful payment amounts for owned/managed pitches)
refund total  = sum(successful refund amounts for owned/managed pitches)
net revenue   = gross revenue - refund total
```

Do not count:

- failed payments;
- pending payments;
- cancelled payments;
- duplicate attempts;
- transactions for another Manager's pitches.

The current Manager balance must come from the approved financial state/service. Do not assume it always equals all-time net revenue if the system has an initial balance or other approved adjustments.

## 6. Required contracts

### 6.1 Navigation contracts

| Contract | Source/action | Target | Exact parameter |
|---|---|---|---|
| IC-11 | S08 accepts revalidated terms and proceeds to payment | S09 | required `bookingDraftId` |
| IC-12 | S09 payment succeeds | S10 | required `bookingId` |
| IC-17 | S14 selects related booking | S12 | required `bookingId` |
| IC-26 | S17 opens revenue | S23 | no parameter |
| IC-34 | S23 inspects related booking | S22 | required `pitchId`; optional `bookingId` |
| IC-39 | S26 opens Admin finance | S32 | optional `bookingId`, `transactionId`, or `pitchId` |
| IC-46 | S31 inspects reported booking | S32 | required `bookingId` |
| IC-49 | S29 reviews suspension-affected finance | S32 | required `pitchId` |
| IC-56 | Admin financial/enforcement event | S34 or S32 target resolution | required target-specific stable ID |

Parameter rules:

- Use exact camelCase names from the table.
- Pass stable IDs, not serialized objects.
- Targets validate missing, malformed, unknown, unauthorized, expired, and unavailable IDs.
- Never accept amount, balance, price, role, ownership, or payment status as authoritative URL values.
- Retrieve the authoritative record from approved services.
- If a target screen is not approved for integration, keep the external control inert and silent.

### 6.2 Shared data-effect contracts

| Contract | Required Finance behavior |
|---|---|
| DC-05 | S09 success deducts Customer balance, increases Manager balance, creates one transaction, confirms booking, and feeds S10/S12/S14/S22/S23/S26/S32/S36 |
| DC-06 | Eligible cancellation/refund updates booking, slot, payment, balances, transaction, and notification consistently across Customer/Manager/Admin consumers |
| DC-08 | Pitch suspension may invalidate holds and cancel/refund affected confirmed bookings; Finance handles the financial side only |
| DC-09 | Manager suspension preserves financial history; only affected bookings determined unfulfillable are cancelled/refunded |
| DC-12 | Admin refund/enforcement action appends an immutable activity record through the approved audit service |

Cross-domain effects require integration with the responsible owners. A page script must not recreate all participating domains.

## 7. Payment state transitions

### 7.1 Successful payment

Preconditions:

- current user is the booking-draft owner and is permitted to book;
- `bookingDraftId` exists and is valid;
- hold remains active;
- pitch and slot remain eligible;
- price/terms have been revalidated and accepted;
- booking is still pending;
- payment has not already succeeded;
- current simulated Customer balance covers the entire amount.

Logical result:

```text
Customer balance     -= amount
Manager balance      += amount
Payment status        = Paid
Booking status        = Confirmed
Payment transaction   = created exactly once
Confirmed snapshot    = preserved
Notification metadata = created through approved service when integrated
Output                 = bookingId for S10
```

All related records must update as one logical operation. Do not deduct the balance first and then leave the booking pending if a later step fails.

### 7.2 Insufficient balance

```text
Payment status  remains Pending
Booking         remains Pending while hold is active
Customer balance unchanged
Manager balance unchanged
No successful transaction created
Retry permitted only while hold remains active
```

### 7.3 Expired hold

```text
Pending payment becomes Cancelled
Pending booking becomes Cancelled
Slot/hold is released by the Booking/Availability contract
No balance changes
No successful payment transaction
Further payment attempt rejected
```

### 7.4 Duplicate payment attempt

If the booking already has a successful payment:

- reject the attempt;
- do not deduct balance again;
- do not create another transaction;
- return/reuse the existing confirmed booking result only through an approved idempotent service response.

## 8. Refund state transitions

### 8.1 Eligible refund

Preconditions depend on the cancellation source and applicable Business Rules. At minimum:

- booking/payment relationship is valid;
- successful payment exists;
- payment is `Paid`, not already refunded/cancelled;
- refund amount matches the eligible successful payment amount;
- caller has the required Customer, Manager, or Admin authority;
- cancellation/refund reason and eligibility are valid;
- duplicate refund is rejected.

Logical result:

```text
Customer balance     += refund amount
Manager balance      -= refund amount
Refund transaction    = created exactly once
Payment status        = Refunded
Booking status        = Cancelled
Notification metadata = created when integrated
Audit activity         = appended for Admin action when integrated
```

For a paid cancellation, do not mark payment `Refunded` or booking `Cancelled` until the refund operation succeeds as one consistent logical transition.

### 8.2 Ineligible or duplicate refund

- No balance change.
- No new transaction.
- No status change.
- Return a clear domain result that the page can render safely.
- Never rely only on a disabled button; the service must revalidate eligibility.

## 9. Business Rules by screen

### 9.1 S09 primary rules

| Rule | Meaning for implementation |
|---|---|
| BR-1 | Only a registered permitted Customer may book/pay |
| BR-7 | Suspended Customer cannot create a new commitment |
| BR-18–BR-19 | Slot cannot be double booked and must be revalidated |
| BR-20 | Booking status transition must remain valid |
| BR-23 | Revalidate pitch, slot, price, status, and terms before confirmation |
| BR-24, BR-28 | Preserve confirmed booking and included-service snapshot |
| BR-26–BR-27 | Hold lasts for the configured period; expiry rejects payment |
| BR-29 | Balance is simulated only |
| BR-30–BR-31 | Successful payment updates balance; sufficient balance required |
| BR-35 | Booking confirms only after payment while hold is active |
| BR-36–BR-37 | One linked transaction with all required entity IDs |
| BR-38 | No real financial transaction or external gateway |
| BR-39 | No duplicate successful payment |
| BR-40 | Balance check and deduction are one logical operation |
| BR-41 | Failed payment changes no balance/booking confirmation and may retry during active hold |
| BR-42 | Payment state machine must remain valid |

### 9.2 S14 primary rules

| Rule | Meaning for implementation |
|---|---|
| BR-2 | Suspended Customer retains access to own financial history |
| BR-29 | Show simulated balance clearly as simulated |
| BR-36–BR-38 | Display linked payment/refund transaction integrity; no real-money claim |
| BR-42 | Display canonical payment status |
| BR-47–BR-50 | Refund amount/status and booking/payment consistency must be represented correctly |

### 9.3 S23 primary rules

| Rule | Meaning for implementation |
|---|---|
| BR-5–BR-6 | Suspended Manager loses management access, but financial history/balance must not be erased or reset |
| BR-8–BR-9 | Only affected unfulfillable bookings may be refunded; restoration preserves records |
| BR-29 | Manager balance is simulated |
| BR-33 | Manager sees only revenue/transactions for owned or managed pitches |
| BR-34 | Successful payment increases related Manager balance/revenue |
| BR-36–BR-38 | Transactions retain correct entity links and remain simulated |
| BR-42 | Canonical payment states feed the dashboard |
| BR-44–BR-50 | Eligible refunds reduce Manager balance/revenue exactly once and preserve consistency |
| BR-51 | Manager access is restricted to authorized pitches |

### 9.4 S32 primary rules

| Rule | Meaning for implementation |
|---|---|
| BR-2–BR-9 | Account suspension must preserve financial history and only affect eligible bookings |
| BR-12–BR-17 | Validate cancellation/refund eligibility and ownership/history constraints |
| BR-20, BR-25 | Booking transition is terminal and cancellation cannot happen twice |
| BR-29–BR-42 | Payment, balance, transaction, uniqueness, and state rules remain valid |
| BR-43–BR-45 | Validate Manager cancellation and pitch-suspension refund cases |
| BR-46 | Admin may process eligible simulated refunds |
| BR-47–BR-50 | Adjust balances, record one refund, and update booking/payment consistently |
| BR-52 | Pitch suspension invalidates holds and cancels/refunds affected confirmed bookings |
| BR-58 | Admin enforcement requires justified authority |
| BR-60 | Repeated cancellation/refund activity may be flagged for review |

## 10. S09 — Mock Payment specification

### 10.1 Purpose

S09 allows the current Customer to review the amount and simulated balance and attempt payment while the booking hold remains active.

### 10.2 Input and output

Input:

```text
payment.html?bookingDraftId=BD001
```

Output after success:

```text
booking-result.html?bookingId=B001
```

Do not accept `amount`, `balance`, `price`, `customerId`, `paymentStatus`, or role from the URL.

### 10.3 Required UI regions

- breadcrumb/back context without bypassing the booking flow;
- exactly one meaningful `h1`;
- hold countdown/status using the authoritative expiry time;
- booking summary:
  - pitch name;
  - date;
  - time slot;
  - pitch/services snapshot;
  - amount in VND;
- simulated balance panel:
  - current balance;
  - payment amount;
  - expected remaining balance;
- clear simulation notice;
- primary `Pay with simulated balance` action;
- cancel/back action that does not create a payment;
- local states for:
  - loading;
  - missing/invalid draft;
  - expired hold;
  - insufficient balance;
  - failed/retryable attempt;
  - already paid/idempotent attempt;
  - success while waiting for S10 integration.

Do not add:

- card number fields;
- bank-account fields;
- QR payment;
- external gateway/e-wallet buttons;
- real currency transfer claims.

### 10.4 Page logic

1. Run Customer/Auth guard.
2. Parse exact `bookingDraftId`.
3. Ask Booking service for the current owned draft/payment context.
4. Render only after identity, ownership, and draft validation.
5. Display countdown derived from `holdExpiresAt`; do not create a new hold.
6. On payment click, disable repeated submission while the operation is pending.
7. Revalidate through approved Booking/Availability interfaces.
8. Call Finance payment operation once.
9. Render domain result.
10. Navigate to S10 with exact `bookingId` only when IC-12 target integration is approved.

The countdown is presentation only. The service must compare the authoritative current time again during payment.

## 11. S14 — Payment History specification

### 11.1 Purpose

S14 displays the current Customer's successful simulated payments and refunds, including amount, related booking, transaction type, status, and date.

### 11.2 Input and output

Input:

```text
current authenticated Customer session
```

Output:

```text
booking-details.html?bookingId=B001
```

### 11.3 Required UI regions

- one meaningful `h1`;
- simulated current balance summary;
- optional summary totals:
  - paid amount;
  - refunded amount;
  - transaction count;
- filters suitable for existing data:
  - transaction type: all/payment/refund;
  - status;
  - optional date range;
- responsive transaction list/table;
- each record shows:
  - transaction ID;
  - type;
  - amount;
  - status;
  - date/time;
  - related pitch or booking label;
  - link/action to the related booking when IC-17 is integrable;
- loading, empty, and safe-error states.

### 11.4 Page logic

- Use current Customer ID from the session.
- Read through `finance-service.js`.
- Never display another Customer's transactions.
- Suspended Customer may still view historical payment/refund records.
- Treat the page as read-only; it does not perform refund processing.
- Use `textContent`, reusable `<template>`, and an accessible table/card strategy.
- Keep the S12 link inert until IC-17 is ready for integration.

## 12. S23 — Revenue Dashboard specification

### 12.1 Purpose

S23 displays a Manager's simulated balance, revenue, refunds, transactions, and statistics calculated only from pitches that Manager owns/manages.

### 12.2 Input and output

Primary input:

```text
current authenticated Manager session
```

Optional approved context:

```text
pitchId
```

Output to S22:

```text
manager-bookings.html?pitchId=P001
manager-bookings.html?pitchId=P001&bookingId=B001
```

### 12.3 Required UI regions

- one meaningful `h1`;
- Manager simulated balance;
- statistics:
  - gross revenue;
  - refunds;
  - net revenue;
  - successful payment count;
- filters:
  - owned pitch;
  - transaction type;
  - date/period;
- accessible revenue visualization or summarized trend;
- responsive transaction table/list with:
  - date;
  - pitch;
  - booking;
  - Customer reference appropriate for the Manager role;
  - payment/refund type;
  - amount;
  - status;
- loading, empty, and safe-error states.

### 12.4 Page logic

- Run Manager role guard first.
- Retrieve authorized pitch IDs through the Pitch service.
- Ask Finance service for transactions limited to those pitch IDs.
- Validate optional `pitchId` belongs to the current Manager.
- Do not hardcode owner `O001`, Manager ID, revenue, or balance.
- Do not derive revenue from card text or DOM values.
- Do not include other Managers' transactions.
- Keep IC-34 links inert until S22 is approved for integration.

## 13. S32 — Admin Finance specification

### 13.1 Purpose

S32 allows an Admin to review booking records, monitor simulated payment/refund transactions, inspect enforcement-affected bookings, and process eligible refunds.

It does not independently suspend a user, Manager, or pitch. Those decisions belong to the relevant Admin/Pitch services and screens.

### 13.2 Inputs

S32 supports these approved contexts:

```text
admin-finance.html
admin-finance.html?bookingId=B001
admin-finance.html?transactionId=T001
admin-finance.html?pitchId=P001
```

Use at most the applicable approved parameters. Do not accept role, refund amount, status, or ownership from the URL.

### 13.3 Required UI regions

- one meaningful `h1`;
- Admin navigation consistent with current foundation;
- high-level summaries:
  - successful payments;
  - completed refunds;
  - pending/eligible refund cases;
  - total simulated values;
- tabs or filters for:
  - bookings;
  - payments;
  - refunds;
  - affected/enforcement cases;
- search/filter by approved ID/status/date/pitch/Manager/Customer as supported by the service;
- responsive record table/list;
- record detail panel with linked booking/payment/transaction/pitch/Customer/Manager IDs;
- refund-eligibility explanation;
- refund reason field when Admin action requires it;
- explicit confirmation UI for a real refund action in the simulation;
- result/status region;
- loading, empty, invalid-context, unauthorized-record, and safe-error states.

Use a semantic confirmation dialog or inline confirmation region. Do not use development `alert()`/`confirm()` messages as the final implementation.

### 13.4 Page logic

1. Run Admin guard before reading records.
2. Parse optional approved context ID.
3. Resolve records through Admin/Booking/Finance/Pitch services.
4. Validate all linked records and current states.
5. Calculate refund eligibility through domain services, not DOM logic.
6. Require a reason/confirmation when applicable.
7. Prevent double submission.
8. Call the approved refund operation.
9. Update shared state consistently.
10. Request notification and audit effects through approved services during integration.
11. Rerender from shared state after success.

S32 must not fabricate a refund merely because an Admin button was clicked. The service must reject ineligible, already refunded, missing, mismatched, or terminal records.

## 14. Recommended Finance service contract

First inspect the current `finance-service.js`. Reuse its public API if it already exists. Do not replace it with this proposal automatically.

If the service is missing and the approved Finance foundation issue authorizes its creation, propose an API equivalent to:

```js
getCustomerBalance(customerId)
getManagerBalance(managerId)

getPaymentContext({ bookingDraftId, customerId })
processSimulatedPayment({ bookingDraftId, customerId })

listCustomerTransactions(customerId, filters)
getManagerRevenueSummary(managerId, filters)
listManagerTransactions(managerId, filters)

getAdminFinanceSummary(filters)
listAdminFinancialRecords(filters)
getRefundEligibility({ bookingId, actorId, actorRole })
processSimulatedRefund({ bookingId, actorId, actorRole, reason })
```

Expected result objects should be explicit and renderable, for example:

```js
{
  ok: true,
  bookingId: 'B001',
  transactionId: 'T001',
  paymentStatus: 'Paid',
  bookingStatus: 'Confirmed',
  balance: 1580000
}
```

or:

```js
{
  ok: false,
  code: 'HOLD_EXPIRED',
  message: 'Khung giờ giữ chỗ đã hết hạn.'
}
```

Do not expose or rely on error strings alone. Stable codes may include only cases approved by the current service contract, such as:

```text
INVALID_DRAFT
UNAUTHORIZED
HOLD_EXPIRED
INSUFFICIENT_BALANCE
ALREADY_PAID
PAYMENT_NOT_FOUND
REFUND_NOT_ELIGIBLE
ALREADY_REFUNDED
```

Before implementing cross-domain methods, inspect and follow the exact current Booking-service public contract. Finance must not import another page script. If the contract is missing, prepare the Finance side and report the dependency instead of inventing a competing Booking API.

## 15. Dependency and integration matrix

| Dependency | Owner | Finance expectation |
|---|---|---|
| Authentication/session/access control | Nguyen Vinh Hung | Import current public APIs; do not modify auth logic |
| Pitch ownership/status | Be Thanh Tien | Query approved Pitch service; do not duplicate pitch data |
| Holds, drafts, booking status, cancellation | Pham Ba Viet | Coordinate IC-11/12 and DC-05/06 through Booking service |
| Admin enforcement/report decisions | Le Huy Hoang | S32 consumes approved affected-record context; it does not make unrelated enforcement decisions |
| Notifications | Nguyen Vinh Hung | Produce target metadata through notification service during integration |
| Audit activity | Le Huy Hoang | Admin financial action appends immutable activity through audit service |

### 15.1 Exact dependent screens Codex must inspect

| Contract | Direction | Screen and expected files | Exact parameter/context | Action when ready |
|---|---|---|---|---|
| IC-11 | S08 → S09 | `booking-confirmation.html`, `js/pages/booking-confirmation.js` | required `bookingDraftId` | Activate the payment action so it opens `payment.html?bookingDraftId=<id>` |
| IC-12 | S09 → S10 | `booking-result.html`, `js/pages/booking-result.js` | required `bookingId` | After successful payment, navigate to `booking-result.html?bookingId=<id>` |
| IC-17 | S14 → S12 | `booking-details.html`, `js/pages/booking-details.js` | required `bookingId` | Transaction/booking detail action opens the exact booking record |
| IC-26 | S17 → S23 | `manager-dashboard.html`, `js/pages/manager-dashboard.js` | no parameter | Activate the Manager revenue navigation item |
| IC-34 | S23 → S22 | `manager-bookings.html`, `js/pages/manager-bookings.js` | required `pitchId`; optional `bookingId` | Revenue drill-down opens the corresponding owned pitch/booking filter |
| IC-39 | S26 → S32 | `admin-dashboard.html`, `js/pages/admin-dashboard.js` | optional `bookingId`, `transactionId`, or `pitchId` | Activate Admin financial drill-down with whichever stable ID exists |
| IC-46 | S31 → S32 | `admin-reports.html`, `js/pages/admin-reports.js` | required `bookingId` | Report action opens the affected booking in S32 |
| IC-49 | S29 → S32 | `admin-pitch-moderation.html`, `js/pages/admin-pitch-moderation.js` | required `pitchId` | Moderation action opens affected financial records in S32 |
| IC-56 | S32 → S34, or S34 → S32 | `admin-activity-log.html`, `js/pages/admin-activity-log.js` | target-specific stable ID | Link the financial event and audit record without free-text matching |
| DC-05/DC-06 notifications | Finance → S36 | `notifications.html`, `js/pages/notifications.js` | approved target metadata and related stable ID | Produce/read notification records through the current notification service |

Expected locations are beneath `frontend/`. If the repository uses a Screen Map-approved canonical name that differs, follow `docs/SCREEN_MAP.md` and report the difference; do not create a duplicate page merely to match this table.

### 15.2 Readiness checklist for each connection

A dependency is **Ready** only when all applicable conditions are true:

1. The canonical source and target files exist.
2. The target page loads its page script without an obvious browser error.
3. The target parses the exact Screen Map parameter and safely rejects a missing, unknown, or unauthorized ID.
4. The source has the real stable ID required to construct the link; it does not invent an ID.
5. Both screens use the same shared record and approved service/state source.
6. The target has the correct access guard and ownership/policy validation.
7. Enabling the connection requires only a link, form action, URL parameter, or approved service call—not a redesign or replacement of another member's business logic.
8. The change does not overwrite unrelated user work or introduce a merge-conflict workaround.

When every condition passes:

- implement the connection now;
- use `URL`/`URLSearchParams` or an equivalent safe local-route helper;
- pass only the exact documented parameter names;
- test normal, missing, invalid, unauthorized, reload, and back-navigation cases;
- list the connection as **Connected and tested** in the completion report.

When any condition fails:

- complete this Finance domain's side of the contract, including parameter parsing or output preparation;
- keep the unavailable control disabled, hidden, or non-navigating according to the current UI pattern—never point it at `#`, an invented filename, or a knowingly broken route;
- do not copy the missing screen's logic into a Finance page;
- list the connection as **Waiting**, including the failed readiness condition, expected owner, file, parameter, and next integration action.

### 15.3 Allowed edits outside the four screen trios

Codex may make a minimal integration-only edit in a ready dependent page. Such an edit is limited to:

- adding or correcting the exact local link/form target;
- passing or parsing the exact Screen Map query parameter;
- calling an already-approved public service method;
- exposing an existing stable ID needed by the connection;
- adding a small guard/error state required to avoid an unsafe broken link.

Do not change the dependent screen's visual design, unrelated behavior, naming convention, data ownership, or domain rules. All such edits must be listed separately in the final report.

### 15.4 Required integration sequence

1. Verify the current authentication/storage foundation.
2. Inspect Booking draft/hold and cancellation contracts.
3. Implement the Finance service against the current shared state.
4. Implement S09 and validate DC-05.
5. Implement S14 from the same transaction records.
6. Implement S23 from the same Manager-side transactions and balances.
7. Implement S32 and eligible DC-06 refund processing.
8. Inspect every dependency in Section 15.1 and connect all Ready items.
9. Test DC-08, DC-09, notification, and audit behavior where their approved services already exist.
10. Report Ready/Connected/Waiting status for every row in Section 15.1.

## 16. Required implementation order in this coding run

All four screens must be coded in the same Codex task. The following phases describe implementation order, not separate approval gates. Git commits or Pull Requests may still be separated later for easier review.

### Phase A — Repository inventory and Finance foundation

- inspect the shared contracts listed in Section 21;
- create or complete `frontend/js/services/finance-service.js`;
- add only the smallest compatible Finance state initialization required;
- preserve the current authentication chain and single state key;
- verify service results and idempotency before binding pages.

### Phase B — S09 Mock Payment

```text
frontend/payment.html
frontend/css/payment.css
frontend/js/pages/payment.js
```

### Phase C — S14 Payment History

```text
frontend/payment-history.html
frontend/css/payment-history.css
frontend/js/pages/payment-history.js
```

### Phase D — S23 Revenue Dashboard

```text
frontend/manager-revenue.html
frontend/css/manager-revenue.css
frontend/js/pages/manager-revenue.js
```

### Phase E — S32 Admin Finance

```text
frontend/admin-finance.html
frontend/css/admin-finance.css
frontend/js/pages/admin-finance.js
```

### Phase F — Integration and verification

- classify each dependency as Ready or Waiting using Section 15.2;
- connect and test every Ready item;
- verify IC-11/12/17/26/34/39/46/49/56 and DC-05/06/08/09/12 as applicable;
- run the four-screen and regression test matrix;
- provide the completion report required by Section 20.

## 17. HTML/CSS/JavaScript rules for all four screens

### HTML

- `<!doctype html>` and `<html lang="vi">`.
- UTF-8 charset and viewport metadata.
- Title format: `Tên màn hình — Pitch Point`.
- Shared CSS order: reset, tokens, layout, components, then page CSS.
- Reuse `<site-header>` and `<site-footer>`.
- Exactly one meaningful `h1`.
- Semantic `main`, `section`, `article`, `form`, `table`, `nav`, and `aside` where appropriate.
- Use `<template>` for repeated dynamic records.
- Provide loading, empty, error, and success/status regions.
- Every form control has a visible or accessible label.
- No inline CSS or inline JavaScript.
- Unique IDs.

### CSS

Root classes:

```text
.payment-page
.payment-history-page
.manager-revenue-page
.admin-finance-page
```

Scope all page CSS beneath the matching root. Do not redefine global selectors such as `.btn`, `.card`, `.container`, `.table`, `body`, or `:root` in page CSS.

Use existing tokens, mobile-first responsive behavior, visible focus, and responsive table overflow/card fallback. Check near 390, 768, 1366, and 1920 px.

### JavaScript

- One page script controls one screen.
- Import services, never another page script.
- Use `textContent`, not untrusted `innerHTML`.
- Parse only approved query parameters.
- Query DOM defensively.
- Disable duplicate submissions during pending operations.
- Rerender from authoritative shared state after mutation.
- No direct `localStorage`/`sessionStorage` use.
- No hardcoded current user, Manager, Admin, balance, booking, or transaction ID.
- No invented backend/API response.
- No development `alert`, toast, modal, popup, or console-only behavior.

## 18. Prohibited implementations

Codex must not:

- build a real payment gateway;
- request or store card/bank/e-wallet credentials;
- claim simulated balance is real money;
- accept payment amount or balance from the URL;
- let Login/Register choose a financial role;
- store Finance data under a new localStorage key;
- update only the DOM without shared state;
- create a successful transaction before final validation;
- confirm a booking when payment fails;
- deduct Customer balance without increasing the related Manager balance;
- refund without decreasing the related Manager balance;
- create duplicate payment/refund transactions;
- erase financial history when an account is suspended;
- expose one Customer's history to another Customer;
- expose another Manager's revenue in S23;
- allow Manager access to S32 or Admin access to S23 by default;
- edit another member's page files to make integration appear complete;
- activate links to missing/unapproved screens;
- alter shared schemas or services without reporting and approval.

## 19. Acceptance test matrix

### S09 tests

- [ ] Guest is redirected according to IC-08.
- [ ] Wrong role is redirected according to IC-09.
- [ ] Missing `bookingDraftId` shows safe invalid state.
- [ ] Unknown/other-Customer draft is rejected.
- [ ] Active hold and sufficient balance complete exactly one payment.
- [ ] Customer balance decreases once.
- [ ] Related Manager balance increases once.
- [ ] One linked transaction is created.
- [ ] Booking becomes Confirmed.
- [ ] S10 output uses exact `bookingId` when integrated.
- [ ] Insufficient balance changes nothing and allows retry during active hold.
- [ ] Expired hold rejects payment and changes no balance.
- [ ] Repeated click/refresh cannot double charge.

### S14 tests

- [ ] Only the current Customer's transactions display.
- [ ] Payment and refund records show canonical type/status/amount/date.
- [ ] Suspended Customer retains historical access.
- [ ] Filters do not mutate records.
- [ ] Empty state works.
- [ ] S12 output uses exact `bookingId` when integrated.

### S23 tests

- [ ] Only active Manager may enter.
- [ ] Only owned/managed pitch transactions are included.
- [ ] Gross, refund, and net totals are correct.
- [ ] Failed/pending/cancelled attempts are excluded from revenue.
- [ ] Optional pitch filter rejects unauthorized pitch IDs.
- [ ] IC-34 passes exact `pitchId` and optional `bookingId` when integrated.
- [ ] No hardcoded revenue/balance remains.

### S32 tests

- [ ] Only Admin may enter.
- [ ] Optional `bookingId`, `transactionId`, and `pitchId` contexts validate safely.
- [ ] Eligible refund updates both balances exactly once.
- [ ] Refund transaction links all required entities.
- [ ] Booking/payment/refund statuses remain consistent.
- [ ] Ineligible, completed, missing, mismatched, and duplicate refund attempts change nothing.
- [ ] Pitch-suspension case affects only eligible related bookings.
- [ ] Manager-suspension case preserves history and does not automatically refund every booking.
- [ ] Notification/audit effects are produced only through approved services when integrated.

### Regression tests

- [ ] Customer, Manager, and Admin demo accounts still work.
- [ ] Registration still creates only Customer accounts.
- [ ] Only `pitch-point:state:v1` is used.
- [ ] Reload/back navigation does not create duplicate transactions.
- [ ] Other members' screens remain unchanged except for separately reported minimal integrations that passed Section 15.2.
- [ ] Browser console has no obvious error.
- [ ] Responsive layouts pass required widths.

## 20. Definition of done and Codex completion report

A screen is not done merely because its static HTML looks complete.

For each completed screen, Codex must report:

1. Screen ID and owner.
2. Exact files changed.
3. Shared files read and shared files changed.
4. Guard and role used.
5. Inputs parsed and outputs prepared.
6. IC/DC contracts implemented.
7. Business Rules enforced.
8. Services used.
9. State mutations performed.
10. Dependencies still waiting for integration.
11. Tests performed and results.
12. Any unresolved contract/schema decision requiring coordinator approval.

## 21. Required immediate Codex coding task

Implement the full Payment & Financial scope now. Start with a short repository inspection, then code continuously through all phases below; do not stop after the inventory or implementation plan.

### Step 1 — Inspect current contracts

Read before editing:

```text
frontend/js/services/storage-service.js
frontend/js/services/auth-service.js
frontend/js/services/access-control.js
frontend/js/services/booking-service.js
frontend/js/services/finance-service.js   (if present)
frontend/mock/
frontend/booking-confirmation.html
frontend/js/pages/booking-confirmation.js
frontend/booking-result.html
frontend/js/pages/booking-result.js
frontend/booking-details.html
frontend/js/pages/booking-details.js
frontend/manager-dashboard.html
frontend/js/pages/manager-dashboard.js
frontend/manager-bookings.html
frontend/js/pages/manager-bookings.js
frontend/admin-dashboard.html
frontend/js/pages/admin-dashboard.js
frontend/admin-pitch-moderation.html
frontend/js/pages/admin-pitch-moderation.js
frontend/admin-reports.html
frontend/js/pages/admin-reports.js
frontend/admin-activity-log.html
frontend/js/pages/admin-activity-log.js
frontend/notifications.html
frontend/js/pages/notifications.js
```

Briefly record:

- the existing booking-draft/hold schema;
- the current balance/transaction schema;
- the exact S08 output currently available;
- the exact S10 input currently expected;
- which dependent screens and contracts in Section 15 are Ready or Waiting;
- any real protected-contract conflict that cannot be solved backward-compatibly.

### Step 2 — Implement the Finance foundation

- Reuse the current storage API and only `pitch-point:state:v1`.
- Implement the public Finance methods listed in Section 14, adapting method names only when an equivalent current convention already exists.
- Keep payment and refund mutations atomic and idempotent.
- Reuse Booking records and stable IDs; do not create a separate Finance copy of a booking.
- If current mock state lacks Finance collections, initialize them backward-compatibly without erasing existing state.

### Step 3 — Implement all four screens

Complete, in this order:

1. S09 Mock Payment.
2. S14 Payment History.
3. S23 Revenue Dashboard.
4. S32 Admin Finance.

Each screen must satisfy its full UI, role, business-rule, service, state, input/output, empty/error/success, accessibility, and responsive requirements in this document. Do not substitute hardcoded page data for shared-state behavior.

### Step 4 — Connect current dependencies

Apply the Section 15 readiness checklist to every IC/DC connection. Implement and test every Ready connection, including the smallest necessary edit in another screen. For a Waiting connection, finish this domain's side and document exactly what is missing; do not create a placeholder navigation target.

### Step 5 — Verify and report

- Run the complete test matrix in Section 19.
- Check browser console behavior and the required viewport widths.
- Confirm demo authentication and registration still work.
- Confirm reload/back/double-click behavior cannot duplicate a payment or refund.
- Give the Section 20 completion report, plus a dependency table with one of: `Connected and tested`, `Ready but blocked by <reason>`, or `Waiting for <owner/file/contract>`.

Begin coding after Step 1. A missing optional dependent screen is not a reason to stop implementation of the four assigned screens. Stop only for an irreconcilable conflict that would require deleting user work, replacing the authentication foundation, or breaking a protected shared contract; report that conflict with exact file and evidence.
