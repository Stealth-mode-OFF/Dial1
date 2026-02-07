export type WorkspaceRole = 'owner' | 'admin' | 'member';

export type Workspace = {
  id: string;
  name: string;
  is_personal: boolean;
  created_by: string;
  created_at: string;
};

export type Contact = {
  id: string;
  workspace_id: string;
  full_name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CallOutcome =
  | 'connected'
  | 'no_answer'
  | 'voicemail'
  | 'callback'
  | 'not_interested'
  | 'interested'
  | 'booked_meeting';

export type CallSession = {
  id: string;
  workspace_id: string;
  contact_id: string;
  channel: string;
  dialed_number: string | null;
  outcome: CallOutcome | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CallNote = {
  id: string;
  workspace_id: string;
  call_session_id: string;
  author_user_id: string;
  body_text: string;
  created_at: string;
};

