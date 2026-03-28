# Feature Specification: Task CRUD Operations (Phase II)

**Feature Branch**: `001-tasks-crud`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Authenticated users can create, read, update, delete, and toggle completion of their own tasks with title and optional description, enforced via JWT user isolation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a New Task (Priority: P1)

A logged-in user fills in a task title (required) and an optional description, then submits the form. The new task appears immediately in their task list as incomplete.

**Why this priority**: Creating tasks is the entry point for all other operations — without it, there is nothing to view, edit, delete, or complete.

**Independent Test**: Can be fully tested by logging in, creating a task with only a title, and verifying it appears in the task list marked as incomplete.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the task creation form, **When** they submit a valid title (1–200 chars) with no description, **Then** the task is saved and appears in their list as incomplete.
2. **Given** a logged-in user, **When** they submit a title and a description (up to 1000 chars), **Then** both fields are saved and visible in the task detail.
3. **Given** a logged-in user, **When** they submit an empty title, **Then** the system rejects the submission and shows a validation error.
4. **Given** a logged-in user, **When** they submit a title exceeding 200 characters, **Then** the system rejects it with a clear character-limit message.
5. **Given** a logged-in user, **When** they submit a description exceeding 1000 characters, **Then** the system rejects it with a clear character-limit message.
6. **Given** an unauthenticated request to create a task, **When** it arrives at the system, **Then** it is rejected with an authorization error — no task is created.

---

### User Story 2 - View All My Tasks (Priority: P2)

A logged-in user opens their task list and sees all tasks they have created, and only their tasks — no tasks belonging to other users are ever shown.

**Why this priority**: Viewing tasks is the primary read surface and necessary context for all update, delete, and toggle actions.

**Independent Test**: Can be fully tested by creating tasks under two different user accounts and verifying each user sees only their own tasks.

**Acceptance Scenarios**:

1. **Given** a logged-in user with existing tasks, **When** they open the task list, **Then** all of their tasks are displayed with title, description (if set), and completion status.
2. **Given** two logged-in users each with their own tasks, **When** each views their task list, **Then** each sees only their own tasks with zero data leakage across accounts.
3. **Given** a logged-in user with no tasks, **When** they open the task list, **Then** an empty-state message is displayed.
4. **Given** an unauthenticated request to list tasks, **When** it arrives, **Then** it is rejected and no task data is returned.

---

### User Story 3 - Update a Task (Priority: P3)

A logged-in user selects one of their existing tasks, edits its title and/or description, and saves the changes. The updated content is immediately reflected in the task list.

**Why this priority**: Editing corrects mistakes and keeps tasks current — a core expectation of any CRUD interface.

**Independent Test**: Can be fully tested by creating a task, editing its title and description, saving, and verifying the updated values appear in the list and detail view.

**Acceptance Scenarios**:

1. **Given** a logged-in user with an existing task, **When** they update the title to a valid value (1–200 chars), **Then** the task reflects the new title immediately.
2. **Given** a logged-in user, **When** they update the description to a valid value (up to 1000 chars) or clear it, **Then** the change is saved correctly.
3. **Given** a logged-in user, **When** they attempt to update a task with an empty title, **Then** the system rejects the change and shows a validation error.
4. **Given** a logged-in user, **When** they attempt to update a task belonging to another user (via direct request), **Then** the system denies the action with an authorization error.
5. **Given** an unauthenticated request to update a task, **When** it arrives, **Then** it is rejected — no change is made.

---

### User Story 4 - Delete a Task (Priority: P4)

A logged-in user permanently removes one of their tasks. The task disappears from the list immediately and cannot be recovered.

**Why this priority**: Deletion keeps the task list clean and manageable. It completes the full CRUD lifecycle.

**Independent Test**: Can be fully tested by creating a task, deleting it, and confirming it no longer appears in the list or is retrievable.

**Acceptance Scenarios**:

1. **Given** a logged-in user with at least one task, **When** they delete a task, **Then** it is permanently removed from their list.
2. **Given** a logged-in user, **When** they attempt to delete a task owned by another user (via direct request), **Then** the system denies the action — the target task is unaffected.
3. **Given** a logged-in user who deletes their only remaining task, **When** they view their task list, **Then** the empty-state message is displayed.
4. **Given** an unauthenticated request to delete a task, **When** it arrives, **Then** it is rejected — no task is deleted.

---

### User Story 5 - Toggle Task Completion (Priority: P5)

A logged-in user marks one of their tasks as complete or toggles it back to incomplete. The status change is reflected instantly in the UI.

**Why this priority**: Completion tracking is the primary progress mechanism in a task app — without it the app has no workflow value beyond a list.

**Independent Test**: Can be fully tested by creating a task, toggling it to complete (verifying the visual state), then toggling it back to incomplete.

**Acceptance Scenarios**:

1. **Given** a logged-in user with an incomplete task, **When** they mark it complete, **Then** the task immediately shows a completed visual indicator.
2. **Given** a logged-in user with a completed task, **When** they mark it incomplete, **Then** the task reverts to the pending state.
3. **Given** a logged-in user, **When** they toggle one task's completion status, **Then** all other tasks' statuses are unchanged.
4. **Given** a logged-in user, **When** they attempt to toggle a task belonging to another user (via direct request), **Then** the system denies the action.
5. **Given** an unauthenticated request to toggle completion, **When** it arrives, **Then** it is rejected — no status change occurs.

---

### Edge Cases

- What happens when a title is exactly 200 characters? The system accepts it as valid.
- What happens when a description is exactly 1000 characters? The system accepts it as valid.
- What happens when a user submits only whitespace as a title? Treated as empty — rejected with a validation error.
- What happens when the same task is updated and deleted by concurrent requests? The system handles this atomically; one operation succeeds and the other returns an appropriate error.
- What happens when a user requests a task by ID that does not exist? The system returns a "not found" error without revealing whether the task exists for another user.
- What happens when a valid session is provided but the user account no longer exists? The system rejects the request and invalidates the session.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to create a task with a title of 1–200 characters (required) and an optional description of up to 1000 characters.
- **FR-002**: System MUST reject task creation if the title is empty, whitespace-only, or exceeds 200 characters, and return a descriptive validation error.
- **FR-003**: System MUST reject task creation if the description exceeds 1000 characters, and return a descriptive validation error.
- **FR-004**: System MUST associate every created task with the authenticated user's identity derived from their session credential.
- **FR-005**: System MUST return all tasks belonging to the authenticated user when they request their task list, including title, description (if set), and completion status.
- **FR-006**: System MUST never include tasks belonging to other users in any response, regardless of request parameters.
- **FR-007**: System MUST allow authenticated users to update the title and/or description of their own tasks, enforcing the same validation rules as creation.
- **FR-008**: System MUST allow authenticated users to permanently delete any of their own tasks.
- **FR-009**: System MUST allow authenticated users to toggle the completion status (complete ↔ incomplete) of any of their own tasks.
- **FR-010**: System MUST reject any create, read, update, delete, or toggle request that lacks a valid authentication credential, returning an authorization error.
- **FR-011**: System MUST reject any attempt by an authenticated user to read, update, delete, or toggle a task they do not own, returning an authorization error.
- **FR-012**: System MUST present the task interface in a responsive layout usable across mobile and desktop screen sizes.

### Key Entities

- **Task**: A single unit of work owned by one user. Has a unique identifier, a title (1–200 chars, required), an optional description (0–1000 chars), a completion status (complete/incomplete), a creation timestamp, and a last-updated timestamp. Belongs to exactly one User.
- **User**: The authenticated identity that owns tasks. One user owns zero or more tasks. Referenced via the authenticated session on every request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated user can create a task with a valid title and see it appear in their list within 2 seconds of submission on a standard connection.
- **SC-002**: An authenticated user's task list contains exclusively their own tasks — 0% cross-user data exposure under all tested conditions.
- **SC-003**: All five operations (create, list, update, delete, toggle completion) are accessible and functional through the web UI with no command-line interaction required.
- **SC-004**: 100% of requests without a valid authentication credential are rejected — no task data is returned to unauthenticated callers.
- **SC-005**: 100% of authenticated requests targeting another user's task are denied — ownership is enforced on every read and write operation.
- **SC-006**: All validation constraints (title 1–200 chars, description 0–1000 chars) are enforced consistently on both create and update, with user-facing error messages for each violation.
- **SC-007**: The task interface renders correctly and is fully usable on screen widths from 375px (mobile) to 1440px (desktop) without horizontal scrolling or broken layout elements.

## Assumptions

- JWT-based authentication is handled by a separate auth feature; this spec assumes a valid, verifiable user identity is available on every request.
- Tasks are displayed in reverse-chronological order (newest first) by default; no custom sort is in scope for this phase.
- No pagination is required initially — all of a user's tasks are returned in a single response (revisit if task volume grows).
- Deletion is permanent — no archive, soft-delete, or undo mechanism is in scope.
- Task attachments, tags, due dates, and priorities are out of scope for this phase.
- Title and description character limits (200 and 1000) are derived directly from the provided acceptance criteria.
