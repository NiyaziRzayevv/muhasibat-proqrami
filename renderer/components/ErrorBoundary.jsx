import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex items-center justify-center h-full w-full p-8">
        <div className="card max-w-lg w-full p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Xəta baş verdi</h2>
            <p className="text-sm text-dark-400">Bu səhifə yüklənərkən xəta yarandı.</p>
          </div>
          {this.state.error && (
            <div className="bg-dark-800 border border-dark-700 rounded-xl p-3 text-left">
              <p className="text-xs font-mono text-red-400 break-all">
                {this.state.error.message || String(this.state.error)}
              </p>
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="btn-primary mx-auto"
          >
            <RefreshCw size={14} /> Yenidən cəhd et
          </button>
        </div>
      </div>
    );
  }
}
