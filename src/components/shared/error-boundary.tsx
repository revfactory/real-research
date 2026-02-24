'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">문제가 발생했습니다</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
            {this.state.error?.message || '예상치 못한 오류가 발생했습니다.'}
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            새로고침
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
