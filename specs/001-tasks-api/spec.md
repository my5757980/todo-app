# Feature Specification: Task REST API Contract (Phase II)

**Feature Branch**: `001-tasks-api`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "REST API contract for task operations — six endpoints for listing, creating, reading, updating, deleting, and toggling completion of tasks, all requiring JWT authentication and scoped per user"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - List My Tasks (Priority: P1)

The frontend client, acting on behalf of an authenticated user, requests the full list of that user's tasks. The API returns only that user's tasks. An optional status filter narrows results to pending tasks only.

**Why this priority**: Listing tasks is the most frequently called operation — it drives the main dashboard view and is the entry point for all other operations.

**Independent Test**: Can be fully tested by calling the list endpoint with a valid session credential, verifying only the authenticated user's tasks are returned, and calling again with `?status=pending` to verify only incomplete tasks appear.

**Acceptance Scenarios**:

1. **Given** a valid session credential for User A, **When** the client requests the task list, **Then** the response contains all of User A's tasks and none of User B's tasks.
2. **Given** a valid session credential and tasks with mixed statuses, **When** the client requests the list with a `pending` status filter, **Then** only incomplete tasks are returned.
3. **Given** a valid session credential for a user with no tasks, **When** the client requests the task list, **Then** the response is a successful empty collection.
4. **Given** no session credential, **When** the client requests the task list, **Then** the API returns an authorization error and no task data.
5. **Given** a session credential for User A and a URL path for User B's tasks, **When** the request arrives, **Then** the API denies it — the session identity must match the URL identity.

---

### User Story 2 - Create a Task (Priority: P2)

The frontend client submits a new task on behalf of the authenticated user. The API validates the input, persists the task, and returns the newly created task record.

**Why this priority**: Creation is the producer operation — without it, all other endpoints have nothing to act on.

**Independent Test**: Can be fully tested by posting a valid title to the create endpoint, verifying a successful response with the created task's data, and then confirming it appears in the list endpoint.

**Acceptance Scenarios**:

1. **Given** a valid session credential and a valid title (1–200 chars), **When** the client creates a task, **Then** the API returns the created task including its assigned identifier and default incomplete status.
2. **Given** a valid session credential and an optional description (up to 1000 chars), **When** the client creates a task with both fields, **Then** both fields are persisted and returned.
3. **Given** a valid session credential and an empty or whitespace-only title, **When** the client submits, **Then** the API returns a validation error and no task is created.
4. **Given** a valid session credential and a title exceeding 200 characters, **When** the client submits, **Then** the API returns a validation error and no task is created.
5. **Given** no session credential, **When** a create request arrives, **Then** the API returns an authorization error.

---

### User Story 3 - Get a Single Task (Priority: P3)

The frontend client fetches the full details of one specific task belonging to the authenticated user, identified by its unique identifier.

**Why this priority**: Required for detail views and pre-populating edit forms. Enables targeted reads without fetching the full list.

**Independent Test**: Can be fully tested by creating a task, then fetching it by its identifier and verifying all fields (title, description, status, timestamps) are returned correctly.

**Acceptance Scenarios**:

1. **Given** a valid session credential and an existing task owned by the user, **When** the client fetches it by identifier, **Then** the API returns all fields of that task.
2. **Given** a valid session credential and an identifier that does not exist, **When** the client fetches it, **Then** the API returns a "not found" error.
3. **Given** a valid session credential for User A and an identifier belonging to User B's task, **When** the client fetches it, **Then** the API returns an authorization error — not a "not found" that reveals the task exists.
4. **Given** no session credential, **When** the request arrives, **Then** the API returns an authorization error.

---

### User Story 4 - Update a Task (Priority: P4)

The frontend client submits updated content (title and/or description) for a specific task belonging to the authenticated user. The API validates the input, applies the change, and returns the updated task.

**Why this priority**: Editing is essential for correcting tasks and keeping them current. Completes the write side of full CRUD.

**Independent Test**: Can be fully tested by creating a task, updating its title and description, and verifying the response and subsequent fetch reflect the new values.

**Acceptance Scenarios**:

1. **Given** a valid session credential and a task owned by the user, **When** the client submits a valid updated title and/or description, **Then** the API returns the updated task with the new values.
2. **Given** a valid session credential, **When** the client submits an empty or whitespace-only title, **Then** the API returns a validation error and the task is unchanged.
3. **Given** a valid session credential and a non-existent task identifier, **When** the client submits an update, **Then** the API returns a "not found" error.
4. **Given** a valid session credential for User A and a task identifier owned by User B, **When** the client submits an update, **Then** the API returns an authorization error.
5. **Given** no session credential, **When** the update request arrives, **Then** the API returns an authorization error.

---

### User Story 5 - Delete a Task (Priority: P5)

The frontend client permanently removes a specific task belonging to the authenticated user by its identifier. The API confirms deletion and the task is no longer retrievable.

**Why this priority**: Completes the full CRUD contract. Deletion keeps user data manageable.

**Independent Test**: Can be fully tested by creating a task, deleting it, and verifying a subsequent fetch of the same identifier returns "not found".

**Acceptance Scenarios**:

1. **Given** a valid session credential and a task owned by the user, **When** the client deletes it, **Then** the API returns a success confirmation and the task is permanently removed.
2. **Given** a valid session credential and a non-existent task identifier, **When** the client deletes it, **Then** the API returns a "not found" error.
3. **Given** a valid session credential for User A and a task identifier owned by User B, **When** the client requests deletion, **Then** the API returns an authorization error and the task is unaffected.
4. **Given** no session credential, **When** the delete request arrives, **Then** the API returns an authorization error.

---

### User Story 6 - Toggle Task Completion (Priority: P6)

The frontend client sends a toggle request for a specific task. The API flips the task's completion status (incomplete → complete, or complete → incomplete) and returns the updated task.

**Why this priority**: Completion toggling is a high-frequency, targeted write — purposely separated from the full update operation to allow atomic, idempotent status changes.

**Independent Test**: Can be fully tested by creating a task (incomplete), toggling it (expect complete), toggling again (expect incomplete), and verifying the status changes with each response.

**Acceptance Scenarios**:

1. **Given** a valid session credential and an incomplete task owned by the user, **When** the client sends a toggle request, **Then** the API returns the task with status changed to complete.
2. **Given** a valid session credential and a complete task owned by the user, **When** the client sends a toggle request, **Then** the API returns the task with status changed to incomplete.
3. **Given** a valid session credential and a non-existent task identifier, **When** the toggle is requested, **Then** the API returns a "not found" error.
4. **Given** a valid session credential for User A and a task identifier owned by User B, **When** the toggle is requested, **Then** the API returns an authorization error.
5. **Given** no session credential, **When** the toggle request arrives, **Then** the API returns an authorization error.

---

### Edge Cases

- What happens when `{user_id}` in the URL path does not match the user identity in the session credential? The API rejects the request with an authorization error — the session credential is the authoritative source of identity.
- What happens when a request body is malformed (not valid JSON)? The API returns a descriptive parse error.
- What happens when the `?status` filter value is unrecognized (e.g., `?status=banana`)? The API returns a validation error describing accepted values.
- What happens when the same task is deleted and updated concurrently? The operation that arrives second returns a "not found" error.
- What happens when a task identifier in the URL is syntactically invalid (wrong format)? The API returns a validation error before querying any data.
- What happens when a list request returns a very large number of tasks? The API returns all tasks; pagination is out of scope for this phase but the response format must be extensible.

## Requirements *(mandatory)*

### Functional Requirements

**Endpoint: List Tasks**
- **FR-001**: The list endpoint MUST return all tasks owned by the authenticated user when no filter is applied.
- **FR-002**: The list endpoint MUST accept an optional status filter; when `pending` is specified, only incomplete tasks are returned.
- **FR-003**: The list endpoint MUST return an empty collection (not an error) when the user has no tasks.

**Endpoint: Create Task**
- **FR-004**: The create endpoint MUST accept a required title (1–200 chars) and an optional description (up to 1000 chars).
- **FR-005**: The create endpoint MUST return the newly created task, including its system-assigned identifier, completion status (default: incomplete), and creation timestamp.
- **FR-006**: The create endpoint MUST reject requests with a missing, empty, or whitespace-only title and return a descriptive validation error.

**Endpoint: Get Single Task**
- **FR-007**: The single-task endpoint MUST return all stored fields of the requested task when it exists and is owned by the requester.
- **FR-008**: The single-task endpoint MUST return a "not found" response for identifiers that do not exist or are owned by another user (no ownership leakage via distinct error codes).

**Endpoint: Update Task**
- **FR-009**: The update endpoint MUST accept a title (1–200 chars) and/or description (up to 1000 chars) and apply changes to the target task.
- **FR-010**: The update endpoint MUST return the task with all fields reflecting the update, including a last-updated timestamp.
- **FR-011**: The update endpoint MUST enforce the same validation rules as create (title non-empty, within length limits).

**Endpoint: Delete Task**
- **FR-012**: The delete endpoint MUST permanently remove the specified task and return a success confirmation.
- **FR-013**: After deletion, any subsequent read, update, or toggle request for the same identifier MUST return a "not found" response.

**Endpoint: Toggle Completion**
- **FR-014**: The toggle endpoint MUST flip the task's completion status atomically and return the updated task.
- **FR-015**: The toggle endpoint MUST NOT require a request body — it derives all needed state from the current task record.

**Cross-Cutting: Authentication & Authorization**
- **FR-016**: Every endpoint MUST require a valid session credential; requests without one MUST return an authorization error.
- **FR-017**: Every endpoint MUST validate that the user identity in the session credential matches the ownership of the requested resource; mismatches MUST return an authorization error.
- **FR-018**: The `{user_id}` path segment MUST be validated against the session-credential identity on every request; a mismatch MUST result in an authorization error.

### Key Entities

- **Task**: The primary resource. Has a unique identifier, title (1–200 chars), optional description (0–1000 chars), completion status, creation timestamp, last-updated timestamp, and owner identity. All endpoints operate on this entity.
- **Session Credential**: The authoritative source of user identity on every request. Validated before any business logic runs. Its encoded user identity supersedes any user identifier supplied in the URL.
- **Status Filter**: A query parameter accepted by the list endpoint. Valid values: `pending` (incomplete tasks only). Omitting it returns all tasks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six endpoints return correct responses for happy-path requests within 500ms on a standard server connection.
- **SC-002**: 100% of requests without a valid session credential receive an authorization error across all six endpoints — no data is returned to unauthenticated callers.
- **SC-003**: 100% of requests where the session identity does not match the resource owner receive an authorization error — cross-user data access is impossible through any endpoint.
- **SC-004**: The `{user_id}` path segment is validated against the session credential on every request — a mismatched path cannot bypass ownership checks.
- **SC-005**: All six validation rules (title required, title ≤200 chars, description ≤1000 chars, valid status filter, valid identifier format, valid JSON body) return descriptive errors with no data mutation.
- **SC-006**: The list endpoint with a `?status=pending` filter returns exclusively incomplete tasks — 0% false positives (completed tasks) in filtered results.
- **SC-007**: The toggle endpoint is idempotent in pairs — toggling twice always returns the task to its original status.

## Assumptions

- The six endpoints listed are the complete API surface for task operations in this phase; no additional endpoints (e.g., bulk operations, search, sort) are in scope.
- The `?status` filter currently supports only `pending`; future values (e.g., `completed`, `all`) are out of scope but the filter parameter is designed to be extended without breaking existing callers.
- Pagination is out of scope for this phase; all tasks are returned in a single response. The response envelope should be structured to allow pagination headers/metadata to be added later without a breaking change.
- The `{user_id}` in the URL path is an explicit routing segment; it must always match the session-credential identity (FR-018). It is not used as a shortcut to bypass the credential check.
- Task identifiers are opaque unique values assigned by the system; clients must not construct or guess them.
- The response format for all endpoints is a consistent structured data envelope (not plain text).
- This API is consumed exclusively by the Phase II web frontend; no public third-party API access is in scope.

📋 **Architectural decision detected**: The `{user_id}` URL path segment creates redundancy with the JWT-extracted identity and introduces a mismatch-validation requirement (FR-018). Two valid approaches exist: (A) keep `{user_id}` in the path for RESTful resource grouping with strict validation; (B) remove it and derive all user scoping solely from the JWT. Document reasoning and tradeoffs? Run `/sp.adr user-id-in-url-vs-jwt-only`.
