import React from 'react';
import { useApiHealth } from '../hooks/useApi';

interface ConnectionStatusProps {
  showDetails?: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

/**
 * Connection status indicator showing API health.
 * Displays latency and connection state.
 */
export function ConnectionStatus({ showDetails = false, position = 'bottom-right' }: ConnectionStatusProps) {
  const health = useApiHealth(30000);
  
  const getStatusColor = () => {
    if (!health.configured) return 'var(--gray-400)';
    if (!health.reachable) return 'var(--danger)';
    if (health.latency && health.latency > 1000) return 'var(--amber-500)';
    return 'var(--success)';
  };
  
  const getStatusText = () => {
    if (!health.configured) return 'Not configured';
    if (!health.reachable) return 'Disconnected';
    if (health.latency && health.latency > 1000) return 'Slow connection';
    return 'Connected';
  };
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: 16, right: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'top-left': { top: 16, left: 16 },
    'bottom-left': { bottom: 16, left: 16 },
  };
  
  return (
    <div 
      className="connection-status"
      style={positionStyles[position]}
      title={health.error || getStatusText()}
    >
      <span 
        className="connection-status-dot"
        style={{ background: getStatusColor() }}
      />
      {showDetails && (
        <span className="connection-status-text">
          {getStatusText()}
          {health.latency && ` (${health.latency}ms)`}
        </span>
      )}
    </div>
  );
}

/**
 * API Status Banner for configuration errors.
 */
export function ApiStatusBanner({ onDismiss }: { onDismiss?: () => void }) {
  const health = useApiHealth();
  
  if (health.configured && health.reachable) return null;
  
  const isConfigError = !health.configured;
  const isConnectionError = health.configured && !health.reachable;
  
  return (
    <div className={`api-status-banner ${isConfigError ? 'config-error' : 'connection-error'}`}>
      <div className="api-status-banner-content">
        <span className="api-status-banner-icon">
          {isConfigError ? '⚙️' : '📡'}
        </span>
        <div className="api-status-banner-text">
          <strong>
            {isConfigError ? 'API Configuration Required' : 'Connection Lost'}
          </strong>
          <p>
            {isConfigError 
              ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
              : `Unable to reach the server. ${health.error || 'Check your network connection.'}`
            }
          </p>
        </div>
        {onDismiss && (
          <button className="api-status-banner-dismiss" onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton component.
 */
export function Skeleton({ 
  width = '100%', 
  height = 20, 
  variant = 'text',
  count = 1,
}: { 
  width?: string | number; 
  height?: number; 
  variant?: 'text' | 'circle' | 'rect';
  count?: number;
}) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: `${height}px`,
    borderRadius: variant === 'circle' ? '50%' : variant === 'text' ? '4px' : '8px',
  };
  
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={style} />
      ))}
    </>
  );
}

/**
 * Empty state component.
 */
export function EmptyState({
  icon = '📭',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">{icon}</span>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <button className="empty-state-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Loading spinner component.
 */
export function Spinner({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      className="spinner"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  );
}

/**
 * Toast notification component.
 */
export function Toast({
  message,
  type = 'info',
  onClose,
  duration = 5000,
}: {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
  duration?: number;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };
  
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  );
}

export default ConnectionStatus;
