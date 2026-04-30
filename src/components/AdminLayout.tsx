// AdminLayout fornece o espaçamento padrão das páginas internas do hub.
// O chrome (sidebar/header) é provido pelo HubLayout.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full px-4 sm:px-6 md:px-10 py-6 md:py-8 max-w-7xl mx-auto w-full">
      {children}
    </div>
  );
}
