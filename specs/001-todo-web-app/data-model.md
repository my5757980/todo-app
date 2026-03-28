# Data Model: Todo App Phase II

**Branch**: `001-todo-web-app` | **Date**: 2026-03-26
**Source**: `specs/001-todo-web-app/spec.md`, `specs/001-tasks-crud/spec.md`, `specs/001-auth-jwt/spec.md`

---

## Entities

### User

Represents a registered identity in the system. Created once on sign-up; owns all tasks.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, auto-generated | Stable identifier across sessions |
| `email` | String | UNIQUE, NOT NULL, max 320 chars | Validated as RFC 5321 email |
| `hashed_password` | String | NOT NULL | bcrypt hash; plaintext never stored |
| `created_at` | DateTime (UTC) | NOT NULL, default = now() | Registration timestamp |

**State transitions**: User → Active (after registration). No soft-delete in Phase II.

**Validation rules**:
- Email must be unique across all users
- Email must match standard format (local@domain.tld)
- Password minimum 8 characters (validated before hashing; hash stored)

---

### Task

Represents a single unit of work owned by one user.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | UUID | PK, auto-generated | Opaque identifier; clients must not construct |
| `user_id` | UUID | FK → User.id, NOT NULL, INDEX | Hard foreign key; owner isolation enforced at DB level |
| `title` | String | NOT NULL, min 1 char, max 200 chars | Whitespace-only is treated as empty (server-side trim) |
| `description` | String | NULLABLE, max 1000 chars | Optional; NULL and empty string treated equivalently |
| `is_complete` | Boolean | NOT NULL, default = false | Completion status |
| `created_at` | DateTime (UTC) | NOT NULL, default = now() | Set on insert; never updated |
| `updated_at` | DateTime (UTC) | NOT NULL, default = now() | Auto-updated on every write |

**State transitions**:
```
is_complete = false (Incomplete) ──toggle──► is_complete = true (Complete)
is_complete = true  (Complete)   ──toggle──► is_complete = false (Incomplete)
```

**Validation rules**:
- `title`: Required, strip whitespace, reject if empty after strip, max 200 chars
- `description`: Optional, max 1000 chars, NULL stored as NULL
- `user_id`: Injected by JWT middleware; never accepted from request body
- `is_complete`: Defaults to `false` on creation; toggled atomically via PATCH endpoint

---

## Relationships

```
User ─────┐ (1)
          │ has
          └──── Task (0..N)
                 user_id FK → User.id
```

- One User owns zero or more Tasks
- One Task belongs to exactly one User
- Deleting a User cascades to delete all their Tasks (CASCADE DELETE on FK)
- Tasks cannot exist without an owner

---

## Database Schema (DDL — informational)

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "user" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(320) NOT NULL UNIQUE,
    hashed_password TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    description  TEXT,
    is_complete  BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_user_id ON task(user_id);
CREATE INDEX idx_task_user_status ON task(user_id, is_complete);
```

The `idx_task_user_status` composite index supports the list + status filter query (`WHERE user_id = ? AND is_complete = false`) efficiently.

---

## API Response Shapes

### UserPublic (returned after sign-in / sign-up)

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2026-03-26T10:00:00Z"
}
```

### TaskResponse (returned by all task endpoints)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "is_complete": false,
  "created_at": "2026-03-26T10:00:00Z",
  "updated_at": "2026-03-26T10:05:00Z"
}
```

### TaskListResponse (returned by list endpoint)

```json
{
  "tasks": [ /* TaskResponse[] */ ],
  "total": 12
}
```

The `total` field is included in the response envelope to support future pagination without a breaking change.

---

## JWT Payload (issued by Better Auth)

```json
{
  "sub": "uuid",        // user.id — authoritative identity
  "email": "user@example.com",
  "iat": 1711444800,    // issued-at (Unix timestamp)
  "exp": 1711448400     // expiry (Unix timestamp)
}
```

FastAPI middleware extracts `sub` as `current_user_id` and injects it into every protected request handler via dependency injection.
