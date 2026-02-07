// Legacy compat wrapper.
// The MVP settings live in `src/pages/SettingsPage.tsx`.

import { SettingsPage } from '../pages/SettingsPage';

export function SettingsScreen(_props: { salesStyle?: string; setSalesStyle?: (v: string) => void }) {
  return <SettingsPage />;
}

