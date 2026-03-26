import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, FileText, MessageCircle, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="gradient-hero text-primary-foreground">
        <div className="container py-16 md:py-24 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Shield className="w-9 h-9" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold max-w-2xl mx-auto leading-tight">
            Propostas de seguros que encantam seus clientes
          </h1>
          <p className="text-lg opacity-90 max-w-xl mx-auto">
            Crie estudos comparativos em minutos. Envie links e feche mais contratos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to="/login">
              <Button variant="accent" size="lg" className="text-base px-8">
                Acessar o sistema
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {
              icon: FileText,
              title: "Propostas comparativas",
              desc: "Compare operadoras lado a lado com visual profissional e elegante.",
            },
            {
              icon: MessageCircle,
              title: "WhatsApp integrado",
              desc: "Botão direto para o WhatsApp da consultora em cada proposta.",
            },
            {
              icon: Zap,
              title: "Link instantâneo",
              desc: "Gere links públicos únicos e envie para o cliente em segundos.",
            },
          ].map((f) => (
            <div key={f.title} className="text-center space-y-3 p-6">
              <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
                <f.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>FBN Digital — Sua plataforma de propostas inteligentes</p>
      </footer>
    </div>
  );
}
