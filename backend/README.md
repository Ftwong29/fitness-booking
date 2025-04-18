# 🏋️‍♀️ Fitness Booking Backend (Bun + Elysia + Prisma)

This is a production-ready Node.js backend built with **[Bun](https://bun.sh/)** and **[Elysia.js](https://elysiajs.com/)** for a fitness app that allows users to book workout machines and instructors.

---

## 📦 Project Structure

```
fitness_booking/
├── prisma/
│   ├── dev.db                  # SQLite database
│   ├── schema.prisma          # Prisma data models
│   └── seed.ts                # DB seeding script
├── scripts/
│   ├── reset.ts               # Dev reset: drops and reseeds database
│   └── full_test.ts           # Full integration test suite
├── src/
│   ├── helper/
│   │   └── verifySimpleToken.ts # Simple auth verification middleware
│   └── routes/
│       ├── bookings.ts        # Booking API logic
│       ├── instructors.ts     # Instructor routes
│       ├── machines.ts        # Machine routes
│       └── users.ts           # User routes
├── index.ts                   # Main server entry (Elysia app)
├── .env                       # Environment variables (SQLite, secret)
├── package.json               # Dependencies & scripts
├── bun.lock                   # Bun lock file
├── tsconfig.json              # TypeScript configuration
└── README.md                  # You're reading this!
```

---

## 🔧 Setup Instructions

### 1. Clone the repo & install dependencies

```bash
bun install
```

### 2. Set up the database

```bash
bun run scripts/reset.ts
```

This will:

- Delete the existing `dev.db`
- Push the Prisma schema
- Run seed data (users, instructors, machines)

> ⚠️ You must restart the Bun server after resetting.

### 3. Run the server

```bash
bun run index.ts
```

### 4. View Prisma Studio (optional)

```bash
bunx prisma studio
```

---

## 📚 API Endpoints

### ✅ Authentication Middleware

All protected routes require a simple token (base64 user ID):

```http
Authorization: Bearer <base64-encoded-id>
```

---

### 🔐 Protected Routes

| Method | Endpoint         | Description                        |
|--------|------------------|------------------------------------|
| GET    | /users           | Get user list (admin only)         |
| GET    | /instructors     | Get instructor list (auth required)|
| GET    | /machines        | Get available machines (paged)     |
| GET    | /bookings        | Get all bookings                   |
| POST   | /bookings        | Create a new booking               |

---

## 📅 Booking Rules & Validations

- 🕓 Machine & instructor **cannot be double-booked**
- ❄️ Machine requires **10 min cooldown** between bookings
- ⏳ Booking conflict checks include **startTime–endTime** overlap
- 📍 GET /machines returns nearest machines (sorted by user location)

---

## 🧪 Testing

Run the full test suite (auth + booking logic):

```bash
bun test scripts/full_test.ts
```

Test cases include:

- Admin/user auth validation
- Machine listing
- Successful bookings
- Conflict detection (machine/instructor overlap)
- Cooldown enforcement

---

## 📌 Author Notes

This backend is structured with scalability in mind:
- Elysia provides fast, composable routing
- Prisma offers a clean, type-safe ORM
- Bun gives performance boosts and dev speed
- Code separation allows easy migration to REST/GraphQL or microservices

---
