import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"

const semanticChecks = [
    ["Simple arithmetic check", 
        "\
        affix io@exscribe; \
        main = exscribe (2 + 2);"
    ],

    ["Variable assignment and output", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 42; \
            exscribe x; \
        }"
    ],

    ["Function invocation with no return", 
        "\
        affix io@exscribe; \
        evoke print_message() -> void { \
            exscribe \"Hello\"; \
        } \
        \
        main = { \
            invoke print_message(); \
        }"
    ],

    ["Nested array declaration", 
        "\
        affix io@exscribe; \
        main = { \
            const arr: [[int32]] = [[1, 2], [3, 4]]; \
            exscribe arr; \
        }"
    ],

    ["String concatenation", 
        "\
        affix io@exscribe; \
        main = { \
            let message: string = \"Hello\" + \" \" + \"World\"; \
            exscribe message; \
        }"
    ],
    
    ["Boolean comparison", 
        "\
        affix io@exscribe; \
        main = { \
            const isTrue: bool = 5 > 3; \
            exscribe isTrue; \
        }"
    ],

    ["While loop", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 3; \
            while x > 0 { \
                exscribe x; \
                x = x - 1; \
            } \
        }"
    ],

    ["Function with parameters", 
        "\
        affix io@exscribe; \
        evoke add(a: int32, b: int32) -> int32 { return (a + b) } \
        main = { \
            exscribe add(2, 3); \
        }"
    ],

    ["Void function with side effects", 
        "\
        affix io@exscribe; \
        evoke log() -> void { \
            exscribe \"Logging...\"; \
        } \
        main = { \
            invoke log(); \
        }"
    ],

    ["Nested function calls", 
        "\
        affix io@exscribe; \
        evoke square(x: int32) -> int32 { return (x * x) } \
        evoke sum(a: int32, b: int32) -> int32 { return (a + b) }\
        main = { \
            exscribe sum(square(3), square(4)); \
        }"
    ],

    ["Multi-dimensional array access", 
        "\
        affix io@exscribe; \
        main = { \
            const arr: [[int32]] = [[1, 2], [3, 4]]; \
            exscribe arr[1][0]; \
        }"
    ],

    ["Function with multiple parameters", 
        "\
        affix io@exscribe; \
        evoke multiply(a: int32, b: int32, c: int32) -> int32 { return (a * b * c) }\
        main = { \
            exscribe multiply(2, 3, 4); \
        }"
    ],

    ["Function with exponentiation and multiple parameters",
        " \
        affix io@exscribe; \
        evoke is_pythag_triple (a: uint8, b: uint8, c: uint8) -> bool {\
            return (a ** 2 + b ** 2 == c ** 2) \
        }\
        main = { \
            exscribe is_pythag_triple (3, 4, 5); \
            exscribe is_pythag_triple (3, 4, 6); \
        }"
    ],

    ["Logical operations", 
        "\
        affix io@exscribe; \
        main = { \
            let x: bool = (5 > 3) && (2 < 4); \
            exscribe x; \
        }"
    ],

    ["For loop simulation", 
        "\
        affix io@exscribe; \
        main = { \
            let i: int32 = 0; \
            while i < 5 { \
                exscribe i; \
                i = i + 1; \
            } \
        }"
    ],

    ["Nested while loops", 
        "\
        affix io@exscribe; \
        main = { \
            let i: int32 = 0; \
            while i < 3 { \
                let j: int32 = 0; \
                while j < 2 { \
                    exscribe i * j; \
                    j = j + 1; \
                } \
                i = i + 1; \
            } \
        }"
    ],

    ["Conditional statements", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 10; \
            if x > 5 { \
                exscribe \"Greater\"; \
            } else { \
                exscribe \"Lesser\"; \
            } \
        }"
    ],

    ["Multiple variable declarations and usage", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 10; \
            let y: int32 = 20; \
            exscribe x + y; \
        }"
    ],

    ["Nested conditionals", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 10; \
            if x > 5 { \
                if x < 15 { \
                    exscribe \"Within range\"; \
                } \
            } \
        }"
    ],

    ["Function returning an array", 
        "\
        affix io@exscribe; \
        evoke getArray() -> [int32] = ([1, 2, 3]); \
        main = { \
            exscribe getArray(); \
        }"
    ]
]

const semanticErrors = [   
    ["Division by zero", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 5 / 0; \
            exscribe x; \
        }", 
        "Division by zero is not allowed."
    ],

    ["Type mismatch in assignment", 
        "\
        main = { \
            let x: int32 = 'string'; \
        }", 
        "Cannot assign a string to a variable of type int32."
    ],

    ["Invalid array indexing", 
        "\
        affix io@exscribe; \
        main = { \
            const arr: [int32] = [1, 2, 3]; \
            exscribe arr[5]; \
        }", 
        "Array index out of bounds."
    ],

    ["Invoking non-existent function", 
        "\
        main = { \
            invoke nonExistentFunction(); \
        }", 
        "Function 'nonExistentFunction' is not defined."
    ],

    ["Incorrect function parameter type", 
        "\
        affix io@exscribe; \
        evoke add(a: int32, b: int32) -> int32 = a + b; \
        main = { \
            exscribe add('2', 3); \
        }", 
        "Expected int32 for parameter 'a', but got string."
    ],

    ["Constant re-assignment", 
        "\
        main = { \
            const x: int32 = 5; \
            x = 10; \
        }", 
        "Cannot reassign a constant variable."
    ],

    ["Missing return type", 
        "\
        affix io@exscribe; \
        evoke badFunc() { \
            exscribe 'error'; \
        }", 
        "Function declaration requires a return type."
    ],

    ["Invalid operation between types", 
        "\
        affix io@exscribe; \
        main = { \
            exscribe 'string' + 5; \
        }", 
        "Cannot add a string and an integer."
    ],

    ["Invalid type casting", 
        "\
        main = { \
            let x: int32 = 3.14; \
        }", 
        "Cannot assign a float to a variable of type int32."
    ],

    ["Array type mismatch", 
        "\
        main = { \
            const arr: [int32] = [1, 'two', 3]; \
        }", 
        "Array contains inconsistent types; expected int32."
    ],

    ["Function call with incorrect argument count", 
        "\
        affix io@exscribe; \
        evoke add(a: int32, b: int32) -> int32 = a + b; \
        main = { \
            exscribe add(1); \
        }", 
        "Function 'add' requires 2 arguments but 1 was provided."
    ],

    ["Mismatched return type", 
        "\
        evoke returnString() -> int32 = 'This is not an int'; \
        ", 
        "Return type mismatch; expected int32 but got string."
    ],

    ["Circular type aliasing", 
        "\
        type alias A = B; \
        type alias B = A; \
        main = { \
            let x: A = 5; \
        }", 
        "Circular type alias detected."
    ],

    ["Unterminated string literal", 
        "\
        affix io@exscribe; \
        main = { \
            exscribe \"This will cause an error; \
        }", 
        "String literal not properly terminated."
    ],

    ["Function with unused parameters", 
        "\
        affix io@exscribe; \
        evoke unusedFunc(x: int32) -> int32 = 42; \
        main = { \
            exscribe unusedFunc(); \
        }", 
        "Expected argument for parameter 'x'."
    ],

    ["Accessing element from empty array", 
        "\
        affix io@exscribe; \
        main = { \
            const arr: [int32] = []; \
            exscribe arr[0]; \
        }", 
        "Array index out of bounds."
    ],

    ["Using undeclared type", 
        "\
        main = { \
            let x: NonExistentType = 10; \
        }", 
        "Type 'NonExistentType' is not declared."
    ],

    ["Array assignment type mismatch", 
        "\
        main = { \
            let arr: [int32] = [1, 2, 3]; \
            arr[0] = \"string\"; \
        }", 
        "Array element type mismatch; expected int32."
    ],

    ["Re-declaration of existing variable", 
        "\
        main = { \
            let x: int32 = 10; \
            let x: string = \"Conflict\"; \
        }", 
        "Variable 'x' is already declared."
    ],

    ["Invalid function return type", 
        "\
        affix io@exscribe; \
        evoke broken() -> int32 { \
            exscribe \"error\"; \
        }", 
        "Function expected to return int32 but returned void instead."
    ],

    ["Improper array access", 
        "\
        affix io@exscribe; \
        main = { \
            const arr: [int32] = [1, 2, 3]; \
            exscribe arr[-1]; \
        }", 
        "Array index cannot be negative."
    ],

    ["Type inference mismatch", 
        "\
        main = { \
            let x = \"string\"; \
            x = 5; \
        }", 
        "Variable type mismatch; expected string but got int32."
    ],

    ["Uninitialized variable access", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32; \
            exscribe x; \
        }", 
        "Variable 'x' used before initialization."
    ],

    ["Function redefinition", 
        "\
        evoke func() -> void {} \
        evoke func() -> void {} \
        ", 
        "Function 'func' is already declared."
    ],

    ["Array access on non-array type", 
        "\
        affix io@exscribe; \
        main = { \
            let x: int32 = 5; \
            exscribe x[0]; \
        }", 
        "Attempted array access on non-array type."
    ],

    ["Return type mismatch in complex expression", 
        "\
        evoke badFunc() -> int32 = if true { \"string\" } else { 42 }; \
        ", 
        "Inconsistent return types; expected int32."
    ],
];



describe("The analyzer", () => {
    console.log("Running " + semanticChecks.length + " semantic checks...")
    for (const [scenario, source] of semanticChecks) {
        it(`recognizes ${scenario}`, () => {
            assert.ok(analyze(parse(source)), (scenario + " should not throw"))
        })
    }
    console.log("Running " + semanticErrors.length + " semantic checks...")
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