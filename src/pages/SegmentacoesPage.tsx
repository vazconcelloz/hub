import { useState, useRef, useEffect } from "react";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Send, Download, Bot, User, Loader2, Table as TableIcon, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  fileUrl?: string;
  fileName?: string;
  previewData?: any[];
};

export default function SegmentacoesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Olá! Descreva qual segmento de clientes você deseja exportar. (Ex: 'Clientes que tem consorcio')"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (mode: 'export' | 'preview' = 'preview') => {
    if (!input.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setSelectedItems([]); // Limpa seleção anterior

    try {
      const token = localStorage.getItem('hub_token');
      const endpoint = mode === 'export' ? '/segment/export' : '/segment/preview';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: userMsg.content })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Erro ao processar segmentação (${mode}).`);
      }

      const json = await response.json();
      
      if (mode === 'export') {
        const url = json.downloadUrl;
        const fileName = json.fileName;
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "bot",
          content: "Sua planilha de segmentação está pronta! O download deve iniciar automaticamente, ou clique abaixo:",
          fileUrl: url,
          fileName
        }]);
        window.location.href = url;
      } else {
        // Preview mode
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "bot",
          content: `Encontrei alguns resultados para sua busca. Você pode visualizar abaixo e selecionar quais deseja enviar para o RD Station:`,
          previewData: json.data || json // Ajustar conforme o retorno da API
        }]);
      }
      
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        content: "Houve um erro ao tentar processar sua solicitação. Por favor, tente novamente."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (item: any) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => JSON.stringify(i) === JSON.stringify(item));
      if (exists) {
        return prev.filter(i => JSON.stringify(i) !== JSON.stringify(item));
      } else {
        return [...prev, item];
      }
    });
  };

  const handleSelectAll = (items: any[]) => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items);
    }
  };

  const navigateToMapping = () => {
    if (selectedItems.length > 0) {
      navigate("/app/segmentacoes/rd-mapping", { state: { items: selectedItems } });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-6xl mx-auto p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-[hsl(var(--hub-text))] flex items-center gap-2">
          <Target className="w-6 h-6 text-[hsl(var(--hub-primary))]" />
          Assistente de Segmentação
        </h1>
        <p className="text-sm text-[hsl(var(--hub-text-muted))]">
          Solicite planilhas, visualize dados e envie negociações para o RD Station CRM.
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
            
            <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end max-w-[80%]" : "items-start w-full"}`}>
              <div className={`p-4 rounded-2xl ${
                msg.role === "user" 
                  ? "bg-[hsl(var(--hub-primary))] text-white rounded-tr-sm max-w-max" 
                  : "bg-[hsl(var(--hub-background))] border border-[hsl(var(--hub-border))] text-[hsl(var(--hub-text))] rounded-tl-sm w-full lg:max-w-[90%]"
              }`}>
                {msg.content}
                
                {msg.previewData && msg.previewData.length > 0 && (
                  <div className="mt-4 space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                      <div className="overflow-x-auto max-h-[350px]">
                        <Table>
                          <TableHeader className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12">
                                <Checkbox 
                                  checked={selectedItems.length === msg.previewData.length}
                                  onCheckedChange={() => handleSelectAll(msg.previewData!)}
                                />
                              </TableHead>
                              {Object.keys(msg.previewData[0]).map(key => (
                                <TableHead key={key} className="whitespace-nowrap uppercase text-[10px] font-bold">
                                  {key.replace(/_/g, ' ')}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {msg.previewData.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Checkbox 
                                    checked={!!selectedItems.find(i => JSON.stringify(i) === JSON.stringify(row))}
                                    onCheckedChange={() => handleToggleSelect(row)}
                                  />
                                </TableCell>
                                {Object.values(row).map((val: any, vIdx) => (
                                  <TableCell key={vIdx} className="whitespace-nowrap text-xs max-w-[200px] truncate">
                                    {String(val)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 p-3 bg-[hsl(var(--hub-surface-muted))] rounded-lg">
                      <div className="text-sm font-medium">
                        {selectedItems.length} itens selecionados
                      </div>
                      <Button 
                        size="sm" 
                        onClick={navigateToMapping}
                        disabled={selectedItems.length === 0}
                        className="bg-[#364AD2] hover:bg-[#2A3AB3] text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Avançar para RD Station
                      </Button>
                    </div>
                  </div>
                )}
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
              Processando sua solicitação...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="bg-[hsl(var(--hub-surface))] border-x border-b border-[hsl(var(--hub-border))] p-4 rounded-b-xl flex flex-col gap-3">
        <div className="flex gap-2">
          <Input 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ex: Clientes que tem consorcio..."
            className="flex-1 bg-[hsl(var(--hub-background))]"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage('preview')}
            disabled={loading}
          />
          <Button 
            onClick={() => sendMessage('preview')} 
            disabled={!input.trim() || loading}
            className="bg-[hsl(var(--hub-primary))] text-white hover:bg-[hsl(var(--hub-primary-hover))]"
          >
            <TableIcon className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
        </div>
        <div className="flex justify-center">
          <Button 
            variant="ghost"
            onClick={() => sendMessage('export')} 
            disabled={!input.trim() || loading}
            className="text-xs text-[hsl(var(--hub-text-muted))] hover:text-[hsl(var(--hub-primary))] flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Ou exportar direto para Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
