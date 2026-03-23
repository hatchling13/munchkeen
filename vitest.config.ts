import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    solidPlugin({
      hot: false,
      solid: { generate: "dom" },
    }),
  ],
  test: {
    watch: false,
    isolate: true,
    environment: "jsdom",
  },
  resolve: {
    conditions: ["browser", "development"],
  },
});
