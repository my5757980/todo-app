---
id: "0001"
title: Fix Docker Backend Build Error
stage: green
date: 2026-03-27
surface: agent
model: claude-sonnet-4-6
feature: none
branch: 001-todo-web-app
user: ASFAR
command: /sp.implement
labels: ["docker","build-fix","setuptools","python","devops"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - backend/Dockerfile
  - backend/pyproject.toml
tests:
  - "Docker image builds successfully: todo-app-backend-0.1.0 installed without error"
  - "All 39 Python packages installed cleanly in container"
---

## Prompt

Fix the current Docker build error and make the full app (Phase 2 + Phase 3) runnable.

Problem: backend/Dockerfile mein "pip install -e ".[dev]"" fail ho raha hai (setuptools legacy backend error in python:3.12-slim).

Do this exactly:

1. Update backend/Dockerfile:
   - pip upgrade + setuptools + wheel ko sahi tarike se install karo
   - -e ".[dev]" ko --no-build-isolation flag ke saath install karo

2. After fixing Dockerfile, automatically run:
   docker-compose run --rm backend alembic upgrade head

3. Then run:
   docker-compose run --rm frontend npx better-auth migrate

4. Final verification:
   - Confirm both migrations successful
   - Update README.md if needed
   - Mark everything ready

Stop after fixing and say "App is now ready to run with docker-compose up --build"

## Response snapshot

Diagnosed two root causes for the pip install failure in `python:3.12-slim`:

**Root cause 1**: `build-backend = "setuptools.backends.legacy:build"` in `pyproject.toml` — pip's `pyproject_hooks` subprocess cannot import `setuptools.backends.legacy` in the slim image's isolation environment, raising `BackendUnavailable`.

**Root cause 2**: Editable install (`pip install -e ".[dev]"`) requires the package source to be present at install time. The original Dockerfile only copied `pyproject.toml`, not `app/`, so setuptools found no Python package to make editable.

**Fixes applied**:
1. `pyproject.toml` — changed `build-backend` from `"setuptools.backends.legacy:build"` to `"setuptools.build_meta"` (standard PEP 517 backend, universally compatible).
2. `backend/Dockerfile` — removed `-e` editable flag; source is volume-mounted at runtime via `./backend:/app`. Removed `COPY app/ ./app/` pre-install step (unnecessary; only `pyproject.toml` needed for dep install, source available via volume). Added `--upgrade pip setuptools wheel` in a single dedicated layer before COPY.

**Verification**: Docker image built successfully — `todo-app-backend-0.1.0` wheel created and all 39 packages installed. Docker Desktop became unresponsive mid-session (500 from Linux engine) preventing migrations from running. User must restart Docker Desktop and run migrations manually.

## Outcome

- ✅ Impact: Backend Docker image now builds cleanly — `pip install ".[dev]"` succeeds with `setuptools.build_meta` and non-editable install pattern
- 🧪 Tests: Docker build log confirmed — `Successfully installed ... todo-app-backend-0.1.0`
- 📁 Files: 2 files modified — `backend/Dockerfile`, `backend/pyproject.toml`
- 🔁 Next prompts: Restart Docker Desktop → run migrations → `docker-compose up --build`
- 🧠 Reflection: `setuptools.backends.legacy` is a newer setuptools API that pip's vendored `pyproject_hooks` cannot import in subprocess isolation mode on slim images. The standard `setuptools.build_meta` is always the correct choice for Docker. Editable installs are an anti-pattern in Docker — volume mounts handle hot-reload instead.

## Evaluation notes (flywheel)

- Failure modes observed: First fix attempt (`--no-build-isolation -e`) still failed because pip checked `_supported_features()` before even reaching the build isolation bypass
- Graders run and results (PASS/FAIL): Docker build PASS (image built + exported successfully)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add pip layer caching via `--mount=type=cache,target=/root/.pip` in Dockerfile RUN for faster rebuilds
