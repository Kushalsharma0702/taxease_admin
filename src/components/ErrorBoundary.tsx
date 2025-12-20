import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import logger from '@/lib/logger';
import config from '@/config';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary caught an error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-2xl w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-xl font-semibold">
                Something went wrong
              </AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-4">
                  We're sorry, but something unexpected happened. The error has been logged
                  and our team will look into it.
                </p>
                
                {config.isDevelopment() && this.state.error && (
                  <details className="mt-4 p-4 bg-muted rounded-lg">
                    <summary className="cursor-pointer font-semibold mb-2">
                      Error Details (Development Only)
                    </summary>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Error:</strong>
                        <pre className="mt-1 p-2 bg-background rounded overflow-x-auto">
                          {this.state.error.toString()}
                        </pre>
                      </div>
                      {this.state.errorInfo && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="mt-1 p-2 bg-background rounded overflow-x-auto text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>
                If this problem persists, please contact support at{' '}
                <a
                  href="mailto:support@taxhub.com"
                  className="text-primary hover:underline"
                >
                  support@taxhub.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
