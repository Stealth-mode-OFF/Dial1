import { createContext, useContext } from 'react';
import type { Workspace } from '../data/types';

export type WorkspaceState = {
  loading: boolean;
  workspace: Workspace | null;
};

const WorkspaceContext = createContext<WorkspaceState | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceState;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('WorkspaceProvider missing');
  return ctx;
}

