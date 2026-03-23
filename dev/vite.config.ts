import { defineConfig } from "vite";
import path from "node:path";
import solidPlugin from "vite-plugin-solid";

const developmentNodeEnv = JSON.stringify("development");

export default defineConfig({
  define: {
    "process.env.SSR": "false",
    "process.env.DEV": "true",
    "process.env.PROD": "false",
    "process.env.NODE_ENV": developmentNodeEnv,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "../src"),
    },
  },
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
