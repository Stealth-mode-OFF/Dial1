import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary for graceful error handling in production.
 * Catches JavaScript errors in child component tree.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call optional error handler (for analytics/logging)
    this.props.onError?.(error, errorInfo);
    
    // In production, you could send to error tracking service
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Placeholder for error reporting service (Sentry, LogRocket, etc.)
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    // Log for now - replace with actual error service
    console.error('[Production Error Report]', errorReport);
    
    // Example: Send to backend
    // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorReport) });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h2 className="error-boundary-title">Něco se pokazilo</h2>
            <p className="error-boundary-message">
              Omlouváme se, došlo k neočekávané chybě.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Technické detaily</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            
            <div className="error-boundary-actions">
              <button 
                className="error-boundary-btn error-boundary-btn-primary"
                onClick={this.handleRetry}
              >
                Zkusit znovu
              </button>
              <button 
                className="error-boundary-btn error-boundary-btn-secondary"
                onClick={this.handleReload}
              >
                Obnovit stránku
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
