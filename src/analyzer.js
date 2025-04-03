import * as core from "./core.js";
import { standardLibrary } from "./std-lib.js";

const DEFAULT_INT_TYPE = "int32";
const DEFAULT_FLOAT_TYPE = "float64";
const validTypeRegex = /^(u?(int|float|decim|fixed|slash|slog)(8|16|32|64|128)?|bool|string|glyph|codepoint|void|any)(\[\])*$/


// Define bit sizes for each base type
const bitSizes = ["8", "16", "32", "64", "128"];
const numericBases = ["int", "uint", "float", "decim", "slash", "slog"];
const implicitNumericConversions = new Map();

function isNumeric(type) {
    return /^u?(int|float|decim|slash|slog)(8|16|32|64|128)$/.test(type);
}

function addConversion(from, to) {
  if (!implicitNumericConversions.has(from)) {
    implicitNumericConversions.set(from, new Set());
  }
  implicitNumericConversions.get(from).add(to);
}

// Add self-conversions and widening by bit size
for (const base of numericBases) {
  for (let i = 0; i < bitSizes.length; i++) {
    const from = base + bitSizes[i];

    // Allow self-conversion
    addConversion(from, from);

    // Widen to all larger sizes
    for (let j = i + 1; j < bitSizes.length; j++) {
      const to = base + bitSizes[j];
      addConversion(from, to);
    }

    // Unsigned base (e.g., uint32) → signed base (e.g., int32 or int64)
    if (base.startsWith("u")) {
      const signedBase = base.slice(1);
      addConversion(from, signedBase + bitSizes[i]);
      for (let j = i + 1; j < bitSizes.length; j++) {
        addConversion(from, signedBase + bitSizes[j]);
      }
    } else {
      // Also allow signed → unsigned of same or larger size, for positive values
      const unsignedBase = "u" + base;
      addConversion(from, unsignedBase + bitSizes[i]);
      for (let j = i + 1; j < bitSizes.length; j++) {
        addConversion(from, unsignedBase + bitSizes[j]);
      }
    }
  }
}

function isArrayType(type) {
  return type.endsWith("[]");
}

function checkImportedFunction(name, node) {
    const entity = context.lookup(name);
    check(entity, `Function '${name}' must be imported before use`, node);
    checkIsFunction(entity, node);
    return entity;
}

function unwrapArrayType(type) {
  return type.substring(0, type.length - 2); // removes rightmost []
}

function canConvert(from, to, value) {
  if (from === to) return true;
  if (from === "glyph" && to === "string") return true;
  // Check for array types
  if (isArrayType(from) && isArrayType(to)) {
    // Unwrap one level of array (e.g., int8[][] -> int8[])
    const innerFrom = unwrapArrayType(from);
    const innerTo = unwrapArrayType(to);
    
    // Recursively check if the inner types are convertible
    return canConvert(innerFrom, innerTo, undefined);
  }

  // Base case for primitive types (existing numeric logic)
  if (isNumeric(from) && isNumeric(to)) {
    if (implicitNumericConversions.has(from) && 
        implicitNumericConversions.get(from).has(to)) {
      return true;
    }
    
    // Special case for signed -> unsigned (need positive value)
    const fromIsUnsigned = from.startsWith("u");
    const toIsUnsigned = to.startsWith("u");
    
    if (!fromIsUnsigned && toIsUnsigned) {
      return typeof value === 'bigint' || typeof value === 'number'
        ? value >= 0
        : false;
    }
  }

  return false;
}
  


class Context {
    constructor(parent = null, inLoop = false, currentFunction = null) {
        this.parent = parent;
        this.locals = new Map();
        this.inLoop = inLoop;
        this.currentFunction = currentFunction;
    }
    add(name, entity) {
        this.locals.set(name, entity);
    }
    lookup(name) {
        return this.locals.get(name) || (this.parent && this.parent.lookup(name));
    }
    newChildContext({ inLoop = false, currentFunction = null } = {}) {
        // Inherit the current function context if not explicitly overridden
        const funcCtx = currentFunction !== null ? currentFunction : this.currentFunction;
        return new Context(this, inLoop, funcCtx);
    }
}

export default function analyze(match) {
    const grammar = match.matcher.grammar;
    let context = new Context();  // Start with an empty root context (no preloaded names)

    // Type category helpers
    const numericTypes = new Set([
        core.intType, core.uintType,
        core.floatType, core.ufloatType,
        core.decimType, core.udecimType,
        core.slashType, core.uslashType,
        core.slogType, core.uslogType
    ]);
    
    const textTypes = new Set([core.stringType, core.glyphType]);

    function isText(type) {
        return textTypes.has(type);
    }
    function isGlyph(type) {
        return type === core.glyphType;
    }

    function checkImportedFunction(name, node) {
        const entity = context.lookup(name);
        check(entity, `Function '${name}' must be imported before use`, node);
        checkIsFunction(entity, node);
        return entity;
    }

    function areCompatible(t1, t2) {
        if (t1 === t2 || t1 === core.anyType || t2 === core.anyType) {
            return true;
        }
    
        // Extract base types without bitsizes (e.g., int16 -> int, uint8 -> uint)
        const stripBits = t => t.replace(/\d+$/, "");
    
        // Allow signed <-> unsigned conversions between same base type (e.g., int16 ↔ uint16)
        const base1 = stripBits(t1);
        const base2 = stripBits(t2);
    
        const unsigned = base => base.startsWith("u") ? base.slice(1) : base;
    
        if (unsigned(base1) === unsigned(base2)) {
            return true;
        }
    
        // Also fallback to implicit widening rules
        return canConvert(t1, t2, undefined) || canConvert(t2, t1, undefined);
    }
    
    function handleBinaryExpression(op, left, right, node, categoryCheckFn, categoryName) {
        const leftType = left.type;
        const rightType = right.type;
        const leftValid = categoryCheckFn(leftType);
        const rightValid = categoryCheckFn(rightType);
        check(leftValid && rightValid, `Operands must be ${categoryName}`, node);

        let resultType = leftType;
        if (!areCompatible(leftType, rightType)) {
            check(false, `Cannot ${op} ${leftType} and ${rightType}`, node);
        } else if (leftType === core.anyType) {
            resultType = rightType;
        } else if (rightType === core.anyType) {
            resultType = leftType;
        }
        return core.binary(op, left, right, resultType);
    }

    // Error checking helper functions
    function check(condition, message, node) {
        if (!condition) {
            const prefix = node.source.getLineAndColumnMessage();
            throw new Error(`${prefix}${message}`);
        }
    }
    function checkNotAlreadyDeclared(name, node) {
        check(!context.lookup(name), `Identifier ${name} already declared`, node);
    }
    function checkDeclared(entity, name, node) {
        check(entity, `Identifier ${name} not declared`, node);
    }
    function checkIsFunction(entity, node) {
        check(entity.kind === "Function", `${entity.name || node.sourceString} not a function`, node);
    }
    function checkArgumentCountAndTypes(parameters, args, node) {
        check(parameters.length === args.length,
            `Expected ${parameters.length} argument(s) but ${args.length} passed`,
            node);
    
        for (let i = 0; i < parameters.length; i++) {
            const paramType = parameters[i].type;
            const arg = args[i];
            const argType = arg.type;
            if (canConvert(argType, paramType, arg.value)) {
                // Implicitly convert
                arg.type = paramType;
            } else {
                check(argType === paramType || paramType === core.anyType || argType === core.anyType,
                    `Cannot assign ${argType} to ${paramType}`, node);
            }
        }
    }    
    function checkAllElementsHaveSameType(elements, node) {
        if (elements.length > 0) {
            const firstType = elements[0].type;
            for (const elem of elements) {
                check(elem.type === firstType, "All elements must have the same type", node);
            }
        }
    }

    // Define the semantics for analysis
    const semantics = match.matcher.grammar.createSemantics().addOperation("analyze", {
        _iter(...children) {
            return children.map(child => child.analyze());
        },
        Program(statements) {
            return core.program(statements.children.map(s => s.analyze()));
        },
        Stmt_exprstmt(exp, _semi) {
            return exp.analyze();
        },
        MainStmt(_main, _eq, body) {
            // Analyze the body (Exp | Stmt | Block)
            const analyzedBody = body.analyze();
        
            // Store or handle main entry point explicitly in your analyzer/core
            return core.mainStatement(analyzedBody);
        },
        
        FunctionBody_func(_eq, expression) {
            return [core.returnStatement(expression.analyze())];
        },
        FunctionBody_decl(block) {
            return block.analyze();
        },

        Primary_parens(_open, exp, _close) {
            return exp.analyze();
        },
        Condition_add(left, _op, right) {
            const l = left.analyze();
            const r = right.analyze();
        
            const lIsNum = isNumeric(l.type);
            const rIsNum = isNumeric(r.type);
            const lIsText = isText(l.type);
            const rIsText = isText(r.type);
        
            check(!(lIsNum && rIsText) && !(lIsText && rIsNum), "Cannot add text and number", _op);
            
            if(lIsText && isGlyph(r.type) || isGlyph(l.type) && rIsText) {
                return core.binary("+", l, r, core.stringType);
            }

            if (lIsText && rIsText) {
                check(l.type === r.type, "Cannot add string to glyph", _op);
                return core.binary("+", l, r, l.type);
            }
        
            // Now it's numeric addition
            return handleBinaryExpression("+", l, r, _op, isNumeric, "numbers");
        },
        Condition_sub(left, _op, right) {
            const l = left.analyze();
            const r = right.analyze();
        
            const lType = l.type;
            const rType = r.type;
        
            check(isNumeric(lType) && isNumeric(rType), "Operands must be numeric", _op);
        
            // Prevent subtraction resulting in invalid values (e.g., uint - int)
            const resultMightUnderflow = lType.startsWith("u") && !rType.startsWith("u");
            check(!resultMightUnderflow, `Cannot subtract signed value from unsigned (${lType} - ${rType})`, _op);
        
            const resultType = areCompatible(lType, rType) ? lType : core.anyType;
            return core.binary("-", l, r, resultType);
        },
        Term_mul(left, _op, right) {
            const result = left.analyze();
            const rightNode = right.analyze();
            const operator = _op.sourceString;
            return handleBinaryExpression(operator, result, rightNode, _op, isNumeric, "numbers");
        },
        Factor_exp(base, _op, exponent) {
            const left = base.analyze();
            const right = exponent.analyze();
            return handleBinaryExpression("**", left, right, _op, isNumeric, "numbers");
        },
        Exp_relop(left, _op, right) {
            const l = left.analyze();
            const r = right.analyze();
            const o = _op.sourceString;
        
            if (["==", "!="].includes(o)) {
                check(areCompatible(l.type, r.type), "Operands to comparison must have the same type", _op);
            } else {
                check(isNumeric(l.type) && isNumeric(r.type), "Operands must be numbers", _op);
            }
        
            return core.binary(o, l, r, core.booleanType);
        },
        Primary_functionCall(id, callOrExp) {
            const calleeName = id.sourceString;
            const callee = context.lookup(calleeName);
            
            checkDeclared(callee, calleeName, id);
            checkIsFunction(callee, id);
        
            let args = [];
        
            if (callOrExp.numChildren > 0) {
                if (callOrExp.ctorName === "Arguments") {
                    // explicitly correct: callOrExp.child(1) is ListOf
                    args = callOrExp.child(1).asIteration().children.map(arg => arg.analyze());
                } else {
                    // Single expression case (no parentheses)
                    args = [callOrExp.analyze()];
                }
            }
            checkArgumentCountAndTypes(callee.parameters, args, id);
            return core.functionCall(callee, args);
        },
        
        
        Arguments(_open, argsList, _close) {
            return argsList.asIteration().children.map(arg => arg.analyze());
        },

        // Import statement: affix module@component;
        ImportStmt(_affix, moduleName, _at, importName, _semi) {
            const module = moduleName.sourceString;
            const component = importName.sourceString;
            const lib = standardLibrary[module];
            check(lib, `Module ${module} not found`, moduleName);
            const entity = lib[component];
            check(entity, `Module ${module} has no component ${component}`, importName);
            checkNotAlreadyDeclared(component, importName);
            context.add(component, entity);
            return core.importStatement(module, [component]);
        },
        // Function declaration: evoke name(params) -> returnType { ... }
        EvokeStmt(_evoke, id, _open, paramList, _close, _arrow, returnType, block) {
            const name = id.sourceString;
            checkNotAlreadyDeclared(name, id);
        
            const returnTypeStr = returnType.sourceString;
        
            // Create and assign a placeholder type before analyzing anything else
            const placeholderParams = [];
            const placeholderType = core.functionType(placeholderParams, returnTypeStr);
            const funcEntity = core.fun(name, placeholderParams, null, returnTypeStr);
            funcEntity.type = placeholderType;
        
            // Add early to allow recursive lookup
            context.add(name, funcEntity);
        
            // Start analyzing in new function scope
            context = context.newChildContext({ currentFunction: funcEntity });
        
            let params = [];
            if (paramList.numChildren > 0) {
                params = paramList.child(0).asIteration().children.map(param => param.analyze());
            }
        
            funcEntity.parameters = params;
            funcEntity.type.paramTypes = params.map(p => p.type); // Update placeholder types
        
            const body = block.analyze();
            context = context.parent;
        
            funcEntity.body = body;
            return core.functionDeclaration(funcEntity);
        },
        type(_typeNode) {
            const typeName = this.sourceString;
            check(validTypeRegex.test(typeName), `Invalid type: ${typeName}`, this);
            return typeName;
        },
        // Parameter in a function declaration: name: Type (unwrap the id: type into just type)
        Parameter(id, typeOpt) {
            const name = id.sourceString;
            let typeStr;
        
            if (typeOpt.numChildren === 0) {
                typeStr = core.anyType; // inferred/default type if missing
            } else {
                // Explicitly unwrap the Type_hint node:
                const typeHintNode = typeOpt.child(0); // ":" Type
                const actualTypeNode = typeHintNode.child(1);
                typeStr = actualTypeNode.analyze();
        
                // Safely unwrap array result if present
                if (Array.isArray(typeStr)) {
                    typeStr = typeStr[0];
                }
            }
        
            const paramVar = core.variable(name, typeStr);
            context.add(name, paramVar);
            return paramVar;
        },
        Type_array(_open, typeNode, _close) {
            const baseType = typeNode.analyze();
            check(baseType !== core.voidType, "Array elements cannot have type void", typeNode);
            return `${baseType}[]`;
        },
        Primary_subscript(arrayNode, _open, indexNode, _close) {
            const array = arrayNode.analyze();
            const index = indexNode.analyze();
          
            check(isArrayType(array.type), "Only arrays can be subscripted", arrayNode);
            check(isNumeric(index.type), "Array index must be a number", indexNode);
          
            const elementType = array.type.replace(/\[\]$/, ""); // peel off one []
            return core.subscript(array, index, elementType);
          }, 
        Type_hint(_colon, typeNode) {
            return typeNode.analyze(); // directly delegate to type's analysis
        },
        numericType(typeNode) {
            const literal = typeNode.sourceString;
            check(validTypeRegex.test(literal), `Invalid numeric type: ${literal}`, typeNode);
            return literal;
        },
        
        
        unsignedNumericType(typeName, bitsizeOpt) {
            const baseType = typeName.sourceString; // explicitly "uint", "ufloat", etc.
            const bitSize = bitsizeOpt.numChildren ? bitsizeOpt.sourceString : "";
            const typeStr = `${baseType}${bitSize}`;
            check(validTypeRegex.test(typeStr), `Invalid numeric type: ${typeStr}`, this);
            return typeStr;
        },

        signedNumericType(typeName, bitsizeOpt) {
            const baseType = typeName.sourceString; // explicitly "int", "float", etc.
            const bitSize = bitsizeOpt.numChildren ? bitsizeOpt.sourceString : "";
            const typeStr = `${baseType}${bitSize}`;
            check(validTypeRegex.test(typeStr), `Invalid numeric type: ${typeStr}`, this);
            return typeStr;
        },
        
        InvokeStmt_invoke(_invoke, funcId, argsNode, _endchar) {
            const calleeName = funcId.sourceString;
            const callee = context.lookup(calleeName);
            checkDeclared(callee, calleeName, funcId);
            checkIsFunction(callee, funcId);
        
            const args = argsNode.analyze();
            checkArgumentCountAndTypes(callee.parameters, args, funcId);
            return core.functionCall(callee, args);
        },
        
        // Exscribe output statement: exscribe expr;
        ExscribeStmt(_exscribe, exp, _semi) {
            const exscribeFunc = context.lookup("exscribe");
            checkDeclared(exscribeFunc, "exscribe", _exscribe);
            const value = exp.analyze();
            return core.exscribeStatement(value);
        },        
        // Return statement: return expr?;
        ReturnStmt(_return, expr) {
            check(context.currentFunction, "Return can only appear inside a function", _return);
            const func = context.currentFunction;
            if (!func.returnHint) {
                // No declared return type -> inference mode
                if (expr.numChildren === 0) {
                    // bare return
                    if (!func.returnType) {
                        func.returnType = core.voidType;
                    } else if (func.returnType !== core.voidType) {
                        // conflict: prior returns expected a value
                        check(false, `Return statement in function ${func.name} ` +
                            `missing a return value of type ${func.returnType}`, _return);
                    }
                    return core.returnStatement(null);
                } else {
                    // return with a value
                    const returnValue = expr.analyze();
                    if (!func.returnType || func.returnType === core.voidType) {
                        if (!func.returnType) {
                            // first return with a value sets the return type
                            func.returnType = returnValue.type;
                        } else {
                            // conflict: a previous return was void
                            check(false, "Return with a value in void function", expr);
                        }
                    } else {
                        // ensure subsequent returns match the inferred type (or `any`)
                        check(
                            canConvert(returnValue.type, func.returnType, returnValue.value) ||
                            returnValue.type === core.anyType ||
                            func.returnType === core.anyType,
                            `Expected return type ${func.returnType} but got ${returnValue.type}`,
                            expr
                        );
                    }
                    return core.returnStatement(returnValue);
                }
            } else {
                // Declared return type (existing behavior)
                const expectedType = func.returnHint;  // the declared type
                if (expr.numChildren === 0) {
                    // no value provided, declared type must be void
                    check(expectedType === core.voidType,
                        `Return statement in function ${func.name} missing a return value of type ${expectedType}`,
                        _return);
                    return core.returnStatement(null);
                } else {
                    const returnValue = expr.analyze();
                    check(expectedType !== core.voidType, "Return with a value in void function", expr);
                    check(
                        canConvert(returnValue.type, expectedType, returnValue.value) ||
                        returnValue.type === core.anyType ||
                        expectedType === core.anyType,
                        `Expected return type ${expectedType} but got ${returnValue.type}`,
                        expr
                    );
                    return core.returnStatement(returnValue);
                }
            }
        },
        // Variable declaration with type: (let/const) name: Type = expr;
        LetStmt(_let, decl) {
            const node = decl.analyze();
            node.variable.mutable = true;
            return node;
        },

        ConstStmt(_const, decl) {
            const node = decl.analyze();
            node.variable.mutable = false;
            return node;
        },
        NonemptyListOf(first, _sep, rest) {
            return [first.analyze(), ...rest.analyze()];
        },
        VarDec(id, maybeType, _eq, expr, _semi) {
            const name = id.sourceString;
            checkNotAlreadyDeclared(name, id);
            const initial = expr.analyze();
        
            let typeStr;
            if (maybeType.children.length === 0) {
                typeStr = initial.type;
            } else {
                const typeHintNode = maybeType.child(0); // ":" Type
                const typeNode = typeHintNode.child(1);  // this is the actual Type
                typeStr = typeNode.analyze();
                check(validTypeRegex.test(typeStr), "Type expected", typeNode);

                if (typeStr !== core.anyType) {
                    check(initial.type === typeStr || initial.type === core.anyType,
                        `Cannot assign ${initial.type} to ${typeStr}`, id);
                }
            }
        
            const variable = core.variable(name, typeStr);
            context.add(name, variable);
            return core.variableDeclaration(variable, initial);
        },        
        // Assignment: target = source;
        AssignmentStmt(id, _eq, expr, _semi) {
            const source = expr.analyze();
            const target = id.analyze();
        
            check(target && target.kind === "Variable", `${id.sourceString} not declared`, id);
            if (target.mutable !== undefined) {
                check(target.mutable, `Cannot assign to constant ${target.name}`, id);
            }
        
            check(
                canConvert(source.type, target.type, source.value) ||
                source.type === core.anyType ||
                target.type === core.anyType,
                `Cannot assign ${source.type} to ${target.type}`,
                id
            );
        
            return core.assignment(target, source);
        },
        
        // If statement (with optional else)
        IfStmt(_if, testExpr, trueBlock, _else, falseBlock) {
            const condition = testExpr.analyze();
            check(condition.type === core.booleanType, "Expected a boolean", testExpr);
            const consequent = trueBlock.analyze();
            const alternate = falseBlock?.analyze() || [];  // handle optional else
            return core.ifStatement(condition, consequent, alternate);
        },
        // While loop statement
        WhileStmt(_while, testExpr, bodyBlock) {
            const condition = testExpr.analyze();
            check(condition.type === core.booleanType, "Expected a boolean", testExpr);
            context = context.newChildContext({ inLoop: true });
            const body = bodyBlock.analyze();
            context = context.parent;
            return core.whileStatement(condition, body);
        },
        // Break statement: break;
        Stmt_break(breakKeyword, _semi) {
            check(context.inLoop, "Break can only appear in a loop", breakKeyword);
            return core.breakStatement;
        },
        // Block: { statements }
        Block(_open, statements, _close) {
            context = context.newChildContext({ inLoop: context.inLoop, currentFunction: context.currentFunction });
            const stmts = statements.children.map(s => s.analyze());
            context = context.parent;
            return stmts;
        },
        // Array literal: [elements,...]
        Primary_array(_open, elems, _close) {
            const elements = elems.asIteration().children.map(e => e.analyze());
            checkAllElementsHaveSameType(elements, _open);
            const elemType = elements.length === 0 ? core.anyType : elements[0].type;
            return core.arrayExpression(elements, `${elemType}[]`);
        },
        // Identifier
        id(_first, _rest) {
            const name = this.sourceString;
            const entity = context.lookup(name);
            checkDeclared(entity, name, this);
            return entity;
        },
        // Literals
        numeral(_digits, _dot, _frac, _e, _expSign, _exp) {
            const text = this.sourceString;
            return text.includes(".") || text.includes("e") || text.includes("E")
                ? { kind: "NumericLiteral", value: Number(text), type: DEFAULT_FLOAT_TYPE }
                : { kind: "NumericLiteral", value: BigInt(text), type: DEFAULT_INT_TYPE };
        },
        stringlit(_open, _chars, _close) {
            return {
                kind: "StringLiteral",
                value: this.sourceString,
                type: core.stringType
            };
        },
        charlit(_open, charNode, _close) {
            const value = charNode.sourceString;
            return {
              kind: "GlyphLiteral",
              value,
              type: core.glyphType,
            };
          },         
        true(_) {
            const boolVal = true;
            boolVal.type = core.booleanType;
            return boolVal;
        },
        false(_) {
            const boolVal = false;
            boolVal.type = core.booleanType;
            return boolVal;
        }
    }
    );

    return semantics(match).analyze();
}
