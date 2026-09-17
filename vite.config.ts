import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  base: "/Mohamed-El_Whash/",
  tanstackStart: {
    server: { entry: "server" },
    prerender: {
      enabled: true,
      crawlLinks: true,
      autoSubfolderIndex: true,
    },
  },
});
