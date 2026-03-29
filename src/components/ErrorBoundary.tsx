import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      let errorMessage = 'Ocurrió un error inesperado en la aplicación.';
      
      try {
        // Check if it's a Firestore error JSON
        if (error?.message.startsWith('{')) {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('insufficient permissions')) {
            errorMessage = 'No tienes permisos suficientes para realizar esta acción. Por favor, contacta al administrador.';
          } else if (errData.error.includes('quota exceeded')) {
            errorMessage = 'Se ha excedido la cuota de uso de la base de datos. Por favor, intenta de nuevo mañana.';
          }
        }
      } catch (e) {
        // Fallback to default message
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full space-y-6 bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">¡Ups! Algo salió mal</h2>
              <p className="text-white/40 text-[15px] leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
            >
              <RefreshCcw className="w-4 h-4" />
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
