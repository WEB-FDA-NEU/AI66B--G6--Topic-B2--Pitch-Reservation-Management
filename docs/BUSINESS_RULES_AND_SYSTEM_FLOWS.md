# Pitch Point — Business Rules, Roles, and Cross-Domain System Flows

> Purpose: provide one implementation-facing reference for every official Business Rule, role boundary, state transition, cross-screen dependency, and cross-domain consistency requirement in the Pitch Point frontend prototype.  
> Project stage: Milestone 2 functional frontend prototype.  
> Technology: plain HTML, CSS, vanilla JavaScript, mock JSON, and one shared browser state.  
> Financial scope: simulation only; no real money, bank account, card, wallet, or payment gateway.

## 1. Authority and required reading

Read these sources before implementing a screen or service:

1. Official merged Milestone 1 requirements or the submitted specification PDF.
2. `AGENTS.md`.
3. `docs/PITCH_POINT_CONTEXT.md`.
4. `docs/SCREEN_MAP.md`.
5. `docs/DEMO_ACCOUNT_GUIDE.md`.
6. This file.
7. The assigned issue and the current source files.

If two documents conflict, the official merged requirements win. `SCREEN_MAP.md` is authoritative for current filenames, owners, input/output parameters, and integration contracts. This file explains how the official rules must work together; it does not silently introduce a new product requirement.

### 1.1 Rule labels used here

| Label | Meaning |
|---|---|
| `BR-1`–`BR-60` | Official Business Rule from the Milestone 1 specification |
| `FR` | Official feature/screen requirement that is not assigned a numbered BR |
| `IR` | Integration rule derived from multiple official requirements so screens remain consistent |

## 2. Role definitions and authority boundaries

### 2.1 Guest

A Guest is represented by no authenticated session. Guest is not a stored user role.

Allowed:

- open public screens S01–S06 and S37–S40 where applicable;
- browse, search, filter, and view publicly available pitch information;
- register and log in.

Forbidden:

- create, confirm, cancel, or reschedule bookings;
- see protected booking schedules;
- pay, review, report, message, or access role dashboards;
- select a role through Login, URL parameters, or browser storage.

### 2.2 Customer

Canonical role: `customer`.

Allowed:

- use public screens and Customer screens S07–S16;
- create bookings for eligible active pitches and available slots;
- pay using simulated balance;
- view only their own bookings and financial history;
- cancel or reschedule only eligible owned bookings;
- review a pitch only after an owned booking becomes Completed;
- use role-appropriate messaging, notifications, and settings.

Forbidden:

- access Manager or Admin screens;
- view or mutate another Customer's protected records;
- choose Manager/Admin during registration;
- bypass booking, cancellation, refund, or review eligibility using URL/DOM changes.

### 2.3 Pitch Manager

Canonical role: `manager`.

Allowed:

- use Manager screens S17–S25;
- create and manage only owned/assigned pitches;
- configure operating hours, availability, and slots for owned pitches;
- view and manage bookings only for owned/managed pitches;
- cancel eligible bookings only for permitted exceptional reasons;
- view revenue, balance, payments, and refunds only for owned/managed pitches;
- message Customers and Admins through approved contexts.

Forbidden:

- access another Manager's pitch, booking, revenue, or settings through a changed ID;
- perform Admin suspension, restoration, user enforcement, or report-resolution actions;
- edit payment balances or transaction history directly;
- cancel bookings outside the permitted Manager cancellation policy.

### 2.4 Administrator

Canonical role: `admin`.

Allowed:

- use Admin screens S26–S35;
- review users, managers, pitches, reports, bookings, and financial records system-wide;
- warn, suspend, restore, or restrict accounts under applicable rules;
- temporarily or permanently suspend pitches and restore eligible temporary suspensions;
- determine how bookings affected by enforcement are handled;
- review/process eligible simulated refunds;
- manage banners, announcements, Admin settings, and audit views.

Forbidden:

- automatically behave as a Customer or Manager unless an explicit contract permits it;
- alter financial or historical records without an eligible business event;
- refund the same successful payment twice;
- restore a permanently suspended pitch;
- enforce a report before review/investigation;
- bypass required reason, confirmation, notification, or audit behavior.

### 2.5 Role enforcement rules

1. Authentication identifies the current account; authorization decides whether it may enter a screen or act on a record.
2. Every protected page must call the shared access guard before rendering protected records or binding privileged actions.
3. Hiding a menu item is presentation, not authorization.
4. Domain services must re-check ownership, role, record status, and eligibility.
5. Role comes from the matched account record, never from a Login selector, query parameter, DOM attribute, or page-specific key.
6. Registration creates only `customer` accounts.
7. The prototype demonstrates authorization in the frontend; a production backend must enforce the same rules independently.

## 3. Canonical shared state and entity relationships

Use only the shared state owned by `storage-service.js`:

```text
pitch-point:state:v1
```

Conceptual state:

```js
{
  version: 1,
  users: [],
  session: null,
  pitches: [],
  availability: [],
  bookingDrafts: [],
  bookings: [],
  payments: [],
  transactions: [],
  reviews: [],
  reports: [],
  conversations: [],
  notifications: [],
  activities: [],
  content: []
}
```

Required relationships:

| Entity | Required stable relationships |
|---|---|
| Pitch | `pitchId`, Manager/owner ID |
| Slot/availability | `slotId`, `pitchId`, date/time |
| Booking draft/hold | `bookingDraftId`, `customerId`, `pitchId`, `slotId`, expiration |
| Booking | `bookingId`, `customerId`, `pitchId`, Manager ID, preserved booking terms |
| Payment | Payment ID, `bookingId`, payer, amount, status |
| Transaction | `transactionId`, `bookingId`, Customer, pitch, Manager, type, amount |
| Review | Review ID, `bookingId`, `pitchId`, Customer |
| Report | `reportId`, reporter, target type, target ID, status |
| Notification | `notificationId`, recipient, target type, stable target ID |
| Activity | `activityId`, actor, action, entity type, entity ID, timestamp |

Pages pass stable IDs. Pages do not pass full objects, balances, roles, ownership, or trusted prices through URLs.

## 4. Canonical status models

### 4.1 Account status

Minimum statuses:

```text
active
suspended
```

Restoration returns an eligible temporarily suspended account to `active`. Historical bookings, payments, refunds, revenue, and activities remain preserved.

### 4.2 Booking status

```text
Pending → Confirmed → Completed
    └──────────────→ Cancelled
Confirmed ─────────→ Cancelled
```

- `Pending`: temporary hold exists and payment has not succeeded.
- `Confirmed`: payment succeeded while the hold remained valid.
- `Completed`: scheduled slot ended without cancellation.
- `Cancelled`: terminal state; it cannot return to Pending, Confirmed, or Completed.

### 4.3 Payment status

```text
Pending → Paid → Refunded
    └────→ Cancelled
```

`Refunded` and `Cancelled` are terminal. A successful payment is unique per booking, and a successful refund is unique per paid payment.

### 4.4 Pitch status — official Milestone 1 model

```text
Active ──Manager──> Deactivated ──Manager──> Active
Active ──Admin────> Temporarily Suspended ──Admin──> Active
Active ──Admin────> Permanently Suspended (terminal)
```

- Active: accepts eligible new bookings.
- Deactivated: Manager-controlled; blocks new bookings but preserves existing Confirmed bookings.
- Temporarily suspended: Admin-controlled; blocks new bookings, releases holds, cancels affected Confirmed bookings, and requires full simulated refunds.
- Permanently suspended: Admin-controlled and cannot be restored.

### 4.5 Pitch creation and Admin moderation

The official Pitch lifecycle begins at Active. A valid pitch created by its authorized Manager does not require pre-publication approval from Admin.

The required flow is:

```text
S19 Add Pitch → valid owned pitch created as Active
               → visible/bookable when availability and other eligibility rules pass
               → S29 may later review and apply enforcement when necessary
```

S29 Pitch Moderation operates on pitches that already exist. Its responsibilities are:

- review pitch information and current operational status;
- temporarily suspend a pitch when enforcement is justified;
- permanently suspend a pitch for a sufficiently serious or confirmed violation;
- restore an eligible temporarily suspended pitch;
- inspect and coordinate effects on holds, bookings, refunds, notifications, and audit records.

Codex must not create `pending_review`, approve/reject-new-pitch actions, or a new-pitch approval queue. “Pitch Moderation” means review and enforcement of existing pitches, not approval before first publication.

## 5. Official Business Rule catalog

The descriptions below are implementation summaries. When wording matters, consult the official specification.

### 5.1 Identity, roles, and account status

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-1 | Only registered Customers may make bookings; Guests may browse only. | S01–S09, Auth, Access Control |
| BR-2 | A suspended Customer retains access to owned booking/payment/refund history and relevant notifications; history is not altered. | S11, S12, S14, S36 |
| BR-3 | A suspended Customer may cancel an otherwise eligible owned booking and receive the normal eligible refund, but cannot reschedule. | S12, Booking, Finance |
| BR-4 | Admin may restore an eligible temporarily suspended Customer; restoration does not rewrite history. | S27, Auth, Audit |
| BR-5 | Suspending a Manager blocks management access and new bookings for associated pitches; existing Confirmed bookings remain unless Admin finds them unfulfillable. | S28, S17–S25, Pitch, Booking |
| BR-6 | Manager suspension does not reset balance, revenue, or financial history. | S23, S28, S32, Finance |
| BR-7 | A suspended Customer cannot create or reschedule bookings or create other restricted commitments; existing Confirmed bookings remain unless separately cancelled. | S07–S12, Auth, Booking |
| BR-8 | If an associated booking cannot be fulfilled during Manager suspension, Admin cancels only the affected booking and issues a full simulated refund. | S28, S32, Booking, Finance |
| BR-9 | Restoring an eligible Manager may restore management access and allow associated pitches to accept new bookings; preserved history remains unchanged. | S28, S17–S25 |
| BR-10 | Only authenticated accounts may send messages. | S15, S24, S30, Communication |

### 5.2 Booking eligibility and Customer policies

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-11 | A slot in the past cannot be booked. | S07, Booking |
| BR-12 | Customer cancellation is eligible only at least two hours before start; an eligible Customer cancellation receives a full simulated refund. | S12, Booking, Finance |
| BR-13 | Customers may cancel/reschedule only their own bookings. | S11, S12, Booking |
| BR-14 | Customers may book only available slots within the next seven days. | S07, Availability, Booking |
| BR-15 | Rescheduling requires an account permitted to create bookings and is implemented as cancellation/refund of the original followed by a new booking flow; suspended Customers cannot reschedule. | S12 → S07–S10 |
| BR-16 | A booking chain may be rescheduled at most once; the replacement inherits the used restriction. | S12, Booking |
| BR-17 | Completed bookings cannot be cancelled/rescheduled and are not eligible for cancellation refunds. | S12, Booking, Finance |

### 5.3 Booking state, availability, and consistency

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-18 | One pitch/date/time slot cannot have more than one active hold or Confirmed booking. | S07–S09, S21, Booking |
| BR-19 | Booking proceeds only when the slot is currently available and not held/confirmed by another booking; revalidate before confirmation. | S07–S09, Booking |
| BR-20 | Booking has exactly one status: Pending, Confirmed, Completed, or Cancelled, with only approved transitions. | S07–S12, S22, S32 |
| BR-21 | Existing Confirmed bookings remain valid unless cancelled under an applicable Customer, Manager, or Admin policy. | S12, S20–S22, S28–S32 |
| BR-22 | A non-cancelled Confirmed booking becomes Completed after its scheduled slot ends. | S11, S12, Booking |
| BR-23 | Before final confirmation, revalidate pitch, slot, availability, price, operating status, and terms; changed-but-valid terms require Customer acceptance; invalid bookings stop and release the hold. | S08, S09, Booking, Pitch |
| BR-24 | Confirmed bookings preserve the pitch, date/time, price, and critical terms used at confirmation; later pitch edits do not rewrite history. | S10–S12, S20–S21 |
| BR-25 | A booking can become Cancelled only once; duplicate or ineligible cancellation requests change nothing. | S12, S22, S32 |
| BR-26 | Proceeding from slot selection creates a temporary hold for the permitted period and blocks competing bookings. | S07–S09, Booking |
| BR-27 | An unpaid Pending booking is cancelled when its hold expires, the slot is released, and later payment is rejected. | S08, S09, Booking, Finance |
| BR-28 | Confirmed booking services/facilities/options are preserved and are not rewritten by later pitch edits. | S10–S12, S20 |

### 5.4 Payment, balance, and financial transactions

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-29 | Every Customer and Manager has a simulated balance; it is not real money. | S09, S14, S23, S32 |
| BR-30 | Successful payment deducts the Customer balance and records a payment transaction. | S09, Finance |
| BR-31 | Payment succeeds only when the Customer's current balance covers the full amount. | S09, Finance |
| BR-32 | A newly registered Customer receives a configurable initial simulated balance. | S06, Auth, Storage, Finance |
| BR-33 | Manager revenue/transactions contain only records belonging to owned/managed pitches. | S23, Finance, Pitch |
| BR-34 | Successful payment increases the corresponding Manager balance and revenue records. | S09, S23, Finance |
| BR-35 | A booking becomes Confirmed only after successful payment while the hold remains valid. | S09, Booking, Finance |
| BR-36 | Each completed payment is linked to exactly one booking and one corresponding transaction. | S09, S14, S32 |
| BR-37 | Every payment/refund transaction links the relevant booking, Customer, pitch, and Manager. | S14, S23, S32 |
| BR-38 | No real financial processing or gateway is permitted. | All Finance UI/services |
| BR-39 | One booking cannot have multiple successful payments. | S09, Finance |
| BR-40 | Current balance validation and deduction are one atomic operation; insufficient balance changes nothing and does not confirm the booking. | S09, Finance |
| BR-41 | Failed payment during an active hold changes no balance and leaves booking Pending so the Customer may retry before expiry. | S09, Finance, Booking |
| BR-42 | Payment status is exactly Pending, Paid, Refunded, or Cancelled and follows only approved transitions. | S09, S10, S12, S14, S32 |

### 5.5 Cancellation and refund

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-43 | Manager may cancel a booking for an owned pitch only under permitted exceptional circumstances such as damage or unexpected unavailability. | S22, Booking |
| BR-44 | Eligible Manager cancellation gives a full simulated refund. | S22, Finance |
| BR-45 | Each paid booking cancelled because of pitch suspension receives a full refund with consistent Customer balance, Manager balance, payment, and transaction updates. | S29, S32, Booking, Finance |
| BR-46 | Admin may review/process eligible simulated refunds; updates affect both Customer and Manager financial records. | S32, Finance |
| BR-47 | Refund restores Customer balance, deducts Manager balance/revenue, marks payment Refunded, and records a refund transaction. | S12, S22, S32, Finance |
| BR-48 | A successful payment may be refunded only once for its eligible refundable amount. | S12, S22, S32, Finance |
| BR-49 | Booking, payment, and refund states must remain mutually consistent in one logical transaction. | Booking, Finance |
| BR-50 | For a paid booking requiring refund, mark booking Cancelled and payment Refunded only after refund succeeds; amount equals eligible successful payment. | S12, S22, S32 |

### 5.6 Pitch management and operational status

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-51 | Manager may edit/manage only authorized owned/managed pitches. | S18–S22, Pitch |
| BR-52 | Suspended pitch accepts no new booking; active holds release; all existing Confirmed bookings cancel and receive full refunds. | S29, S32, Pitch, Booking, Finance |
| BR-53 | Suspended/deactivated pitches are excluded from Search; suspended pitches are excluded from public discovery; deactivated pitches may appear lower in general browsing; saved/history/profile references show unavailable status; neither is bookable. | S01–S04, S07, S13 |
| BR-54 | Only Admin may restore an eligible temporarily suspended pitch; cancelled/refunded bookings are not restored. | S29, Pitch |
| BR-55 | Admin may permanently suspend a pitch for sufficiently serious/confirmed violations; permanent suspension cannot be restored. | S29, Pitch, Audit |
| BR-56 | Manager may deactivate/reactivate an owned pitch; deactivation blocks new bookings but does not cancel existing Confirmed bookings. | S18, S20, Pitch, Booking |

### 5.7 Reviews, reports, and enforcement

| BR | Implementation requirement | Primary screens/services |
|---|---|---|
| BR-57 | Customer may review only a pitch from an owned Completed booking; one eligible booking produces at most one review. | S12, S03, Review |
| BR-58 | Admin may suspend pitches, Customers, or Managers when violations are confirmed or enforcement is justified by reviewed reports/policies. | S27–S31, Admin |
| BR-59 | Reports from Customers/Managers are recorded and reviewed by Admin before applicable enforcement. | S03/S04/S15/S24 → S31 |
| BR-60 | Repeated cancellation/refund behavior may be flagged; Admin may restrict accounts that abuse policy. | S26, S27, S31, S32 |

## 6. Screen-to-rule responsibility matrix

This matrix identifies the principal rules each screen must represent. It does not permit a page to reimplement another domain service.

### 6.1 Public and Customer screens

| Screen | Core responsibility | Main BRs |
|---|---|---|
| S01 Home | Show discoverable/bookable pitch summaries and public navigation. | BR-1, BR-53 |
| S02 Search Results | Search/filter/sort while excluding suspended/deactivated pitches. | BR-53 |
| S03 Pitch Details | Display status and permit booking only when pitch/account are eligible; show eligible reviews. | BR-1, BR-7, BR-52, BR-53, BR-57 |
| S04 Pitch Owner Profile | Show owner and associated pitches with correct status visibility. | BR-53 |
| S05 Login | Authenticate one account and derive role/status. | BR-1–BR-10 as access context |
| S06 Register | Create Customer only and initialize simulated balance. | BR-1, BR-29, BR-32 |
| S07 Booking Schedule | Validate Customer, pitch, date window, availability, ownership-independent booking eligibility, and create hold. | BR-1, BR-7, BR-11, BR-14, BR-18, BR-19, BR-26, BR-52, BR-53 |
| S08 Booking Confirmation | Show preserved draft terms/countdown and revalidate before payment. | BR-18–BR-20, BR-23, BR-26–BR-28 |
| S09 Mock Payment | Validate draft/hold/current balance, make atomic payment, confirm booking, and prevent duplicates. | BR-18–BR-20, BR-23, BR-27, BR-29–BR-42 |
| S10 Booking Result | Render authoritative booking/payment result. | BR-20, BR-24, BR-30, BR-34–BR-37, BR-42 |
| S11 Booking History | Show owned historical/current records and consistent statuses. | BR-2, BR-20–BR-22, BR-24, BR-25, BR-49, BR-50 |
| S12 Booking Details | Enforce ownership; cancellation/rescheduling/review/refund eligibility. | BR-2, BR-3, BR-12–BR-17, BR-21–BR-25, BR-42–BR-50, BR-57 |
| S13 Favorites | Preserve saved unavailable pitch references and disable booking. | BR-53 |
| S14 Payment History | Show owned immutable payment/refund records and balances consistently. | BR-2, BR-29–BR-42, BR-45–BR-50 |
| S15 Messages | Authenticated Customer communication only. | BR-10, BR-59 |
| S16 Account Settings | Update owned profile/preferences without changing role or protected history. | Access/status rules |

### 6.2 Manager screens

| Screen | Core responsibility | Main BRs |
|---|---|---|
| S17 Manager Dashboard | Owned pitch/booking/notification overview; block suspended Manager. | BR-5, BR-6, BR-9, BR-33, BR-51 |
| S18 My Pitches | List only owned/managed pitches with operational statuses. | BR-5, BR-9, BR-51, BR-53, BR-56 |
| S19 Add Pitch | Create a valid owned pitch. Under official scope, it begins Active; no Admin pre-approval rule exists. | BR-51; official Pitch lifecycle |
| S20 Edit Pitch | Edit only owned pitch; deactivate/reactivate without rewriting Confirmed history. | BR-21, BR-24, BR-28, BR-51, BR-56 |
| S21 Availability | Manage only owned pitch hours/slots; protect holds and Confirmed bookings. | BR-18, BR-19, BR-21, BR-23, BR-24, BR-28, BR-51 |
| S22 Manager Bookings | View owned-pitch bookings and cancel only eligible cases with consistent refund. | BR-5, BR-8, BR-21, BR-25, BR-43, BR-44, BR-47–BR-51 |
| S23 Revenue Dashboard | Show only owned-pitch balance, revenue, payment, and refund records. | BR-6, BR-9, BR-29, BR-33, BR-34, BR-37, BR-45–BR-50 |
| S24 Manager Messages | Authenticated Manager communication and report submission. | BR-10, BR-59 |
| S25 Manager Settings | Update own settings only; suspended Manager cannot use management functions. | BR-5, BR-9 |

### 6.3 Admin and shared screens

| Screen | Core responsibility | Main BRs |
|---|---|---|
| S26 Admin Dashboard | System summaries and navigation to users, pitches, reports, finance, content, and audit. | BR-4–BR-9, BR-46, BR-52–BR-60 |
| S27 User Management | Warning, suspension, restoration, restrictions, and historical preservation. | BR-2–BR-4, BR-7, BR-58, BR-60 |
| S28 Manager Management | Suspension/restoration, associated pitch handling, booking review, and financial preservation. | BR-5, BR-6, BR-8, BR-9, BR-58, BR-60 |
| S29 Pitch Moderation | Post-creation review; temporary/permanent suspension; eligible restoration; affected-booking context. | BR-45, BR-52–BR-55, BR-58, BR-59 |
| S30 Admin Messages | Authenticated Admin communication. | BR-10 |
| S31 Report Management | Record, investigate, resolve, and enforce only after review. | BR-58–BR-60 |
| S32 Admin Finance | Monitor bookings/transactions and process eligible single refunds consistently. | BR-8, BR-21, BR-25, BR-37, BR-43–BR-50, BR-52, BR-58, BR-60 |
| S33 Admin Content | Manage banners/announcements through Admin-only service and audit actions. | FR: content management |
| S34 Activity Log | Read immutable important activity history. | FR: audit monitoring |
| S35 Admin Settings | Update Admin/system preferences without changing domain history directly. | FR: Admin settings |
| S36 Notifications | Show role-owned notifications and resolve targets through stable IDs. | Effects of BR-3–BR-9, BR-12, BR-43–BR-60 |
| S37 Settings | Public interface/appearance preferences only. | FR: shared settings |
| S38 Not Found | Missing/unknown route or record state. | Error-handling requirement |
| S39 Access Denied | Wrong role/status/ownership state where appropriate. | Role protection requirement |
| S40 Server Error | Safe unexpected-error presentation without exposing internals. | Error-handling requirement |

## 7. Cross-domain system flows

### 7.1 Authentication and role landing

```text
Guest → Login → auth-service validates credentials/status
      → session stores userId + canonical role
      → customer: S01 | manager: S17 | admin: S26
```

Constraints:

- demo buttons only fill credentials;
- role comes from the account record;
- protected pages guard before render/action binding;
- wrong role goes to S39;
- logout clears session;
- all domains resolve current identity through Auth service.

### 7.2 Official pitch creation and operation

```text
Manager S19 → Pitch service validates Manager/fields
            → creates owned Active pitch
            → S18/S17 show it
            → S01–S04 may discover it according to filters
            → S07 may book it when slots are eligible
```

Constraints:

- Manager ownership is authoritative from the session/service, not form input;
- S19 must not write pitch data directly if Pitch service exists;
- later edits do not rewrite Confirmed booking snapshots;
- Admin S29 may later moderate/suspend/restore the pitch;
- the official flow contains no mandatory pre-publication approval or new-pitch approval queue.

### 7.3 Booking hold and payment

```text
S03 pitchId
 → S07 validates role/pitch/date/slot and creates bookingDraftId + 10-minute hold
 → S08 revalidates and presents terms
 → S09 validates hold + booking + current balance
 → atomic successful payment
 → Customer balance decreases
 → Manager balance increases
 → payment transaction is recorded
 → booking becomes Confirmed
 → S10 receives bookingId
```

Failure behavior:

- invalid/unavailable slot: no hold or booking commitment;
- expired hold: cancel Pending booking, cancel Pending payment, release slot;
- insufficient balance while hold active: no balance/transaction/status mutation; retry allowed;
- duplicate successful payment: reject/reuse authoritative result without a second deduction.

### 7.4 Customer cancellation and rescheduling

```text
S12 owned Confirmed booking
 → validate ≥2 hours, not Completed, not already Cancelled
 → if cancellation: process eligible full refund → Cancelled
 → if reschedule: cancel/refund original
                → S07 creates new hold
                → normal confirmation/payment flow
                → mark booking chain reschedule-used
```

Suspended Customer may cancel an eligible booking but cannot reschedule or create the replacement booking.

### 7.5 Manager cancellation

```text
S22 owned-pitch Confirmed booking
 → validate Manager ownership + permitted exceptional reason
 → Booking service validates one-time cancellation
 → Finance service processes full refund
 → payment becomes Refunded
 → booking becomes Cancelled
 → transaction + notification + audit effects are recorded
```

Manager cancellation is not a general delete action.

### 7.6 Admin refund

```text
S32 selected booking/payment/transaction
 → validate Admin + entity consistency + eligibility
 → ensure payment Paid and not previously refunded
 → one logical operation:
      Customer balance ↑
      Manager balance ↓
      refund transaction created
      payment = Refunded
      booking = Cancelled when cancellation requires it
 → notification + activity recorded
```

### 7.7 Pitch deactivation versus suspension

| Action | Actor | New bookings | Existing Confirmed bookings | Holds | Refund |
|---|---|---:|---|---|---|
| Deactivate | Authorized Manager | Blocked | Continue | New holds blocked; existing behavior follows eligibility | No automatic refund |
| Temporary suspension | Admin | Blocked | Cancel affected bookings | Release immediately | Full refund for each paid affected booking |
| Permanent suspension | Admin | Blocked permanently | Cancel affected bookings | Release immediately | Full refund for each paid affected booking |
| Reactivate deactivated | Authorized Manager | May resume | Unchanged | New holds allowed when eligible | None |
| Restore temporary suspension | Admin | May resume | Previously cancelled bookings stay cancelled | New holds allowed when eligible | Previous refunds remain |

### 7.8 Manager suspension

```text
S28 Admin suspends Manager
 → Auth blocks Manager management access
 → Pitch service blocks new bookings on associated pitches
 → existing Confirmed bookings are reviewed individually
      fulfillable → continue
      unfulfillable → Admin cancellation + full refund
 → Finance history/balance is preserved except valid refund adjustments
 → notifications + audit records created
```

Restoration may restore access and pitch bookability; it never erases history or reverses completed refunds.

### 7.9 Report and enforcement

```text
Authorized actor submits report
 → report recorded
 → S31 Admin review/investigation
 → resolve without action OR apply eligible warning/restriction/suspension
 → affected domain services perform state changes
 → S36 notifications + S34 immutable activity
```

A report alone is not proof and must not immediately suspend an entity.

### 7.10 Booking completion and review

```text
Confirmed booking reaches scheduled end
 → Booking service marks Completed if not Cancelled
 → S12 allows one review for owner of that booking
 → review links bookingId + pitchId + customerId
 → S03 may display the review/rating
```

## 8. Cross-domain integration rules

| IR | Required invariant |
|---|---|
| IR-01 | A page imports domain services, never another page script. |
| IR-02 | One stable record exists per entity; screens do not maintain competing copies. |
| IR-03 | URL parameters identify records only; services load and validate authoritative data. |
| IR-04 | Identity, role, account status, ownership, price, balance, and financial status never come from trusted URL/form values. |
| IR-05 | Booking + payment success is one logical transition; partial success must not remain. |
| IR-06 | Cancellation requiring refund becomes final only after required Finance updates succeed. |
| IR-07 | Suspension effects call Pitch, Booking, Finance, Notification, and Audit responsibilities rather than duplicating them in S29. |
| IR-08 | Manager suspension calls Auth, Pitch, Booking, Finance, Notification, and Audit responsibilities rather than duplicating them in S28. |
| IR-09 | Every payment/refund is idempotent: reload, back, double-click, or repeated calls cannot duplicate effects. |
| IR-10 | Historical booking terms and transaction records are immutable except for approved status links/adjustments. |
| IR-11 | All protected list/detail operations filter by role and record ownership in the responsible service. |
| IR-12 | Notifications carry target type + stable ID; they do not embed a trusted complete business object. |
| IR-13 | Admin actions record actor, reason, entity, timestamp, result, and required notification/audit effect. |
| IR-14 | Unknown, missing, malformed, unavailable, expired, or unauthorized IDs produce safe states without mutation. |
| IR-15 | Unfinished destinations remain inert; do not use `#`, invented files, or knowingly broken routes. |

## 9. Service ownership and responsibilities

| Service | Owns | Must not own |
|---|---|---|
| Storage | One key, initialization, load/save/update/reset, schema version | Domain policy decisions |
| Authentication | Register, Login, Logout, session, current account/status | Pitch, booking, payment decisions |
| Access Control | Page role guards and safe redirects | Record ownership/business eligibility |
| Pitch | Pitch CRUD, ownership, operating status, search visibility, availability coordination | Booking/payment records |
| Booking | Holds, drafts, slot conflicts, booking transitions, cancellation eligibility, reschedule chain, completion | Balance mutation |
| Finance | Balances, payments, refunds, transactions, revenue, financial idempotency | Slot or general booking ownership decisions |
| Admin/Enforcement | Review decisions, reasons, warning/restriction/suspension intent | Directly reimplementing all downstream domain mutations |
| Communication | Conversations, participants, message records | Authentication authority |
| Notification | Recipient events and stable target metadata | Core booking/financial truth |
| Audit | Immutable activity records | Editing historical domain records |

## 10. Non-negotiable consistency invariants

1. A slot has at most one active hold or Confirmed booking for the same pitch/date/time.
2. A Confirmed booking has exactly one successful payment.
3. A successful payment has at most one successful refund.
4. A refund cannot exist without a prior successful payment.
5. A Refunded payment and its required cancellation state must agree.
6. Customer and Manager balance changes equal recorded transaction effects.
7. Manager revenue includes only owned/managed pitch transactions.
8. Cancelled/Completed bookings never return to earlier states.
9. Expired holds never accept payment.
10. Pitch edits never rewrite preserved Confirmed booking terms.
11. Suspended/deactivated pitches never accept new bookings.
12. Manager deactivation does not automatically cancel Confirmed bookings.
13. Admin suspension cancels/refunds affected Confirmed bookings and releases holds.
14. Manager suspension does not automatically refund all bookings; Admin reviews affected bookings individually.
15. Restoration never resurrects cancelled bookings, reverses refunds, or deletes history.
16. Every privileged action checks both role and record-level authority.
17. Every cross-domain mutation is safe against retry/reload/double-click.

## 11. Required implementation behavior for coding agents

Before coding a screen, the agent must report:

1. Screen ID, owner, role, priority, and canonical files.
2. Official BR IDs affecting the screen.
3. Input/output Screen Map contracts.
4. Shared data effects and services.
5. Records read and mutated.
6. Required role, status, ownership, and eligibility checks.
7. Neighboring screens/services that are ready or still waiting.

During implementation:

- implement both success and rejected/error paths;
- use shared services and the single state key;
- keep domain mutation out of HTML and shared components;
- prepare exact parameter contracts without creating broken links;
- preserve current authentication and teammate work;
- do not invent a new status, role, BR, route, service, or schema field without an approved decision;
- do not claim a cross-screen flow is integrated until source and target have been tested together.

After implementation, report:

- files changed;
- BRs and contracts implemented;
- state transitions and mutations tested;
- role/ownership/security checks tested;
- connected dependencies;
- waiting dependencies and exact missing contract;
- unresolved decisions.

## 12. Cross-domain acceptance checklist

### Authentication and roles

- [ ] Guest cannot enter Customer/Manager/Admin screens.
- [ ] Customer cannot enter Manager/Admin screens.
- [ ] Manager cannot enter Customer-only/Admin screens unless explicitly shared.
- [ ] Admin cannot silently act as Customer/Manager.
- [ ] Changed URL IDs cannot bypass ownership.
- [ ] Suspended account restrictions preserve permitted history.

### Pitch and discovery

- [ ] Manager CRUD is limited to owned pitches.
- [ ] Deactivated/suspended pitch visibility follows BR-53.
- [ ] No unavailable pitch can start a new booking.
- [ ] Deactivation preserves Confirmed bookings.
- [ ] Suspension releases holds and triggers required cancellation/refund coordination.
- [ ] A valid Manager-created pitch follows the official Active lifecycle without an invented approval queue.

### Booking and payment

- [ ] Seven-day window and past-slot rules are enforced.
- [ ] Competing active hold/booking is rejected.
- [ ] Hold expires and releases slot automatically.
- [ ] Payment revalidates hold, booking-critical data, and current balance.
- [ ] Successful payment performs every required update exactly once.
- [ ] Failure changes no balance and does not confirm booking.
- [ ] Reload/back/double-click cannot duplicate payment.

### Cancellation and refund

- [ ] Actor, ownership, reason, deadline, booking status, and refund eligibility are validated.
- [ ] Refund changes both balances, transaction history, payment status, and booking status consistently.
- [ ] Duplicate cancellation/refund changes nothing.
- [ ] Manager cancellation is limited to permitted exceptional circumstances.
- [ ] Admin suspension refund affects only the appropriate bookings.

### Admin and enforcement

- [ ] Reports are reviewed before enforcement.
- [ ] Temporary and permanent pitch suspension behave differently.
- [ ] Permanent pitch suspension cannot be restored.
- [ ] Manager suspension preserves financial history and reviews bookings individually.
- [ ] Actions include required reason, notification, and immutable activity record.

## 13. Implementation clarification register

| Question | Authoritative answer | Coding instruction |
|---|---|---|
| Must Admin approve every new pitch? | No. The official pitch lifecycle starts Active. | S19 creates a valid owned Active pitch; do not create an approval queue. |
| What does Pitch Moderation mean? | Review and enforcement for existing pitches: temporary/permanent suspension and eligible restoration. | Implement these actions in S29 and coordinate their downstream effects. |
| Does Manager deactivation refund existing bookings? | No. Confirmed bookings continue. | Block only new bookings. |
| Does Admin pitch suspension refund existing bookings? | Yes, affected paid Confirmed bookings receive full simulated refunds. | Coordinate Pitch + Booking + Finance + Notification + Audit. |
| Does Manager suspension refund all bookings? | No. Admin reviews each affected booking; only unfulfillable bookings are cancelled/refunded. | Preserve other bookings and financial history. |
| Can a suspended Customer cancel? | Yes, when the owned booking remains normally eligible. | Permit cancellation/refund but block rescheduling/new booking. |
| Can Admin refund any transaction freely? | No. Refund must be eligible, linked, consistent, and unique. | Validate before mutation. |
| Are simulated balances real money? | No. | Label as simulated and never integrate a real gateway. |

## 14. Maintenance rule

When an official BR, role authority, status, or cross-domain flow changes:

1. Update the official requirements first.
2. Update this file.
3. Update `SCREEN_MAP.md` contracts and data effects.
4. Update affected issues and notify source, target, and service owners.
5. Update mock schema/state migration without erasing existing data.
6. Update tests for every affected source, target, and downstream consumer.
7. Record the reason and compatibility impact in the Pull Request.

Do not reuse an existing BR/contract ID for a different meaning. Do not allow page code to become the undocumented source of product policy.
