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
      convites: {
        Row: {
          aceito_em: string | null
          convidado_por: string | null
          created_at: string
          email: string
          expira_em: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          setor_id: string | null
          status: string
          token: string
        }
        Insert: {
          aceito_em?: string | null
          convidado_por?: string | null
          created_at?: string
          email: string
          expira_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          setor_id?: string | null
          status?: string
          token?: string
        }
        Update: {
          aceito_em?: string | null
          convidado_por?: string | null
          created_at?: string
          email?: string
          expira_em?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          setor_id?: string | null
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      coparticipacao_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          itens: Json
          modalidade: string
          observacoes: string | null
          operadora_id: string
          plano_nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          itens?: Json
          modalidade?: string
          observacoes?: string | null
          operadora_id: string
          plano_nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          itens?: Json
          modalidade?: string
          observacoes?: string | null
          operadora_id?: string
          plano_nome?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coparticipacao_catalogo_operadora_id_fkey"
            columns: ["operadora_id"]
            isOneToOne: false
            referencedRelation: "operadoras_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      manuais: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          tamanho_bytes: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url: string
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          tamanho_bytes?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          tamanho_bytes?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      operadoras_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          logo_url: string | null
          nome: string
          observacoes: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome: string
          observacoes?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nome?: string
          observacoes?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      permissoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          modulo: string
          nome: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          modulo: string
          nome: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          modulo?: string
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposta_auto_seguradoras: {
        Row: {
          app_morte_invalidez: number | null
          assistencia_24h: string | null
          carro_reserva: string | null
          cobertura_resumo: string | null
          cor_coluna: string | null
          cores_celulas: Json | null
          created_at: string
          danos_corporais: number | null
          danos_materiais: number | null
          danos_morais: number | null
          destaque_comercial: string | null
          formas_pagamento: string | null
          formas_pagamento_detalhes: Json | null
          franquia_tipo: string | null
          franquia_valor: number | null
          id: string
          ordem_exibicao: number
          parcelamento: string | null
          pdf_url: string | null
          percentual_fipe: string | null
          premio_total: number | null
          produto_nome: string | null
          proposta_id: string
          seguradora_nome: string
          updated_at: string
          vidros: string | null
        }
        Insert: {
          app_morte_invalidez?: number | null
          assistencia_24h?: string | null
          carro_reserva?: string | null
          cobertura_resumo?: string | null
          cor_coluna?: string | null
          cores_celulas?: Json | null
          created_at?: string
          danos_corporais?: number | null
          danos_materiais?: number | null
          danos_morais?: number | null
          destaque_comercial?: string | null
          formas_pagamento?: string | null
          formas_pagamento_detalhes?: Json | null
          franquia_tipo?: string | null
          franquia_valor?: number | null
          id?: string
          ordem_exibicao?: number
          parcelamento?: string | null
          pdf_url?: string | null
          percentual_fipe?: string | null
          premio_total?: number | null
          produto_nome?: string | null
          proposta_id: string
          seguradora_nome: string
          updated_at?: string
          vidros?: string | null
        }
        Update: {
          app_morte_invalidez?: number | null
          assistencia_24h?: string | null
          carro_reserva?: string | null
          cobertura_resumo?: string | null
          cor_coluna?: string | null
          cores_celulas?: Json | null
          created_at?: string
          danos_corporais?: number | null
          danos_materiais?: number | null
          danos_morais?: number | null
          destaque_comercial?: string | null
          formas_pagamento?: string | null
          formas_pagamento_detalhes?: Json | null
          franquia_tipo?: string | null
          franquia_valor?: number | null
          id?: string
          ordem_exibicao?: number
          parcelamento?: string | null
          pdf_url?: string | null
          percentual_fipe?: string | null
          premio_total?: number | null
          produto_nome?: string | null
          proposta_id?: string
          seguradora_nome?: string
          updated_at?: string
          vidros?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposta_auto_seguradoras_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas_auto"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_operadoras: {
        Row: {
          abrangencia: string | null
          acomodacao: string | null
          coparticipacao: string | null
          coparticipacao_detalhes: Json | null
          cor_coluna: string | null
          cores_celulas: Json | null
          created_at: string
          destaque_comercial: string | null
          faixas_etarias: string | null
          grupo_soma: string | null
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
          coparticipacao_detalhes?: Json | null
          cor_coluna?: string | null
          cores_celulas?: Json | null
          created_at?: string
          destaque_comercial?: string | null
          faixas_etarias?: string | null
          grupo_soma?: string | null
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
          coparticipacao_detalhes?: Json | null
          cor_coluna?: string | null
          cores_celulas?: Json | null
          created_at?: string
          destaque_comercial?: string | null
          faixas_etarias?: string | null
          grupo_soma?: string | null
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
          cores_rotulos: Json | null
          created_at: string
          estado: string | null
          faixa_etaria_ou_perfil: string | null
          id: string
          idades_beneficiarios: string | null
          linhas_ocultas: string[] | null
          nome_cliente: string
          observacoes_gerais: string | null
          slug: string
          status: string
          telefone_cliente: string | null
          tipo_produto: string | null
          updated_at: string
          user_id: string | null
          validade_proposta: string | null
        }
        Insert: {
          cidade?: string | null
          consultora_foto_url?: string | null
          consultora_nome?: string | null
          consultora_telefone?: string | null
          cores_rotulos?: Json | null
          created_at?: string
          estado?: string | null
          faixa_etaria_ou_perfil?: string | null
          id?: string
          idades_beneficiarios?: string | null
          linhas_ocultas?: string[] | null
          nome_cliente: string
          observacoes_gerais?: string | null
          slug: string
          status?: string
          telefone_cliente?: string | null
          tipo_produto?: string | null
          updated_at?: string
          user_id?: string | null
          validade_proposta?: string | null
        }
        Update: {
          cidade?: string | null
          consultora_foto_url?: string | null
          consultora_nome?: string | null
          consultora_telefone?: string | null
          cores_rotulos?: Json | null
          created_at?: string
          estado?: string | null
          faixa_etaria_ou_perfil?: string | null
          id?: string
          idades_beneficiarios?: string | null
          linhas_ocultas?: string[] | null
          nome_cliente?: string
          observacoes_gerais?: string | null
          slug?: string
          status?: string
          telefone_cliente?: string | null
          tipo_produto?: string | null
          updated_at?: string
          user_id?: string | null
          validade_proposta?: string | null
        }
        Relationships: []
      }
      propostas_auto: {
        Row: {
          cep_pernoite: string | null
          condutor_18_26: boolean | null
          consultora_foto_url: string | null
          consultora_nome: string | null
          consultora_telefone: string | null
          cor_rotulos: string | null
          cores_rotulos: Json | null
          created_at: string
          id: string
          linhas_ocultas: string[] | null
          nome_cliente: string
          observacoes_gerais: string | null
          slug: string
          status: string
          telefone_cliente: string | null
          tipo_cotacao: string | null
          updated_at: string
          user_id: string | null
          validade_proposta: string | null
          veiculo_marca_modelo: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          cep_pernoite?: string | null
          condutor_18_26?: boolean | null
          consultora_foto_url?: string | null
          consultora_nome?: string | null
          consultora_telefone?: string | null
          cor_rotulos?: string | null
          cores_rotulos?: Json | null
          created_at?: string
          id?: string
          linhas_ocultas?: string[] | null
          nome_cliente: string
          observacoes_gerais?: string | null
          slug: string
          status?: string
          telefone_cliente?: string | null
          tipo_cotacao?: string | null
          updated_at?: string
          user_id?: string | null
          validade_proposta?: string | null
          veiculo_marca_modelo?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          cep_pernoite?: string | null
          condutor_18_26?: boolean | null
          consultora_foto_url?: string | null
          consultora_nome?: string | null
          consultora_telefone?: string | null
          cor_rotulos?: string | null
          cores_rotulos?: Json | null
          created_at?: string
          id?: string
          linhas_ocultas?: string[] | null
          nome_cliente?: string
          observacoes_gerais?: string | null
          slug?: string
          status?: string
          telefone_cliente?: string | null
          tipo_cotacao?: string | null
          updated_at?: string
          user_id?: string | null
          validade_proposta?: string | null
          veiculo_marca_modelo?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      rede_credenciada_catalogo: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string
          coberturas_por_plano: Json
          created_at: string
          destaque: boolean
          endereco: string | null
          especialidades: string[] | null
          estado: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          operadora_id: string
          planos_aplicaveis: string[] | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade: string
          coberturas_por_plano?: Json
          created_at?: string
          destaque?: boolean
          endereco?: string | null
          especialidades?: string[] | null
          estado: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          operadora_id: string
          planos_aplicaveis?: string[] | null
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string
          coberturas_por_plano?: Json
          created_at?: string
          destaque?: boolean
          endereco?: string | null
          especialidades?: string[] | null
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          operadora_id?: string
          planos_aplicaveis?: string[] | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rede_credenciada_catalogo_operadora_id_fkey"
            columns: ["operadora_id"]
            isOneToOne: false
            referencedRelation: "operadoras_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      rede_credenciada_uploads: {
        Row: {
          arquivo_nome: string
          arquivo_url: string
          created_at: string
          id: string
          observacoes: string | null
          operadora_id: string
          planos_detectados: string[]
          status: string
          total_importado: number
        }
        Insert: {
          arquivo_nome: string
          arquivo_url: string
          created_at?: string
          id?: string
          observacoes?: string | null
          operadora_id: string
          planos_detectados?: string[]
          status?: string
          total_importado?: number
        }
        Update: {
          arquivo_nome?: string
          arquivo_url?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          operadora_id?: string
          planos_detectados?: string[]
          status?: string
          total_importado?: number
        }
        Relationships: []
      }
      segmentacoes: {
        Row: {
          created_at: string
          criado_por: string | null
          criterios: Json
          descricao: string | null
          id: string
          nome: string
          total_contatos: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          criterios?: Json
          descricao?: string | null
          id?: string
          nome: string
          total_contatos?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          criterios?: Json
          descricao?: string | null
          id?: string
          nome?: string
          total_contatos?: number
          updated_at?: string
        }
        Relationships: []
      }
      setor_permissoes: {
        Row: {
          created_at: string
          id: string
          permissao_chave: string
          setor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissao_chave: string
          setor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permissao_chave?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setor_permissoes_permissao_chave_fkey"
            columns: ["permissao_chave"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["chave"]
          },
          {
            foreignKeyName: "setor_permissoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      treinamentos: {
        Row: {
          ativo: boolean
          categoria: string | null
          conteudo: string | null
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          thumbnail_url: string | null
          titulo: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          conteudo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          conteudo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          thumbnail_url?: string | null
          titulo?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      user_permissoes: {
        Row: {
          concedida: boolean
          created_at: string
          id: string
          permissao_chave: string
          user_id: string
        }
        Insert: {
          concedida?: boolean
          created_at?: string
          id?: string
          permissao_chave: string
          user_id: string
        }
        Update: {
          concedida?: boolean
          created_at?: string
          id?: string
          permissao_chave?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissoes_permissao_chave_fkey"
            columns: ["permissao_chave"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["chave"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_setores: {
        Row: {
          created_at: string
          id: string
          setor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: { _chave: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
