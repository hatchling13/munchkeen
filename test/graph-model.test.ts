import { describe, expect, expectTypeOf, it } from "vitest";

import { isLeft, isRight, left, right } from "../src/core/either";
import {
  edgeId,
  nodeId,
  type EdgeDataFromSchema,
  type EdgeId,
  type EdgeKindFromSchema,
  type GraphData,
  type GraphDataFromSchema,
  type GraphNodeFromSchema,
  type GraphSchema,
  type GraphSchemaValidator,
  type NodeDataFromSchema,
  type NodeId,
  type NodeKindFromSchema,
} from "../src/core/model";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validatePerson: GraphSchemaValidator<{ readonly name: string }> = (value) => {
  if (!isRecord(value) || typeof value.name !== "string") {
    return left({
      code: "invalid_person",
      message: "Expected person data with a string name",
      path: ["data", "name"],
      value,
    });
  }

  return right({ name: value.name });
};

const validateCompany: GraphSchemaValidator<{ readonly domain: string }> = (value) => {
  if (!isRecord(value) || typeof value.domain !== "string") {
    return left({
      code: "invalid_company",
      message: "Expected company data with a string domain",
      path: ["data", "domain"],
      value,
    });
  }

  return right({ domain: value.domain });
};

const validateWorksAt: GraphSchemaValidator<{ readonly since: number }> = (value) => {
  if (!isRecord(value) || typeof value.since !== "number") {
    return left({
      code: "invalid_works_at",
      message: "Expected edge data with a numeric since",
      path: ["data", "since"],
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

describe("graph identifiers", () => {
  it("brands node and edge ids without changing their runtime value", () => {
    const person = nodeId("person-1");
    const worksAt = edgeId("works-at-1");

    expect(person).toBe("person-1");
    expect(worksAt).toBe("works-at-1");

    expectTypeOf(person).toEqualTypeOf<NodeId>();
    expectTypeOf(worksAt).toEqualTypeOf<EdgeId>();
  });
});

describe("graph schema", () => {
  it("uses a munchkeen-owned validator contract over unknown input", () => {
    const validateNumber: GraphSchemaValidator<number> = (value) =>
      typeof value === "number"
        ? right(value)
        : left({
            code: "invalid_number",
            message: "Expected a number",
            path: ["nodes", 0, "data"],
            value,
          });

    const success = validateNumber(42);
    const failure = validateNumber("nope");

    expect(isRight(success)).toBe(true);
    expect(isLeft(failure)).toBe(true);

    if (isRight(success)) {
      expect(success.right).toBe(42);
    }

    if (isLeft(failure)) {
      expect(failure.left.code).toBe("invalid_number");
      expect(failure.left.path).toEqual(["nodes", 0, "data"]);
      expect(failure.left.value).toBe("nope");
    }
  });

  it("returns Left for invalid node and edge schema inputs", () => {
    const invalidPerson = validatePerson({ name: 123 });
    const invalidEdge = validateWorksAt({ since: "1843" });

    expect(isLeft(invalidPerson)).toBe(true);
    expect(isLeft(invalidEdge)).toBe(true);

    if (isLeft(invalidPerson)) {
      expect(invalidPerson.left.code).toBe("invalid_person");
      expect(invalidPerson.left.path).toEqual(["data", "name"]);
      expect(invalidPerson.left.value).toEqual({ name: 123 });
    }

    if (isLeft(invalidEdge)) {
      expect(invalidEdge.left.code).toBe("invalid_works_at");
      expect(invalidEdge.left.path).toEqual(["data", "since"]);
      expect(invalidEdge.left.value).toEqual({ since: "1843" });
    }
  });

  it("derives schema-aware node and edge relationships without replacing GraphData", () => {
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

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(personNode.kind).toBe("person");
    expect(personNode.data?.name).toBe("Ada");

    expectTypeOf<NodeKindFromSchema<typeof schema>>().toEqualTypeOf<"person" | "company">();
    expectTypeOf<EdgeKindFromSchema<typeof schema>>().toEqualTypeOf<"worksAt">();
    expectTypeOf<NodeDataFromSchema<typeof schema, "person">>().toEqualTypeOf<{
      readonly name: string;
    }>();
    expectTypeOf<EdgeDataFromSchema<typeof schema, "worksAt">>().toEqualTypeOf<{
      readonly since: number;
    }>();
    expectTypeOf<GraphDataFromSchema<typeof schema>>().toExtend<GraphData>();
  });
});
