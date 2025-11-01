import tagger from "@dhiwise/component-tagger";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
    // This changes the out put dir from dist to build
    // comment this out if that isn't relevant for your project
    build: {
        outDir: "build",
        chunkSizeWarningLimit: 2000,
    },
    plugins: [tsconfigPaths(), react(), tagger()],
    server: {
        port: Number(process.env.PORT || 5173),
        host: process.env.HOST || "127.0.0.1",
        strictPort: false,
        allowedHosts: ['.amazonaws.com', '.builtwithrocket.new']
    }
});
