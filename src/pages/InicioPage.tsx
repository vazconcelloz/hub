import { useEffect, useState } from "react";
import { db } from "@/lib/db";

export default function InicioPage() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    db.auth.getUser().then(({ data }) => {
      const e = data.user?.email ?? "";
      setEmail(e.split("@")[0]);
    });
  }, []);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-semibold text-[hsl(var(--hub-text))]">
          Olá{email ? `, ${email}` : ""}
        </h1>
        <p className="text-[hsl(var(--hub-text-muted))] mt-1">Bem-vindo ao Hub Grupo FBN.</p>
      </header>
    </div>
  );
}
