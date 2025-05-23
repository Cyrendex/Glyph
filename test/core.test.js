import { describe, it } from "node:test"
import assert from "node:assert/strict"

import {
    program,
    variableDeclaration,
    variable,
    uintType,
    fun,
    binary,
    unary,
    ifStatement,
    whileStatement,
    breakStatement,
    returnStatement,
    subscript,
    arrayExpression,
    increment,
    decrement
} from '../src/core.js';

    describe('Glyph Core Functions', () => {

    describe('Program', () => {
        it('should create a program node', () => {
            const node = program([]);
            assert.strictEqual(node.kind, 'Program');
            assert.deepStrictEqual(node.statements, []);
        });
    });

    describe('Variable Declarations', () => {
        it('should create a variable declaration node', () => {
            const node = variableDeclaration(variable("x", uintType), 42);
            assert.strictEqual(node.kind, 'VariableDeclaration');
            assert.strictEqual(node.variable.name, 'x');
            assert.strictEqual(node.variable.type, uintType);
            assert.strictEqual(node.initializer, 42);
        });
    });

    describe('Function Declarations', () => {
        it('should create a function declaration node', () => {
            const node = fun("sum", ["a", "b"], ["return a + b;"], "int");
            assert.strictEqual(node.kind, 'Function');
            assert.strictEqual(node.name, 'sum');
            assert.deepStrictEqual(node.parameters, ["a", "b"]);
            assert.deepStrictEqual(node.body, ["return a + b;"]);
            assert.strictEqual(node.returnHint, 'int');
        });
    });

    describe('Binary Expressions', () => {
        it('should create a binary expression node', () => {
            const node = binary('+', 1, 2, uintType);
            assert.strictEqual(node.kind, 'BinaryExpression');
            assert.strictEqual(node.op, '+');
            assert.strictEqual(node.left, 1);
            assert.strictEqual(node.right, 2);
            assert.strictEqual(node.type, uintType);
        });
    });

    describe('Unary Expressions', () => {
        it('should create a unary expression node', () => {
            const node = unary('-', 1, uintType);
            assert.strictEqual(node.kind, 'UnaryExpression');
            assert.strictEqual(node.op, '-');
            assert.strictEqual(node.operand, 1);
            assert.strictEqual(node.type, uintType);
        });
    });

    describe('If Statements', () => {
        it('should create an if statement node', () => {
            const node = ifStatement(true, ["exscribe('True');"], ["exscribe('False');"]);
            assert.strictEqual(node.kind, 'IfStatement');
            assert.strictEqual(node.condition, true);
            assert.deepStrictEqual(node.consequent, ["exscribe('True');"]);
            assert.deepStrictEqual(node.alternative, ["exscribe('False');"]);
        });
    });

    describe('While Statements', () => {
        it('should create a while statement node', () => {
        const node = whileStatement(true, ["exscribe('Looping');"]);
            assert.strictEqual(node.kind, 'WhileStatement');
            assert.strictEqual(node.condition, true);
            assert.deepStrictEqual(node.block, ["exscribe('Looping');"]);
        });
    });

    describe('Array Expressions', () => {
        it('should create an array expression node', () => {
        const node = arrayExpression([1, 2, 3], uintType);
            assert.strictEqual(node.kind, 'ArrayExpression');
            assert.deepStrictEqual(node.elements, [1, 2, 3]);
            assert.strictEqual(node.type, uintType);
        });
    });

    describe('Subscript Expressions', () => {
        it('should create a subscript expression node', () => {
        const node = subscript('array', 0);
            assert.strictEqual(node.kind, 'SubscriptExpression');
            assert.strictEqual(node.array, 'array');
            assert.strictEqual(node.index, 0);
        });
    });

    describe('Control Flow', () => {
        it('should create a break statement node', () => {
            assert.strictEqual(breakStatement.kind, 'BreakStatement');
        });

        it('should create an increment statement node', () => {
            const node = increment("x");
            assert.strictEqual(node.kind, 'Increment');
            assert.strictEqual(node.variable, "x");
        });

        it('should create a decrement statement node', () => {
            const node = decrement("x");
            assert.strictEqual(node.kind, 'Decrement');
            assert.strictEqual(node.variable, "x");
        });
    });

    describe('Return Statements', () => {
        it('should create a return statement node', () => {
            const node = returnStatement(42);
            assert.strictEqual(node.kind, 'ReturnStatement');
            assert.strictEqual(node.expression, 42);
        });
    });
    
    //TODO - Uncomment and implement the following tests when the functions are implemented
    // describe('conjureStatement', () => {
    //   it('should return a ConjureStatement with the given block', () => {
    //     const block = { kind: 'Block', statements: [] };
    //     const result = conjureStatement(block);
    //     assert.deepEqual(result, { kind: 'ConjureStatement', block });
    //   });
    // });

    describe('increment', () => {
        it('should return an Increment with the given variable', () => {
            const variable = 'x';
            const result = increment(variable);
            assert.deepEqual(result, { kind: 'Increment', variable });
        });
    });

    describe('decrement', () => {
        it('should return a Decrement with the given variable', () => {
            const variable = 'x';
            const result = decrement(variable);
            assert.deepEqual(result, { kind: 'Decrement', variable });
        });
    });
});
