import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Send, Download, Bot, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  fileUrl?: string;
  fileName?: string;
};

export default function SegmentacoesPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Olá! Descreva qual segmento de clientes você deseja exportar. (Ex: 'Clientes que tem consorcio')"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem('hub_token');
      const response = await fetch(`${API_URL}/segment/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: userMsg.content })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao gerar segmentação na API externa.");
      }

      const json = await response.json();
      const url = json.downloadUrl;
      const fileName = json.fileName;
      
      console.log("Baixando pela nova rota oficial Express:", url);

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        content: "Sua planilha de segmentação está pronta! O download deve iniciar automaticamente, ou clique abaixo:",
        fileUrl: url,
        fileName
      }]);
      
      // Abre a rota oficial de download no próprio navegador, garantindo compatibilidade 100%
      window.location.href = url;
      
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        content: "Houve um erro ao tentar gerar a planilha. Por favor, tente novamente."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-5xl mx-auto p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-[hsl(var(--hub-text))] flex items-center gap-2">
          <Target className="w-6 h-6 text-[hsl(var(--hub-primary))]" />
          Assistente de Segmentação
        </h1>
        <p className="text-sm text-[hsl(var(--hub-text-muted))]">
          Solicite planilhas segmentadas via chat e baixe em Excel instantaneamente.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto bg-[hsl(var(--hub-surface))] border border-[hsl(var(--hub-border))] rounded-t-xl p-4 md:p-6 space-y-6">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-[hsl(var(--hub-primary))] text-white" : "bg-[hsl(var(--hub-surface-muted))] text-[hsl(var(--hub-text))]"
            }`}>
              {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            
            <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`p-4 rounded-2xl ${
                msg.role === "user" 
                  ? "bg-[hsl(var(--hub-primary))] text-white rounded-tr-sm" 
                  : "bg-[hsl(var(--hub-background))] border border-[hsl(var(--hub-border))] text-[hsl(var(--hub-text))] rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
              
              {msg.fileUrl && (
                <a 
                  href={msg.fileUrl} 
                  download={msg.fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {msg.fileName}
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4 flex-row">
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--hub-surface-muted))] text-[hsl(var(--hub-text))] flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-2xl bg-[hsl(var(--hub-background))] border border-[hsl(var(--hub-border))] rounded-tl-sm flex items-center gap-2 text-[hsl(var(--hub-text-muted))]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando planilha (pode levar alguns segundos)...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="bg-[hsl(var(--hub-surface))] border-x border-b border-[hsl(var(--hub-border))] p-4 rounded-b-xl flex gap-2">
        <Input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ex: Clientes que tem consorcio..."
          className="flex-1 bg-[hsl(var(--hub-background))]"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <Button 
          onClick={sendMessage} 
          disabled={!input.trim() || loading}
          className="bg-[hsl(var(--hub-primary))] text-white hover:bg-[hsl(var(--hub-primary-hover))]"
        >
          <Send className="w-4 h-4 mr-2" />
          Gerar Planilha
        </Button>
      </div>
    </div>
  );
}
