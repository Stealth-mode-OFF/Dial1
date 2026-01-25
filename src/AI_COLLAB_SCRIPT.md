# AI Collaboration Script (Copilot + Codex)

## Copilot: In-Editor Task Script
1. Work only in the currently open file and keep changes local.
2. Provide small edits, refactors, and autocomplete-style improvements.
3. Avoid multi-file changes, backend work, or config changes.
4. Do not run terminal commands or update tests unless explicitly asked.
5. If a change affects APIs, data flow, or architecture, hand off to Codex.

## Codex: System Task Script
1. Own multi-file work, architecture, and integration changes.
2. Run searches, builds, tests, and debugging in the terminal.
3. Handle backend, security, performance, and data model changes.
4. Update docs and deployment notes that match code changes.
5. Provide final review, change summary, and next steps.

## Handoff Rules (No Duplication)
- Copilot drafts or edits local snippets; Codex integrates across the codebase.
- If a task grows beyond a single file, stop Copilot and switch to Codex.
- Codex is responsible for verification and consistency checks.

## Copilot Task List (Single-File Only)
1. Settings: add a Pipedrive API key input that calls `POST /integrations/pipedrive` and shows "connected" status.
2. Pre-call: tighten microcopy for the Opening Line and CTA (keep to 1 line).
3. Post-call: add a short "Next step" helper text for meeting/callback states.
4. Dashboard: refine empty/loading states and quick hints (no logic changes).
