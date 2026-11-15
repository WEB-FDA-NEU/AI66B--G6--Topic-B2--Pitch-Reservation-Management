# Pitch Point

An online booking system for mini football pitches (Group 6, Topic B2). It has three roles: **customers** search for and book pitches, **pitch managers** manage their pitches and bookings, and **administrators** manage users, reports and system settings. Wallet money is test money only.

## Features

- Search pitches by area, pitch type, date and time; view free slots hour by hour.
- 10-minute slot hold, wallet payment, cancellation with refund, rescheduling, reviews after a match.
- Pitch managers: add and edit pitches with photos, opening hours and prices, block time slots, track bookings and revenue.
- Administrators: suspend accounts, moderate pitches, handle reports, manage home page content, system settings, activity log.
- Messaging between customers and pitch managers, support from administrators, in-app notifications.
- Light and dark themes, mobile-friendly layout.

## Tech stack

| Part | Technology |
|---|---|
| Frontend | Plain HTML, CSS and JavaScript (ES modules), no build step |
| Backend | Python, FastAPI, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL 17 |
| Security | bcrypt password hashing, sessions via HttpOnly cookie or Bearer token |
| Testing | pytest (API), Playwright (real browser) |

## Quick start

Requires Python 3.11+ and PostgreSQL 17. Step-by-step guide (in Vietnamese): **[docs/SETUP.md](docs/SETUP.md)**.

```powershell
python -m pip install -r requirements.txt
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -f backend/scripts/setup_postgres.sql
Copy-Item backend/.env.example backend/.env    # database connection settings (not committed)
cd backend
python -m app.migrate
python -m uvicorn app.main:app --port 8000
```

Open http://localhost:8000/. API documentation: http://localhost:8000/api/docs.

To open the site from a phone on the same Wi-Fi network, add `--host 0.0.0.0` and browse to `http://<laptop IP>:8000`.

## Demo accounts

All accounts use the password `123456`.

| Role | Email |
|---|---|
| Customer | `customer@pitchpoint.test` |
| Pitch manager | `manager@pitchpoint.test` |
| Administrator | `admin@pitchpoint.test` |

Full list: [docs/ACCOUNTS.md](docs/ACCOUNTS.md).

## Testing

```powershell
$env:TEST_DATABASE_URL = "postgresql+psycopg://pitchpoint:pitchpoint@localhost:5432/pitchpoint_test"
python -m pytest -q
```

Real-browser tests (requires Google Chrome), crash tests (the server is killed mid-payment or mid-refund) and 10 manual test scenarios: see [docs/TEST_GUIDE.md](docs/TEST_GUIDE.md).

## Project structure

```
PitchPoint/
├── frontend/        User interface: 40 HTML pages, css/, js/, img/
├── backend/         FastAPI: app/, alembic/ (migrations), scripts/, seed.json
├── tests/           All tests: backend/ (pytest), e2e/ (Playwright), crash/ (server killed mid-request), race_http.py
├── docs/            Documentation (see below)
└── requirements.txt All Python dependencies, installed with one command
```

CSS and JS files need no manual versioning: the server adds a version number based on file changes, so browsers pick up edits after a page reload.

## Documentation

The detailed documents are written in Vietnamese.

| File | Contents |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Installation, running, testing, troubleshooting |
| [docs/TEST_GUIDE.md](docs/TEST_GUIDE.md) | 10 manual test scenarios (main features, crash) and the automated test suites |
| [docs/BACKEND.md](docs/BACKEND.md) | Backend structure, design (authentication, race conditions, wallet), API reference |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Frontend structure, screen list, business rules |
| [docs/DEMO_CURL.md](docs/DEMO_CURL.md) | `curl` commands showing the API returns 401 without login |
| [docs/BR_TRACEABILITY.md](docs/BR_TRACEABILITY.md) | 60 business rules mapped to code and tests, and where the system differs from the PDF specification |
| [docs/ACCOUNTS.md](docs/ACCOUNTS.md) | Demo accounts and pitches |

Original project specification: `docs/Group6 - Topic B2 - Pitch Management System.pdf`.
