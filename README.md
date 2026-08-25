# 🚀 Appointment Management System – Backend API

A RESTful API built with **Node.js** and **Express**, designed to handle service scheduling with strict availability validation, overlap prevention and role-based access control. Consumed by the [Appointment Management Frontend](https://github.com/EdannyDev/frontend-appointment).

## 📌 Overview

Appointment Management Backend is a RESTful API designed to handle service scheduling with strict availability validation and overlap prevention.

It enforces business-hour constraints, relational data integrity and secure role-based access control. Two deliberate engineering decisions worth calling out: **MySQL named locks** are used to prevent race conditions when two clients try to book the same slot at the same time, and appointment status changes are handled through an explicit **state machine** rather than free-form updates, so an appointment can't move into an invalid status.

## 🏗 Architecture

The application follows a layered structure:

- **Routes** → Define API endpoints
- **Controllers** → Handle business logic
- **Middlewares** → Authentication & role validation

The architecture ensures separation of concerns and consistent rule enforcement before data persistence.

## 🔐 Authentication & Security

- Password hashing using `bcryptjs`
- JWT-based authentication
- Secure session handling via HttpOnly cookies
- Role-based authorization middleware
- HTTP security headers via `helmet`
- Rate limiting via `express-rate-limit` to mitigate brute-force/abuse
- `trust proxy` correctly configured for accurate client IPs behind a reverse proxy
- Environment-based configuration using `dotenv`

## 👥 Role-Based Access Control (RBAC)

**Admin**
- Manage services
- Configure business hours
- Block specific dates
- View and manage all appointments

**Client**
- Register & authenticate
- Book appointments
- Cancel appointments
- View booking history

Access restrictions are enforced through middleware validation.

## 📧 Email Notifications

Transactional emails (e.g. appointment confirmations and admin notifications) are sent via [Resend](https://resend.com). Configure `RESEND_API_KEY`, `RESEND_FROM` and `ADMIN_EMAIL` to enable this feature.

## 📦 Core Modules

- Authentication System
- Service Management
- Scheduling Engine
- Business Hours Configuration
- Blocked Days Management
- Appointment Status Management (state machine)

## 🛠 Tech Stack

| Category           | Technologies |
|----------------------|--------------|
| Runtime / Framework   | Node.js, Express 5 |
| Database              | MySQL (`mysql2`) |
| Auth                  | JWT, `bcryptjs`, `cookie-parser` |
| Security               | `helmet`, `express-rate-limit`, CORS |
| Email                  | Resend |
| Configuration           | `dotenv` |
| Testing                 | Node.js native test runner (`node --test`) |

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- A running MySQL instance

### Installation

```bash
git clone https://github.com/EdannyDev/backend-appointment.git
cd backend-appointment
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

| Variable            | Description                                             | Example                        |
|----------------------|-----------------------------------------------------------|----------------------------------|
| `PORT`              | Port the server listens on                                | `5000`                          |
| `DB_HOST`           | MySQL host                                                 | `localhost`                     |
| `DB_USER`           | MySQL user                                                 | `root`                          |
| `DB_PASSWORD`       | MySQL password                                             | *(empty for local dev)*         |
| `DB_NAME`           | MySQL database name                                        | `appointmentsDB`                |
| `JWT_SECRET`        | Secret key used to sign JWT tokens                         | `your_jwt_secret_key`           |
| `JWT_EXPIRES_IN`    | JWT expiration window                                      | `1d`                             |
| `CLIENT_URL`        | Frontend origin (used for CORS & cookie settings)          | `https://gestor-citas-edannydev.vercel.app` |
| `RESEND_API_KEY`    | API key for the Resend email service                       | `your_resend_api_key`           |
| `RESEND_FROM`       | Verified sender address used for outgoing emails           | `onboarding@resend.dev`         |
| `ADMIN_EMAIL`       | Address that receives admin-facing notifications           | `admin@example.com`             |

### Running the Server

```bash
node server.js
```

The API will be available at `http://localhost:5000`.

## 🌐 Deployment

The API is deployed on [Render](https://render.com) (free tier), with [Aiven](https://aiven.io) MySQL (free tier) as the managed database.

- **API**: [backend-appointment-0eqz.onrender.com](https://backend-appointment-0eqz.onrender.com)

### Cold Starts & Health Checks

Render's free tier spins the service down after periods of inactivity, so the first request after idle time is delayed (cold start). A `/health` endpoint checks both server and DB connectivity, and is pinged periodically by [UptimeRobot](https://uptimerobot.com) and [cron-job.org](https://cron-job.org) to keep the instance warm and reduce cold-start impact.

## 📜 Available Scripts

| Script         | Description                          |
|-----------------|----------------------------------------|
| `npm start`     | Starts the server                      |
| `npm test`      | Runs the unit test suite               |

## 🧪 Testing

The project includes unit tests covering critical business logic (e.g. scheduling and status transitions), run with Node's native test runner:

```bash
npm test
```

---

Frontend: [frontend-appointment](https://github.com/EdannyDev/frontend-appointment) · Author: [@EdannyDev](https://github.com/EdannyDev)