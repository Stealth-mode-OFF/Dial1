// ═══════════════════════════════════════════════════════════════
// UserSettingsContext — per-user dialer config (server-persisted)
//
// Wraps the whole app. Any component can call useUserSettingsCtx()
// to read resolved settings (with defaults) or save updates.
// ═══════════════════════════════════════════════════════════════

import React, { createContext, useContext } from "react";
import {
  useUserSettings,
  type UserSettings,
  type QualQuestion,
} from "../hooks/useUserSettings";

export type UserSettingsContextValue = {
  raw: UserSettings | null;
  loading: boolean;
  saving: boolean;
  save: (partial: Partial<UserSettings>) => Promise<any>;
  openingScript: string;
  smsTemplate: string;
  schedulerUrl: string;
  pipedriveDomain: string;
  qualQuestions: readonly QualQuestion[];
  salesStyle: "hunter" | "consultative";
};

const Ctx = createContext<UserSettingsContextValue | null>(null);

export function UserSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useUserSettings();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUserSettingsCtx(): UserSettingsContextValue {
  const v = useContext(Ctx);
  if (!v)
    throw new Error(
      "useUserSettingsCtx must be used within UserSettingsProvider",
    );
  return v;
}
