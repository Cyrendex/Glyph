import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"

const semanticChecks = [
  ["Simple arithmetic check", "main = exscribe (2 + 2);"],
  ["Variable assignment and output", "main = { let x: int32 = 42; exscribe x; }"],
  ["Function invocation with no return", "evoke print_message() -> void { exscribe 'Hello'; } main = { invoke print_message(); }"],
  ["Nested array declaration", "main = { const arr: [[int32]] = [[1, 2], [3, 4]]; exscribe arr; }"],
  ["String concatenation", "main = { let message: string = 'Hello' + ' ' + 'World'; exscribe message; }"],
  ["Boolean comparison", "main = { const isTrue: bool = 5 > 3; exscribe isTrue; }"],
  ["While loop", "main = { let x: int32 = 3; while x > 0 { exscribe x; x = x - 1; } }"],
  ["Function with parameters", "evoke add(a: int32, b: int32) -> int32 = a + b; main = { exscribe add(2, 3); }"],
  ["Void function with side effects", "evoke log() -> void { exscribe 'Logging...'; } main = { invoke log(); }"],
  ["Nested function calls", "evoke square(x: int32) -> int32 = x * x; evoke sum(a: int32, b: int32) -> int32 = a + b; main = { exscribe sum(square(3), square(4)); }"],
  ["String length function", "evoke strlen(s: string) -> int32 = s.length; main = { exscribe strlen('test'); }"],
  ["Multi-dimensional array access", "main = { const arr: [[int32]] = [[1, 2], [3, 4]]; exscribe arr[1][0]; }"],
  ["Function with multiple parameters", "evoke multiply(a: int32, b: int32, c: int32) -> int32 = a * b * c; main = { exscribe multiply(2, 3, 4); }"],
  ["Logical operations", "main = { let x: bool = (5 > 3) && (2 < 4); exscribe x; }"],
  ["For loop simulation", "main = { let i: int32 = 0; while i < 5 { exscribe i; i = i + 1; } }"],
  ["Type aliasing", "type alias Num = int32; main = { let x: Num = 10; exscribe x; }"],
  ["Nested while loops", "main = { let i: int32 = 0; while i < 3 { let j: int32 = 0; while j < 2 { exscribe i * j; j = j + 1; } i = i + 1; } }"],
  ["Conditional statements", "main = { let x: int32 = 10; if x > 5 { exscribe 'Greater'; } else { exscribe 'Lesser'; } }"],
  ["Simple module import", "affix math@exscribe; evoke square(x: int32) -> int32 = x * x; main = { invoke math square(5); }"]
]

const semanticErrors = [
  ["Division by zero", "main = { let x: int32 = 5 / 0; exscribe x; }", "Division by zero is not allowed."],
  ["Type mismatch in assignment", "main = { let x: int32 = 'string'; }", "Cannot assign a string to a variable of type int32."],
  ["Invalid array indexing", "main = { const arr: [int32] = [1, 2, 3]; exscribe arr[5]; }", "Array index out of bounds."],
  ["Invoking non-existent function", "main = { invoke nonExistentFunction(); }", "Function 'nonExistentFunction' is not defined."],
  ["Incorrect function parameter type", "evoke add(a: int32, b: int32) -> int32 = a + b; main = { exscribe add('2', 3); }", "Expected int32 for parameter 'a', but got string."],
  ["Constant re-assignment", "main = { const x: int32 = 5; x = 10; }", "Cannot reassign a constant variable."],
  ["Missing return type", "evoke badFunc() { exscribe 'error'; }", "Function declaration requires a return type."],
  ["Non-void function with no return statement", "evoke badFunc() -> int32 { let x = 5; }", "Function expected to return int32 but no return statement provided."],
  ["Invalid operation between types", "main = { exscribe 'string' + 5; }", "Cannot add a string and an integer."],
  ["Invalid type casting", "main = { let x: int32 = 3.14; }", "Cannot assign a float to a variable of type int32."],
  ["Array type mismatch", "main = { const arr: [int32] = [1, 'two', 3]; }", "Array contains inconsistent types; expected int32."],
  ["Function call with incorrect argument count", "evoke add(a: int32, b: int32) -> int32 = a + b; main = { exscribe add(1); }", "Function 'add' requires 2 arguments but 1 was provided."],
  ["Mismatched return type", "evoke returnString() -> int32 = 'This is not an int';", "Return type mismatch; expected int32 but got string."],
  ["Circular type aliasing", "type alias A = B; type alias B = A; main = { let x: A = 5; }", "Circular type alias detected."],
  ["Unterminated string literal", "main = { exscribe \"This will cause an error; }", "String literal not properly terminated."],
  ["Function with unused parameters", "evoke unusedFunc(x: int32) -> int32 = 42; main = { exscribe unusedFunc(); }", "Expected argument for parameter 'x'."],
  ["Accessing element from empty array", "main = { const arr: [int32] = []; exscribe arr[0]; }", "Array index out of bounds."],
  ["Infinite recursion", "evoke recurse() -> void { invoke recurse(); } main = { invoke recurse(); }", "Stack overflow due to infinite recursion."],
  ["Using undeclared type", "main = { let x: NonExistentType = 10; }", "Type 'NonExistentType' is not declared."]
]



describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)), (scenario + " should not throw"))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  // it("produces the expected representation for a trivial program", () => {
  //   assert.deepEqual(
  //     analyze(parse("let x = π + 2.2;")),
  //     program([
  //       variableDeclaration(
  //         variable("x", true, floatType),
  //         binary("+", variable("π", false, floatType), 2.2, floatType)
  //       ),
  //     ])
  //   )
  // })
})