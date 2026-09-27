# Pitch Point — Screen Map and Integration Contracts

> Purpose: define the authoritative screen registry, cross-screen navigation, parameter names, shared-state ownership, and integration workflow for the Pitch Point frontend.

## 1. Authority and reading order

This file extends the official Milestone 1 requirements and the ownership table in `docs/PITCH_POINT_CONTEXT.md`. It does not replace the Business Rules.

Before implementing or integrating a screen, read:

1. `AGENTS.md`
2. `docs/PITCH_POINT_CONTEXT.md`
3. This `docs/SCREEN_MAP.md`
4. The assigned GitHub Sub-issue
5. The assigned screen files and approved shared-service interfaces

If documents conflict, use this order:

1. Official merged Milestone 1 requirements
2. Approved screen ownership and filenames in `PITCH_POINT_CONTEXT.md`
3. This file's integration contracts
4. `AGENTS.md`
5. Page-specific implementation

The project coordinator resolves any remaining conflict. Agents must not invent a replacement contract.

## 2. Milestone 2 implementation model

Milestone 2 is a functional frontend prototype built with HTML, CSS, vanilla JavaScript, and simulated data.

- Screens are separate static HTML files under `frontend/`.
- Live Server uses the static filenames in this document.
- Shared services provide cross-screen state and business operations.
- URL query parameters carry stable IDs or small search criteria, not complete objects.
- Core P0 flows must work across screens with simulated data.
- No real payment gateway, bank, e-wallet, email, SMS, or backend is implemented.
- A screen may be merged before its dependencies are integrated, provided unfinished external controls remain inert and the dependency is reported.

## 3. Access codes and delivery statuses

### Access codes

| Code | Meaning |
|---|---|
| `P` | Public |
| `Auth` | Authenticated registered customer |
| `M` | Authenticated pitch manager |
| `A` | Authenticated administrator |

Canonical stored role values are `customer`, `manager`, and `admin`. Guest means that no authenticated session exists; `guest` must not be stored as an account role.

### Screen delivery statuses

```text
Planned
In progress
Ready for review
Approved
Integrated
```

### Integration contract statuses

```text
Planned
Source ready
Target ready
Ready for integration
Integrated
Tested
```

`Approved` filenames and parameters must not be renamed without coordinator approval.

## 4. Team ownership

| Owner | Domain | Screen IDs |
|---|---|---|
| Nguyen Vinh Hung | Platform, Authentication & Communication | S05, S06, S15, S16, S24, S25, S30, S36, S37, S38, S39, S40 |
| Be Thanh Tien | Pitch Catalog & Pitch Operations | S01, S02, S03, S04, S13, S17, S18, S19, S20, S21, S29 |
| Pham Ba Viet | Booking Lifecycle | S07, S08, S10, S11, S12, S22 |
| Luong The Hieu | Payment & Financial | S09, S14, S23, S32 |
| Le Huy Hoang | Administration & Enforcement | S26, S27, S28, S31, S33, S34, S35 |

An owner controls their assigned page files and the domain logic stated above. Ownership of a screen does not grant permission to edit another owner's page.

## 5. Authoritative screen registry

Every non-Home screen owns this trio:

```text
frontend/<slug>.html
frontend/css/<slug>.css
frontend/js/pages/<slug>.js
```

Home is the only exception: `index.html`, `css/home.css`, and `js/pages/home.js`.

### 5.1 Public and guest screens

| ID | Screen | Official route | Static file | Access | Priority | Owner | Primary input | Primary output |
|---|---|---|---|---|---|---|---|---|
| S01 | Home Page | `/` | `index.html` | P | P0 | Be Thanh Tien | Published banner/pitch data | Search criteria to S02 |
| S02 | Search Results | `/search` | `search.html` | P | P0 | Be Thanh Tien | `q`, `location`, `date`, `time`, `pitchType`, `sort` | `pitchId` to S03 |
| S03 | Pitch Details | `/pitch/:id` | `pitch-detail.html` | P | P0 | Be Thanh Tien | `pitchId` | `ownerId` to S04; `pitchId` to S07; `managerId` to S15 |
| S04 | Pitch Owner Profile | `/owner/:id` | `pitch-owner-profile.html` | P | P1 | Be Thanh Tien | `ownerId` | `pitchId` to S03; `managerId` to S15 |
| S05 | Login | `/login` | `login.html` | P | P0 | Nguyen Vinh Hung | Credentials; optional approved `returnTo` | Authenticated session and role landing |
| S06 | Register | `/register` | `register.html` | P | P0 | Nguyen Vinh Hung | Registration form | New simulated account; navigation to S05 |

### 5.2 Registered customer screens

| ID | Screen | Official route | Static file | Access | Priority | Owner | Primary input | Primary output |
|---|---|---|---|---|---|---|---|---|
| S07 | Booking Schedule | `/user/book/:pitchId` | `booking-schedule.html` | Auth | P0 | Pham Ba Viet | `pitchId` or `rescheduleBookingId` | `bookingDraftId` to S08 |
| S08 | Booking Confirmation | `/user/booking/confirm` | `booking-confirmation.html` | Auth | P0 | Pham Ba Viet | `bookingDraftId` | Validated `bookingDraftId` to S09 |
| S09 | Mock Payment | `/user/payment` | `payment.html` | Auth | P0 | Luong The Hieu | `bookingDraftId` | Confirmed `bookingId` to S10 |
| S10 | Booking Result | `/user/booking/result` | `booking-result.html` | Auth | P0 | Pham Ba Viet | `bookingId` | `bookingId` to S12 or navigation to S11 |
| S11 | Booking History | `/user/bookings` | `booking-history.html` | Auth | P0 | Pham Ba Viet | Current customer session | `bookingId` to S12 |
| S12 | Booking Details | `/user/bookings/:id` | `booking-details.html` | Auth | P0 | Pham Ba Viet | `bookingId` | Cancellation/refund request; `rescheduleBookingId` to S07; review record |
| S13 | Favorite Pitches | `/user/favorites` | `favorite-pitches.html` | Auth | P1 | Be Thanh Tien | Current customer session | `pitchId` to S03 |
| S14 | Payment History | `/user/payments` | `payment-history.html` | Auth | P1 | Luong The Hieu | Current customer session | `bookingId` to S12 |
| S15 | Messages | `/user/messages` | `user-messages.html` | Auth | P1 | Nguyen Vinh Hung | `conversationId` or `managerId` | Message records and report request |
| S16 | Account Settings | `/user/settings` | `account-settings.html` | Auth | P0 | Nguyen Vinh Hung | Current customer session | Updated profile and account preferences |

### 5.3 Pitch manager screens

| ID | Screen | Official route | Static file | Access | Priority | Owner | Primary input | Primary output |
|---|---|---|---|---|---|---|---|---|
| S17 | Manager Dashboard | `/manager/dashboard` | `manager-dashboard.html` | M | P0 | Be Thanh Tien | Current manager session | Navigation and selected `pitchId` |
| S18 | My Pitches | `/manager/pitches` | `manager-pitches.html` | M | P0 | Be Thanh Tien | Current manager session | Selected `pitchId` to S20, S21, or S22 |
| S19 | Add Pitch | `/manager/pitches/new` | `add-pitch.html` | M | P0 | Be Thanh Tien | New-pitch form | Created `pitchId` and updated pitch store |
| S20 | Edit Pitch | `/manager/pitches/:id/edit` | `edit-pitch.html` | M | P0 | Be Thanh Tien | `pitchId` | Updated pitch/status record |
| S21 | Pitch Availability Management | `/manager/pitches/:id/availability` | `pitch-availability.html` | M | P0 | Be Thanh Tien | `pitchId` | Updated availability and slot records |
| S22 | Booking Management | `/manager/pitches/:id/bookings` | `manager-bookings.html` | M | P0 | Pham Ba Viet | `pitchId`; optional `bookingId` | Booking action; customer context to S24 |
| S23 | Revenue Dashboard | `/manager/revenue` | `manager-revenue.html` | M | P1 | Luong The Hieu | Current manager session; optional `pitchId` | `pitchId` and optional `bookingId` to S22 |
| S24 | Manager Messages | `/manager/messages` | `manager-messages.html` | M | P1 | Nguyen Vinh Hung | `conversationId` or `customerId`; optional `bookingId` | Message records and report request |
| S25 | Manager Settings | `/manager/settings` | `manager-settings.html` | M | P0 | Nguyen Vinh Hung | Current manager session | Updated manager preferences |

### 5.4 Administrator screens

| ID | Screen | Official route | Static file | Access | Priority | Owner | Primary input | Primary output |
|---|---|---|---|---|---|---|---|---|
| S26 | Admin Dashboard | `/admin/dashboard` | `admin-dashboard.html` | A | P0 | Le Huy Hoang | Current Admin session; optional `tab` | Navigation to S27-S35; selected entity ID |
| S27 | User Management | `/admin/users` | `admin-users.html` | A | P0 | Le Huy Hoang | Optional `userId` | Warning, suspension/restoration and message context |
| S28 | Pitch Manager Management | `/admin/pitch-managers` | `admin-pitch-managers.html` | A | P0 | Le Huy Hoang | Optional `managerId` | Manager enforcement and message context |
| S29 | Pitch Moderation | `/admin/pitches` | `admin-pitch-moderation.html` | A | P0 | Be Thanh Tien | Optional `pitchId` | Pitch enforcement; affected pitch context to S32 |
| S30 | Admin Messages | `/admin/messages` | `admin-messages.html` | A | P1 | Nguyen Vinh Hung | `conversationId`, `userId`, or `managerId` | Message records |
| S31 | Report Management | `/admin/reports` | `admin-reports.html` | A | P1 | Le Huy Hoang | Optional `reportId` | Target entity ID to S27, S28, S29, or S32 |
| S32 | Booking, Refund & Financial Management | `/admin/bookings` | `admin-finance.html` | A | P0 | Luong The Hieu | Optional `bookingId`, `transactionId`, or `pitchId` | Refund/financial state and audit event |
| S33 | Announcement & Banner Management | `/admin/content` | `admin-content.html` | A | P1 | Le Huy Hoang | Optional `contentId` | Published banner/announcement data |
| S34 | Activity Log | `/admin/activity-log` | `admin-activity-log.html` | A | P1 | Le Huy Hoang | Optional `activityId`, `entityType`, `entityId` | Read-only audit display |
| S35 | Admin Settings | `/admin/settings` | `admin-settings.html` | A | P0 | Le Huy Hoang | Current Admin session | Updated Admin/system preferences |

S26 must provide the teacher-required Admin dashboard tabs for `users`, `pitches`, and `reports`. These tabs may show summaries and links to the full S27, S29, and S31 management screens. Full management logic remains in the assigned screens and services.

### 5.5 Shared and system screens

| ID | Screen | Official route | Static file | Access | Priority | Owner | Primary input | Primary output |
|---|---|---|---|---|---|---|---|---|
| S36 | Notifications | `/notifications` | `notifications.html` | Auth | P0 | Nguyen Vinh Hung | Current session; optional `notificationId` | Role-specific target contract |
| S37 | Settings | `/settings` | `settings.html` | P | P0 | Nguyen Vinh Hung | Current interface preferences | Updated appearance/interface preferences |
| S38 | Not Found | `/404` | `404.html` | P | P0 | Nguyen Vinh Hung | Missing route context only | Safe navigation to Home |
| S39 | Access Denied | `/403` | `403.html` | P | P0 | Nguyen Vinh Hung | Access failure context only | Safe navigation to role landing or Login |
| S40 | Server Error | `/500` | `500.html` | P | P0 | Nguyen Vinh Hung | Generic failure context only | Retry or safe navigation to Home |

## 6. Canonical parameter dictionary

Use these exact names. Do not create aliases such as `id`, `fieldId`, `pitch_id`, or `bookingID`.

| Parameter | Meaning | Format/example |
|---|---|---|
| `q` | Search text | `q=Cau+Giay` |
| `location` | Search location | `location=Ha+Noi` |
| `date` | Selected date | `date=2026-09-30` |
| `time` | Selected start time | `time=18%3A00` |
| `pitchType` | Pitch category/type | `pitchType=7-a-side` |
| `sort` | Approved sort option | `sort=rating-desc` |
| `pitchId` | Stable pitch identifier | `pitchId=P001` |
| `ownerId` | Pitch owner profile identifier | `ownerId=O001` |
| `userId` | Registered customer identifier | `userId=U001` |
| `customerId` | Customer context for manager communication | `customerId=U001` |
| `managerId` | Pitch manager identifier | `managerId=M001` |
| `slotId` | Availability slot identifier; normally stored inside a booking draft | `slotId=SL001` |
| `bookingDraftId` | Pending booking/hold identifier | `bookingDraftId=BD001` |
| `bookingId` | Confirmed or historical booking identifier | `bookingId=B001` |
| `rescheduleBookingId` | Original booking being rescheduled | `rescheduleBookingId=B001` |
| `transactionId` | Payment/refund transaction identifier | `transactionId=T001` |
| `conversationId` | Messaging conversation identifier | `conversationId=C001` |
| `reportId` | Report identifier | `reportId=R001` |
| `contentId` | Banner/announcement identifier | `contentId=CT001` |
| `notificationId` | Notification identifier | `notificationId=N001` |
| `activityId` | Audit activity identifier | `activityId=A001` |
| `entityType` | Approved audit/report target type | `user`, `manager`, `pitch`, `booking`, `transaction`, `report`, or `content` |
| `entityId` | Stable ID paired with `entityType` | `entityId=P001` |
| `tab` | Approved dashboard tab | `users`, `pitches`, or `reports` |
| `returnTo` | Optional approved local destination after Login | A relative project filename only; never an external URL |

Rules:

- Pass stable IDs rather than serialized objects.
- Encode user-entered values with `URLSearchParams` or `encodeURIComponent`.
- Every target validates missing, malformed, unknown, unauthorized, expired, and unavailable IDs.
- A target must not trust price, balance, role, status, or ownership values supplied in the URL.
- Retrieve authoritative mock records through an approved service.
- Do not place passwords, message bodies, payment details, full objects, or sensitive profile data in URLs.
- An optional parameter must have a safe default state.

## 7. Shared state and service ownership

### 7.1 One approved frontend store

For the functional prototype, all cross-screen state must use one approved storage contract managed by:

```text
frontend/js/services/storage-service.js
```

Reserved storage key:

```text
pitch-point:state:v1
```

Only `storage-service.js` may directly read or write the reserved key. Page scripts and other services must use its exported functions. Do not create screen-specific `localStorage` or `sessionStorage` keys.

The shared state may contain these top-level collections:

```text
version
session
users
pitches
availability
favorites
bookingDrafts
bookings
transactions
reviews
conversations
messages
reports
notifications
contents
activities
settings
```

This is simulated frontend persistence, not a backend or security boundary.

Initial demo users are seeded from:

```text
frontend/mock/users.json
```

The seed contains one approved Customer, Manager, and Admin demo account for Milestone 2 testing. Registration adds only Customer accounts. Guest is represented by `session === null`.

### 7.2 Service ownership

Shared service files are protected. The listed owner may implement or change the service only through an approved issue/PR. Other members import the public functions but do not change the contract independently.

| Service | Canonical file | Owner | Main responsibility |
|---|---|---|---|
| Storage | `js/services/storage-service.js` | Project coordinator | Single state key, seed/reset/load/save, schema version |
| Authentication | `js/services/auth-service.js` | Nguyen Vinh Hung | Register, login, logout, current session and current-user lookup |
| Access control | `js/services/access-control.js` | Nguyen Vinh Hung | Role constants, `requireAuth`, `requireRole`, protected-page redirects |
| Communication | `js/services/communication-service.js` | Nguyen Vinh Hung | Conversations, messages, role-specific recipients |
| Notifications | `js/services/notification-service.js` | Nguyen Vinh Hung | In-app notifications and target metadata |
| Interface settings | `js/services/settings-service.js` | Nguyen Vinh Hung | Shared appearance/interface preferences |
| Pitch catalog | `js/services/pitch-service.js` | Be Thanh Tien | Search, details, owner data, manager pitch CRUD, pitch status |
| Availability | `js/services/availability-service.js` | Be Thanh Tien | Operating hours, slots, availability updates |
| Favorites | `js/services/favorite-service.js` | Be Thanh Tien | Customer-pitch favorite relations |
| Booking | `js/services/booking-service.js` | Pham Ba Viet | Holds, drafts, revalidation, status, cancellation, rescheduling, completion |
| Reviews | `js/services/review-service.js` | Pham Ba Viet | Eligibility, one review per completed booking, review records |
| Finance | `js/services/finance-service.js` | Luong The Hieu | Simulated balances, payments, transactions, refunds, revenue |
| Reports and enforcement | `js/services/admin-service.js` | Le Huy Hoang | Reports, warnings, account enforcement, Admin decisions |
| Content and audit | `js/services/content-audit-service.js` | Le Huy Hoang | Banners, announcements, activity records, Admin settings integration |

### 7.3 Role and authorization contract

Authentication establishes identity. Authorization determines whether that identity may enter a screen or act on a record.

| Account state | Screen behavior |
|---|---|
| No session | Treat as Guest; allow `P` screens; redirect protected screens to S05 Login with an approved local `returnTo` |
| Active `customer` | Allow `P` and `Auth` customer screens; reject `M` and `A` screens through S39 |
| Active `manager` | Allow `P` and `M` screens; reject customer-only `Auth` and `A` screens unless a contract explicitly says otherwise |
| Active `admin` | Allow `P` and `A` screens; do not assume Admin may perform customer or manager workflows unless explicitly required |
| Suspended/restricted account | Apply the applicable Business Rules and redirect forbidden screen access to S39 |

Mandatory rules:

- Login derives role from the matched user record. Forms and URLs must never choose or override role.
- The three demo-account buttons may fill approved credentials, but they do not directly assign a role.
- Registration creates only `customer` accounts.
- `auth-service.js` owns identity/session operations; `access-control.js` owns page-level role guards.
- Every protected page calls the approved guard before rendering protected records or binding privileged actions.
- Role-aware header/sidebar visibility is presentation only and never replaces a page guard.
- Domain services enforce record-level authorization and ownership in addition to the page guard.
- Customer records are restricted by `customerId`; manager-owned pitch operations are restricted by `managerId`/`ownerId`; administrator actions require the Admin role and applicable Business Rules.
- A query parameter, DOM attribute, or page-specific storage value is never authoritative for identity, role, account status, balance, or ownership.
- These frontend checks demonstrate the Milestone 2 workflow only. A production backend must independently enforce authentication and authorization.

### 7.4 Service interaction boundaries

- Page scripts may import services; page scripts must never import another page script.
- A service owns business state, while a page owns its DOM and presentation.
- Cross-domain operations call both approved services in the required order.
- Payment confirmation requires Booking and Finance coordination.
- Cancellation/refund requires Booking and Finance coordination.
- Pitch suspension requires Pitch, Booking, Finance, Notification, and Audit coordination.
- Manager suspension requires Authentication, Pitch, Booking, Finance, Notification, and Audit coordination.
- Contract changes require coordinator approval and updates to this file before dependent pages change.

## 8. Direct navigation and parameter contracts

All contracts below are canonical. `No parameter` means ordinary navigation. The source owner creates the link and output. The target owner parses and validates the input.

### 8.1 Public discovery and authentication

| Contract | Source | Action | Target | Parameter(s) | Service(s) | Integration status |
|---|---|---|---|---|---|---|
| IC-01 | S01 Home | Submit search | S02 Search Results | Optional `q`, `location`, `date`, `time`, `pitchType`, `sort` | Pitch | Planned |
| IC-02 | S02 Search Results | Select pitch | S03 Pitch Details | Required `pitchId` | Pitch | Planned |
| IC-03 | S03 Pitch Details | View owner | S04 Pitch Owner Profile | Required `ownerId` | Pitch | Planned |
| IC-04 | S03 Pitch Details | Start booking | S07 Booking Schedule | Required `pitchId` | Pitch, Availability, Booking | Planned |
| IC-05 | S04 Pitch Owner Profile | Select pitch | S03 Pitch Details | Required `pitchId` | Pitch | Planned |
| IC-06 | S06 Register | Registration succeeds | S05 Login | No parameter | Authentication | Planned |
| IC-07 | S05 Login | Login succeeds | Role landing | No URL parameter; Authentication determines S01, S17, or S26 | Authentication | Planned |
| IC-08 | Protected screen | Unauthenticated access | S05 Login | Optional approved local `returnTo` | Authentication | Planned |
| IC-09 | Protected screen | Wrong role or suspended restriction | S39 Access Denied | No business data in URL | Authentication | Planned |

### 8.2 Booking, payment, history, and review

| Contract | Source | Action | Target | Parameter(s) | Service(s) | Integration status |
|---|---|---|---|---|---|---|
| IC-10 | S07 Booking Schedule | Select eligible slot and continue | S08 Booking Confirmation | Required `bookingDraftId` | Availability, Booking | Planned |
| IC-11 | S08 Booking Confirmation | Accept revalidated terms and pay | S09 Mock Payment | Required `bookingDraftId` | Booking, Finance | Planned |
| IC-12 | S09 Mock Payment | Payment succeeds | S10 Booking Result | Required `bookingId` | Booking, Finance, Notifications | Planned |
| IC-13 | S10 Booking Result | View booking details | S12 Booking Details | Required `bookingId` | Booking, Finance | Planned |
| IC-14 | S10 Booking Result | View all bookings | S11 Booking History | No parameter | Booking | Planned |
| IC-15 | S11 Booking History | Select booking | S12 Booking Details | Required `bookingId` | Booking, Finance | Planned |
| IC-16 | S12 Booking Details | Reschedule eligible booking | S07 Booking Schedule | Required `rescheduleBookingId` | Booking, Availability, Finance | Planned |
| IC-17 | S14 Payment History | View related booking | S12 Booking Details | Required `bookingId` | Finance, Booking | Planned |

S12 submits a review through `review-service.js` after a booking is `Completed`. S03 reads approved reviews through the same service. No direct S12-to-S03 navigation is required for review synchronization.

### 8.3 Favorites and communication

| Contract | Source | Action | Target | Parameter(s) | Service(s) | Integration status |
|---|---|---|---|---|---|---|
| IC-18 | S13 Favorite Pitches | Select favorite pitch | S03 Pitch Details | Required `pitchId` | Favorites, Pitch | Planned |
| IC-19 | S03 Pitch Details | Contact pitch manager | S15 Messages | Required `managerId` | Authentication, Communication | Planned |
| IC-20 | S04 Pitch Owner Profile | Contact pitch manager | S15 Messages | Required `managerId` | Authentication, Communication | Planned |
| IC-21 | S15 Messages | Open conversation | S15 Messages | Optional `conversationId` | Communication | Planned |
| IC-22 | S24 Manager Messages | Open conversation | S24 Manager Messages | Optional `conversationId` | Communication | Planned |
| IC-23 | S30 Admin Messages | Open conversation | S30 Admin Messages | Optional `conversationId` | Communication | Planned |

Conversation creation uses recipient IDs through `communication-service.js`; message content is never placed in the URL.

### 8.4 Pitch manager workflow

| Contract | Source | Action | Target | Parameter(s) | Service(s) | Integration status |
|---|---|---|---|---|---|---|
| IC-24 | S17 Manager Dashboard | Manage pitches | S18 My Pitches | No parameter | Pitch | Planned |
| IC-25 | S17 Manager Dashboard | View pitch bookings | S22 Booking Management | Required selected `pitchId` | Pitch, Booking | Planned |
| IC-26 | S17 Manager Dashboard | View revenue | S23 Revenue Dashboard | No parameter | Finance | Planned |
| IC-27 | S17 Manager Dashboard | Open messages | S24 Manager Messages | No parameter | Communication | Planned |
| IC-28 | S17 Manager Dashboard | Open settings | S25 Manager Settings | No parameter | Authentication, Settings | Planned |
| IC-29 | S18 My Pitches | Add pitch | S19 Add Pitch | No parameter | Pitch | Planned |
| IC-30 | S18 My Pitches | Edit pitch | S20 Edit Pitch | Required `pitchId` | Pitch | Planned |
| IC-31 | S18 My Pitches | Manage availability | S21 Pitch Availability | Required `pitchId` | Pitch, Availability | Planned |
| IC-32 | S18 My Pitches | Manage bookings | S22 Booking Management | Required `pitchId` | Pitch, Booking | Planned |
| IC-33 | S22 Booking Management | Contact customer | S24 Manager Messages | Required `customerId`; optional `bookingId` | Booking, Communication | Planned |
| IC-34 | S23 Revenue Dashboard | Inspect related booking | S22 Booking Management | Required `pitchId`; optional `bookingId` | Finance, Booking | Planned |

### 8.5 Administrator workflow

| Contract | Source | Action | Target | Parameter(s) | Service(s) | Integration status |
|---|---|---|---|---|---|---|
| IC-35 | S26 Admin Dashboard | Open user management | S27 User Management | Optional selected `userId` | Admin, Authentication | Planned |
| IC-36 | S26 Admin Dashboard | Open manager management | S28 Pitch Manager Management | Optional selected `managerId` | Admin, Authentication | Planned |
| IC-37 | S26 Admin Dashboard | Open pitch moderation | S29 Pitch Moderation | Optional selected `pitchId` | Admin, Pitch | Planned |
| IC-38 | S26 Admin Dashboard | Open reports | S31 Report Management | Optional selected `reportId` | Admin | Planned |
| IC-39 | S26 Admin Dashboard | Open booking/finance | S32 Admin Finance | Optional `bookingId`, `transactionId`, or `pitchId` | Booking, Finance, Admin | Planned |
| IC-40 | S26 Admin Dashboard | Open content management | S33 Admin Content | Optional `contentId` | Content/Audit | Planned |
| IC-41 | S26 Admin Dashboard | Open activity log | S34 Activity Log | Optional `activityId` | Content/Audit | Planned |
| IC-42 | S26 Admin Dashboard | Open Admin settings | S35 Admin Settings | No parameter | Admin, Settings | Planned |
| IC-43 | S31 Report Management | Inspect reported user | S27 User Management | Required `userId` | Admin, Authentication | Planned |
| IC-44 | S31 Report Management | Inspect reported manager | S28 Pitch Manager Management | Required `managerId` | Admin, Authentication | Planned |
| IC-45 | S31 Report Management | Inspect reported pitch | S29 Pitch Moderation | Required `pitchId` | Admin, Pitch | Planned |
| IC-46 | S31 Report Management | Inspect reported booking | S32 Admin Finance | Required `bookingId` | Admin, Booking, Finance | Planned |
| IC-47 | S27 User Management | Contact user | S30 Admin Messages | Required `userId` | Admin, Communication | Planned |
| IC-48 | S28 Pitch Manager Management | Contact manager | S30 Admin Messages | Required `managerId` | Admin, Communication | Planned |
| IC-49 | S29 Pitch Moderation | Review affected bookings/refunds | S32 Admin Finance | Required `pitchId` | Pitch, Booking, Finance, Admin | Planned |

### 8.6 Notification targets

Notification records contain a `targetType` and the required stable ID. S36 resolves the destination according to the authenticated role.

| Contract | Notification type | Role | Target | Parameter(s) | Integration status |
|---|---|---|---|---|---|
| IC-50 | Customer booking update | Auth | S12 Booking Details | Required `bookingId` | Planned |
| IC-51 | Customer message | Auth | S15 Messages | Required `conversationId` | Planned |
| IC-52 | Manager booking update | M | S22 Booking Management | Required `pitchId`; optional `bookingId` | Planned |
| IC-53 | Manager message | M | S24 Manager Messages | Required `conversationId` | Planned |
| IC-54 | Admin report update | A | S31 Report Management | Required `reportId` | Planned |
| IC-55 | Admin message | A | S30 Admin Messages | Required `conversationId` | Planned |
| IC-56 | Admin enforcement/financial event | A | S34 Activity Log or S32 Admin Finance | Required target-specific stable ID | Planned |

## 9. Shared data-effect contracts

These contracts synchronize screens that share state even when users do not navigate directly between them.

| Contract | Trigger owner/screen | Shared effect | Consumers | Service owner |
|---|---|---|---|---|
| DC-01 | S05/S06 Authentication | Session and role/account status change | Header, protected S07-S36, S39 | Nguyen Vinh Hung |
| DC-02 | S19/S20/S21 Pitch Operations | Pitch details, status, operating hours, and availability change | S01-S04, S07, S13, S17-S23, S29 | Be Thanh Tien |
| DC-03 | S03/S13 Favorites | Favorite relation is added or removed | S03 and S13 | Be Thanh Tien |
| DC-04 | S07 Booking Schedule | Ten-minute hold and pending draft are created | S08 and S09; availability consumers | Pham Ba Viet |
| DC-05 | S09 Mock Payment | Customer balance decreases, manager balance increases, transaction is recorded, booking becomes confirmed | S10-S12, S14, S22, S23, S26, S32, S36 | Luong The Hieu with Pham Ba Viet |
| DC-06 | S12/S22/S32 Cancellation | Eligible booking cancellation and refund update booking, slot, payment, balances, transactions, and notifications together | S07, S11, S12, S14, S22, S23, S26, S32, S36 | Pham Ba Viet with Luong The Hieu |
| DC-07 | S12 Review submission | One verified review is linked to a completed booking and pitch | S03 and S12 | Pham Ba Viet |
| DC-08 | S29 Pitch suspension | Pitch blocks bookings, holds release, affected confirmed bookings cancel/refund, notifications/audit are recorded | Discovery, booking, manager, finance, Admin, notifications | Be Thanh Tien with Pham Ba Viet, Luong The Hieu, Le Huy Hoang |
| DC-09 | S28 Manager suspension | Manager access is restricted, associated pitches stop new bookings, existing bookings are reviewed, financial history is preserved | S05, S17-S25, S26, S29, S32, S34, S36 | Le Huy Hoang with Nguyen Vinh Hung, Be Thanh Tien, Pham Ba Viet, Luong The Hieu |
| DC-10 | Report submission from customer/manager screens | Report record is created for Admin review | S26, S31, S34, S36 | Le Huy Hoang |
| DC-11 | S33 Content publication | Active banners feed S01; announcements feed S36 | S01 and S36 | Le Huy Hoang with Nguyen Vinh Hung and Be Thanh Tien |
| DC-12 | Administrative action | An immutable activity record is appended | S26 and S34 | Le Huy Hoang |

Cross-domain effects require an Integration PR. One page owner must not reimplement every affected domain inside a page script.

## 10. Required core flow coverage

The teacher's minimum features must be testable through these screen groups:

| Core flow | Screens | Required result |
|---|---|---|
| Find and inspect a pitch | S01 → S02 → S03 | Search/filter mock pitches and open the selected pitch by `pitchId` |
| Register and login | S06 → S05 | Create a simulated account, authenticate, and establish role-aware session state |
| Select and hold a slot | S03 → S07 → S08 | Create a unique ten-minute hold and display remaining time |
| Confirm and pay | S08 → S09 → S10 | Revalidate the draft, pay with simulated balance, record transaction, confirm booking |
| History, detail, cancel, reschedule | S11 → S12 → S07 | Display booking/payment state and apply eligible cancellation or one-time rescheduling |
| Review after completion | S12 → shared review data → S03 | Permit one review only for a completed booking and display it on the pitch |
| Manager operations | S17 → S18/S21/S22/S23 | Manage owned pitches, availability, bookings, and simulated revenue |
| Admin dashboard tabs | S26 → S27/S29/S31 | Provide user, pitch, and report tabs/entry points with working management actions |

A collection of unrelated static pages does not satisfy these flows. The relevant JavaScript and shared services must update and read the same simulated state.

## 11. Cross-member synchronization workflow

### 11.1 Before implementation

For every dependency:

1. Find the contract ID in Section 8 or 9.
2. Confirm the source, target, filename, parameter, services, and owners.
3. Add the contract ID to both related Sub-issues.
4. Confirm any shared-service function with its owner.
5. Do not rename or extend the contract without coordinator approval.

### 11.2 If the target screen finishes first

The target owner:

1. Implements parameter parsing and validation.
2. Handles missing, invalid, unauthorized, unavailable, and expired data.
3. Retrieves the record through the approved service or temporary contract-compatible mock adapter.
4. Merges the Screen PR while reporting `Waiting for source integration: IC-XX`.
5. Does not edit the unfinished source screen.

When the source becomes ready, the source owner updates from `main`, creates the approved link/output, and tests the contract.

### 11.3 If the source screen finishes first

The source owner:

1. Implements the local selection/action that will produce the output.
2. Does not navigate to a missing or unapproved target.
3. Keeps the external control visually present but inert and silent.
4. Merges the Screen PR while reporting `Waiting for target integration: IC-XX`.
5. Creates a small Integration PR after the target is merged, unless the coordinator assigns that PR to another integrator.

### 11.4 If a member owns the middle screen

For a flow such as:

```text
Member A source → Member B middle screen → Member C target
```

Member B must implement both contracts belonging to the middle screen:

- parse and validate the incoming contract from Member A;
- perform only the middle screen's assigned responsibility;
- create the outgoing contract for Member C;
- never edit Member A's or Member C's page files;
- update from `main` and test the complete available path after both neighboring screens merge.

### 11.5 Updating a working branch

Before an Integration PR, update the branch from the current `main`:

```bash
git switch <feature-branch>
git fetch origin
git merge origin/main
```

Use the team's approved conflict-resolution workflow. Do not overwrite another owner's changes to resolve a conflict. Escalate conflicts in shared files to the coordinator.

## 12. Pull Request responsibilities

### 12.1 Screen PR

A Screen PR may contain only:

- the assigned screen's approved HTML/CSS/JavaScript trio;
- an explicitly approved shared-service change owned by the author;
- local interactions, input parsing, output preparation, and states for that screen.

It must list:

- Screen IDs;
- applicable Business Rule IDs;
- input and output contract IDs;
- files changed;
- shared services used;
- tests performed;
- unfinished dependencies.

### 12.2 Integration PR

An Integration PR connects already approved screens or services. It may:

- activate a previously inert source link;
- pass approved parameters;
- replace a local mock adapter with an approved shared service;
- coordinate an approved cross-domain state transition;
- add end-to-end tests or test evidence.

The source owner normally creates the navigation Integration PR. The shared-service owner creates service-contract changes. The coordinator may create or reassign a cross-domain Integration PR.

### 12.3 Reviewer checks

The reviewer verifies:

- the source produces exactly the approved parameter names;
- the target validates them;
- the shared service owns the real mock record;
- no page imports another page script;
- no duplicate storage key or data schema was created;
- Business Rules and state transitions remain valid;
- source and target were both tested;
- no unrelated screen was modified.

## 13. Integration and test checklist

For every contract moved to `Integrated` or `Tested`:

- [ ] Source and target screens are approved
- [ ] Source uses the approved static filename
- [ ] Parameters exactly match Section 6
- [ ] User-entered values are encoded
- [ ] Target handles missing and invalid input
- [ ] Target checks authorization and ownership where required
- [ ] Full data is loaded from an approved service
- [ ] No complete object or sensitive data is placed in the URL
- [ ] Shared state remains consistent after the action
- [ ] Relevant Business Rules were checked
- [ ] Browser console has no obvious errors
- [ ] Back/reload behavior was tested where relevant
- [ ] Layout remains usable near 390, 768, 1366, and 1920 px
- [ ] Contract status was updated in this file

## 14. Rules for coding agents

An agent working on Pitch Point must:

1. State the assigned Screen ID and owner before editing.
2. Identify all input, output, data-effect, and Business Rule contracts for that screen.
3. Edit only the authorized screen trio and explicitly approved shared files.
4. Use exact filenames and parameter names from this document.
5. Implement the screen's side of each contract, not the neighboring screen's implementation.
6. Keep unfinished destinations inert and silent.
7. Import services, never another page script.
8. Use the approved shared store instead of creating storage keys.
9. Report dependencies and contract statuses after work.
10. Never claim integration is complete without testing both source and target.

An agent must stop and ask the coordinator when:

- a required transition is missing from this file;
- two contracts disagree;
- a service interface is undefined;
- a filename or owner conflicts with the authoritative registry;
- completing the request would require editing another owner's page;
- a shared schema or storage change is required.

## 15. Maintenance rules

The project coordinator maintains this document.

When a contract changes:

1. Update this file first.
2. Update both affected Sub-issues.
3. Notify the source owner, target owner, and service owner.
4. Update any affected tests.
5. Record the reason in the Pull Request.

Do not delete old contract IDs and reuse them for a different relationship. Add a new ID or mark the old contract as replaced so review history remains understandable.
