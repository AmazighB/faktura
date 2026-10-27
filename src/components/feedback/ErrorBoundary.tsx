import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-950">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Une erreur inattendue s'est produite
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              L'application a rencontré un problème. Vos données ne sont pas affectées. Vous pouvez réessayer ou recharger la page.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-gray-100 p-3 text-left text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                {this.state.error.message}
              </pre>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <RotateCcw className="h-4 w-4" />
                Réessayer
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Recharger la page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
