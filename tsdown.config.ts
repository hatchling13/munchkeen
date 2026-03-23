import solid from "rolldown-plugin-solid";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.tsx"],
  platform: "neutral",
  dts: true,
  plugins: [solid()],
});
