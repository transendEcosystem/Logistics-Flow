'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handlePossibleStaleChunk, isChunkLoadError } from '@/lib/chunk-reload';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isRecovering: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRecovering: isChunkLoadError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // A stale chunk after a deploy is recoverable, so reload rather than
    // stranding the user on an error panel.
    if (handlePossibleStaleChunk(error)) return;

    this.setState({ isRecovering: false });
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    // Clearing state cannot recover a missing file, so force a fresh page load.
    if (isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, isRecovering: false });
  };

  public render() {
    if (this.state.hasError) {
      if (this.state.isRecovering) {
        return (
          <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Updating to the latest version&hellip;</p>
          </div>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center space-y-4 bg-muted/20 rounded-xl border border-border/50 my-4 mx-2">
          <div className="p-3 bg-destructive/10 text-destructive rounded-full">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-lg font-bold text-foreground">Something went wrong</h3>
            <p className="text-xs text-muted-foreground break-words">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleReset}
            className="gap-2 font-medium"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
