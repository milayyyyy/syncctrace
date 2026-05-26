import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen min-h-dvh flex items-center justify-center bg-slate-100 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-lg p-6 text-center">
            <p className="text-lg font-bold text-gray-900 mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-4">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => globalThis.location.assign('/login')}
              className="px-4 py-2 rounded-xl bg-[#1E3A5F] text-white text-sm font-semibold"
            >
              Back to login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
