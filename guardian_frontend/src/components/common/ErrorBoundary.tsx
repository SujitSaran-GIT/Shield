// src/components/common/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface BoundaryProps { children?: React.ReactNode; title?: string; message?: string; onRetry?: () => void }
interface BoundaryState { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null; showDetails: boolean }
class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log to error reporting service
    if (import.meta.env.DEV) console.error('Component render failed');
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {this.props.title || 'Something went wrong'}
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {this.props.message || 'An unexpected error occurred. Please try again.'}
                </p>

                {this.state.error && import.meta.env.DEV && (
                  <div className="mb-6">
                    <button
                      onClick={this.toggleDetails}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
                    >
                      {this.state.showDetails ? 'Hide details' : 'Show details'}
                    </button>
                    
                    {this.state.showDetails && (
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-left">
                        <p className="text-sm font-mono text-red-600 dark:text-red-400 break-all mb-2">
                          {this.state.error.toString()}
                        </p>
                        {this.state.errorInfo?.componentStack && (
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
