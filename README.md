# Chosen Clinic Management API

A production-oriented backend API for a clinic management system built with Node.js, Express, and MongoDB. Includes a React frontend served from the same server.

**Live:** [https://chosen.webooz.in](https://chosen.webooz.in)
**API Docs:** [https://chosen.webooz.in/api-docs](https://chosen.webooz.in/api-docs)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22.x |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT (jsonwebtoken + bcryptjs) |
| Validation | Joi |
| Testing | Jest + Supertest + mongodb-memory-server |
| API Docs | Swagger / OpenAPI 3.0 (swagger-jsdoc + swagger-ui-express) |
| Frontend | React + Vite + Tailwind CSS (served as static build) |
| Container | Docker Compose (MongoDB) |

---

## Architecture

```
src/
  config/          # App config, DB connection, Swagger spec
    index.js       # Environment variables
    db.js          # MongoDB connection with retry logic
    swagger.js     # OpenAPI 3.0 specification
  models/          # Mongoose schemas and indexes
    User.js        # Staff accounts (admin, receptionist, doctor)
    Patient.js     # Patient records with phone uniqueness
    Doctor.js      # Doctor profiles with working hours
    Appointment.js # Appointments with status machine
    AuditLog.js    # Action audit trail (bonus)
  middleware/      # Reusable Express middleware
    auth.js        # JWT token verification
    authorize.js   # Role-based access control
    validate.js    # Joi schema validation wrapper
    errorHandler.js# Global error handler
  validators/      # Joi schemas per module
  services/        # Business logic layer
  controllers/     # Thin request handlers
  routes/          # Express routers with middleware chains
  utils/           # ApiError class, response helpers, audit logger
  seed/            # Database seed script
public/            # Built React bundle served by Express (tracked, generated)
frontend/          # React + Vite source for the admin UI
  src/
    components/    # Layout (responsive shell), ProtectedRoute
    context/       # AuthContext (JWT + role helpers)
    pages/         # Login, Dashboard, Patients, Doctors, Appointments, MyAppointments
    services/      # Axios instance with token + 401 interceptors
tests/             # Automated test suites
```

### Design Principles

- **Separation of concerns:** Routes handle wiring, controllers handle request/response, services contain all business logic.
- **Thin controllers:** Controllers only extract request data, call services, and send responses. No business logic in controllers.
- **Reusable middleware:** Authentication and authorization are middleware functions, not duplicated across routes.
- **Consistent error handling:** All errors flow through a global error handler. `ApiError` class provides typed HTTP errors.
- **Consistent response format:** All responses follow `{ success, message, data }` shape.

---

## Setup Instructions

### Prerequisites

- Node.js 20+ 
- MongoDB (local, Docker, or Atlas)

### 1. Clone and install

```bash
git clone https://github.com/0rajeeshravi0/chosen.git
cd chosen
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/clinic_management
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
NODE_ENV=development
DEFAULT_APPOINTMENT_DURATION=30
```

### 3. Start MongoDB

**Option A — Docker:**
```bash
docker compose up -d
```

**Option B — MongoDB Atlas:**
Use a `mongodb+srv://...` connection string in `MONGODB_URI`.

### 4. Seed the database

```bash
npm run seed
```

This creates:
- 1 Admin, 1 Receptionist, 2 Doctor users
- 2 Doctors with configured working hours
- 5 Patients
- 7 Appointments (scheduled, confirmed, cancelled)

### 5. Run the server

```bash
npm run dev    # Development (with nodemon hot reload)
npm start      # Production
```

Server starts at `http://localhost:3000` and serves both the API and the React
UI. Swagger docs at `http://localhost:3000/api-docs`.

> **Timezone:** availability cut-offs and the "no past appointments" rule compare
> wall-clock times, so the process pins `process.env.TZ` to `CLINIC_TIMEZONE`
> (default `Asia/Kolkata`) at startup. Override it for a clinic in another
> region; the boot log prints the active timezone and local time.

### 6. Frontend (optional — a built bundle is already committed)

`public/` contains the production build that Express serves, so the app runs
without any frontend tooling. To change the UI:

```bash
npm run frontend:install   # install React/Vite deps into frontend/
npm run frontend:dev       # Vite dev server on :5173, proxies /api to :3000
npm run build:frontend     # rebuild frontend/ -> public/
```

Commit the regenerated `public/` alongside your `frontend/` changes — that
directory is what the deployed server serves.

### 7. Run tests

```bash
npm test
```

Tests use `mongodb-memory-server` — no external database needed.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/clinic_management` |
| `JWT_SECRET` | Secret key for JWT signing | (required) |
| `JWT_EXPIRES_IN` | Token expiration time | `24h` |
| `NODE_ENV` | Environment mode | `development` |
| `DEFAULT_APPOINTMENT_DURATION` | Slot duration in minutes (bonus) | `30` |
| `CLINIC_TIMEZONE` | IANA timezone the clinic operates in; pins `process.env.TZ` so slot cut-offs use clinic wall-clock time instead of the host's (usually UTC) | `Asia/Kolkata` |

---

## Authentication

JWT-based authentication using Bearer tokens.

### Login

```
POST /api/auth/login
```

```json
{
  "email": "admin@clinic.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbG...",
    "user": { "name": "Admin User", "email": "admin@clinic.com", "role": "admin" }
  }
}
```

All protected endpoints require: `Authorization: Bearer <token>`

### Seeded Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@clinic.com | Admin@123 |
| Receptionist | receptionist@clinic.com | Recep@123 |
| Doctor 1 | dr.priya@clinic.com | Doctor@123 |
| Doctor 2 | dr.amit@clinic.com | Doctor@123 |

---

## Role-Based Access Control (RBAC)

Three roles with granular permissions:

| Function | Admin | Receptionist | Doctor |
|---|:---:|:---:|:---:|
| Manage doctors (CRUD) | Full | View only | View only |
| Manage patients (CRUD) | Full | Full | View assigned |
| Create appointments | Yes | Yes | No |
| Update appointments | Yes | Yes | Own only |
| Cancel appointments | Yes | Yes | No |
| View all appointments | Yes | Yes | No |
| View own appointments | Yes | Yes | Yes |
| Update appointment status | Yes | Yes | Yes |
| Configure doctor availability | Yes | No | No |
| Manage users | Yes | No | No |

### Resource-Level Authorization

Authorization is enforced at the **object level**, not just role level:

- A doctor can only view/update their **own** appointments (matched via `user.doctorId`).
- Changing `doctorId` in a request does **not** grant access to another doctor's data.
- The `findAll` query for doctors automatically filters by `user.doctorId`.
- The `findById` and `update` methods verify ownership before returning data.

**Implementation:** `src/services/appointmentService.js` — the service layer checks `user.role === 'doctor'` and compares `appointment.doctor` with `user.doctorId`.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |

### Patients
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/patients` | Create patient |
| GET | `/api/patients` | List with search & pagination |
| GET | `/api/patients/:id` | Get by ID |
| PUT | `/api/patients/:id` | Update |
| DELETE | `/api/patients/:id` | Delete |

**Query params:** `?page=1&limit=10&search=rahul` (searches name, phone, email)

### Doctors
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/doctors` | Create doctor |
| GET | `/api/doctors` | List all |
| GET | `/api/doctors/:id` | Get by ID |
| PUT | `/api/doctors/:id` | Update |
| DELETE | `/api/doctors/:id` | Delete |
| PUT | `/api/doctors/:id/availability` | Set working hours (admin only) |
| GET | `/api/doctors/:id/availability?date=YYYY-MM-DD` | Get available slots |

### Appointments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/appointments` | Book appointment |
| GET | `/api/appointments` | List with filters & pagination |
| GET | `/api/appointments/:id` | Get by ID |
| PUT | `/api/appointments/:id` | Update status/reason |
| DELETE | `/api/appointments/:id` | Cancel appointment |

**Query params:** `?doctorId=&patientId=&date=2026-09-01&status=confirmed&page=1&limit=10`

Full interactive documentation: `/api-docs` (Swagger UI)

---

## Availability & Scheduling Logic

### Doctor Working Hours

Each doctor has configurable working hours per day of the week:

```json
{
  "workingHours": {
    "monday": [
      { "start": "09:00", "end": "13:00" },
      { "start": "14:00", "end": "18:00" }
    ],
    "tuesday": [{ "start": "09:00", "end": "18:00" }]
  }
}
```

Multiple time blocks per day are supported (e.g., morning + afternoon with a lunch break).

### Slot Generation Algorithm

`GET /api/doctors/:id/availability?date=2026-09-01`

1. Determine the day of week from the date (e.g., Monday).
2. Get the doctor's working hour blocks for that day.
3. Generate slots of `DEFAULT_APPOINTMENT_DURATION` minutes (default 30) from each block.
4. Fetch all **non-cancelled** appointments for that doctor on that date.
5. Mark a slot `available: false` if it overlaps an existing appointment, **or if
   its start time has already passed** (relevant when querying today's date).

**Overlap detection:** Slot `[slotStart, slotEnd)` overlaps appointment `[aptStart, aptEnd)` when `slotStart < aptEnd AND slotEnd > aptStart`.

**Cancelled appointments** do not block slots — they are excluded from the overlap query via `status: { $ne: 'cancelled' }`.

**Availability/creation consistency.** Both the availability engine and
`POST /api/appointments` use the same `isPast()` helper in `src/utils/time.js`.
This guarantees a one-way invariant that is covered by tests: every slot
reported `available: true` is actually bookable. Without it, querying today's
date would advertise morning slots that creation then rejects with
`400 Cannot schedule appointments in the past` — the API contradicting itself.

### Appointment Conflict Rules

Six rules enforced on appointment creation:

1. **Doctor availability:** Appointment must fall entirely within a working hour block for that day.
2. **Doctor conflict:** No overlapping non-cancelled appointments for the same doctor. Adjacent is OK (`10:00-10:30` then `10:30-11:00`).
3. **Patient conflict:** Same overlap logic applied per patient.
4. **Past appointments:** `appointmentDate + startTime` must be in the future.
5. **Valid duration:** `startTime < endTime`.
6. **Cancelled slots:** Cancelled appointments are excluded from conflict checks.

**Implementation:** `src/services/appointmentService.js` — the `create` method runs all 6 checks sequentially before inserting.

---

## Appointment Status Machine

Statuses: `scheduled`, `confirmed`, `completed`, `cancelled`, `no_show`

### Valid Transitions

```
scheduled  --> confirmed, cancelled
confirmed  --> completed, cancelled, no_show
completed  --> (terminal)
cancelled  --> (terminal)
no_show    --> (terminal)
```

Invalid transitions return `400: Cannot transition from 'X' to 'Y'`.

**Rationale:**
- `scheduled` is the initial state. Can be confirmed or cancelled.
- `confirmed` can progress to completion, be cancelled, or marked no-show.
- `completed`, `cancelled`, `no_show` are terminal — no further changes.
- A cancelled appointment cannot be reverted to avoid slot conflicts.

**Implementation:** `src/models/Appointment.js` exports `VALID_TRANSITIONS`. The service checks transitions before saving.

---

## Database Design

### Models

**User** — Staff accounts
- `name`, `email` (unique), `password` (hashed, select: false), `role` (admin/receptionist/doctor), `doctorId` (links doctor users to Doctor records)

**Patient** — Patient records
- `firstName`, `lastName`, `phone` (unique), `email`, `dateOfBirth`, `gender`

**Doctor** — Doctor profiles
- `name`, `specialisation`, `phone`, `email` (unique), `workingHours` (nested per-day time blocks)

**Appointment** — Appointment records
- `patient` (ref), `doctor` (ref), `appointmentDate`, `startTime`, `endTime`, `reason`, `status`

**AuditLog** (bonus) — Action trail
- `user` (ref), `action`, `entity`, `entityId`, `details`, `createdAt`

### Indexes

| Index | Collection | Purpose |
|---|---|---|
| `{ phone: 1 }` unique | Patient | Prevent duplicate patients, fast phone lookup |
| `{ email: 1 }` | Patient | Email search |
| `{ firstName, lastName, phone, email }` text | Patient | Full-text search |
| `{ email: 1 }` unique | Doctor | Prevent duplicate doctors |
| `{ doctor: 1, appointmentDate: 1 }` | Appointment | Fast conflict detection per doctor per day |
| `{ patient: 1, appointmentDate: 1 }` | Appointment | Fast conflict detection per patient per day |
| `{ status: 1 }` | Appointment | Status filtering |
| `{ appointmentDate: 1 }` | Appointment | Date filtering |
| `{ entity: 1, entityId: 1 }` | AuditLog | Lookup logs per entity |
| `{ createdAt: -1 }` | AuditLog | Recent logs first |

**Why compound indexes on `(doctor, appointmentDate)` and `(patient, appointmentDate)`?**
Conflict detection queries always filter by doctor/patient + date. Compound indexes make these queries use a single index scan instead of a collection scan, which is critical as appointment volume grows.

---

## Validation & Error Handling

### Input Validation

All inputs are validated using Joi schemas in `src/validators/`. The `validate` middleware strips unknown fields and returns all validation errors at once.

### Error Types Handled

| Error | HTTP Code | Example |
|---|---|---|
| Missing required fields | 400 | `"firstName" is required` |
| Invalid ID format | 400 | `Invalid ID format` |
| Invalid date/time | 400 | `appointmentDate must be in YYYY-MM-DD format` |
| Invalid time range | 400 | `Start time must be before end time` |
| Past appointments | 400 | `Cannot schedule appointments in the past` |
| Outside working hours | 400 | `Appointment is outside doctor's working hours` |
| Invalid status transition | 400 | `Cannot transition from 'cancelled' to 'completed'` |
| Unauthenticated | 401 | `No token provided` / `Invalid token` / `Token has expired` |
| Forbidden | 403 | `You do not have permission to perform this action` |
| Resource not found | 404 | `Patient not found` |
| Duplicate record | 409 | `A patient with this phone number already exists` |
| Doctor conflict | 409 | `Doctor already has an appointment during this time` |
| Patient conflict | 409 | `Patient already has an appointment during this time` |
| Server error | 500 | `Internal server error` (no stack traces exposed) |

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "Patient created successfully",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Doctor already has an appointment during this time."
}
```

**Paginated:**
```json
{
  "success": true,
  "message": "Success",
  "data": [...],
  "pagination": { "total": 42, "page": 1, "limit": 10, "pages": 5 }
}
```

---

## Automated Tests

39 tests across 3 suites using Jest + Supertest + mongodb-memory-server.

```bash
npm test
```

### Test Coverage

| Suite | Tests |
|---|---|
| **Auth** | Login success, invalid credentials, non-existent user, missing fields, no token, invalid token |
| **RBAC** | Admin access, receptionist access, doctor read access, doctor create blocked, receptionist doctor-manage blocked |
| **Patients** | Create, duplicate phone (409), get by ID, search by name, pagination |
| **Doctor Availability** | Configure working hours, retrieve slots, non-working day empty, occupied slots marked, cancelled slots available, non-admin blocked |
| **Appointments** | Create, outside working hours, doctor conflict, adjacent allowed, patient conflict, invalid time range, past date rejected, cancel, cancelled slot freed, valid status transition, invalid status transition, filter by doctor, filter by status, populated patient/doctor info |
| **Resource Auth** | Doctor cannot view another doctor's appointment (403), doctor can view own appointment |

---

## Bonus Features

### Audit Logs (Section 20)

All important mutations are logged to the `AuditLog` collection:

- Patient created / updated / deleted
- Doctor created / updated / deleted
- Doctor availability changed
- Appointment created / updated / cancelled

Each log entry contains: `user`, `action`, `entity`, `entityId`, `details`, `timestamp`.

**Implementation:** `src/utils/auditLog.js` — called from service methods after successful mutations.

### Configurable Appointment Duration (Section 21)

Slot duration is configurable via the `DEFAULT_APPOINTMENT_DURATION` environment variable (default: 30 minutes). The availability engine uses this value when generating slots.

Supported values: 15, 30, 45, 60 (or any positive integer).

---

## Docker

```bash
# Start MongoDB only
docker compose up -d

# The backend runs with npm
npm run dev
```

`docker-compose.yml` provides MongoDB 7 with persistent volume storage.

---

## Known Limitations

- No password reset or user registration API (users are seeded or created by admin).
- No rate limiting on login endpoint.
- Appointment duration is global — not per-doctor configurable.
- No recurring appointment support.
- No email/SMS notifications.
- Search is regex-based, not full-text weighted ranking.

## Assumptions

- All times are in HH:mm 24-hour format (timezone-agnostic, clinic operates in one timezone).
- Appointment slots are fixed-duration and aligned to working hour blocks.
- `DELETE /api/appointments/:id` performs a soft cancel (sets status to `cancelled`) rather than a hard delete, preserving audit history.
- A doctor user is linked to a Doctor record via `user.doctorId`. This is set during seeding.
- Phone numbers are exactly 10 digits (Indian format).
