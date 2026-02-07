import type { User } from '@supabase/supabase-js';
import type { CallNote, CallOutcome, CallSession, Contact, Workspace } from './types';

export type ListParams = {
  limit?: number;
};

export type ListContactsParams = ListParams & {
  workspaceId: string;
  query?: string;
};

export type UpsertContactInput = {
  id?: string;
  full_name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  tags?: string[];
};

export type StartCallSessionInput = {
  workspaceId: string;
  contactId: string;
  channel?: string;
  dialedNumber?: string | null;
};

export type AddCallNoteInput = {
  workspaceId: string;
  callSessionId: string;
  bodyText: string;
};

export type SignUpResult = {
  /**
   * When email confirmations are enabled in Supabase, `signUp` succeeds but no
   * session is created until the user clicks the confirmation link.
   */
  requiresEmailConfirmation: boolean;
};

export interface DataAdapter {
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getMe(): Promise<User | null>;

  ensureWorkspaceForUser(): Promise<Workspace>;
  getActiveWorkspace(): Promise<Workspace>;

  listContacts(params: ListContactsParams): Promise<Contact[]>;
  getContact(workspaceId: string, contactId: string): Promise<Contact>;
  upsertContact(workspaceId: string, input: UpsertContactInput): Promise<Contact>;
  deleteContact(workspaceId: string, contactId: string): Promise<void>;

  startCallSession(input: StartCallSessionInput): Promise<CallSession>;
  endCallSession(callSessionId: string, outcome: CallOutcome): Promise<CallSession>;
  listCallSessionsForContact(workspaceId: string, contactId: string, params?: ListParams): Promise<CallSession[]>;
  listRecentCallSessions(workspaceId: string, params?: ListParams): Promise<CallSession[]>;

  addCallNote(input: AddCallNoteInput): Promise<CallNote>;
  listCallNotes(workspaceId: string, callSessionId: string, params?: ListParams): Promise<CallNote[]>;
}
