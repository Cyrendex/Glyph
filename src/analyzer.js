import * as core from "./core.js";
import { standardLibrary } from "./std-lib.js";

const DEFAULT_INT_TYPE = "int32";
const DEFAULT_FLOAT_TYPE = "float64";
const validTypeRegex = /^(u?(int|float|decim|fixed|slash|slog)(8|16|32|64|128)|bool|string|glyph|codepoint|void|any)(\[\]|\*|\?)*$/;



// Define bit sizes for each base type
const bitSizes = ["8", "16", "32", "64", "128"];
const numericBases = ["int", "uint", "float", "decim", "slash", "slog"];
const implicitNumericConversions = new Map();

function isNumeric(type) {
    return /^u?(int|float|decim|slash|slog)(8|16|32|64|128)$/.test(type);
}

function parseNumericBits(type) {
    const match = type.match(/^(u?)(int|float|decim|slash|slog)(\d+)?$/);
    if (!match) return null;
    return {
        unsigned: !!match[1],
        base: match[2],
        bits: match[3] ? Number(match[3]) : undefined,
    };
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



function isPointerType(type) {
    return typeof type === "string" && type.endsWith("*");
}

function unwrapPointerType(type) {
    return isPointerType(type) ? type.slice(0, -1) : type;
}

function isOptionalType(type) {
    return typeof type === "string" && type.endsWith("?");
}

function unwrapOptionalType(type) {
    return isOptionalType(type) ? type.slice(0, -1) : type;
}

function isArrayType(type) {
    return type.endsWith("[]");
}

function unwrapArrayType(type) {
    return type.substring(0, type.length - 2); // removes rightmost []
}

function canConvertArray(from, to, value) {
    if (!isArrayType(from) || !isArrayType(to)) return false;
    const fromElem = unwrapArrayType(from);
    const toElem = unwrapArrayType(to);
    if (!Array.isArray(value)) return canConvert(fromElem, toElem, undefined);
    return value.every(element =>
        Array.isArray(element)
            ? canConvertArray(fromElem, toElem, element)
            : canConvert(fromElem, toElem, element)
    );
}

function canConvert(from, to, value) {
    if (from === to || from === "any" || to === "any") return true;
    if (from === "glyph" && to === "string") return true;
    
    if (isOptionalType(to) && from === unwrapOptionalType(to)) return true;

    if (isArrayType(from) && isArrayType(to)) {
        return canConvertArray(from, to, value);
    }

    if (isNumeric(from) && isNumeric(to)) {
        const f = parseNumericBits(from);
        const t = parseNumericBits(to);

        if (!f || !t) return false;

        if (f.bits < t.bits) return true;
        const fractionalBases = ["float", "decim", "slash", "slog"];
        const isFractional = base => fractionalBases.includes(base);

        if (f.bits >= t.bits && (!isFractional(f.base) || isFractional(t.base))) {

            if (typeof value !== "number" && typeof value !== "bigint") return false;

            let min, max;
            if (t.unsigned) {
                min = BigInt(0);
                max = BigInt(2 ** t.bits - 1);
            } else {
                min = BigInt(-(2 ** (t.bits - 1)));
                max = BigInt(2 ** (t.bits - 1) - 1);
            }

            const numericValue =
                typeof value === "bigint" ? value : BigInt(Math.floor(value));

            return numericValue >= min && numericValue <= max;
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
        const funcCtx = currentFunction !== null ? currentFunction : this.currentFunction;
        return new Context(this, inLoop, funcCtx);
    }
}

export default function analyze(match) {
    let context = new Context();

    const textTypes = new Set([core.stringType, core.glyphType]);

    function isText(type) {
        return textTypes.has(type);
    }

    function isGlyph(type) {
        return type === core.glyphType;
    }

    function hasReturn(node) {
        if (node.kind === "ReturnStatement") {
            return true;
        }

        for (let i in node) {
            if (node[i].kind === "ReturnStatement") {
                return true;
            }

            if (node[i].kind === "IfStatement") {
                return hasReturn(node[i].consequent) && hasReturn(node[i].alternative.flat());
            }

            if (node[i].kind === "WhileStatement") {
                return node[i].block.some(hasReturn);
            }
        }

        return false;
    }
      
    function areCompatible(term1, term2) {
        if (term1 === term2 || term1 === core.anyType || term2 === core.anyType) {
            return true;
        }

        // Extract base types without bitsizes (e.g., interm16 -> int, uint8 -> uint)
        const stripBits = t => t.replace(/\d+$/, "");

        // Allow signed <-> unsigned conversions between same base type (e.g., interm16 ↔ uinterm16)
        const base1 = stripBits(term1);
        const base2 = stripBits(term2);

        const unsigned = base => base.startsWith("u") ? base.slice(1) : base;

        if (unsigned(base1) === unsigned(base2)) {
            return true;
        }

        // Also fallback to implicit widening rules
        return canConvert(term1, term2, undefined) || canConvert(term2, term1, undefined);
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

        // Optional constant folding
        let value = undefined;
        if ("value" in left && "value" in right) {
            try {
                const leftValue = left.value;
                const rightValue = right.value;
                switch (op) {
                    case "+": value = leftValue + rightValue; break;
                    case "-": value = leftValue - rightValue; break;
                    case "*": value = leftValue * rightValue; break;
                    case "/": value = leftValue / rightValue; break;
                    case "%": value = leftValue % rightValue; break;
                }
            } catch {
                value = undefined;
            }
        }

        const nodeObj = core.binary(op, left, right, resultType);
        if (value !== undefined) {
            nodeObj.value = value;
        }
        return nodeObj;
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
            const argument = args[i];
            const argumentType = argument.type;
            if (canConvert(argumentType, paramType, argument.value)) {
                argument.type = paramType;
            } else {
                check(argumentType === paramType || paramType === core.anyType || argumentType === core.anyType,
                    `Cannot assign ${argumentType} to ${paramType}`, node);
            }
        }
    }

    function checkArrayIndexing(array, arrayNode, index, indexNode) {
        check(isArrayType(array.type), "Only arrays can be subscripted", arrayNode);
        check(isNumeric(index.type), "Array index must be a number", indexNode);
        check(index.value >= 0n, "Array index must be non-negative", indexNode);
        if (array.kind === "Variable" && array.initializer && Array.isArray(array.initializer.elements)) {
            check(!(Number(index.value) > (array.initializer.elements.length - 1)), "Array index out of bounds", indexNode);
        } else if (array.kind === "SubscriptExpression") {
            checkArrayIndexing(array.array, arrayNode, index, indexNode);
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
            const analyzedBody = body.analyze();
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

        Condition_and(left, _op, right) {
            const leftTerm = left.analyze();
            const rightTerm = right.analyze();
            check(leftTerm.type === core.booleanType && rightTerm.type === core.booleanType, "Operands must be boolean", _op);
            return core.binary("&&", leftTerm, rightTerm, core.booleanType);
        },

        Condition_or(left, _op, right) {
            const leftTerm = left.analyze();
            const rightTerm = right.analyze();
            check(leftTerm.type === core.booleanType && rightTerm.type === core.booleanType, "Operands must be boolean", _op);
            return core.binary("||", leftTerm, rightTerm, core.booleanType);
        },

        Condition_add(left, _op, right) {
            const leftTerm = left.analyze();
            const rightTerm = right.analyze();

            const leftIsNumeric = isNumeric(leftTerm.type);
            const rightIsNumeric = isNumeric(rightTerm.type);
            const leftIsTextual = isText(leftTerm.type);
            const rightIsTextual = isText(rightTerm.type);

            check(!(leftIsNumeric && rightIsTextual) && !(leftIsTextual && rightIsNumeric), "Cannot add text and number", _op);

            if (leftIsTextual && isGlyph(rightTerm.type) || isGlyph(leftTerm.type) && rightIsTextual) {
                return core.binary("+", leftTerm, rightTerm, core.stringType);
            }

            if (leftIsTextual && rightIsTextual) {
                check(leftTerm.type === rightTerm.type, "Cannot add string to glyph", _op);
                return core.binary("+", leftTerm, rightTerm, leftTerm.type);
            }

            return handleBinaryExpression("+", leftTerm, rightTerm, _op, isNumeric, "numbers");
        },

        Condition_sub(left, _op, right) {
            const leftTerm =left.analyze();
            const rightTerm =right.analyze();

            const leftTermType = leftTerm.type;
            const rightTermType = rightTerm.type;

            check(isNumeric(leftTermType) && isNumeric(rightTermType), "Operands must be numeric", _op);

            const resultMightUnderflow = leftTermType.startsWith("u") && !rightTermType.startsWith("u");
            check(!resultMightUnderflow, `Cannot subtract signed value from unsigned (${leftTermType} - ${rightTermType})`, _op);

            const resultType = areCompatible(leftTermType, rightTermType) ? leftTermType : core.anyType;
            return core.binary("-", leftTerm , rightTerm, resultType);
        },

        Term_mul(left, _op, right) {
            const result = left.analyze();
            const rightNode = right.analyze();
            const operator = _op.sourceString;
            return handleBinaryExpression(operator, result, rightNode, _op, isNumeric, "numbers");
        },

        Term_div(left, _op, right) {
            const result = left.analyze();
            const rightNode = right.analyze();
            const operator = _op.sourceString;
            check(!(BigInt(rightNode.value) === 0n), "Cannot divide by zero", _op);
            return handleBinaryExpression(operator, result, rightNode, _op, isNumeric, "numbers");
        },

        Term_mod(left, _op, right) {
            const result = left.analyze();
            const rightNode = right.analyze();
            const operator = _op.sourceString;
            check(!(BigInt(rightNode.value) === 0n), "Cannot mod by zero", _op);
            return handleBinaryExpression(operator, result, rightNode, _op, isNumeric, "numbers");
        },

        Factor_neg(_op, base) {
            const operand = base.analyze();
            check(isNumeric(operand.type), "Unary minus only for numbers", _op);
            const result = core.unary("-", operand, operand.type);

            if ("value" in operand && (typeof operand.value === "number" || typeof operand.value === "bigint")) {
                result.value = typeof operand.value === "bigint"
                    ? -operand.value
                    : -Number(operand.value);
            }

            return result;
        },

        Factor_exp(base, _op, exponent) {
            const leftTerm = base.analyze();
            const rightTerm = exponent.analyze();
            return handleBinaryExpression("**", leftTerm, rightTerm, _op, isNumeric, "numbers");
        },

        Exp_relop(left, _op, right) {
            const leftTerm = left.analyze();
            const rightTerm = right.analyze();
            const operandString = _op.sourceString;

            if (["==", "!="].includes(operandString)) {
                check(areCompatible(leftTerm.type, rightTerm.type), "Operands to comparison must have the same type", _op);
            } else {
                check(isNumeric(leftTerm.type) && isNumeric(rightTerm.type), "Operands must be numbers", _op);
            }

            return core.binary(operandString, leftTerm, rightTerm, core.booleanType);
        },

        Primary_functionCall(id, argsNode) {
            const calleeName = id.sourceString;
            const symbol = context.lookup(calleeName);
            checkDeclared(symbol, calleeName, id);
            
            const callee = symbol.kind === "Variable" ? symbol.initializer : symbol;
          
            check(callee?.type?.kind === "FunctionType",`${callee.name ?? calleeName} is not a function`,id);

            const args = argsNode.analyze();

            if (callee.kind === "Function") {
                checkArgumentCountAndTypes(callee.parameters, args, id);
            } else if (callee.kind === "ImportedFunction") {
                let parameters = standardLibrary["properties"]["functionList"][callee.module][callee.name];
                check(args.length === parameters['expectedParameters'], `'${callee.name}' expects ${parameters['expectedParameters']} arguments`, id);
                if(parameters['expectedParameters'] === 1) {

                    if(parameters["expectedFields"] === null) {
                        return parameters["coreFunction"]();
                    } else {
                        let collected = [args[0]];
                        for (const [key, val] of Object.entries(args[0])) {
                            if (parameters["expectedFields"].includes(key)) {
                              collected.push(val);
                            }
                        }

                        if(parameters["additionalBehaviors"] !== null && Object.keys(parameters["additionalBehaviors"]).includes(args[0].kind)) {
                            const behavior = parameters["additionalBehaviors"][args[0].kind];
                            collected[behavior[1]] = collected[behavior[1]][behavior[0]];
                        }

                        check(collected.length===parameters["expectedFields"].length+1, `Expected '${parameters['expectedFields'].length+1}' arguments, got '${collected.length}'`, id);
                        return parameters["coreFunction"](...collected);
                    }
                }

                //Need additional checks for Imported Functions with more than 1 expected parameter (ex: swap(1, 2))
            }

            return core.functionCall(callee, args);
        },

        Arguments(_open, argsList, _close) {
            return argsList.asIteration().children.map(arg => arg.analyze());
        },

        // Import statement: affix module@component;
        ImportStmt(_affix, moduleName, _at, importName, _semi) {
            const module = moduleName.sourceString;
            const component = importName.sourceString;
            const library = standardLibrary[module];
            check(library, `Module ${module} not found`, moduleName);
            const entity = library[component];
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
            
            const placeholderParams = [];
            const placeholderType = core.functionType(placeholderParams, returnTypeStr);
            const funcEntity = core.fun(name, placeholderParams, null, returnTypeStr);
            funcEntity.type = placeholderType;
          
            context.add(name, funcEntity);
          
            context = context.newChildContext({ currentFunction: funcEntity });
          
            const params = paramList.numChildren > 0
              ? paramList.child(0).asIteration().children.map(p => p.analyze())
              : [];
            
            funcEntity.parameters = params;
            funcEntity.type.paramTypes = params.map(p => p.type);
            
            const body = block.analyze();
            context = context.parent;
          
            funcEntity.body = body;
            if (returnTypeStr !== core.voidType) {
                check(hasReturn(body), `Missing return in function '${name}' that returns ${returnTypeStr}`, id);
            }
          
            return core.functionDeclaration(funcEntity);
        },

        Primary_lambda(id, _colon, _open, paramList, _close, _arrow, returnTypeNode, _eq, conjureStmt) {
            const returnType = returnTypeNode.analyze();
            const name = id.sourceString;
            checkNotAlreadyDeclared(name, id);
            const placeholderParams = [];
            const placeholderType = core.functionType(placeholderParams, returnType);
            const funcEntity = core.fun(name, placeholderParams, null, returnType);
            funcEntity.type = placeholderType;
            context.add(name, funcEntity);
            context = context.newChildContext({ currentFunction: funcEntity });
            const params = paramList.numChildren > 0
                ? paramList.child(0).asIteration().children.map(p => p.analyze())
                : [];

            funcEntity.parameters = params;
            funcEntity.type.paramTypes = params.map(p => p.type);
            const conjureNode = conjureStmt.analyze();
            const body = conjureNode.block;
            context = context.parent;
            
            funcEntity.body = body;
            
            if (returnType !== core.voidType) {
                check(hasReturn(body), `Missing return in function '${name}' that returns ${returnType}`, id);
            }
            
            return core.functionDeclaration(funcEntity);
        },

        // Parameter in a function declaration: name: Type (unwrap the id: type into just type)
        Parameter(id, typeOpt) {
            const name = id.sourceString;
            let typeStr;

            const typeHintNode = typeOpt.child(0);
            const actualTypeNode = typeHintNode.child(1);
            typeStr = actualTypeNode.analyze();

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
            checkArrayIndexing(array, arrayNode, index, indexNode);
            const elementType = array.type.replace(/\[\]$/, "");
            return core.subscript(array, index, elementType);
        },

        Type_refderef(op, typeNode) {
            const base = typeNode.analyze();
            const opStr = op.sourceString;
          
            if (opStr === "*") {
                return `${base}*`;
            }
        },

        Primary_addr(_amp, expr) {
            const variable = expr.analyze();
            check(variable.kind === "Variable", "Can only take address of variables", expr);
            return core.addressOf(variable, `${variable.type}*`);
        },
        
        Primary_deref(_star, expr) {
            const operand = expr.analyze();
            check(isPointerType(operand.type), "Can only dereference a pointer", expr);
            return core.dereference(operand, unwrapPointerType(operand.type));
        },

        Type_group(_open, inner, _close) {
            return inner.analyze();
        },

        Type_option(innerType, _q) {
            const typeStr = innerType.analyze();
            return core.optionalType(typeStr);
        },

        Primary_null(_) {
            return core.NullLiteral();
        },

        Type_conjure(_conjure, _open, returnTypeNode, _close) {
            const returnType = returnTypeNode.analyze();
            return core.functionType([], returnType);
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
            check(value.type !== core.voidType,"Cannot exscribe a void value",exp);
            return core.exscribeStatement(value);
        },
        
        // Return statement: return expr?;
        ReturnStmt(_return, expr) {
            // Ensure we're inside a function
            check(context.currentFunction, "Return can only appear inside a function", _return);
            const func = context.currentFunction;

            const expectedType = func.returnHint || func.returnType;
            const isVoid = expectedType === core.voidType;

            // Handle `return expr;`
            const returnValue = expr.analyze();

            if (func.returnHint) {
                check(!isVoid, "Return with a value in void function", expr);
            }

            // Ensure the returned type matches the expected one
            check(
                canConvert(returnValue.type, expectedType, returnValue.value) ||
                returnValue.type === core.anyType ||
                expectedType === core.anyType,
                `Expected return type ${expectedType} but got ${returnValue.type}`,
                expr
            );

            return core.returnStatement(returnValue);
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

        VarDec(id, maybeType, _eq, expr, _semi) {
            const name = id.sourceString;
            checkNotAlreadyDeclared(name, id);
        
            const initial = expr.analyze();
            let typeStr;
        
            if (maybeType.children.length === 0) {
                typeStr = initial.type;
            } else {
                const typeHintNode = maybeType.child(0);
                const typeNode = typeHintNode.child(1);
                typeStr = typeNode.analyze();
              
                check(validTypeRegex.test(typeStr) || typeStr.kind === "FunctionType", "Type expected", typeNode);
                
                if (typeStr !== core.anyType) {
                    if (initial.value === null) {
                        check(isOptionalType(typeStr), `Cannot assign null to non-optional type ${typeStr}`, id);
                        initial.type = typeStr;
                    } else if (typeStr.kind === "FunctionType") {
                        check(initial.fun.type.kind === "FunctionType", `Expected a function`, expr);
                        initial.type = typeStr;
                    } else {
                        check(canConvert(initial.type, typeStr, initial.value), `Cannot assign ${initial.type} to ${typeStr}`, id);
                    }
                }
            }
        
            check(typeStr !== core.voidType, "Cannot assign a variable to void type", expr);
            const variable = core.variable(name, typeStr, initial);
            context.add(name, variable);
            return core.variableDeclaration(variable, initial);
        },
        
        
        AssignmentStmt(id, _eq, expr, _semi) {
            const source = expr.analyze();
            const target = id.analyze();
            check(source.type !== core.voidType, "Cannot assign a void value", expr);
            check(target && target.kind === "Variable", `${id.sourceString} not declared`, id);
            if (target.mutable !== undefined) {
                check(target.mutable, `Cannot assign to constant ${target.name}`, id);
            }

            if (source.value === null) {
                check(isOptionalType(target.type),`Cannot assign null to non-optional type ${target.type}`,id);
                source.type = target.type;
            } else {
                check(
                    canConvert(source.type, target.type, source.value) ||
                    source.type === core.anyType ||
                    target.type === core.anyType,
                    `Cannot assign ${source.type} to ${target.type}`,
                    id
                );
            }

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

        ConjureStmt(_conjure, block) {
            block = block.analyze();
            check(hasReturn(block), "Conjure statement must have a return", _conjure);
            return core.conjureStatement(block);
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

            const value = elements.map(e =>
                "value" in e ? e.value : Array.isArray(e.elements) ? e.elements.map(el => el.value) : undefined
            );

            return {
                ...core.arrayExpression(elements, `${elemType}[]`),
                value,
            };
        },

        type(_typeNode) {
            const typeName = this.sourceString;
            check(validTypeRegex.test(typeName), `Invalid type: ${typeName}`, this);
            return typeName;
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
            return (text.includes(".") || text.includes("e") || text.includes("E"))
                ? core.NumericLiteral(Number(text), DEFAULT_FLOAT_TYPE)
                : core.NumericLiteral(BigInt(text), DEFAULT_INT_TYPE);
        },

        stringlit(_open, _chars, _close) {            
            return core.StringLiteral(_chars.sourceString);
        },

        charlit(_open, charNode, _close) {
            return core.GlyphLiteral(charNode.sourceString);
        },

        codepointlit(_open, _prefix, codepointNode, _close) {
            const value = String.fromCodePoint(parseInt(codepointNode.sourceString, 16));
            return core.CodepointLiteral(value);
        },

        Primary_true(_) {
            return core.BooleanLiteral(true);
        },

        Primary_false(_) {
            return core.BooleanLiteral(false);
        }
    });

    return semantics(match).analyze();
}