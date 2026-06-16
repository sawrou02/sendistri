import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Change this key (e.g. route path) to auto-reset the boundary on navigation. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // Log for debugging — never crashes the whole app anymore.
    console.error('ErrorBoundary caught:', error, info);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
            ⚠️
          </div>
          <h2 className="mb-2 text-xl font-bold text-sendistri-dark">Une erreur est survenue</h2>
          <p className="mb-4 max-w-md text-sm text-gray-500">
            Cette page a rencontré un problème. Tu peux réessayer ou revenir au tableau de bord.
          </p>
          {this.state.error && (
            <pre className="mb-4 max-w-md overflow-auto rounded-lg bg-gray-50 p-3 text-left text-xs text-gray-400">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Réessayer
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Tableau de bord
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
