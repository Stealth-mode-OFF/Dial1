// ═══════════════════════════════════════════════════════════════
// useUserSettings — loads per-user dialer config from server
//
// Provides dynamic overrides for config.ts defaults.
// Settings are stored server-side in KV (per user).
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { echoApi } from "../utils/echoApi";
import { isSupabaseConfigured } from "../utils/supabase/info";
import type { UserSettings, QualQuestion } from "../utils/echoApi";
import {
  QUAL_QUESTIONS as DEFAULT_QUAL_QUESTIONS,
  OPENING_SCRIPT as DEFAULT_OPENING_SCRIPT,
  DEFAULT_SMS_TEMPLATE,
  SCHEDULER_URL as DEFAULT_SCHEDULER_URL,
  PIPEDRIVE_DOMAIN as DEFAULT_PIPEDRIVE_DOMAIN,
} from "../features/dialer/config";

export type { UserSettings, QualQuestion };

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    if (!isSupabaseConfigured || loadedRef.current) return;
    loadedRef.current = true;

    echoApi
      .getUserSettings()
      .then((res) => {
        if (res?.settings) setSettings(res.settings);
      })
      .catch((err) => {
        console.warn("Failed to load user settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Save (partial update — merges with existing)
  const save = useCallback(async (partial: Partial<UserSettings>) => {
    setSaving(true);
    try {
      const res = await echoApi.saveUserSettings(partial);
      if (res?.ok && res.settings) {
        setSettings(res.settings);
      }
      return res;
    } finally {
      setSaving(false);
    }
  }, []);

  // Resolved values with defaults
  const openingScript = settings?.openingScript || DEFAULT_OPENING_SCRIPT;
  const smsTemplate = settings?.smsTemplate || DEFAULT_SMS_TEMPLATE;
  const schedulerUrl = settings?.schedulerUrl || DEFAULT_SCHEDULER_URL;
  const pipedriveDomain = settings?.pipedriveDomain || DEFAULT_PIPEDRIVE_DOMAIN;
  const qualQuestions: readonly QualQuestion[] = settings?.qualQuestions?.length
    ? settings.qualQuestions
    : DEFAULT_QUAL_QUESTIONS;
  const salesStyle = settings?.salesStyle || "hunter";

  return {
    // Raw settings (null until loaded)
    raw: settings,
    loading,
    saving,
    save,

    // Resolved (with defaults)
    openingScript,
    smsTemplate,
    schedulerUrl,
    pipedriveDomain,
    qualQuestions,
    salesStyle,
  };
}
