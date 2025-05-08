import { describe, it } from "node:test"
import assert from "node:assert/strict"
import optimize from "../src/optimizer.js"
import * as core from "../src/core.js"

const int = x => ({ kind: "NumericLiteral", value: BigInt(x), type: "int" })
const float = x => ({ kind: "NumericLiteral", value: x, type: "float" })
const bool = x => ({ kind: "BooleanLiteral", value: x, type: "bool" })
const str = x => ({ kind: "StringLiteral", value: x, type: "string" })
const nul = () => ({ kind: "NullLiteral", value: null, type: null })

const x = core.variable("x", "int", int(3))
const y = core.variable("y", "int", int(4))
const arr = core.variable("arr", "int[]", core.arrayExpression([int(1), int(2)], "int[]"))

const tests = [
  ["folds +", core.binary("+", int(1), int(2), "int"), int(3)],
  ["folds *", core.binary("*", int(2), int(5), "int"), int(10)],
  ["folds <", core.binary("<", int(1), int(2), "bool"), bool(true)],
  ["negates constant", core.unary("-", int(3), "int"), int(-3)],
  ["simplifies +0", core.binary("+", x, int(0), "int"), x],
  ["simplifies 0+", core.binary("+", int(0), y, "int"), y],
  ["simplifies *1", core.binary("*", x, int(1), "int"), x],
  ["simplifies *0", core.binary("*", x, int(0), "int"), int(0)],
  ["simplifies 0*", core.binary("*", int(0), x, "int"), int(0)],
  ["simplifies true && x", core.binary("&&", bool(true), x, "bool"), x],
  ["simplifies false && x", core.binary("&&", bool(false), x, "bool"), bool(false)],
  ["simplifies true || x", core.binary("||", bool(true), x, "bool"), bool(true)],
  ["simplifies false || x", core.binary("||", bool(false), x, "bool"), x],
  ["optimizes if true", core.ifStatement(bool(true), [core.exscribeStatement(x)], []), [core.exscribeStatement(x)]],
  ["optimizes if false", core.ifStatement(bool(false), [core.exscribeStatement(x)], [core.exscribeStatement(y)]), [core.exscribeStatement(y)]],
  ["eliminates x = x", core.assignment(x, x), []],
  ["dereference of address", core.dereference(core.addressOf(x, "int*"), "int"), x],
  ["preserves null literal", nul(), nul()],
  ["simplifies subscript index", core.subscript(arr, int(0), "int"), core.subscript(arr, int(0), "int")]
]

describe("Optimizer with full AST node return", () => {
  for (const [name, input, expected] of tests) {
    it(name, () => {
      assert.deepEqual(optimize(input), expected)
    })
  }
})