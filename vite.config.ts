import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // Split vendor libs into smaller, cacheable chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — rarely changes, caches very well
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // TanStack React Query

          "vendor-query": ["@tanstack/react-query"],
          // Radix UI primitives — many small packages
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-accordion",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
            "@radix-ui/react-separator",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-progress",
            "@radix-ui/react-slider",
            "@radix-ui/react-avatar",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-menubar",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-aspect-ratio",
          ],
          // Recharts — heavy charting lib, only needed on Dashboard
          "vendor-recharts": ["recharts"],
          // date-fns — used across many pages
          "vendor-date": ["date-fns"],
        },
      },
    },
  },
}));
