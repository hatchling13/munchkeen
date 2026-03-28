import {
  buildRenderScene,
  diffScene,
  isLeft,
  projectGraph,
  runLayout,
  validateGraph,
  edgeId,
  nodeId,
} from "munchkeen/core";

const ada = nodeId("ada");
const charles = nodeId("charles");
const collaborates = edgeId("collaborates");

export const corePipelineExampleInput = {
  nodes: [
    { id: ada, label: "Ada Lovelace" },
    { id: charles, label: "Charles Babbage" },
  ],
  edges: [
    { id: collaborates, source: ada, target: charles, label: "collaborates" },
  ],
};

export const runCorePipelineExample = () => {
  const validated = validateGraph(corePipelineExampleInput);

  if (isLeft(validated)) {
    throw new Error(validated.left.map((error) => error.message).join(", "));
  }

  const projected = projectGraph({
    graph: validated.right,
  });

  if (isLeft(projected)) {
    throw new Error(projected.left.message);
  }

  const laidOut = runLayout({
    graph: projected.right,
    layout: {
      kind: "breadthfirst",
      root: ada,
    },
  });

  if (isLeft(laidOut)) {
    throw new Error(laidOut.left.message);
  }

  const scene = buildRenderScene({
    graph: laidOut.right,
  });
  const commands = diffScene(undefined, scene);

  return {
    validated: validated.right,
    projected: projected.right,
    laidOut: laidOut.right,
    scene,
    commands,
  };
};

void runCorePipelineExample();
