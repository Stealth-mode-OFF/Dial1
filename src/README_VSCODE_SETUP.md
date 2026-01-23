# Echo Dialer MVP - VS Code & Copilot Setup Guide

This guide explains how to migrate the "Echo Dialer" project from the cloud environment to your local VS Code, enabling you to use GitHub Copilot to generate new features in the same "Neo-brutalist" style.

## 1. Local Project Initialization

We use **Vite** for a fast, modern React setup. Open your terminal and run:

```bash
npm create vite@latest echo-dialer -- --template react-ts
cd echo-dialer
```

## 2. Install Dependencies

Copy and run this command to install the libraries used in the project:

```bash
npm install lucide-react recharts @supabase/supabase-js react-router-dom clsx tailwind-merge
```

*Note: We are using Tailwind CSS v4. If you are setting this up from scratch, ensure you have the latest PostCSS plugins.*

## 3. Tailwind CSS Setup (Crucial for Design)

The unique "Neo-brutalist" look (thick borders, shadows, bold colors) relies on specific utility classes.

1.  Ensure Tailwind is installed:
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```

2.  Update `tailwind.config.js` (if using v3) or `src/index.css` (if using v4).
    *   *Key Style Rule:* The project uses `border-2 border-black` and `shadow-[4px_4px_0px_0px_black]` extensively.

3.  **Copy the CSS**: Open `src/index.css` in your local project and paste the content from `/styles/globals.css` in this environment. This contains the `@layer utilities` that make the shadows work.

## 4. Migrating the Code

Recreate the following file structure in your `src` folder:

```text
src/
├── components/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── (Other UI components)
├── pages/
│   ├── CommandCenter.tsx
│   ├── LiveCampaigns.tsx
│   ├── Intelligence.tsx
│   ├── MeetCoach.tsx
│   └── Configuration.tsx
├── contexts/
│   └── SalesContext.tsx
├── utils/
│   └── supabase/
│       ├── client.ts
│       └── info.ts
└── App.tsx
```

**Action:** Copy the code from each file in the browser editor and paste it into the corresponding file in VS Code.

## 5. Using GitHub Copilot with this Design

Once the files are in VS Code, Copilot can "read" your existing styles to generate matching components.

### How to Prompt Copilot

When asking Copilot to create a new UI element, always reference the design system context.

**Example Prompt:**
> "Create a modal for 'Add New Contact'. Use the same neo-brutalist style as the rest of the app: white background, 2px black border, hard black shadow (neobrutal-shadow), and Space Grotesk font. The header should be black with white text."

### "Feeding" the Context
If Copilot isn't matching the style:
1.  Open `CommandCenter.tsx` or `globals.css` in a tab (keep it open).
2.  Copilot uses open tabs as context.
3.  Ask: *"Look at CommandCenter.tsx and create a similar card for 'Missed Calls'."*

## 6. Connecting the Backend

The project uses Supabase.
1.  Create a `.env` file in your project root.
2.  Add your keys:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```
3.  Update `src/utils/supabase/client.ts` to use `import.meta.env.VITE_SUPABASE_URL`.

---

**Design System Cheatsheet for Copilot:**
- **Borders:** `border-2 border-black`
- **Shadows:** `shadow-[4px_4px_0px_0px_black]` (or `neobrutal-shadow` class)
- **Hover:** `hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_black]`
- **Active:** `active:translate-y-[2px] active:shadow-none`
- **Colors:** `bg-yellow-300`, `bg-pink-400`, `bg-emerald-400`, `bg-slate-50`
- **Typography:** `font-black uppercase tracking-tighter` (Headlines), `font-mono font-bold` (Data/Labels)
