import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, MapPin, Calendar, Heart, Pencil, Save, X, ExternalLink, Plus, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import heroBg from "@/assets/proposta-hero-bg.jpg";

import type { PropostaContext } from "./types";

// ——— Admin Toolbar ———

export function AdminToolbar({ ctx }: { ctx: PropostaContext }) {
  const { proposta, editMode, saving, canEdit, handleEnterEdit, handleCancelEdit, handleSave, addDraftSeguradora } = ctx;

  if (!canEdit) return null;

  return (
    <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200">
      <div className="container py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-amber-900">
          <Pencil className="w-3.5 h-3.5" />
          <span className="font-medium">Modo administrador</span>
          {editMode && <span className="opacity-75">— editando inline</span>}
        </div>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <>
              <Link to={`/app/cotacoes/saude/proposta/${proposta.id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Editor completo
                </Button>
              </Link>
              <Button size="sm" onClick={handleEnterEdit}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Editar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => addDraftSeguradora()} disabled={saving}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar seguradora
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ——— Hero Section ———

export function PropostaHero({ ctx }: { ctx: PropostaContext }) {
  const { view, editMode, updateDraftProposta } = ctx;

  return (
    <header
      className="relative text-primary-foreground bg-cover bg-center"
      style={{ backgroundImage: `url(${heroBg})` }}
    >
      <div className="absolute inset-0 bg-[hsl(220_70%_8%/0.55)]" aria-hidden />
      <div className="container relative py-8 md:py-12 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 backdrop-blur flex items-center justify-center mb-2">
          <Shield className="w-7 h-7" />
        </div>
        <p className="text-xs uppercase tracking-widest opacity-80">Estudo Personalizado</p>
        <h1 className="text-2xl md:text-4xl font-bold">Comparativo de Planos — Todas as Opções</h1>
        {editMode ? (
          <div className="max-w-md mx-auto">
            <Input
              value={view.nome_cliente ?? ""}
              onChange={(e) => updateDraftProposta("nome_cliente", e.target.value)}
              className="text-center text-foreground"
              placeholder="Nome do cliente"
            />
          </div>
        ) : (
          <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
            Olá, <span className="font-semibold">{view.nome_cliente}</span>! Confira lado a lado as melhores opções para o seu perfil.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm opacity-80 pt-2">
          {editMode ? (
            <>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <Input value={view.cidade ?? ""} onChange={(e) => updateDraftProposta("cidade", e.target.value)} placeholder="Cidade" className="h-7 text-xs w-32 text-foreground" />
                <Input value={view.estado ?? ""} onChange={(e) => updateDraftProposta("estado", e.target.value)} placeholder="UF" maxLength={2} className="h-7 text-xs w-14 text-foreground" />
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <Input type="date" value={view.validade_proposta ?? ""} onChange={(e) => updateDraftProposta("validade_proposta", e.target.value)} className="h-7 text-xs text-foreground" />
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <Input value={view.tipo_produto ?? ""} onChange={(e) => updateDraftProposta("tipo_produto", e.target.value)} placeholder="Tipo de produto" className="h-7 text-xs w-40 text-foreground" />
              </div>
            </>
          ) : (
            <>
              {view.cidade && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {view.cidade}{view.estado ? ` - ${view.estado}` : ""}
                </span>
              )}
              {view.validade_proposta && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Válida até {format(new Date(view.validade_proposta), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              {view.tipo_produto && (
                <span className="flex items-center gap-1">
                  <Heart className="w-4 h-4" /> {view.tipo_produto}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// ——— Consultant CTA ———

export function ConsultoraCTA({ ctx }: { ctx: PropostaContext }) {
  const { proposta, editMode, generalWhatsapp } = ctx;

  if (editMode || !proposta.consultora_nome) return null;

  return (
    <section className="container pb-12">
      <div className="p-6 md:p-8 text-center max-w-lg mx-auto rounded-lg border bg-card">
        {proposta.consultora_foto_url && (
          <img src={proposta.consultora_foto_url} alt={proposta.consultora_nome} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-4 border-accent/20" />
        )}
        <h3 className="text-lg font-bold text-foreground">{proposta.consultora_nome}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Sua consultora está disponível para esclarecer dúvidas e ajudar na melhor escolha.
        </p>
        <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer">
          <Button variant="whatsapp" size="lg">
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar com {proposta.consultora_nome} no WhatsApp
          </Button>
        </a>
      </div>
    </section>
  );
}

// ——— Observations ———

export function Observacoes({ ctx }: { ctx: PropostaContext }) {
  const { proposta, editMode } = ctx;

  if (editMode || !proposta.observacoes_gerais) return null;

  return (
    <section className="container pb-8">
      <div className="p-6 rounded-lg border bg-muted/50">
        <p className="text-sm text-muted-foreground font-medium mb-1">Observações</p>
        <p className="text-foreground whitespace-pre-line">{proposta.observacoes_gerais}</p>
      </div>
    </section>
  );
}

// ——— Floating WhatsApp Button ———

export function FloatingWhatsApp({ ctx }: { ctx: PropostaContext }) {
  const { proposta, editMode, selectedPlans, generalWhatsapp } = ctx;

  if (editMode || selectedPlans.size > 0 || !proposta.consultora_telefone) return null;

  return (
    <a href={generalWhatsapp()} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50">
      <Button variant="whatsapp" size="lg" className="rounded-full shadow-xl h-14 px-6 text-base">
        <MessageCircle className="w-5 h-5 mr-2" />
        Falar no WhatsApp
      </Button>
    </a>
  );
}
