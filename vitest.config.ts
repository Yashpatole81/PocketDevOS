import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./client/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "client/src/**/*.test.ts",
      "client/src/**/*.test.tsx",
      "client/src/**/*.property.test.ts",
    ],
    reporters: ["default"],
  },
});
