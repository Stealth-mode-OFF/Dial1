/**
 * Configuration Page
 *
 * Renders the main system configuration and integrations UI.
 * Uses the canonical Figma 1:1 SettingsScreen implementation.
 *
 * For handover: All configuration logic and UI is in SettingsScreen.
 */
import React from 'react';
import { SettingsScreen } from '../components/SettingsScreen';

export default function Configuration() {
  return <SettingsScreen salesStyle="consultative" setSalesStyle={() => {}} />;
}
