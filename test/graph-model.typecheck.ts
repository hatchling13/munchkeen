import { left, right } from "../src/core/either";
import {
  edgeId,
  nodeId,
  type GraphDataFromSchema,
  type GraphSchema,
  type GraphSchemaValidator,
  type GraphNodeFromSchema,
} from "../src/core/model";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validatePerson: GraphSchemaValidator<{ readonly name: string }> = (value) => {
  if (!isRecord(value) || typeof value.name !== "string") {
    return left({
      code: "invalid_person",
      message: "Expected person data with a string name",
      value,
    });
  }

  return right({ name: value.name });
};

const validateCompany: GraphSchemaValidator<{ readonly domain: string }> = (
  value,
) => {
  if (!isRecord(value) || typeof value.domain !== "string") {
    return left({
      code: "invalid_company",
      message: "Expected company data with a string domain",
      value,
    });
  }

  return right({ domain: value.domain });
};

const validateWorksAt: GraphSchemaValidator<{ readonly since: number }> = (
  value,
) => {
  if (!isRecord(value) || typeof value.since !== "number") {
    return left({
      code: "invalid_works_at",
      message: "Expected edge data with a numeric since",
      value,
    });
  }

  return right({ since: value.since });
};

const schema = {
  nodes: {
    person: validatePerson,
    company: validateCompany,
  },
  edges: {
    worksAt: validateWorksAt,
  },
} satisfies GraphSchema;

const personNode: GraphNodeFromSchema<typeof schema, "person"> = {
  id: nodeId("person-1"),
  kind: "person",
  data: { name: "Ada" },
};

const graph: GraphDataFromSchema<typeof schema> = {
  nodes: [
    personNode,
    {
      id: nodeId("company-1"),
      kind: "company",
      data: { domain: "analytical.engine" },
    },
  ],
  edges: [
    {
      id: edgeId("works-at-1"),
      source: nodeId("person-1"),
      target: nodeId("company-1"),
      kind: "worksAt",
      data: { since: 1843 },
    },
  ],
};

void graph;

const invalidNodeData: GraphNodeFromSchema<typeof schema, "company"> = {
  id: nodeId("company-2"),
  kind: "company",
  // @ts-expect-error company nodes require company-shaped data.
  data: { name: "Ada" },
};

void invalidNodeData;

// @ts-expect-error edge ids are branded separately from node ids.
const invalidEdgeId: ReturnType<typeof edgeId> = nodeId("not-an-edge");

void invalidEdgeId;

const invalidGraph: GraphDataFromSchema<typeof schema> = {
  nodes: [
    {
      id: nodeId("person-2"),
      kind: "person",
      data: { name: "Grace" },
    },
  ],
  edges: [
    {
      id: edgeId("works-at-2"),
      source: nodeId("person-2"),
      target: nodeId("company-2"),
      kind: "worksAt",
      data: {
        // @ts-expect-error worksAt edges require numeric since data.
        since: "1843",
      },
    },
  ],
};

void invalidGraph;
