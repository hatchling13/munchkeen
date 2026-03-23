import type { Component } from "solid-js";

import { Graph } from "src";

const App: Component = () => {
  return (
    <Graph
      graph={{ nodes: [], edges: [] }}
      renderer={{ kind: "cytoscape" }}
      fallback={<div>munchkeen scaffold</div>}
    />
  );
};

export default App;
