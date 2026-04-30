// AdminLayout agora é um passthrough — o chrome (sidebar/header) é provido pelo HubLayout.
// Mantido o componente para evitar tocar nas páginas internas que o importam.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full">{children}</div>;
}
