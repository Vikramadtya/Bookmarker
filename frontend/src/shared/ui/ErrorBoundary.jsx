import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-100 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            <h1 className="mb-2 text-2xl font-bold tracking-tight">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              The application encountered an unexpected error. Please try
              reloading the page.
            </p>

            {this.state.error && (
              <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-4 font-mono text-xs text-slate-600 shadow-inner dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
