export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      proposta_operadoras: {
        Row: {
          abrangencia: string | null
          acomodacao: string | null
          coparticipacao: string | null
          created_at: string
          destaque_comercial: string | null
          faixas_etarias: string | null
          id: string
          operadora_nome: string
          ordem_exibicao: number
          pdf_url: string | null
          plano_nome: string | null
          previsao_reajuste_faixa: string | null
          proposta_id: string
          rede_credenciada_resumo: string | null
          reembolso: string | null
          resumo_cobertura: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          abrangencia?: string | null
          acomodacao?: string | null
          coparticipacao?: string | null
          created_at?: string
          destaque_comercial?: string | null
          faixas_etarias?: string | null
          id?: string
          operadora_nome: string
          ordem_exibicao?: number
          pdf_url?: string | null
          plano_nome?: string | null
          previsao_reajuste_faixa?: string | null
          proposta_id: string
          rede_credenciada_resumo?: string | null
          reembolso?: string | null
          resumo_cobertura?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          abrangencia?: string | null
          acomodacao?: string | null
          coparticipacao?: string | null
          created_at?: string
          destaque_comercial?: string | null
          faixas_etarias?: string | null
          id?: string
          operadora_nome?: string
          ordem_exibicao?: number
          pdf_url?: string | null
          plano_nome?: string | null
          previsao_reajuste_faixa?: string | null
          proposta_id?: string
          rede_credenciada_resumo?: string | null
          reembolso?: string | null
          resumo_cobertura?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposta_operadoras_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          cidade: string | null
          consultora_foto_url: string | null
          consultora_nome: string | null
          consultora_telefone: string | null
          created_at: string
          estado: string | null
          faixa_etaria_ou_perfil: string | null
          id: string
          idades_beneficiarios: string | null
          nome_cliente: string
          observacoes_gerais: string | null
          slug: string
          status: string
          telefone_cliente: string | null
          tipo_produto: string | null
          updated_at: string
          user_id: string
          validade_proposta: string | null
        }
        Insert: {
          cidade?: string | null
          consultora_foto_url?: string | null
          consultora_nome?: string | null
          consultora_telefone?: string | null
          created_at?: string
          estado?: string | null
          faixa_etaria_ou_perfil?: string | null
          id?: string
          idades_beneficiarios?: string | null
          nome_cliente: string
          observacoes_gerais?: string | null
          slug: string
          status?: string
          telefone_cliente?: string | null
          tipo_produto?: string | null
          updated_at?: string
          user_id: string
          validade_proposta?: string | null
        }
        Update: {
          cidade?: string | null
          consultora_foto_url?: string | null
          consultora_nome?: string | null
          consultora_telefone?: string | null
          created_at?: string
          estado?: string | null
          faixa_etaria_ou_perfil?: string | null
          id?: string
          idades_beneficiarios?: string | null
          nome_cliente?: string
          observacoes_gerais?: string | null
          slug?: string
          status?: string
          telefone_cliente?: string | null
          tipo_produto?: string | null
          updated_at?: string
          user_id?: string
          validade_proposta?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
