import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const message = this.state.error?.toString() ?? 'Unknown error';
      const isChunkError = message.includes('Failed to fetch dynamically imported module');

      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0a', padding: 24, fontFamily: 'sans-serif', color: '#f5f5f5',
        }}>
          <div className="glass" style={{
            maxWidth: 600, width: '100%', borderRadius: 16, padding: 32,
            border: '1px solid rgba(239,68,68,0.2)', position: 'relative',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
              }}>
                <AlertTriangle size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Application Error</h2>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
                  {isChunkError
                    ? 'A new version was deployed. Reload to fetch the latest files.'
                    : 'Something went wrong in the rendering tree.'}
                </p>
              </div>
            </div>

            <div style={{
              background: '#141414', border: '1px solid #2a2a2a', borderRadius: 8,
              padding: 16, marginBottom: 24, overflowX: 'auto',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#ef4444' }}>
                {this.state.error?.toString()}
              </p>
              {this.state.errorInfo && (
                <pre style={{
                  margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)',
                  fontFamily: 'monospace', lineHeight: 1.5,
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Button onClick={this.handleReload} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={14} />
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
