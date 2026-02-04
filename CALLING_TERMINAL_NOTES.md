# Calling Terminal UI (2026-02-04)

## What changed
- UI refactor na 2 “calling terminal” screeny: **Lead Brief** + **Live Call Coach** (bez dashboard noise).
- Jedna primární akce per screen (Enter): `CALL/END/SAVE&NEXT` a `CONNECT/STOP/LOG`.
- Intel / SPIN / Transcript jsou schované v drawers (D/T) + globální Search (Ctrl/Cmd+K).

## Keyboard shortcuts
**Global**
- `Enter` — primární akce dle stavu
- `Ctrl/Cmd + K` — Search leads
- `Shift + /` — help overlay
- `Esc` — zavře overlay/drawer

**Lead Brief (screen 1)**
- `↑ / ↓` — předchozí / další lead v queue
- `D` — Details drawer
- `1..6` — disposition ve wrap-up

**Live Call Coach (screen 2)**
- `T` — Transcript drawer
- `O` — Objection mode
- `1..6` — outcome ve wrap-up

## Suggested PR / commit message
`feat(ui): calling terminal shell + keyboard-first lead/call flows`

