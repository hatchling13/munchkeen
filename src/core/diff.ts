import type { RenderCommand } from "./commands";

export type SceneDiff = {
  readonly commands: readonly RenderCommand[];
};
