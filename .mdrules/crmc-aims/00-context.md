# 00 — Project Context
> Always loaded first, on every prompt. Keep this file short (<1 page).

## Project
- **Name:** CRMC-AIMS
- **One-line description:** 
- **Primary users:**

## Stack
- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, TypeScript
- **Backend:** Next.js Route Handlers / Node.js (JavaScript)
- **Database:** Supabase
- **Auth:** Supabase Auth
- **Hosting/infra:** Supabase / Vercel
- **Package manager:** npm

## Repo conventions
- Folder structure: (describe or link to a diagram)
- Naming conventions: files `kebab-case`, components `PascalCase`, vars `camelCase` (adjust to project)
- Branching model: e.g. `main` → `dev` → `feature/*`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`)

## Non-negotiables
These override style preferences from any other rule file:
- Never commit secrets/env values into code or docs.
- Never invent an API, library, or file that hasn't been confirmed to exist in this repo.
- Never silently drop error handling to make code "look cleaner."
- Match the existing patterns in the codebase over introducing a new pattern, unless asked to refactor.

## Token-efficiency note for the agent
- Don't restate this whole file back to the user. Use it silently to calibrate output.
- Prefer diffs/snippets over full-file dumps when editing existing files.
- Don't re-explain the stack in every response — it's already known context.
