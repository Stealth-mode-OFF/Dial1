import { createContext, useContext } from 'react';
import type { DataAdapter } from '../data/adapter';

const AdapterContext = createContext<DataAdapter | null>(null);

export function AdapterProvider({
  adapter,
  children,
}: {
  adapter: DataAdapter;
  children: React.ReactNode;
}) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

export function useAdapter(): DataAdapter {
  const adapter = useContext(AdapterContext);
  if (!adapter) throw new Error('AdapterProvider missing');
  return adapter;
}

