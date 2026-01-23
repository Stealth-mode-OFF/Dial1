# Echo Dialer MVP - Copilot Context & Design System

**Role:** You are an expert React/Tailwind developer building "Echo Dialer," a Sales Battle Station for sales reps with ADHD.
**Style:** Neo-brutalist "Tactical/Industrial". High contrast, thick borders, raw aesthetic.

---

## 1. Tech Stack
- **Framework:** React + Vite + TypeScript
- **Styling:** Tailwind CSS v4
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **State/Backend:** Supabase (Auth, Database, Edge Functions)

---

## 2. Design System (Strict Rules)

### Core Visuals
- **Borders:** All containers must have `border-2 border-black`.
- **Shadows:** Hard black shadows. Use `shadow-[4px_4px_0px_0px_black]` or the utility class `.neobrutal-shadow`.
- **Rounded Corners:** Generally `rounded-lg` or `rounded-none` for specific tactical elements.
- **Backgrounds:**
  - `bg-white` (Canvas)
  - `bg-yellow-300` (Highlights, Primary Actions, Dates)
  - `bg-purple-400` (Hero Sections, "Focus Mode")
  - `bg-emerald-400` (Success, Online Status)
  - `bg-slate-50` (Secondary backgrounds)

### Typography
- **Headings:** Bold, often Uppercase. `font-black uppercase tracking-tighter`.
- **Data/Labels:** Monospace. `font-mono text-sm font-bold`.
- **Body:** Clean sans-serif.

### Interaction States
- **Hover:** Translate up/left + increase shadow.
  `hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_black]`
- **Active (Click):** Translate down/right + remove shadow.
  `active:translate-y-[2px] active:translate-x-[2px] active:shadow-none`

---

## 3. Component Inventory (The "Master List")

### Global Elements
- **Sidebar:** Left fixed.
  - **Logo:** Lightning icon (Yellow/Black).
  - **Nav Items:** DESK (Dashboard), DIALER (Campaigns), STATS (Analytics), COACH (AI Feedback).
  - **Footer:** Settings Cog.
- **Top Bar:** Fixed top.
  - **Omni-Search:** "Search contacts..." (CMD+K style). White w/ black border.
  - **System Status:** Pill shape, "SYSTEM: ONLINE" (Green dot).
  - **Notifications:** Bell icon, red badge.
  - **Profile:** Pill shape, Avatar ("AS"), Name ("Alex"), Role ("Senior AE").

### Screen 1: DESK (CommandCenter.tsx)
- **Priority Focus Section:**
  - Date Badge: Yellow, rotated slightly.
  - Heading: "PRIORITY QUEUE".
  - Button: "ADJUST FOCUS".
- **Hero Card (Purple):**
  - Label: "CURRENT MODE: HIGH QUALITY".
  - Copy: "Identified for immediate contact (Prob > 85%)."
  - **Main CTA:** White button "START DIALING ->".
  - **Energy Level:** Indicator (Battery/Progress).
- **System Health:** Two indicators (Database Sync, CRM Connection) - White bars with Green LEDs.
- **Live Stats:**
  - Rotated Yellow Badge: "LIVE STATS".
  - Grid of 4: Calls Today (Big Number), Pipeline Value, Velocity, Success Rate.
- **Tactical Schedule:** Visual timeline of the day (Deep Work, Admin blocks).

### Screen 2: DIALER (LiveCampaigns.tsx)
- **Left Panel (Queue):**
  - Tabs: Priority, Follow-up, Cold.
  - List Items: Name, Company, Score (98/100). Active state highlights item.
- **Center Panel (Workspace):**
  - **Header:** Contact Name, Title, Local Time. Actions: "Open CRM", "LinkedIn".
  - **Tabs:** SCRIPT (Interactive text), NOTES (Textarea).
  - **Call Controls (Bottom):**
    - Giant "DIAL" button.
    - Keypad / Mute.
    - Outcome Grid: "Meeting Booked", "No Answer", "Gatekeeper", "Not Interested".
- **Right Panel (Context):**
  - Info Cards: Phone, Email, Location.
  - History Feed: Previous calls/notes.
  - Tags: "Decision Maker", etc.

### Screen 3: STATS (Intelligence.tsx)
- **Header:** "MISSION REPORT".
- **KPI Row:** Total Calls, Connected, Meetings, Conversion %.
- **Charts:**
  - Activity Volume (Bar Chart).
  - Outcome Distribution (Pie Chart).
- **Insights:** "Best Time to Call", "Top Objection", "Avg Duration".

### Screen 4: COACH (MeetCoach.tsx)
- **Header:** "TACTICAL DEBRIEF".
- **Feedback Feed:** Cards labeled WIN (Green), IMPROVE (Yellow), TIP (Blue).
- **Gamification:** Current Streak (Fire icon), Focus Score.

### Screen 5: CONFIGURATION
- **Profile:** Edit Name, Role.
- **Integrations:** CRM (Salesforce/HubSpot) toggles.
- **Interface:** "Dopamine Mode" (Toggle), "Focus Mode", Theme.

---

## 4. File Structure Map
- `/src/components/` - Reusable UI (Sidebar, TopBar).
- `/src/pages/` - Main views (CommandCenter, LiveCampaigns, etc.).
- `/src/contexts/SalesContext.tsx` - Global state (Stats, Current Lead, Settings).
- `/src/utils/supabase/` - Backend connection.
- `/src/styles/globals.css` - Tailwind imports & custom utilities.

## 5. Coding Instructions for Copilot
1. **Always** use the specific design tokens (border-2, black, shadow).
2. **Never** use default soft shadows or gray borders.
3. **Always** check `SalesContext` for global data before creating local state.
4. **Mock Data:** If Supabase isn't connected, use realistic "Sales" mock data (e.g., "Acme Corp", "SaaS Deal").
