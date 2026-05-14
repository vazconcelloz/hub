import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Send, AlertTriangle, CheckCircle2, X, Search, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface RDField {
  custom_field: {
    id: string;
    name: string;
    type: string;
    options?: string[];
  }
}

interface Funnel {
  id: string;
  name: string;
}

export default function RDStationMappingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [rdFields, setRdFields] = useState<RDField[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Seleções principais
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [rdUsers, setRdUsers] = useState<{ id: string, name: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [skipHeader, setSkipHeader] = useState(true);

  // Mapeamento: { [excelColumn: string]: { rdFieldId: string, isCustom: boolean, entityType?: string } }
  const [mappings, setMappings] = useState<Record<string, { rdFieldId: string, isCustom: boolean, entityType?: string }>>({});
  
  // Mapeamento de Opções: { [rdFieldId: string]: { [excelValue: string]: string } }
  const [optionMappings, setOptionMappings] = useState<Record<string, Record<string, string>>>({});
  
  // Mapeamento Condicional: { [excelColumn: string]: { conditionColumn: string, rules: { value: string, rdFieldId: string, entityType?: string }[] } }
  const [conditionalMappings, setConditionalMappings] = useState<Record<string, any>>({});
  
  // Estado dos Modais
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isConditionalModalOpen, setIsConditionalModalOpen] = useState(false);
  const [activeConditionalColumn, setActiveConditionalColumn] = useState<string | null>(null);
  const [activeMappingColumn, setActiveMappingColumn] = useState<string | null>(null);
  const [activeRdField, setActiveRdField] = useState<RDField | null>(null);

  useEffect(() => {
    if (!location.state || !location.state.items || location.state.items.length === 0) {
      toast({ title: "Nenhum dado", description: "Volte e selecione os dados novamente.", variant: "destructive" });
      navigate("/app/segmentacoes");
      return;
    }

    const data = location.state.items;
    setItems(data);
    setAvailableColumns(Object.keys(data[0]));

    fetchData();
  }, [location, navigate, toast]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('hub_token');
      const [fieldsRes, funnelsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/segment/rd-fields`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/segment/rd-funnels`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/segment/rd-users`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!fieldsRes.ok || !funnelsRes.ok || !usersRes.ok) throw new Error("Erro ao carregar dados do RD Station");

      const fieldsData = await fieldsRes.json();
      const funnelsData = await funnelsRes.json();
      const usersData = await usersRes.json();

      setRdFields(fieldsData.fields || []);
      setFunnels(funnelsData.funnels || []);
      setRdUsers(usersData.users || []);
      
      if (funnelsData.funnels?.length > 0) {
        setSelectedFunnelId(funnelsData.funnels[0].id);
        if (funnelsData.funnels[0].stages?.length > 0) {
          setSelectedStageId(funnelsData.funnels[0].stages[0].id);
        }
      }
      if (usersData.users?.length > 0) {
        // Por padrão seleciona o primeiro
        setSelectedUserIds([usersData.users[0].id]);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getDistinctValues = (column: string) => {
    if (!column) return [];
    const values = new Set(items.map(item => String(item[column] || '').trim()).filter(Boolean));
    return Array.from(values).slice(0, 10); // Amostra de 10
  };

  const handleSelectRDField = (excelColumn: string, value: string) => {
    if (value === "ignore") {
      const newMappings = { ...mappings };
      delete newMappings[excelColumn];
      setMappings(newMappings);
      return;
    }

    if (value === "conditional") {
      setActiveConditionalColumn(excelColumn);
      setIsConditionalModalOpen(true);
      return;
    }

    // Busca o campo para saber a entidade
    const field = rdFields.find(f => f.custom_field.id === value);
    const entityType = (field as any)?.custom_field.for || 'deal';

    const isCustom = value.startsWith("cf_") || value.length > 20; // IDs do RD são longos
    const rdFieldId = isCustom ? value : value; 
    
    setMappings(prev => ({
      ...prev,
      [excelColumn]: { rdFieldId, isCustom, entityType }
    }));

    // Se for um campo de opções, abre o modal
    const customField = rdFields.find(f => f.custom_field.id === rdFieldId);
    if (customField && (customField.custom_field.type === 'dropdown' || customField.custom_field.options?.length)) {
      setActiveMappingColumn(excelColumn);
      setActiveRdField(customField);
      setIsOptionModalOpen(true);
    }
  };

  const handleOptionMapping = (excelValue: string, rdOption: string) => {
    if (!activeRdField) return;
    setOptionMappings(prev => ({
      ...prev,
      [activeRdField.custom_field.id]: {
        ...(prev[activeRdField.custom_field.id] || {}),
        [excelValue]: rdOption
      }
    }));
  };

  const handleSubmit = async () => {
    setSending(true);
    try {
      const token = localStorage.getItem('hub_token');
      
      const basicMapping: any = {};
      const customFieldsMapping: any[] = [];

      Object.entries(mappings).forEach(([excelCol, map]) => {
        if (map.rdFieldId === 'name') basicMapping.name = excelCol;
        else if (map.rdFieldId === 'email') basicMapping.email = excelCol;
        else if (map.rdFieldId === 'phone') basicMapping.phone = excelCol;
        else if (map.isCustom) {
          customFieldsMapping.push({
            customFieldId: map.rdFieldId,
            excelColumn: excelCol,
            entityType: map.entityType,
            valueMapping: optionMappings[map.rdFieldId] || {}
          });
        }
      });

      const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
      
      const response = await fetch(`${API_URL}/segment/send-to-rd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items,
          mapping: basicMapping,
          customFieldsMapping,
          conditionalMappings: Object.values(conditionalMappings),
          funnelId: selectedStageId,
          userIds: selectedUserIds
        })
      });

      if (!response.ok) throw new Error("Erro ao enviar para o RD Station.");

      const result = await response.json();
      toast({ title: "Sucesso!", description: result.message, className: "bg-green-600 text-white" });
      navigate("/app/segmentacoes");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--hub-primary))]" />
      </div>
    );
  }

  const handleSaveConditional = (data: any) => {
    setConditionalMappings(prev => ({
      ...prev,
      [activeConditionalColumn!]: data
    }));
    // Marca como mapeado na tabela principal usando um ID fictício para o status
    setMappings(prev => ({
      ...prev,
      [activeConditionalColumn!]: { rdFieldId: 'conditional', isCustom: false }
    }));
    setIsConditionalModalOpen(false);
  };


  return (
    <div className="flex flex-col max-w-6xl mx-auto p-4 md:p-8 space-y-8 bg-white min-h-screen">
      {/* Header Estilo RD Station */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[#073045]">Combine as colunas do seu arquivo com os campos no RD Station CRM</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#073045]">Para qual funil você quer importar?</Label>
            <Select 
              value={selectedFunnelId} 
              onValueChange={(v) => {
                setSelectedFunnelId(v);
                const funnel = funnels.find(f => f.id === v);
                if (funnel?.stages?.length) setSelectedStageId(funnel.stages[0].id);
              }}
            >
              <SelectTrigger className="w-full bg-white border-[#D2DCE1] h-12 text-[#073045]">
                <SelectValue placeholder="Selecione o funil" />
              </SelectTrigger>
              <SelectContent>
                {funnels.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[#073045]">Em qual etapa devem entrar as negociações?</Label>
            <Select value={selectedStageId} onValueChange={setSelectedStageId} disabled={!selectedFunnelId}>
              <SelectTrigger className="w-full bg-white border-[#D2DCE1] h-12 text-[#073045]">
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {funnels.find(f => f.id === selectedFunnelId)?.stages?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label className="text-sm font-semibold text-[#073045]">Quem deve receber estas negociações? (Distribuição Automática)</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg border-[#D2DCE1] bg-[#F8FAFB]">
              {rdUsers.map(user => (
                <div 
                  key={user.id} 
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all border",
                    selectedUserIds.includes(user.id) 
                      ? "bg-[#364AD2] text-white border-[#364AD2] shadow-sm" 
                      : "bg-white text-[#556D7C] border-[#D2DCE1] hover:border-[#364AD2]"
                  )}
                  onClick={() => {
                    if (selectedUserIds.includes(user.id)) {
                      if (selectedUserIds.length > 1) setSelectedUserIds(prev => prev.filter(id => id !== user.id));
                    } else {
                      setSelectedUserIds(prev => [...prev, user.id]);
                    }
                  }}
                >
                  <span className="text-xs font-medium">{user.name}</span>
                  {selectedUserIds.includes(user.id) && <X className="w-3 h-3" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Checkbox id="skipHeader" checked={skipHeader} onCheckedChange={(v) => setSkipHeader(!!v)} />
          <Label htmlFor="skipHeader" className="text-[#073045] font-normal cursor-pointer">
            A primeira linha é o cabeçalho e não será importada
          </Label>
        </div>
      </div>

      {/* Tabela de Mapeamento */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-[#F8FAFB]">
            <TableRow className="hover:bg-transparent border-b border-[#E9EDF0]">
              <TableHead className="w-16 uppercase text-[10px] font-bold text-[#556D7C]">Status</TableHead>
              <TableHead className="uppercase text-[10px] font-bold text-[#556D7C]">Campo da Planilha</TableHead>
              <TableHead className="w-[400px] uppercase text-[10px] font-bold text-[#556D7C]">Campo do CRM</TableHead>
              <TableHead className="w-32 uppercase text-[10px] font-bold text-[#556D7C]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {availableColumns.map((col) => {
              const mapped = mappings[col];
              const sampleValues = items.slice(0, 3).map(i => String(i[col] || '')).join(', ');
              
              return (
                <TableRow key={col} className="hover:bg-[#F8FAFB] border-b border-[#E9EDF0]">
                  <TableCell>
                    {mapped ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-[#073045]">{col.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-[#556D7C] truncate max-w-[400px]">{sampleValues}...</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ChevronRight className="w-4 h-4 text-[#556D7C]" />
                      <FieldPicker 
                        value={mapped?.rdFieldId || "ignore"}
                        onSelect={(v) => handleSelectRDField(col, v)}
                        rdFields={rdFields}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={!mapped} 
                        onCheckedChange={(v) => handleSelectRDField(col, v ? "ignore" : "name")} 
                      />
                      <span className="text-sm text-[#073045]">Não importar</span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer Estilo RD Station */}
      <div className="flex items-center justify-between pt-6 border-t border-[#E9EDF0]">
        <span className="text-sm text-[#073045]">
          Foram combinados <strong>{Object.keys(mappings).length} de {availableColumns.length}</strong> campos.
        </span>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-[#364AD2]" onClick={() => navigate(-1)}>Salvar e Sair</Button>
          <Button variant="outline" className="text-[#364AD2] bg-[#E8F0FE] border-[#364AD2]" onClick={() => navigate(-1)}>Voltar</Button>
          <Button 
            className="bg-[#D2DCE1] text-[#718D9D] hover:bg-[#c0cbd1]" 
            disabled={Object.keys(mappings).length === 0 || sending}
            onClick={handleSubmit}
            style={Object.keys(mappings).length > 0 ? {backgroundColor: '#364AD2', color: 'white'} : {}}
          >
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Avançar
          </Button>
        </div>
      </div>

      {/* Modal de Combinação de Opções (Screenshot 2) */}
      <Dialog open={isOptionModalOpen} onOpenChange={setIsOptionModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-lg">
          <DialogHeader className="p-6 border-b border-[#E9EDF0]">
            <DialogTitle className="text-xl font-bold text-[#073045]">Combine as opções do campo</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4">
            <p className="text-[#073045]">
              Este é um campo com opções. Combine as opções que encontramos na sua planilha com as opções do CRM.
            </p>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-[#F8FAFB]">
                  <TableRow>
                    <TableHead className="uppercase text-[10px] font-bold text-[#556D7C]">Opções na Planilha</TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="uppercase text-[10px] font-bold text-[#556D7C]">Opções no CRM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeMappingColumn && getDistinctValues(activeMappingColumn).map((val) => (
                    <TableRow key={val}>
                      <TableCell className="text-[#073045] font-medium">{val}</TableCell>
                      <TableCell className="text-[#556D7C]"><ChevronRight className="w-4 h-4" /></TableCell>
                      <TableCell>
                        <Select 
                          value={optionMappings[activeRdField?.custom_field.id || '']?.[val] || ""} 
                          onValueChange={(opt) => handleOptionMapping(val, opt)}
                        >
                          <SelectTrigger className="border-[#D2DCE1]">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeRdField?.custom_field.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="p-6 bg-[#F8FAFB] border-t border-[#E9EDF0]">
            <Button 
              className="bg-[#364AD2] text-white hover:bg-[#2A3AB3] w-full md:w-auto"
              onClick={() => setIsOptionModalOpen(false)}
            >
              Combinar os campos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal de Mapeamento Condicional (Documento PF/PJ) */}
      <ConditionalMappingModal 
        open={isConditionalModalOpen} 
        onOpenChange={setIsConditionalModalOpen}
        sourceColumn={activeConditionalColumn || ""}
        availableColumns={availableColumns}
        rdFields={rdFields}
        onSave={handleSaveConditional}
        items={items}
      />
    </div>
  );
}

function ConditionalMappingModal({ open, onOpenChange, sourceColumn, availableColumns, rdFields, onSave, items }: any) {
  const [conditionColumn, setConditionColumn] = useState("");
  const [rules, setRules] = useState<{ value: string, rdFieldId: string }[]>([]);

  // Quando abre o modal para uma nova coluna ou muda a coluna de condição
  useEffect(() => {
    if (conditionColumn) {
      const distinctValues = Array.from(new Set(items.map((i: any) => String(i[conditionColumn] || "")))).filter(Boolean);
      setRules(distinctValues.map(v => ({ value: v, rdFieldId: "" })));
    }
  }, [conditionColumn, items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#073045]">Mapeamento Condicional: {sourceColumn}</DialogTitle>
          <DialogDescription>
            Defina para qual campo do CRM o valor de <strong>{sourceColumn}</strong> deve ir baseado em outra coluna.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Selecione a coluna que define a condição (ex: Tipo de Pessoa)</Label>
            <Select value={conditionColumn} onValueChange={setConditionColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a coluna..." />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((col: string) => <SelectItem key={col} value={col}>{col}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {conditionColumn && (
            <div className="space-y-4">
              <Label className="text-xs uppercase font-bold text-[#556D7C]">Regras de Mapeamento</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#F8FAFB]">
                    <TableRow>
                      <TableHead>Se valor na planilha for...</TableHead>
                      <TableHead>Enviar {sourceColumn} para o campo...</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule, idx) => (
                      <TableRow key={rule.value}>
                        <TableCell className="font-medium text-[#073045]">{rule.value}</TableCell>
                        <TableCell>
                          <Select 
                            value={rule.rdFieldId} 
                            onValueChange={(v) => {
                              const field = rdFields.find((f: any) => f.custom_field.id === v);
                              const entityType = field?.custom_field.for || 'deal';
                              const newRules = [...rules];
                              newRules[idx].rdFieldId = v;
                              newRules[idx].entityType = entityType;
                              setRules(newRules);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o campo no CRM" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">Não importar</SelectItem>
                              
                              <SelectGroup>
                                <SelectLabel className="text-[#364AD2] font-bold">Empresa</SelectLabel>
                                {rdFields.filter((f: any) => f.custom_field.for === 'organization').map((f: any) => (
                                  <SelectItem key={f.custom_field.id} value={f.custom_field.id}>{f.custom_field.name}</SelectItem>
                                ))}
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-[#364AD2] font-bold">Contato</SelectLabel>
                                <SelectItem value="name">Nome do Contato</SelectItem>
                                <SelectItem value="email">E-mail do Contato</SelectItem>
                                <SelectItem value="phone">Telefone do Contato</SelectItem>
                                {rdFields.filter((f: any) => f.custom_field.for === 'contact').map((f: any) => (
                                  <SelectItem key={f.custom_field.id} value={f.custom_field.id}>{f.custom_field.name}</SelectItem>
                                ))}
                              </SelectGroup>

                              <SelectGroup>
                                <SelectLabel className="text-[#364AD2] font-bold">Negociação</SelectLabel>
                                {rdFields.filter((f: any) => f.custom_field.for === 'deal').map((f: any) => (
                                  <SelectItem key={f.custom_field.id} value={f.custom_field.id}>{f.custom_field.name}</SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            className="bg-[#364AD2] text-white" 
            disabled={!conditionColumn || rules.some(r => !r.rdFieldId)}
            onClick={() => onSave({ sourceColumn, conditionColumn, rules })}
          >
            Salvar Regra Condicional
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldPicker({ value, onSelect, rdFields }: { value: string, onSelect: (v: string) => void, rdFields: any[] }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedField = rdFields.find(f => f.custom_field.id === value);
  const getDisplayName = () => {
    if (value === "ignore") return "Não importar";
    if (value === "conditional") return "Mapeamento Condicional...";
    if (value === "name") return "Nome do Contato";
    if (value === "email") return "E-mail do Contato";
    if (value === "phone") return "Telefone do Contato";
    return selectedField?.custom_field.name || "Buscar campo...";
  };

  const renderFieldList = (entity: string) => {
    let fields = rdFields.filter(f => f.custom_field.for === entity);
    
    // Inclui campos básicos no Contato
    const basicFields = entity === 'contact' ? [
      { id: 'name', name: 'Nome do Contato' },
      { id: 'email', name: 'E-mail do Contato' },
      { id: 'phone', name: 'Telefone do Contato' }
    ] : [];

    const allFields = [...basicFields, ...fields.map(f => ({ id: f.custom_field.id, name: f.custom_field.name }))];
    const filtered = allFields.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

    if (filtered.length === 0) return <div className="p-4 text-xs text-[#556D7C] italic">Nenhum campo encontrado</div>;

    return (
      <div className="max-h-[300px] overflow-y-auto">
        {filtered.map(f => (
          <div 
            key={f.id} 
            className="px-4 py-2 hover:bg-[#F8FAFB] cursor-pointer text-sm text-[#073045] flex items-center justify-between group"
            onClick={() => { onSelect(f.id); setOpen(false); }}
          >
            {f.name}
            {value === f.id && <CheckCircle2 className="w-4 h-4 text-[#364AD2]" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between bg-white border-[#D2DCE1] h-10 font-normal text-[#073045]">
          <span className="truncate">{getDisplayName()}</span>
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Tabs defaultValue="contact" className="w-full">
          <TabsList className="w-full justify-start h-12 bg-white border-b rounded-none p-0">
            <TabsTrigger value="organization" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#00E1FF] data-[state=active]:text-[#364AD2] text-[#556D7C]">Empresa</TabsTrigger>
            <TabsTrigger value="contact" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#00E1FF] data-[state=active]:text-[#364AD2] text-[#556D7C]">Contato</TabsTrigger>
            <TabsTrigger value="deal" className="flex-1 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-[#00E1FF] data-[state=active]:text-[#364AD2] text-[#556D7C]">Negociação</TabsTrigger>
          </TabsList>
          
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar campo em todas as categorias" 
                className="pl-8 h-9 border-none focus-visible:ring-0" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="organization" className="m-0">{renderFieldList('organization')}</TabsContent>
          <TabsContent value="contact" className="m-0">{renderFieldList('contact')}</TabsContent>
          <TabsContent value="deal" className="m-0">{renderFieldList('deal')}</TabsContent>
        </Tabs>

        <div className="p-3 border-t bg-[#F8FAFB]">
          <button 
            className="flex items-center gap-2 text-[#364AD2] text-sm font-semibold hover:underline"
            onClick={() => { onSelect('conditional'); setOpen(false); }}
          >
            + Mapeamento condicional
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

