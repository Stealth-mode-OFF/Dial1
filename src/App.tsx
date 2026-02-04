import React, { useEffect } from 'react';
import { NeoBrutalDialerApp } from './NeoBrutalDialerApp';

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'neobrutalist');
  }, []);

  return <NeoBrutalDialerApp />;
}
