# Pitch Point — Project Context and Frontend Conventions

> Purpose: provide team members and AI coding assistants with the same project context before they create or modify frontend screens.

## 1. How to use these documents

Before working on a screen, read:

1. `AGENTS.md`
2. This `docs/PITCH_POINT_CONTEXT.md`
3. The authoritative ownership and filename tables in Section 8 of this document
4. `docs/SCREEN_MAP.md` when it exists, for approved input/output and integration contracts
5. The canonical screen-template files
6. The assigned screen's current files

`AGENTS.md` contains mandatory operating rules. This document explains the project architecture and the reasons behind those rules.

The official Milestone 1 requirements remain the source of truth for product behavior and required screens.

## 2. Project overview

**Pitch Point** is a responsive web platform for finding, booking, and managing football pitches in Vietnam.

### 2.1 Main user groups

| Role | Main needs |
|---|---|
| Guest | Browse and search pitches, view public pitch information, register, and log in |
| Registered customer | Book pitches, manage bookings, use simulated payment, view history, favorites, messages, notifications, and settings |
| Pitch manager | Manage pitches, availability, bookings, revenue, messages, and manager settings |
| Administrator | Manage users, managers, pitches, reports, bookings, refunds, content, logs, and system settings |

### 2.2 Core required flows

The minimum product flows include:

1. Search for pitches and view pitch details.
2. Register and log in.
3. Select a time slot and temporarily hold it for 10 minutes.
4. Confirm a booking and pay using a simulated balance.
5. View booking history and booking details; cancel or reschedule when eligible.
6. Write a review only after a completed booking.
7. Let pitch managers manage pitches, availability, and bookings.
8. Provide administrator views for users, pitch managers, pitch moderation, reports, bookings, refunds, content, activity logs, and system settings.

These flows span multiple screens. A single page must not absorb the responsibilities of the entire flow.

### 2.3 Explicit boundaries

- Payments, balances, and refunds are simulations only.
- No real card, bank, or e-wallet transaction is processed.
- Customers select pitches and slots themselves.
- Notifications are in-app only unless the requirements are changed.
- The current frontend language is Vietnamese.
- Currency examples use VND.
- The current milestone uses static HTML pages, shared CSS, vanilla JavaScript, and mock data where necessary.

## 3. Current milestone strategy

The project is at Milestone 2. The team must create frontend pages for the screens identified in Milestone 1 using the teacher's shared template.

The current priority order is:

1. Correct screen coverage and filenames.
2. Clear semantic HTML structure.
3. Consistent shared layout and component usage.
4. Responsive page-specific CSS.
5. Local JavaScript interactions and approved mock states.
6. Cross-screen integration after both screens exist.
7. Visual polish after required screens are covered.

The team is intentionally building raw, understandable screen structures before implementing complete workflows.

## 4. How the teacher template works

The teacher template is a starter architecture, not a finished Pitch Point website.

### 4.1 No inherited HTML master page

`index.html` is the Home screen. It does not automatically wrap other screens.

Every screen owns a separate HTML document, while shared interface regions are reused through components:

```html
<site-header></site-header>

<main>
  <!-- Content unique to this screen -->
</main>

<site-footer></site-footer>
```

This arrangement means:

- each screen owns its main content;
- header and footer are maintained once;
- shared CSS provides one visual language;
- page CSS handles only page-specific layout;
- page JavaScript handles only page-specific behavior;
- repeated records can be generated from `<template>` elements.

### 4.2 Important template files

| File or folder | Responsibility |
|---|---|
| `frontend/index.html` | Production Home screen |
| `frontend/*.html` | One document per production screen |
| `frontend/screen-template.html` | Non-production starter for new screens |
| `frontend/css/reset.css` | Normalizes browser defaults |
| `frontend/css/tokens.css` | Shared colors, spacing, typography, radii, and shadows |
| `frontend/css/layout.css` | Shared containers, grids, layout, and responsive rules |
| `frontend/css/components.css` | Shared buttons, forms, cards, badges, tables, and states |
| `frontend/css/<screen-name>.css` | Styles specific to one screen |
| `frontend/js/components/` | Reusable components such as header and footer |
| `frontend/js/pages/` | One JavaScript module per screen |
| `frontend/js/data/` | Approved shared mock data |
| `frontend/js/services/` | Approved shared state or service contracts |
| `frontend/assets/` | Images, icons, and other static resources |

### 4.3 Key terms

| Term | Meaning in this project |
|---|---|
| Template | A starter structure and convention adapted to Pitch Point |
| Component | A reusable interface element such as a header, button, card, or sidebar |
| Web Component | A JavaScript component used through a custom element such as `<site-header>` |
| Semantic HTML | Choosing tags by meaning, such as `nav`, `main`, `section`, and `article` |
| DOM | The browser's object representation of the HTML document |
| Selector | A CSS or JavaScript pattern used to locate an element |
| `<template>` | An inactive HTML blueprint JavaScript can clone |
| Mock data | Temporary sample data used before backend integration |
| Query parameter | A value carried in a URL, such as `?pitchId=P001` |
| Screen contract | The agreed filename, input parameters, output links, and responsibility of a screen |
| Responsive design | A layout that adapts to mobile, tablet, laptop, and wide desktop widths |

## 5. Canonical frontend organization

Production HTML files remain flat under `frontend/`. They are not grouped by member name or role.

```text
frontend/
├── index.html
├── search.html
├── pitch-detail.html
├── screen-template.html
├── mock/
│   ├── users.json
│   └── pitches.json
├── css/
│   ├── reset.css
│   ├── tokens.css
│   ├── layout.css
│   ├── components.css
│   ├── home.css
│   ├── search.css
│   ├── pitch-detail.css
│   └── screen-template.css
├── js/
│   ├── components/
│   │   ├── site-header.js
│   │   └── site-footer.js
│   ├── pages/
│   │   ├── home.js
│   │   ├── search.js
│   │   ├── pitch-detail.js
│   │   └── screen-template.js
│   ├── data/
│   └── services/
│       ├── storage-service.js
│       ├── auth-service.js
│       └── access-control.js
└── assets/
    ├── images/
    └── icons/
```

Reasons for keeping HTML flat:

- relative links remain simple;
- Live Server can open every screen easily;
- members can find screens quickly;
- ownership can change without moving files;
- member folders do not become part of the application architecture.

## 6. Naming conventions

### 6.1 Production files

Use lowercase kebab-case:

```text
pitch-detail.html
booking-schedule.html
manager-dashboard.html
admin-user-management.html
```

Use the same slug for the screen's three files:

```text
frontend/pitch-detail.html
frontend/css/pitch-detail.css
frontend/js/pages/pitch-detail.js
```

Exceptions:

- Home HTML is `index.html`.
- Home CSS and JavaScript are `home.css` and `home.js`.

Do not use:

- member names;
- screen numbers without meaning;
- `final`, `new`, `copy`, or version suffixes;
- spaces;
- camelCase or PascalCase filenames;
- snake_case filenames for new production screens.

### 6.2 Known teacher-template adaptations

```text
shop.html   -> search.html
detail.html -> pitch-detail.html
```

`list.html` remains a legacy generic example and is not a production screen unless the Screen Map explicitly assigns it.

Some local copies may still contain legacy names such as `pitch_detail.html` or `screen_template.html`. The coordinator should normalize those names before distributing the common foundation. AI assistants must not create both underscore and hyphen versions or perform a broad rename without explicit instruction.

### 6.3 Code naming

- IDs: `kebab-case`
- Page root class: `<screen-name>-page`
- Existing reusable BEM-style classes may use names such as `card__title`
- JavaScript variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Custom elements and data attributes: `kebab-case`

## 7. Home and the canonical screen template

### 7.1 Home's role

The Home screen consists of:

```text
frontend/index.html
frontend/css/home.css
frontend/js/pages/home.js
```

Home is the visual reference for:

- Pitch Point's navy-and-lime direction;
- typography and hierarchy;
- spacing and maximum-width layout;
- buttons, inputs, cards, and panels;
- mobile and wide-screen behavior;
- header/footer placement;
- the floating message-bubble pattern.

Home may display interface entry points for Search, Login, Register, Pitch Detail, Booking, or Messages. Displaying those controls does not make Home responsible for those workflows.

At the current foundation stage, Home is a presentation screen:

- it may render approved sample pitch cards;
- it may open local visual controls such as date/time pickers;
- it may validate fields that belong to the Home form;
- it must not implement full search, authentication, favorites, booking, payment, or messaging logic;
- controls targeting unfinished screens remain silent and inert until integration.

### 7.2 Template's role

The reusable starter consists of:

```text
frontend/screen-template.html
frontend/css/screen-template.css
frontend/js/pages/screen-template.js
```

Members copy and rename all three files for an assigned screen. They preserve the shared imports, semantic shell, one-`h1` pattern, responsive foundation, and approved reusable regions.

Home is a design reference; `screen-template` is the technical starting point. Members must not copy Home wholesale.

## 8. Authoritative screen ownership and production files

The official Milestone 1 document defines 40 required screens. The tables below establish the Milestone 2 owner, access level, priority, backend-style route from the requirements, and canonical static frontend files for every screen.

Access codes:

```text
P    = Public
Auth = Authenticated customer
M    = Pitch manager
A    = Administrator
```

The route column preserves the route specified in Milestone 1. Milestone 2 uses the static HTML file column when testing with Live Server. A future router or backend may later implement the official route without renaming the approved frontend files.

Every non-Home row owns a matching trio:

```text
frontend/<slug>.html
frontend/css/<slug>.css
frontend/js/pages/<slug>.js
```

Home is the only exception: `index.html`, `css/home.css`, and `js/pages/home.js`.

### 8.1 Nguyen Vinh Hung — Platform, Authentication & Communication

| ID | Screen | Route | Access | Priority | HTML / CSS / JavaScript | Status |
|---|---|---|---|---|---|---|
| S05 | Login | `/login` | P | P0 | `login.html` / `css/login.css` / `js/pages/login.js` | Planned |
| S06 | Register | `/register` | P | P0 | `register.html` / `css/register.css` / `js/pages/register.js` | Planned |
| S15 | Messages | `/user/messages` | Auth | P1 | `user-messages.html` / `css/user-messages.css` / `js/pages/user-messages.js` | Planned |
| S16 | Account Settings | `/user/settings` | Auth | P0 | `account-settings.html` / `css/account-settings.css` / `js/pages/account-settings.js` | Planned |
| S24 | Manager Messages | `/manager/messages` | M | P1 | `manager-messages.html` / `css/manager-messages.css` / `js/pages/manager-messages.js` | Planned |
| S25 | Manager Settings | `/manager/settings` | M | P0 | `manager-settings.html` / `css/manager-settings.css` / `js/pages/manager-settings.js` | Planned |
| S30 | Admin Messages | `/admin/messages` | A | P1 | `admin-messages.html` / `css/admin-messages.css` / `js/pages/admin-messages.js` | Planned |
| S36 | Notifications | `/notifications` | Auth | P0 | `notifications.html` / `css/notifications.css` / `js/pages/notifications.js` | Planned |
| S37 | Settings | `/settings` | P | P0 | `settings.html` / `css/settings.css` / `js/pages/settings.js` | Planned |
| S38 | Not Found | `/404` | P | P0 | `404.html` / `css/404.css` / `js/pages/404.js` | Planned |
| S39 | Access Denied | `/403` | P | P0 | `403.html` / `css/403.css` / `js/pages/403.js` | Planned |
| S40 | Server Error | `/500` | P | P0 | `500.html` / `css/500.css` / `js/pages/500.js` | Planned |

Logic ownership: authentication, session presentation, account and manager settings, messaging, notifications, shared layout and interface components, route-protection presentation, and common error handling.

### 8.2 Be Thanh Tien — Pitch Catalog & Pitch Operations

| ID | Screen | Route | Access | Priority | HTML / CSS / JavaScript | Status |
|---|---|---|---|---|---|---|
| S01 | Home Page | `/` | P | P0 | `index.html` / `css/home.css` / `js/pages/home.js` | In progress |
| S02 | Search Results | `/search` | P | P0 | `search.html` / `css/search.css` / `js/pages/search.js` | Planned |
| S03 | Pitch Details | `/pitch/:id` | P | P0 | `pitch-detail.html` / `css/pitch-detail.css` / `js/pages/pitch-detail.js` | Planned |
| S04 | Pitch Owner Profile | `/owner/:id` | P | P1 | `pitch-owner-profile.html` / `css/pitch-owner-profile.css` / `js/pages/pitch-owner-profile.js` | Planned |
| S13 | Favorite Pitches | `/user/favorites` | Auth | P1 | `favorite-pitches.html` / `css/favorite-pitches.css` / `js/pages/favorite-pitches.js` | Planned |
| S17 | Manager Dashboard | `/manager/dashboard` | M | P0 | `manager-dashboard.html` / `css/manager-dashboard.css` / `js/pages/manager-dashboard.js` | Planned |
| S18 | My Pitches | `/manager/pitches` | M | P0 | `manager-pitches.html` / `css/manager-pitches.css` / `js/pages/manager-pitches.js` | Planned |
| S19 | Add Pitch | `/manager/pitches/new` | M | P0 | `add-pitch.html` / `css/add-pitch.css` / `js/pages/add-pitch.js` | Planned |
| S20 | Edit Pitch | `/manager/pitches/:id/edit` | M | P0 | `edit-pitch.html` / `css/edit-pitch.css` / `js/pages/edit-pitch.js` | Planned |
| S21 | Pitch Availability Management | `/manager/pitches/:id/availability` | M | P0 | `pitch-availability.html` / `css/pitch-availability.css` / `js/pages/pitch-availability.js` | Planned |
| S29 | Pitch Moderation | `/admin/pitches` | A | P0 | `admin-pitch-moderation.html` / `css/admin-pitch-moderation.css` / `js/pages/admin-pitch-moderation.js` | Planned |

Logic ownership: pitch data, search and discovery, favorites, pitch creation and editing, operating hours, availability, pitch status, deactivation, suspension effects, visibility, moderation, and pitch-management dashboard integration.

### 8.3 Pham Ba Viet — Booking Lifecycle

| ID | Screen | Route | Access | Priority | HTML / CSS / JavaScript | Status |
|---|---|---|---|---|---|---|
| S07 | Booking Schedule | `/user/book/:pitchId` | Auth | P0 | `booking-schedule.html` / `css/booking-schedule.css` / `js/pages/booking-schedule.js` | Planned |
| S08 | Booking Confirmation | `/user/booking/confirm` | Auth | P0 | `booking-confirmation.html` / `css/booking-confirmation.css` / `js/pages/booking-confirmation.js` | Planned |
| S10 | Booking Result | `/user/booking/result` | Auth | P0 | `booking-result.html` / `css/booking-result.css` / `js/pages/booking-result.js` | Planned |
| S11 | Booking History | `/user/bookings` | Auth | P0 | `booking-history.html` / `css/booking-history.css` / `js/pages/booking-history.js` | Planned |
| S12 | Booking Details | `/user/bookings/:id` | Auth | P0 | `booking-details.html` / `css/booking-details.css` / `js/pages/booking-details.js` | Planned |
| S22 | Booking Management | `/manager/pitches/:id/bookings` | M | P0 | `manager-bookings.html` / `css/manager-bookings.css` / `js/pages/manager-bookings.js` | Planned |

Logic ownership: booking availability, temporary holds, revalidation, booking status transitions, history and details, manager booking operations, cancellation, rescheduling, completion, and booking consistency.

### 8.4 Luong The Hieu — Payment & Financial

| ID | Screen | Route | Access | Priority | HTML / CSS / JavaScript | Status |
|---|---|---|---|---|---|---|
| S09 | Mock Payment | `/user/payment` | Auth | P0 | `payment.html` / `css/payment.css` / `js/pages/payment.js` | Planned |
| S14 | Payment History | `/user/payments` | Auth | P1 | `payment-history.html` / `css/payment-history.css` / `js/pages/payment-history.js` | Planned |
| S23 | Revenue Dashboard | `/manager/revenue` | M | P1 | `manager-revenue.html` / `css/manager-revenue.css` / `js/pages/manager-revenue.js` | Planned |
| S32 | Booking, Refund & Financial Management | `/admin/bookings` | A | P0 | `admin-finance.html` / `css/admin-finance.css` / `js/pages/admin-finance.js` | Planned |

Logic ownership: simulated balances, payment processing, payment status, payment and transaction history, refunds, financial transactions, revenue calculations, financial monitoring, and financial consistency.

### 8.5 Le Huy Hoang — Administration & Enforcement

| ID | Screen | Route | Access | Priority | HTML / CSS / JavaScript | Status |
|---|---|---|---|---|---|---|
| S26 | Admin Dashboard | `/admin/dashboard` | A | P0 | `admin-dashboard.html` / `css/admin-dashboard.css` / `js/pages/admin-dashboard.js` | Planned |
| S27 | User Management | `/admin/users` | A | P0 | `admin-users.html` / `css/admin-users.css` / `js/pages/admin-users.js` | Planned |
| S28 | Pitch Manager Management | `/admin/pitch-managers` | A | P0 | `admin-pitch-managers.html` / `css/admin-pitch-managers.css` / `js/pages/admin-pitch-managers.js` | Planned |
| S31 | Report Management | `/admin/reports` | A | P1 | `admin-reports.html` / `css/admin-reports.css` / `js/pages/admin-reports.js` | Planned |
| S33 | Announcement & Banner Management | `/admin/content` | A | P1 | `admin-content.html` / `css/admin-content.css` / `js/pages/admin-content.js` | Planned |
| S34 | Activity Log | `/admin/activity-log` | A | P1 | `admin-activity-log.html` / `css/admin-activity-log.css` / `js/pages/admin-activity-log.js` | Planned |
| S35 | Admin Settings | `/admin/settings` | A | P0 | `admin-settings.html` / `css/admin-settings.css` / `js/pages/admin-settings.js` | Planned |

Logic ownership: administrative dashboards, reporting, warnings, user and manager suspension, restoration, enforcement decisions, announcements, banner content, audit activities, Admin settings, and administrative decision logic.

### 8.6 Screen Map rules

- These 40 rows are the authoritative ownership and production filename map.
- An owner edits only the files assigned to their screens.
- The route column describes the official product route; Live Server integration uses the approved HTML filename.
- A later `docs/SCREEN_MAP.md` may add query parameters, output links, integration readiness, and status changes, but must not silently contradict these owners or filenames.
- Ownership or filename changes require coordinator approval and synchronized updates to this document, issues, and integration links.
- Agents must not create alternative filenames, duplicate screens, or substitute a legacy template page.
- Allowed delivery statuses are `Planned`, `In progress`, `Ready for review`, `Approved`, and `Integrated`.
- When an input/output contract has not been approved, keep the affected external control inert and report the dependency instead of inventing a contract.

## 9. Mandatory product rules and lifecycle contracts

These rules summarize the Milestone 1 business rules that directly affect frontend states and interactions. A screen may use mock data, but it must not demonstrate a transition that violates these rules.

### 9.1 Roles, access, and account status

- Guests may browse public pitch information, register, and log in, but cannot book, view detailed booking schedules, submit reviews/reports, or use messaging.
- Protected screens must display or redirect to the approved Access Denied behavior when the current role is not permitted.
- A suspended customer cannot create a new booking, reschedule, or perform another restricted action that creates a new system commitment. Existing confirmed bookings remain valid unless separately cancelled under an applicable policy.
- A suspended pitch manager loses management access and their pitches stop accepting new bookings. Existing confirmed bookings and historical financial records remain preserved while Admin reviews whether each booking can still be fulfilled.
- Restoring an eligible manager restores management access and may allow associated pitches to accept new bookings again. Restoration does not rewrite historical records.

#### 9.1.1 Milestone 2 authorization model

Milestone 2 demonstrates role-based access control with mock users and shared frontend state. It does not provide production security.

Canonical stored roles:

```text
customer
manager
admin
```

Guest is the absence of an authenticated session and is not stored as a user role.

The approved mock authentication flow is:

```text
mock/users.json
  -> storage-service.js
  -> auth-service.js
  -> access-control.js
  -> protected page
```

- `frontend/mock/users.json` seeds one approved demo Customer, Manager, and Admin account for teacher testing.
- Login identifies an account from the seeded/shared users and creates a session containing the stable user ID and role.
- Register always creates a Customer account. Login and Register must not offer a role selector.
- Manager and Admin roles are available only through approved seeded accounts or an explicit administrative workflow; users cannot promote themselves.
- `auth-service.js` handles register, login, logout, and current session/user lookup.
- `access-control.js` handles `requireAuth`, `requireRole`, shared role constants, unauthenticated redirects to S05, and wrong-role/status redirects to S39.
- A protected page performs its access check before rendering protected data or enabling privileged actions.
- Role-aware header/sidebar links improve navigation but do not grant access.
- Domain services also check record ownership: customers may act only on their own bookings and managers may manage only their own pitches and related records.
- When a backend is introduced, it must repeat all authentication, account-status, role/permission, ownership, and Business Rule checks. Frontend checks alone are not secure.

### 9.2 Booking eligibility and status

- Bookings must be for a future time slot within the next 7 days.
- Only an authenticated, permitted customer can initiate a booking.
- A customer can cancel or reschedule only their own eligible booking.
- Customer cancellation requires at least 2 hours before the scheduled start time.
- Each booking has exactly one state: `Pending`, `Confirmed`, `Completed`, or `Cancelled`.
- A new booking is `Pending` while its temporary hold is active.
- Successful simulated payment changes it to `Confirmed`.
- Hold expiration changes a still-pending booking to `Cancelled` and releases the slot.
- A confirmed, non-cancelled booking becomes `Completed` after the scheduled slot ends.
- `Completed` and `Cancelled` bookings cannot return to an earlier state.
- Historical booking-critical information, including pitch, time, price, and included services, remains preserved after confirmation.

### 9.3 Availability, temporary hold, and revalidation

- A slot cannot have more than one active hold or confirmed booking.
- Selecting an eligible slot creates a temporary hold for the configured period; the current team requirement uses 10 minutes.
- Other users cannot reserve or confirm the same slot while that hold is active.
- Before payment and final confirmation, revalidate the pitch, slot, availability, price, operating status, and booking terms.
- If valid details changed, the customer must review and accept the updated information.
- If the pitch or slot is no longer eligible, stop the booking, cancel the pending state, and release the hold.
- Payment attempts after hold expiration must be rejected.

### 9.4 Payment and financial consistency

- All balances, payments, refunds, and revenue are simulations in VND. No real money or external payment gateway is involved.
- A payment succeeds only when the hold remains active and the customer's current simulated balance covers the full amount.
- Balance validation and deduction must be treated as one operation in the demonstrated state transition.
- A failed payment does not deduct a balance or confirm a booking. The customer may retry while the hold remains active.
- Every payment has exactly one state: `Pending`, `Paid`, `Refunded`, or `Cancelled`.
- A successful payment creates exactly one linked transaction, deducts the customer balance, increases the related manager balance, and confirms the booking.
- Duplicate successful payment attempts for the same booking must be prevented.
- Every payment or refund record remains linked to its booking, customer, pitch, and manager.

### 9.5 Cancellation, refund, and rescheduling

- Eligible customer cancellation receives a full simulated refund.
- An eligible manager cancellation for pitch-related or exceptional circumstances receives a full simulated refund.
- A pitch suspension cancels affected confirmed bookings and gives each paid booking a full simulated refund.
- A successful refund restores the eligible amount to the customer balance, deducts it from the manager balance, records a refund transaction, marks the payment `Refunded`, and keeps booking/payment/refund states consistent.
- A successful payment may be refunded only once for the eligible amount.
- Rescheduling is allowed only for the booking owner when normal booking eligibility, the cancellation deadline, and account restrictions are satisfied.
- Each booking chain may be rescheduled only once.
- Rescheduling means cancelling and refunding the original eligible booking, then creating a new booking through normal slot selection, hold, revalidation, and simulated payment. It is not an in-place time edit.

### 9.6 Pitch status and visibility

- A pitch is `Active`, manager-`Deactivated`, temporarily `Suspended`, or permanently `Suspended` according to the applicable workflow.
- Manager deactivation blocks new bookings but preserves existing confirmed bookings; an authorized manager may reactivate it.
- Suspension blocks new bookings, invalidates active holds, and cancels/refunds affected confirmed bookings.
- A temporarily suspended pitch may be restored by Admin. Previously cancelled bookings are not restored.
- A permanently suspended pitch cannot be restored.
- Suspended and deactivated pitches are excluded from search results. A deactivated pitch may appear with lower priority in general browsing.
- Historical bookings, favorites, and owner profiles may still show an unavailable pitch, but must display its status and disable booking actions.

### 9.7 Reviews, reports, notifications, and audit

- A customer may submit at most one review for a booking, and only after that booking becomes `Completed`.
- Reports must be recorded and reviewed by an administrator before an enforcement decision is applied.
- Enforcement may include a warning, restriction, user suspension, manager suspension, or pitch suspension when justified.
- Important actions should create an auditable activity representation for S34 when the shared contract is available.
- Product notifications are in-app only; email and SMS infrastructure are outside the current scope.

### 9.8 Frontend implementation meaning

Milestone 2 may demonstrate these states with approved mock data and local UI behavior. It must not invent a backend, claim persistence that does not exist, or absorb another owner's workflow. When a transition belongs to another screen, represent the correct current state and use the approved integration contract or leave the external control inert.

### 9.9 Complete Business Rule index

This index preserves all 60 Business Rules from the Milestone 1 document in concise implementation language. The earlier subsections explain the combined lifecycles; this index prevents an individual rule from being overlooked. The official merged requirements remain authoritative if a wording conflict appears.

#### Identity, roles, and account status

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-1 | Account Required for Booking | Only registered users may book; guests may browse but cannot create bookings. |
| BR-2 | Suspended User Historical Access | A suspended user retains access to their booking history/details, payment/refund history, and related notifications; historical records remain unchanged. |
| BR-3 | Suspended User Cancellation | A suspended user may cancel an otherwise eligible existing booking and receive the applicable simulated refund, but cannot reschedule it. |
| BR-4 | User Suspension Restoration | Admin may restore an eligible temporarily suspended user; normal privileges may resume without changing historical booking or financial records. |
| BR-5 | Manager Account Suspension | A suspended manager loses management access and associated pitches stop new bookings; existing confirmed bookings remain during review unless Admin determines they cannot be fulfilled. |
| BR-6 | Suspended Manager Financial Protection | Manager suspension does not erase, reset, or automatically refund the manager balance, revenue, or historical financial records. |
| BR-7 | User Account Suspension | A suspended user cannot create or reschedule bookings or create other new commitments; existing confirmed bookings remain unless separately cancelled under policy. |
| BR-8 | Affected Booking Handling | If a booking linked to a suspended manager cannot be fulfilled, Admin cancels only that affected booking and grants a full simulated refund. |
| BR-9 | Manager Suspension Restoration | Admin may restore an eligible manager; management access and new bookings may resume while preserved booking and financial records remain unchanged. |
| BR-10 | Account-Based Messaging | Only authenticated users may send messages. |

#### Booking eligibility and user policy

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-11 | Future Booking Only | A time slot in the past cannot be booked. |
| BR-12 | Cancellation Deadline | Customer cancellation must occur at least 2 hours before the scheduled start; an eligible customer cancellation receives a full simulated refund. |
| BR-13 | Booking Ownership | Customers may cancel or reschedule only their own bookings. |
| BR-14 | Advance Booking Limit | Customers may book only available slots within the next 7 days. |
| BR-15 | Booking Rescheduling | Rescheduling requires an account permitted to book and is implemented by cancelling the original booking and creating a new booking; suspended users cannot reschedule. |
| BR-16 | Rescheduling Limit | A booking chain may be rescheduled only once, and the replacement booking inherits that used limit. |
| BR-17 | Completed Booking Restriction | A completed booking cannot be cancelled or rescheduled and is not eligible for a cancellation-based refund. |

#### Booking state, availability, and consistency

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-18 | No Double Booking | One slot cannot have multiple active holds or confirmed bookings; competing attempts are rejected until the hold expires or booking is cancelled. |
| BR-19 | Booking Availability | A booking proceeds only for a currently available slot with no active hold or confirmed booking, and availability is revalidated before confirmation. |
| BR-20 | Booking Status Management | A booking has one state: `Pending`, `Confirmed`, `Completed`, or `Cancelled`; payment confirms it, hold expiry cancels it, and cancellation is terminal. |
| BR-21 | Existing Booking Protection | Confirmed bookings remain valid unless cancelled by an authorized customer, manager, or administrator under the applicable policy. |
| BR-22 | Booking Completion | A confirmed, non-cancelled booking becomes `Completed` after its scheduled slot ends. |
| BR-23 | Booking Revalidation | Before confirmation, revalidate pitch, slot, availability, price, operational status, and terms; changed but valid terms require acceptance, while invalid terms stop the flow and release the hold. |
| BR-24 | Booking Data Preservation | Confirmation freezes the relevant pitch, date, slot, price, and terms in the booking history even if the pitch listing later changes. |
| BR-25 | Booking Cancellation Consistency | A booking can be cancelled only once; revalidate its current status and reject duplicate or ineligible cancellation without another refund. |
| BR-26 | Temporary Booking Hold | Proceeding from slot selection temporarily reserves the slot; it blocks competitors and expires automatically if booking is not completed in time. |
| BR-27 | Booking Hold Expiration | An expired pending hold cancels the booking, releases the slot, and causes later payment attempts to be rejected. |
| BR-28 | Booked Service Preservation | Services, facilities, and booking options included at confirmation remain part of the historical booking even if the listing later changes. |

#### Payment, balance, and financial transactions

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-29 | Simulated Account Balance | Every registered customer and pitch manager has a simulated balance that does not represent real money. |
| BR-30 | Payment Balance Update | A successful simulated payment deducts the booking amount from the customer balance and records a payment transaction. |
| BR-31 | Sufficient Simulated Balance | Payment succeeds only when the customer's simulated balance covers the full booking amount. |
| BR-32 | Initial Simulated Balance | A new registered customer receives a configurable initial simulated balance for testing and demonstration. |
| BR-33 | Revenue Ownership | A manager sees revenue and transactions only for pitches that manager owns or manages. |
| BR-34 | Manager Revenue Update | A successful booking payment increases the associated manager balance and contributes to that manager's revenue records. |
| BR-35 | Payment Before Confirmation | A booking becomes confirmed only after successful simulated payment while its hold is still valid. |
| BR-36 | Payment Record Integrity | Each completed simulated payment is linked to exactly one booking and recorded as its transaction. |
| BR-37 | Financial Transaction Integrity | Every simulated payment/refund transaction links to the relevant booking, customer, pitch, and manager. |
| BR-38 | No Real Financial Transactions | Balances, payments, refunds, and transfers are simulations; no external gateway or real money is used. |
| BR-39 | Payment Uniqueness | One booking cannot receive multiple successful payments; later attempts after success are blocked. |
| BR-40 | Atomic Payment Balance Validation | Validate the current balance and deduct it as one logical operation; insufficient balance rejects payment and leaves the booking unconfirmed. |
| BR-41 | Payment Failure Handling | A failed attempt during an active hold leaves the booking pending and permits retry; it does not deduct balance or confirm the booking. |
| BR-42 | Payment Status Management | A payment has one state: `Pending`, `Paid`, `Refunded`, or `Cancelled`; hold expiry cancels pending payment, eligible refund changes paid to refunded, and refunded/cancelled are terminal. |

#### Cancellation and refund

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-43 | Manager Cancellation Policy | A manager may cancel bookings only for their managed pitches and only for permitted exceptional or pitch-related reasons. |
| BR-44 | Manager Cancellation Refund | An eligible manager-initiated cancellation grants a full simulated refund. |
| BR-45 | Refund for Suspended Pitches | Every paid booking cancelled because of pitch suspension receives a full simulated refund with consistent customer balance, manager balance, payment status, and transaction records. |
| BR-46 | Administrator Refund Authority | Admin may review and process eligible simulated refunds, updating the customer balance and related manager financial records. |
| BR-47 | Refund Balance Adjustment | A successful refund increases the customer balance, decreases the manager balance/revenue, marks the payment refunded, and records a refund transaction. |
| BR-48 | Refund Uniqueness | A successful payment may be refunded only once for its eligible amount; later refund attempts are rejected. |
| BR-49 | Booking and Financial Status Consistency | Booking, payment, and refund records must remain consistent and update together as one logical operation. |
| BR-50 | Cancellation and Refund Consistency | For a paid cancellation requiring refund, set booking to cancelled and payment to refunded only after refund succeeds, using the eligible successful payment amount. |

#### Pitch management and operational status

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-51 | Pitch Management Access | A manager may edit or manage only pitches they are authorized to manage. |
| BR-52 | Suspended Pitch Restrictions | A suspended pitch accepts no new booking; active holds are invalidated and confirmed bookings are cancelled with full simulated refunds. |
| BR-53 | Suspended and Deactivated Pitch Visibility | Suspended/deactivated pitches are excluded from search; deactivated pitches may appear lower in general browsing, and permitted historical/favorite/owner views must show unavailable status and disable booking. |
| BR-54 | Pitch Suspension Restoration | Only Admin may restore an eligible temporarily suspended pitch; restoration does not restore cancelled/refunded bookings. |
| BR-55 | Permanent Pitch Suspension | Admin may permanently suspend a pitch for a sufficiently serious confirmed violation; it cannot be restored or accept bookings. |
| BR-56 | Pitch Deactivation | An authorized manager may deactivate/reactivate a pitch; deactivation blocks new bookings but preserves existing confirmed bookings and the manager's fulfilment responsibility. |

#### Reviews, reports, and enforcement

| Rule | Name | Mandatory behavior |
|---|---|---|
| BR-57 | Verified Reviews Only | A customer may rate/review only a pitch they successfully booked and completed. |
| BR-58 | Administrative Authority | Admin may suspend users, managers, or pitches when a confirmed violation or reviewed report justifies enforcement under policy. |
| BR-59 | Report Handling | User/manager reports must be recorded and reviewed by Admin before an enforcement action is applied. |
| BR-60 | Cancellation Abuse Prevention | Repeated cancellation/refund behavior may be flagged for Admin review, and abusive accounts may be restricted. |

## 10. Shared components and ownership boundaries

### 10.1 Shared interface components

The project expects consistent versions of:

1. Header/navbar
2. Footer
3. Role-specific sidebar
4. Buttons
5. Inputs and selects
6. Search bar
7. Filter and sort controls
8. Pitch cards
9. Data tables
10. Status badges
11. Date picker
12. Time-slot selector
13. Modal/dialog
14. Toast/alert for real product feedback
15. Empty state
16. Pagination
17. Notification item
18. Statistic/KPI card

Pages should reuse an approved component instead of creating a visually incompatible alternative.

### 10.2 Ownership boundaries by domain

Section 8 defines the approved screen owners. The corresponding responsibility boundaries are:

- Platform: shared layout, authentication, accounts, messages, notifications, settings, and error screens.
- Access control: protected-page role checks and redirects are centralized in `js/services/access-control.js`; page scripts call this service and do not recreate role logic.
- Pitch catalog: Home, Search, Pitch Detail, favorites, pitch management, availability, and moderation.
- Booking lifecycle: slot selection, temporary hold, confirmation, result, history, details, cancellation, and rescheduling.
- Simulated finance: balances, payments, refunds, transaction history, and revenue.
- Administration: users, managers, reports, content, logs, enforcement, and administrator settings.

When one screen depends on another domain, agree on the screen contract. Do not copy or reimplement the other domain's logic.

## 11. HTML implementation convention

Use this structure as the baseline, then adapt only the screen-specific main content:

```html
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tên màn hình — Pitch Point</title>
  <link rel="stylesheet" href="css/reset.css">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/screen-name.css">
</head>
<body>
  <site-header></site-header>

  <main class="container screen-name-page">
    <header class="page-heading">
      <h1>Tên màn hình</h1>
      <p>Mô tả ngắn mục đích của màn hình.</p>
    </header>

    <section aria-labelledby="section-title">
      <h2 id="section-title">Nội dung chính</h2>
    </section>
  </main>

  <site-footer></site-footer>
  <script type="module" src="js/pages/screen-name.js"></script>
</body>
</html>
```

Manager and administrator screens should reuse an approved shared sidebar when it exists. They must not duplicate a separate navigation implementation in every HTML file.

## 12. CSS implementation convention

Shared CSS responsibilities:

| File | May contain |
|---|---|
| `reset.css` | Browser normalization only |
| `tokens.css` | Shared design values |
| `layout.css` | Reusable page layout and breakpoints |
| `components.css` | Reusable component styling |
| `<screen-name>.css` | Layout and exceptions unique to one screen |

Every page stylesheet should be scoped beneath its root class:

```css
.booking-schedule-page .schedule-grid { }
.booking-schedule-page .slot-list { }
```

Do not redefine global components in page CSS. If a reusable change is genuinely required, request a shared-file update from the coordinator.

The common responsive checks are approximately 390 px, 768 px, 1366 px, and 1920 px.

## 13. JavaScript implementation convention

The page module should:

- query only elements belonging to its screen;
- implement only the assigned screen's interactions;
- render repeated records from approved data where appropriate;
- provide loading, empty, error, and disabled states when relevant;
- keep query-parameter parsing and validation local;
- import shared utilities rather than another page's script;
- fail safely when optional data is unavailable.

It should not:

- implement an unfinished neighboring screen;
- define a new cross-project storage convention;
- duplicate authentication, booking, or payment state logic;
- display development placeholder alerts;
- write untrusted values through `innerHTML`;
- retain unused AI-generated helpers or explanatory comments.

## 14. Linking screens consistently

### 14.1 Static-page navigation

During Milestone 2, screens are static HTML files rather than backend routes.

Once both source and target screens are approved:

```html
<a href="search.html">Tìm sân</a>
<a href="pitch-detail.html?pitchId=P001">Xem chi tiết</a>
```

Use a button for an action on the current page:

```html
<button type="submit">Xác nhận</button>
```

If the target is not ready, keep the control inert and silent. The coordinator activates links during integration.

### 14.2 Data between screens

Use a small, documented query contract:

```text
Home -> Search: q, date, time, type
Search -> Pitch Detail: pitchId
Pitch Detail -> Booking Schedule: pitchId
Booking Schedule -> Confirmation: pitchId, slotId
```

These are examples only. The final parameter names must be recorded in the Screen Map.

Pass stable IDs rather than serialized objects. Each target page validates its own parameters and retrieves or mocks the required record through an approved data module.

### 14.3 Integration rule

When a member needs another member's screen:

1. Check the Screen Map.
2. Confirm the target filename and parameter contract.
3. Build only the source screen's side of the contract.
4. Leave unfinished destinations inert.
5. Report the dependency to the coordinator.
6. Let the coordinator perform the final cross-screen integration after both screens are approved.

## 15. Manual team workflow

The coordinator distributes the common foundation. Each member then:

1. Reads `AGENTS.md`, this context, and the Screen Map.
2. Confirms the assigned Screen ID and three production files.
3. Copies the canonical HTML/CSS/JavaScript template set.
4. Renames the copies to the Screen Map filenames.
5. Implements only the assigned screen.
6. Tests the screen locally with Live Server.
7. Checks mobile, tablet, laptop, and wide-screen layouts.
8. Reports changed files, links, parameters, tests, and unfinished dependencies.
9. Returns the completed files to the coordinator for manual integration.

Members do not edit another member's screen or a protected shared file. When a shared change is needed, they send a proposal to the coordinator instead.

## 16. Review checklist for each screen

### Structure

- Correct filename and three-file pairing
- Correct doctype, language, charset, and viewport
- Descriptive title and exactly one `h1`
- Shared header/footer and approved role navigation
- Semantic content matching the screen purpose
- Correct page stylesheet and module paths

### Forms and interaction

- Every field has a label
- Correct input, select, link, and button semantics
- Clear validation/help locations
- Disabled and unavailable states are understandable
- Dynamic lists provide container, reusable template, and empty state where needed

### CSS

- Page rules are scoped beneath the page root class
- No global component override
- Shared tokens are reused
- No inline styles or unnecessary `!important`
- No page-level horizontal overflow

### JavaScript

- Page responsibility only
- No import of another page's script
- No arbitrary storage keys or invented API
- No unused code, dead comments, placeholder alerts, or debug logs
- User-provided text is inserted safely

### Accessibility and responsiveness

- Logical heading order
- Meaningful alternative text
- Keyboard-accessible controls and visible focus
- Appropriate ARIA state for disclosures
- Color is not the only status indicator
- Layout checked near 390, 768, 1366, and 1920 px

### Project consistency

- No old shopping-template terminology
- No duplicate header/footer
- No duplicate screen or alternative filename
- Links and query parameters match the Screen Map
- Simulated payment is not presented as a real transaction
- Unfinished external screens remain inert and silent

## 17. Current foundation status

The current shared understanding is:

- Home's three files form the reference design.
- Home is presentation-focused and must not implement neighboring screen workflows.
- Production HTML remains flat under `frontend/`.
- New production filenames use kebab-case.
- Members start from the canonical `screen-template` trio.
- Shared files remain coordinator-controlled.
- Section 8 now defines all 40 required screens, owners, priorities, routes, and production file trios.
- Cross-screen links are activated only after source and target screens are ready.
- Visual polish follows required screen coverage and semantic structure.

## 18. Decisions not yet finalized

Do not pretend these choices are settled unless a later document approves them:

- final route and query-parameter contracts;
- final branding/logo artwork;
- final typography and icon set;
- complete shared color and spacing tokens;
- final manager/admin sidebar implementation;
- real backend/API design;
- persistent authentication and storage contract;
- database schema;
- production payment integration;
- which optional P1 behaviors are implemented before the deadline.

When a task depends on one of these decisions, explain the dependency and ask the coordinator instead of inventing a project-wide convention.

## 19. Context maintenance

The coordinator updates this document when the team:

- approves a naming or architecture decision;
- changes a Screen Map contract or implementation status;
- changes screen ownership;
- changes a shared component contract;
- approves a new data or query contract;
- changes the role of a template file.

Record only decisions that future members or AI sessions need. Do not turn this document into a line-by-line development log.
