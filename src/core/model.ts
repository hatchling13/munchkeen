import { brand, type Brand } from "./brand";
import type { Either } from "./either";

export type NodeId = Brand<string, "NodeId">;
export type EdgeId = Brand<string, "EdgeId">;

// Brands a graph node identifier without changing its runtime representation.
export const nodeId = (value: string): NodeId => brand<string, "NodeId">(value);

// Brands a graph edge identifier without changing its runtime representation.
export const edgeId = (value: string): EdgeId => brand<string, "EdgeId">(value);

export type GraphNode<NodeData = unknown, NodeKind extends string = string> = {
  readonly id: NodeId;
  readonly kind?: NodeKind;
  readonly label?: string;
  readonly data?: NodeData;
};

export type GraphEdge<EdgeData = unknown, EdgeKind extends string = string> = {
  readonly id: EdgeId;
  readonly source: NodeId;
  readonly target: NodeId;
  readonly kind?: EdgeKind;
  readonly label?: string;
  readonly directed?: boolean;
  readonly data?: EdgeData;
};

export type GraphData<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = {
  readonly nodes: readonly GraphNode<NodeData, NodeKind>[];
  readonly edges: readonly GraphEdge<EdgeData, EdgeKind>[];
};

export type GraphDataInput<
  NodeData = unknown,
  EdgeData = unknown,
  NodeKind extends string = string,
  EdgeKind extends string = string,
> = GraphData<NodeData, EdgeData, NodeKind, EdgeKind>;

export type GraphSchemaError = {
  readonly code: string;
  readonly message: string;
  readonly path?: readonly (string | number)[];
  readonly value?: unknown;
};

export type GraphSchemaValidator<
  Value = unknown,
  Error extends GraphSchemaError = GraphSchemaError,
> = (value: unknown) => Either<Error, Value>;

type GraphSchemaValidatorMap<Error extends GraphSchemaError = GraphSchemaError> = Readonly<
  Record<string, GraphSchemaValidator<unknown, Error>>
>;

export type GraphSchema<
  NodeKinds extends GraphSchemaValidatorMap = GraphSchemaValidatorMap,
  EdgeKinds extends GraphSchemaValidatorMap = GraphSchemaValidatorMap,
> = {
  readonly nodes?: NodeKinds;
  readonly edges?: EdgeKinds;
};

type SchemaNodeKinds<TSchema extends GraphSchema> = NonNullable<TSchema["nodes"]>;
type SchemaEdgeKinds<TSchema extends GraphSchema> = NonNullable<TSchema["edges"]>;

type SchemaValidatorOutput<TValidator> =
  TValidator extends GraphSchemaValidator<infer Value, infer _Error> ? Value : never;

export type NodeKindFromSchema<TSchema extends GraphSchema> = Extract<
  keyof SchemaNodeKinds<TSchema>,
  string
>;

export type EdgeKindFromSchema<TSchema extends GraphSchema> = Extract<
  keyof SchemaEdgeKinds<TSchema>,
  string
>;

export type NodeDataFromSchema<
  TSchema extends GraphSchema,
  TKind extends NodeKindFromSchema<TSchema>,
> = SchemaValidatorOutput<SchemaNodeKinds<TSchema>[TKind]>;

export type EdgeDataFromSchema<
  TSchema extends GraphSchema,
  TKind extends EdgeKindFromSchema<TSchema>,
> = SchemaValidatorOutput<SchemaEdgeKinds<TSchema>[TKind]>;

export type GraphNodeFromSchema<
  TSchema extends GraphSchema,
  TKind extends NodeKindFromSchema<TSchema> = NodeKindFromSchema<TSchema>,
> =
  TKind extends NodeKindFromSchema<TSchema>
    ? Omit<GraphNode<NodeDataFromSchema<TSchema, TKind>, TKind>, "kind"> & {
        readonly kind: TKind;
      }
    : never;

export type GraphEdgeFromSchema<
  TSchema extends GraphSchema,
  TKind extends EdgeKindFromSchema<TSchema> = EdgeKindFromSchema<TSchema>,
> =
  TKind extends EdgeKindFromSchema<TSchema>
    ? Omit<GraphEdge<EdgeDataFromSchema<TSchema, TKind>, TKind>, "kind"> & {
        readonly kind: TKind;
      }
    : never;

export type GraphDataFromSchema<TSchema extends GraphSchema> = {
  readonly nodes: readonly GraphNodeFromSchema<TSchema>[];
  readonly edges: readonly GraphEdgeFromSchema<TSchema>[];
};

export type GraphNeighborhood = {
  // Projection currently interprets radius as a non-negative integer hop depth
  // from the focused node. GraphView itself does not enforce that invariant.
  readonly radius: number;
  readonly direction?: "in" | "out" | "both";
};

type GraphViewBase = {
  readonly selectedNodeIds?: readonly NodeId[];
  readonly selectedEdgeIds?: readonly EdgeId[];
  readonly hiddenNodeIds?: readonly NodeId[];
  readonly hiddenEdgeIds?: readonly EdgeId[];
};

type GraphViewWithoutNeighborhood = GraphViewBase & {
  readonly focus?: NodeId | null;
  readonly neighborhood?: undefined;
};

type GraphViewWithNeighborhood = GraphViewBase & {
  readonly focus: NodeId;
  readonly neighborhood: GraphNeighborhood;
};

// Neighborhood exploration is only meaningful around a concrete focused node,
// so the public view model encodes that relationship directly.
export type GraphView = GraphViewWithoutNeighborhood | GraphViewWithNeighborhood;
