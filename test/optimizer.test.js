import { describe, it } from "node:test"
import assert from "node:assert/strict"
import optimize from "../src/optimizer.js"
import analyze from "../src/analyzer.js"
import * as core from "../src/core.js"

const int = x => core.NumericLiteral(BigInt(x), "int");
const bool = x => core.BooleanLiteral(x);
const str = x => core.StringLiteral(x);
const glyph = x => core.GlyphLiteral(x);
const code = x => core.CodepointLiteral(x);
const nul = () => core.NullLiteral();

const x = core.variable("x", "int", int(1));
const y = core.variable("y", "int", int(2));
const arr = core.variable("arr", "int[]", core.arrayExpression([int(1), int(2)], "int[]"));

const structured_tests = [
    ["folds +", core.binary("+", int(1), int(2), "int"), int(3)],
    ["folds *", core.binary("*", int(2), int(5), "int"), int(10)],
    ["folds <", core.binary("<", int(1), int(2), "bool"), bool(true)],
    ["negates constant", core.unary("-", int(3), "int"), int(-3)],
    ["simplifies +0", core.binary("+", x, int(0), "int"), x],
    ["simplifies 0+", core.binary("+", int(0), y, "int"), y],
    ["simplifies *1", core.binary("*", x, int(1), "int"), x],
    ["simplifies *0", core.binary("*", x, int(0), "int"), int(0)],
    ["simplifies 0*", core.binary("*", int(0), x, "int"), int(0)],
    ["optimizes if true", core.ifStatement(bool(true), [core.exscribeStatement(x)], []), [core.exscribeStatement(x)]],
    ["optimizes if false", core.ifStatement(bool(false), [core.exscribeStatement(x)], [core.exscribeStatement(y)]), [core.exscribeStatement(y)]],
    ["eliminates x = x", core.assignment(x, x), []],
    ["dereference of address", core.dereference(core.addressOf(x, "int*"), "int"), x],
    ["preserves null literal", nul(), nul()],
    ["simplifies subscript index", core.subscript(arr, int(0), "int"), core.subscript(arr, int(0), "int")],
    ["preserves string literal", str("Howdy"), str("Howdy")],
    ["preserves glyph literal", glyph("a"), glyph("a")],
    ["preserves codepoint literal", code("U+1234"), code("U+1234")],
    ["folds constant inside array", core.arrayExpression([core.binary("+", int(1), int(2), "int")], "int[]"), core.arrayExpression([int(3)], "int[]")],
    ["preserves valid subscript", core.subscript(core.variable("myArr", "int[]"),int(1),"int"), core.subscript(core.variable("myArr", "int[]"),int(1),"int")],    
    ["optimizes variable initializer",core.variableDeclaration(core.variable("a", "int"), core.binary("+", int(1), int(2), "int")),core.variableDeclaration(core.variable("a", "int"), int(3))],
    ["optimizes increment variable",core.increment(core.variable("x", "int", int(3))), core.increment(core.variable("x", "int", int(4)))],
    ["preserves break statement",core.breakStatement, core.breakStatement],
    ["removes while false", core.whileStatement(bool(false), [core.exscribeStatement(x)]), []],
    ["optimizes Program node with nested statements",core.program([core.assignment(x, int(1)),core.assignment(x, x),]),core.program([core.assignment(x, int(1))])],
    ["optimizes expression inside ExscribeStatement",core.exscribeStatement(core.binary("+", int(1), int(2), "int")),core.exscribeStatement(int(3))],
    ["optimizes return with constant expression", core.returnStatement(core.binary("+", core.NumericLiteral(1n, "int"), core.NumericLiteral(2n, "int"), "int")), core.returnStatement(core.NumericLiteral(3n, "int"))],
    ["optimizes if-else statement with constant test (true)", core.ifStatement(core.BooleanLiteral(true), [core.exscribeStatement(core.NumericLiteral(1n, "int"))], [core.exscribeStatement(core.NumericLiteral(2n, "int"))]), [core.exscribeStatement(core.NumericLiteral(1n, "int"))]],
    ["optimizes if-else statement with constant test (false)", core.ifStatement(core.BooleanLiteral(false), [core.exscribeStatement(core.NumericLiteral(1n, "int"))], [core.exscribeStatement(core.NumericLiteral(2n, "int"))]), [core.exscribeStatement(core.NumericLiteral(2n, "int"))]],
    ["preserves while with true condition", core.whileStatement(core.BooleanLiteral(true), [core.exscribeStatement(core.NumericLiteral(42n, "int"))]), core.whileStatement(core.BooleanLiteral(true), [core.exscribeStatement(core.NumericLiteral(42n, "int"))])],
    ["folds true && false", core.binary("&&", core.BooleanLiteral(true), core.BooleanLiteral(false), "bool"), core.BooleanLiteral(false)],
    ["folds false && true", core.binary("&&", core.BooleanLiteral(false), core.BooleanLiteral(true), "bool"), core.BooleanLiteral(false)],
    ["folds <= operator", core.binary("<=", core.NumericLiteral(2n, "int"), core.NumericLiteral(3n, "int"), "bool"), core.BooleanLiteral(true)],
    ["folds == operator", core.binary("==", core.NumericLiteral(2n, "int"), core.NumericLiteral(2n, "int"), "bool"), core.BooleanLiteral(true)],
    ["folds != operator", core.binary("!=", core.NumericLiteral(2n, "int"), core.NumericLiteral(3n, "int"), "bool"), core.BooleanLiteral(true)],
    ["folds >= operator", core.binary(">=", core.NumericLiteral(4n, "int"), core.NumericLiteral(2n, "int"), "bool"), core.BooleanLiteral(true)],
    ["folds > operator", core.binary(">", core.NumericLiteral(5n, "int"), core.NumericLiteral(3n, "int"), "bool"), core.BooleanLiteral(true)],
    ["negates float constant", core.unary("-", core.NumericLiteral(3.5, "float"), "float"), core.NumericLiteral(-3.5, "float")],
    ["optimizes arguments of function call", core.functionCall(core.importedFunction("io", "exscribe", core.functionType(["int"], "void")), [core.binary("*", core.NumericLiteral(2n, "int"), core.NumericLiteral(5n, "int"), "int")]), core.functionCall(core.importedFunction("io", "exscribe", core.functionType(["int"], "void")), [core.NumericLiteral(10n, "int")])],
    ["optimizes function declaration", core.functionDeclaration(core.fun("f", [], [core.assignment(x, x)], core.functionType([], "void"))), core.functionDeclaration(core.fun("f", [], [], core.functionType([], "void")))],
    ["optimizes function body", core.fun("f", [], [core.assignment(x, x)], core.functionType([], "void")), core.fun("f", [], [], core.functionType([], "void"))],
    ["preserves decrement", core.decrement(core.variable("count", "int", core.NumericLiteral(10n, "int"))), core.decrement(core.variable("count", "int", core.NumericLiteral(9n, "int")))],
    ["preserves if with non-boolean test", core.ifStatement(core.NumericLiteral(1n, "int"), [core.exscribeStatement(x)], []), core.ifStatement(core.NumericLiteral(1n, "int"), [core.exscribeStatement(x)], [])],
    ["folds false || true", core.binary("||", core.BooleanLiteral(false), core.BooleanLiteral(true), "bool"), core.BooleanLiteral(true)],
    ["preserves unary on non-numeric", core.unary("-", core.BooleanLiteral(true), "bool"), core.unary("-", core.BooleanLiteral(true), "bool")],
    ["preserves standalone dereference", core.dereference(core.variable("ptr", "int*", null), "int"), core.dereference(core.variable("ptr", "int*", null), "int")],
];

describe("Optimizer with full AST node return", () => {
    for (const [name, input, expected] of structured_tests) {
        it(name, () => {
            assert.deepEqual(optimize(input), expected);
        });
    }
});
