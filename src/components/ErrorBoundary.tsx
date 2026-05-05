import { Component, type ErrorInfo, type ReactNode } from "react";
import { Shield, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Algo deu errado
        </h1>
        <p className="text-muted-foreground max-w-md mb-6">
          Ocorreu um erro inesperado. Tente recarregar a página ou voltar para o início.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre className="text-xs text-left bg-muted p-4 rounded-lg mb-6 max-w-lg overflow-x-auto border">
            {this.state.error.message}
            {"\n"}
            {this.state.error.stack?.split("\n").slice(1, 4).join("\n")}
          </pre>
        )}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={this.handleRetry}>
            Tentar novamente
          </Button>
          <Button onClick={this.handleReload}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar página
          </Button>
        </div>
      </div>
    );
  }
}
