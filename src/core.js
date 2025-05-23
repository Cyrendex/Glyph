export function program(statements) {
    return { kind: "Program", statements }
}

export function variableDeclaration(variable, initializer) {
    return { kind: "VariableDeclaration", variable, initializer }
}

export function variable(name, type, initializer = null) {
    return { kind: "Variable", name, type , initializer }
}

export function pointerType(baseType) {
    return `${baseType}*`;
}

export function optionalType(baseType) {
    return `${baseType}?`;
}

export const uintType = "uint";
export const ufloatType = "ufloat";
export const udecimType = "udecim";
export const uslashType = "uslash";
export const uslogType = "uslog";
export const intType = "int"
export const floatType = "float"
export const decimType = "decim"
export const slashType = "slash"
export const slogType = "slog"
export const booleanType = "bool"
export const stringType = "string"
export const codepointType = "codepoint"
export const voidType = "void"
export const anyType = "any"
export const glyphType = "glyph"

export function mainStatement(executables) {
    return { kind: "MainStatement", executables }
}

export function exscribeStatement(expression) {
    return { kind: "ExscribeStatement", expression }
}

export function conjureStatement(block) {
    return { kind: "ConjureStatement", block }
}

export function importStatement(module, imports) {
    return { kind: "ImportStatement", module, imports }
}

export function typeStatement(expression, value) {
    return { kind: "TypeStatement", expression, value }
}

export function whileStatement(condition, block) {
    return { kind: "WhileStatement", condition, block }
}

export function ifStatement(condition, consequent, alternative) {
    return { kind: "IfStatement", condition, consequent, alternative}
}

export function functionDeclaration(fun) {
    return { kind: "FunctionEvoke", fun }
}

export function fun(name, parameters, body, returnHint) {
    return { kind: "Function", name, parameters, body, returnHint }
}

export function importedFunction(module, name, type) {
    return { kind: "ImportedFunction", module, name, type, imported: true }
}

export function functionType(paramTypes, returnTypes) {
    return { kind: "FunctionType", type: `conjure[${returnTypes}]`, paramTypes, returnTypes}
}

export function returnStatement(expression) {
    return { kind: "ReturnStatement", expression }
}

export function increment(variable) {
    return { kind: "Increment", variable }
}

export function decrement(variable) {
    return { kind: "Decrement", variable }
}

export function assignment(target, source) {
    return { kind: "Assignment", target, source}
}

export const breakStatement = { kind: "BreakStatement" }

export function binary(op, left, right, type) {
    return { kind: "BinaryExpression", op, left, right, type}
}

export function unary(op, operand, type) {
    return { kind: "UnaryExpression", op, operand, type}
}

export function addressOf(expression, type) {
    return { kind: "AddressOf", expression, type };
}

export function dereference(expression, type) {
    return { kind: "Dereference", expression, type };
}

export function subscript(array, index, type) {
    return { kind: "SubscriptExpression", array, index, type };
}

export function arrayExpression(elements, type) {
    return { kind: "ArrayExpression", elements, type};
}

export function functionCall(callee, args) {
    return { kind: "FunctionCall", callee, args, type: callee.type.returnTypes}
}

export function NullLiteral() {
    return { kind: "NullLiteral", value: null, type: null };
}

export function NumericLiteral(value, type) {
    return { kind: "NumericLiteral", value, type: (type || "int32") }
}

export function BooleanLiteral(value) {
    return { kind: "BooleanLiteral", value, type: booleanType }
}

export function StringLiteral(value) {
    return { kind: "StringLiteral", value, type: stringType }
}

export function CodepointLiteral(value) {
    return { kind: "CodepointLiteral", value, type: codepointType }
}

export function GlyphLiteral(value) {
    return { kind: "GlyphLiteral", value, type: glyphType }
}

String.prototype.type = stringType
Number.prototype.type = floatType
BigInt.prototype.type = intType
Boolean.prototype.type = booleanType