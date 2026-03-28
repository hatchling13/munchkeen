import solid from "rolldown-plugin-solid";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.tsx", "./src/core.ts", "./src/cytoscape.ts"],
  platform: "neutral",
  dts: true,
  plugins: [solid()],
});
