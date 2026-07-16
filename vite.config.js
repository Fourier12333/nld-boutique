import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT : remplace "nld-boutique" ci-dessous par le nom EXACT
// de ton dépôt GitHub si tu le nommes différemment.
export default defineConfig({
  plugins: [react()],
  base: "/nld-boutique/",
});
