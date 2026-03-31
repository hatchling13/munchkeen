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
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "json-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
    },
  },
  resolve: {
    conditions: ["browser", "development"],
  },
});
