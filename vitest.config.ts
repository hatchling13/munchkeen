import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig(() => ({
  plugins: [
    solidPlugin({
      hot: false,
      solid: { generate: "dom" },
    }),
  ],
  test: {
    watch: false,
    isolate: true,
    env: {
      NODE_ENV: "development",
      DEV: "1",
      SSR: "",
      PROD: "",
    },
    environment: "jsdom",
    transformMode: { web: [/\.[jt]sx$/], include: ["test/*.test.{ts,tsx}"] },
  },
  resolve: {
    conditions: ["browser", "development"],
  },
}));
