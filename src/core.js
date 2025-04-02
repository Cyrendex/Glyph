export function program(statements) {
    return { kind: "Program", statements }
}
  
export function variableDeclaration(variable, initializer) {
  return { kind: "VariableDeclaration", variable, initializer }
}

export function variable(name, type) {
  return { kind: "Variable", name, type }
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

export function whileStatement(condition, block) {
  return { kind: "WhileStatement", condition, block }
}

export function ifStatement(condition, consequent, alternative) {
  return { kind: "IfStatement", condition, consequent, alternative}
}

// export function shortIfStatement(condition, consequent) {
//   return { kind: "ShortIfStatement", condition, consequent }
// }

export function lambdaDeclaration(lambda, initializer) {
  return { kind: "LambdaStatement", lambda, initializer }
}

export function lambda(name, params, body, type) {
  return { kind: "Lambda", name, params, body, type}
}

export function functionDeclaration(fun) {
  return { kind: "FunctionEvoke", fun }
}

export function fun(name, parameters, body, returnHint) {
  return { kind: "Function", name, parameters, body, returnHint }
}

export function importedFunction(module, name, type) {
  return { kind: "Function", module, name, type, imported: true }
}

export function functionType(paramTypes, returnTypes) {
  return { kind: "FunctionType", paramTypes, returnTypes}
}

export function optionalType(baseType) {
  return { kind: "OptionalType", baseType}
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

export function subscript(array, index, type) {
  return {
    kind: "SubscriptExpression",
    array,
    index,
    type
  };
}


export function arrayExpression(elements, type) {
  return {
    kind: "ArrayExpression",
    elements,
    type
  };
}

export function functionCall(callee, args) {
  if (callee.imported) {
    // NMK: idk smth that makes it act normal
  }
  return { kind: "FunctionCall", callee, args, type: callee.type.returnTypes}
}

// NMK: Don't know if we actually need these, Toal's suggestion for his lang
// // These local constants are used to simplify the standard library definitions.
// const floatToFloatType = functionType([floatType], floatType)
// const floatFloatToFloatType = functionType([floatType, floatType], floatType)
// const stringToIntsType = functionType([stringType], arrayType(intType))
// const anyToVoidType = functionType([anyType], voidType)

// NMK: Need to modify this to support our tomes (modules)
// export const standardLibrary = Object.freeze({
//   int: intType,
//   float: floatType,
//   boolean: boolType,
//   string: stringType,
//   void: voidType,
//   any: anyType,
//   π: variable("π", true, floatType),
//   print: fun("print", anyToVoidType),
//   sin: fun("sin", floatToFloatType),
//   cos: fun("cos", floatToFloatType),
//   exp: fun("exp", floatToFloatType),
//   ln: fun("ln", floatToFloatType),
//   hypot: fun("hypot", floatFloatToFloatType),
//   bytes: fun("bytes", stringToIntsType),
//   codepoints: fun("codepoints", stringToIntsType),
// })


// NMK: Again, Don't know if we need Toal's monkey patching but wdik
// We want every expression to have a type property. But we aren't creating
// special entities for numbers, strings, and booleans; instead, we are
// just using JavaScript values for those. Fortunately we can monkey patch
// the JS classes for these to give us what we want.
String.prototype.type = stringType
Number.prototype.type = floatType
BigInt.prototype.type = intType
Boolean.prototype.type = booleanType