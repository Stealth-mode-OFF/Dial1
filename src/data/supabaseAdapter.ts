import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AddCallNoteInput,
  DataAdapter,
  ListContactsParams,
  ListParams,
  StartCallSessionInput,
  UpsertContactInput,
} from './adapter';
import type { CallNote, CallOutcome, CallSession, Contact, Workspace } from './types';

type PostgrestMaybe<T> = T | null;

function limitOrDefault(params: ListParams | undefined, fallback: number): number {
  const limit = params?.limit ?? fallback;
  return Math.max(1, Math.min(200, limit));
}

export function createSupabaseAdapter(supabase: SupabaseClient): DataAdapter {
  return {
    async signUp(email, password) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
    },

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    async getMe() {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },

    async ensureWorkspaceForUser() {
      const { data, error } = await supabase.rpc('ensure_personal_workspace');
      if (error) throw error;
      const workspaceId = data as string;
      return this.getActiveWorkspaceById(workspaceId);
    },

    async getActiveWorkspace() {
      // MVP: personal workspace is the only "active" workspace.
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('is_personal', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Should not happen if onboarding is configured; self-heal via RPC.
        const ws = await this.ensureWorkspaceForUser();
        return ws;
      }
      return data as Workspace;
    },

    async listContacts(params: ListContactsParams) {
      const limit = limitOrDefault(params, 100);
      const q = (params.query ?? '').trim();

      let query = supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', params.workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Simple search across name/company/email/phone
      if (q) {
        const escaped = q.replaceAll('%', '\\%').replaceAll('_', '\\_');
        query = query.or(
          [
            `full_name.ilike.%${escaped}%`,
            `company.ilike.%${escaped}%`,
            `email.ilike.%${escaped}%`,
            `phone.ilike.%${escaped}%`,
          ].join(','),
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Contact[];
    },

    async getContact(workspaceId: string, contactId: string) {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('id', contactId)
        .single();
      if (error) throw error;
      return data as Contact;
    },

    async upsertContact(workspaceId: string, input: UpsertContactInput) {
      const payload = {
        id: input.id,
        workspace_id: workspaceId,
        full_name: input.full_name.trim(),
        company: input.company?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        tags: input.tags ?? [],
      };

      if (!payload.full_name) {
        throw new Error('full_name is required');
      }

      if (payload.id) {
        const { data, error } = await supabase
          .from('contacts')
          .update({
            full_name: payload.full_name,
            company: payload.company,
            phone: payload.phone,
            email: payload.email,
            tags: payload.tags,
          })
          .eq('workspace_id', workspaceId)
          .eq('id', payload.id)
          .select('*')
          .single();
        if (error) throw error;
        return data as Contact;
      }

      const { data, error } = await supabase.from('contacts').insert(payload).select('*').single();
      if (error) throw error;
      return data as Contact;
    },

    async deleteContact(workspaceId: string, contactId: string) {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('id', contactId);
      if (error) throw error;
    },

    async startCallSession(input: StartCallSessionInput) {
      const payload = {
        workspace_id: input.workspaceId,
        contact_id: input.contactId,
        channel: input.channel ?? 'phone',
        dialed_number: input.dialedNumber ?? null,
      };
      const { data, error } = await supabase.from('call_sessions').insert(payload).select('*').single();
      if (error) throw error;
      return data as CallSession;
    },

    async endCallSession(callSessionId: string, outcome: CallOutcome) {
      const { data, error } = await supabase.rpc('end_call_session', {
        p_session_id: callSessionId,
        p_outcome: outcome,
      });
      if (error) throw error;
      return data as CallSession;
    },

    async listCallSessionsForContact(workspaceId: string, contactId: string, params?: ListParams) {
      const limit = limitOrDefault(params, 50);
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('contact_id', contactId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CallSession[];
    },

    async listRecentCallSessions(workspaceId: string, params?: ListParams) {
      const limit = limitOrDefault(params, 50);
      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CallSession[];
    },

    async addCallNote(input: AddCallNoteInput) {
      const body = input.bodyText.trim();
      if (!body) throw new Error('body_text is required');

      const payload = {
        workspace_id: input.workspaceId,
        call_session_id: input.callSessionId,
        body_text: body,
      };

      const { data, error } = await supabase.from('call_notes').insert(payload).select('*').single();
      if (error) throw error;
      return data as CallNote;
    },

    async listCallNotes(workspaceId: string, callSessionId: string, params?: ListParams) {
      const limit = limitOrDefault(params, 100);
      const { data, error } = await supabase
        .from('call_notes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('call_session_id', callSessionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as CallNote[];
    },

    // Non-interface helper (kept private via closure-style method).
    async getActiveWorkspaceById(workspaceId: string) {
      const { data, error } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
      if (error) throw error;
      return data as Workspace;
    },
  } as DataAdapter & { getActiveWorkspaceById: (workspaceId: string) => Promise<Workspace> };
}

