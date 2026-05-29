import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
export default defineConfig({
    root: resolve(__dirname),
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: resolve(__dirname, "dist"),
    },
    server: {
        port: 5173,
        proxy: {
            "/api": "http://127.0.0.1:3000",
            "/api/terminal": {
                target: "ws://127.0.0.1:3000",
                ws: true,
            },
        },
    },
});
//# sourceMappingURL=vite.config.js.map