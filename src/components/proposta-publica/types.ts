import type { Proposta, Operadora } from "@/lib/proposal-utils";

/** Fields that can be edited inline by the admin */
export type EditableOperadoraField =
  | "operadora_nome"
  | "plano_nome"
  | "valor_mensal"
  | "coparticipacao"
  | "acomodacao"
  | "abrangencia"
  | "reembolso"
  | "resumo_cobertura"
  | "rede_credenciada_resumo"
  | "faixas_etarias"
  | "destaque_comercial"
  | "cor_coluna"
  | "cores_celulas"
  | "coparticipacao_detalhes"
  | "grupo_soma";

export interface CoparticipacaoItem {
  item: string;
  valor: string;
}

export interface GrupoSomaInfo {
  total: number | null;
  membros: Operadora[];
  label: string;
  cor: string;
}

export interface CriterioDefinition {
  label: string;
  field: EditableOperadoraField;
  type: "text" | "textarea" | "sim_nao" | "acomodacao" | "reembolso";
}

/** Shared context for all sub-components of the public proposal page */
export interface PropostaContext {
  proposta: Proposta;
  view: Proposta;
  viewOps: Operadora[];
  editMode: boolean;
  saving: boolean;
  canEdit: boolean;

  // Edit actions
  handleEnterEdit: () => void;
  handleCancelEdit: () => void;
  handleSave: () => void;
  addDraftOperadora: (operadoraNome?: string) => void;
  addDraftSeguradora: () => void;
  removeDraftOperadora: (id: string) => void;
  updateDraftProposta: <K extends keyof Proposta>(field: K, value: Proposta[K]) => void;
  updateDraftOperadora: (id: string, field: EditableOperadoraField, value: any) => void;
  updateOperadoraColor: (operadoraNome: string, colorKey: string | null) => void;
  toggleLinhaOculta: (field: string) => void;

  // Comparison
  selectedPlans: Set<string>;
  toggleSelected: (id: string) => void;
  setSelectedPlans: React.Dispatch<React.SetStateAction<Set<string>>>;
  compareOpen: boolean;
  setCompareOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Computed data
  grupos: { nome: string; planos: Operadora[] }[];
  grupoSomaInfoById: Map<string, GrupoSomaInfo>;
  totalById: Map<string, number | null>;
  criteriosVisiveis: CriterioDefinition[];
  linhasOcultas: (string | null)[];

  // Helpers
  getTotalMensal: (op: Operadora) => number | null;
  whatsappLink: (message: string) => string;
  generalWhatsapp: () => string;
}
