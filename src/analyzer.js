import * as core from "./core.js";

class Context {
  constructor({
    parent = null,
    locals = new Map(),
    inLoop = false,
    function: f = null,
  }) {
    Object.assign(this, { parent, locals, inLoop, function: f });
  }

  add(name, entity) {
    this.locals.set(name, entity);
  }

  lookup(name) {
    return this.locals.get(name) || this.parent?.lookup(name);
  }

  static root() {
    return new Context({
      locals: new Map(Object.entries(core.standardLibrary)),
    });
  }

  newChildContext(props) {
    return new Context({ ...this, ...props, parent: this, locals: new Map() });
  }
}

export default function analyze(match) {
  let context = Context.root();

  function check(condition, message, errorLocation) {
    if (!condition) {
      const prefix = errorLocation.at.source.getLineAndColumnMessage();
      throw new Error(`${prefix}${message}`);
    }
  }

  function checkNotAlreadyDeclared(name, source) {
    check(!context.lookup(name), `Identifier ${name} already declared`, source);
  }

  function checkHaveBeenFound(entity, name, source) {
    check(entity, `Identifier ${name} not declared`, source);
  }

  function checkIsInteger(e, source) {
    check(e.type === core.intType, "Expected an integer", source);
    return Number.isInteger(e);
  }

  function checkIsFloat(e, source) {
    check(e.type === core.floatType, "Expected a float", source);
    num.toString().includes(".");
  }

  function checkIsDecimal(e, source) {
    check(e.type === core.decimType, "Expected a decimal", source);
    return Number(num) === num && num % 1 !== 0;
  }

  function checkIsSlash(e, source) {
    check(e.type === core.slashType, "Expected a slash", source);
  }

  function checkIsSlog(e, source) {
    check(e.type === core.slogType, "Expected a slog", source);
  }

  function checkIsBoolean(e, source) {
    check(e.type === core.booleanType, "Expected a boolean", source);
    return typeof (e, Boolean);
  }

  function checkIsGlyph(e, source) {
    check(e.type === core.glyphType, "Expected a glyph", source);
  }

  function checkIsString(e, source) {
    check(e.type === core.stringType, "Expected a string", source);
  }

  function checkIsCodepoint(e, source) {
    check(e.type === core.codepointType, "Expected a codepoint", source);
  }

  function checkIsVoid(e, source) {
    check(e.type === core.voidType, "Expected void", source);
  }

  function checkIsAny(e, source) {
    check(e.type === core.anyType, "Expected any", source);
  }

  function checkIsNumeric(e, source) {
    const expectedTypes = [
      core.intType,
      core.floatType,
      core.decimType,
      core.slashType,
      core.slogType,
    ];
    check(expectedTypes.includes(e.type), "Expected a number", source);
  }

  function checkIsText(e, source) {
    const expectedTypes = [core.stringType, core.glyphType];
    check(expectedTypes.includes(e.type), "Expected a glyph or string", source);
  }

  function checkIsNumericOrText(e, source) {
    const expectedTypes = [
      core.intType,
      core.floatType,
      core.decimType,
      core.slashType,
      core.slogType,
      core.stringType,
      core.glyphType,
    ];
    check(
      expectedTypes.includes(e.type),
      "Expected a number or string",
      source
    );
  }

  function checkIsAType(e, source) {
    const isBasicType =
      /int|float|decim|slash|slog|bool|string|glyph|codepoint|void|any/.test(e);
    check(isBasicType, "Type expected", source);
  }

  //After this point is Mehmet

  function checkBothHaveTheSameType(e1, e2, source) {
    check(
      equivalent(e1.type, e2.type),
      "Operands do not have the same type",
      source
    );
  }

  function checkAllHaveSameType(expressions, source) {
    check(
      expressions
        .slice(1)
        .every((e) => equivalent(e.type, expressions[0].type)),
      "Not all elements have the same type",
      source
    );
  }

  // function includesAsField() {}

  // function checkNotBeSelfContaining() {}

  function equivalent(item1, item2) {
    return (
      item1 === item2 ||
      (item1?.kind === "OptionalType" &&
        item2?.kind === "OptionalType" &&
        equivalent(item1.baseType, item2.baseType)) ||
      // (item1?.kind === "ArrayType" &&
      //   item2?.kind === "ArrayType" &&
      //   equivalent(t1.baseType, t2.baseType)) ||
      (item1?.kind === "FunctionType" &&
        item2?.kind === "FunctionType" &&
        equivalent(item1.returnType, item2.returnType) &&
        item1.paramTypes.length === item2.paramTypes.length &&
        item1.paramTypes.every((t, i) => equivalent(t, item2.paramTypes[i])))
    );
  }

  function assignable(from, to) {
    return (
      to == core.anyType ||
      equivalent(from, to) ||
      (from?.kind === "FunctionType" &&
        to?.kind === "FunctionType" &&
        assignable(from.returnType, to.returnType) &&
        from.paramTypes.length === to.paramTypes.length &&
        to.paramTypes.every((t, i) => assignable(t, from.paramTypes[i])))
    );
  }

  function typeDescription(type) {
    //this next line may give an error
    if (type.type === "string") return type;
    // if (type.kind == "StructType") return type.name
    if (type.kind == "FunctionType") {
      const paramTypes = type.paramTypes.map(typeDescription).join(", ");
      const returnType = typeDescription(type.returnType);
      return `(${paramTypes})->${returnType}`;
    }
    // if (type.kind == "ArrayType") return `[${typeDescription(type.baseType)}]`
    if (type.kind == "OptionalType")
      return `${typeDescription(type.baseType)}?`;
  }

  function checkIsAssignable(e, { toType: type }, source) {
    const startType = typeDescription(e.type);
    const target = typeDescription(type);
    const message = `Cannot assign a ${startType} to a ${target}`;
    check(assignable(e.type, type), message, source);
  }

  // function checkHaveDistinctFields() {}

  // function checkHaveMember() {}

  function checkIsInLoop(source) {
    check(context.inLoop, "Break can only appear in a loop", source);
  }

  function checkIsInAFunction(source) {
    check(context.function, "Return can only appear in a function", source);
  }

  function checkIsInvokable(e, source) {
    const callable = e.type?.kind === "FunctionType";
    check(callable, "Call of non-function or non-constructor", source);
  }

  function checkNotReturnAnything(f, source) {
    const returnsNothing = f.type.returnType === core.voidType;
    check(returnsNothing, "Something should be returned", source);
  }

  function checkReturnSomething(f, source) {
    const returnsSomething = f.type.returnType !== core.voidType;
    check(returnsSomething, "Cannot return a value from this function", source);
  }

  function checkIsReturnable(e, { from: f }, source) {
    checkIsAssignable(e, { toType: f.type.returnType }, source);
  }

  function checkHaveCorrectArgumentCount(argCount, paramCount, source) {
    const message = `${paramCount} argument(s) required but ${argCount} passed`;
    check(argCount === paramCount, message, source);
  }

  //builder goes here
  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.rep()));
    },

    //we have this but Toal doesn't
    //main is defined as a default function, this is the one that gets executed
    //Aaron method
    mainStatement() {},

    //we have this but Toal doesn't
    //print statement
    //Aaron
    exscribeStatement(_open, message, _close) {
      console.log(message);
    },

    //this if for calling functions
    //Aaron
    invokeStatement() {},

    //we have this but Toal doesn't
    //lambda functions
    //Aaron
    conjureStatement() {},

    //we have this but Toal doesn't
    //import statement
    //Aaron
    importStatement() {},

    //we have this but Toal doesn't
    //probably calls the import statement and makes function list
    //Aaron
    importedFunction() {},

    //Onwards is Mehmet
    variableDecl(modifier, id, _eq, exp, _semicolon) {
      checkNotAlreadyDeclared(id.sourceString, { at: id });
      const initializer = exp.rep();
      const mutable = modifier.sourceString === "let";
      const variable = core.variable(
        id.sourceString,
        mutable,
        initializer.type
      );
      context.add(id.sourceString, variable);
      return core.variableDeclaration(variable, initializer);
    },

    typeDecl(_struct, id, _left, fields, _right) {
      checkNotAlreadyDeclared(id.sourceString, { at: id });
      const type = core.structType(id.sourceString, []);
      context.add(id.sourceString, type);
      type.fields = fields.children.map((field) => field.rep());
      // mustHaveDistinctFields(type, { at: id });
      // mustNotBeSelfContaining(type, { at: id });
      return core.typeDeclaration(type);
    },

    //struct/not used, scrap?
    // field() {},

    FunDecl(_fun, id, parameters, _colons, type, block) {
      checkNotAlreadyDeclared(id.sourceString, { at: id });
      const fun = core.fun(id.sourceString);
      context.add(id.sourceString, fun);

      context = context.newChildContext({ inLoop: false, function: fun });
      fun.params = parameters.rep();

      const paramTypes = fun.params.map((param) => param.type);
      const returnType = type.children?.[0]?.rep() ?? core.voidType;
      fun.type = core.functionType(paramTypes, returnType);

      fun.body = block.rep();

      context = context.parent;
      return core.functionDeclaration(fun);
    },

    Params(_open, paramList, _close) {
      return paramList.asIteration().children.map((p) => p.rep());
    },

    Param(id, _colon, type) {
      const param = core.variable(id.sourceString, false, type.rep());
      checkNotAlreadyDeclared(param.name, { at: id });
      context.add(param.name, param);
      return param;
    },

    Type_optional(baseType, _questionMark) {
      return core.optionalType(baseType.rep());
    },

    Type_function(_left, types, _right, _arrow, type) {
      const paramTypes = types.asIteration().children.map((t) => t.rep());
      const returnType = type.rep();
      return core.functionType(paramTypes, returnType);
    },

    Type_id(id) {
      const entity = context.lookup(id.sourceString);
      checkHaveBeenFound(entity, id.sourceString, { at: id });
      checkIsAType(entity, { at: id });
      return entity;
    },

    Statement_bump(exp, operator, _semicolon) {
      const variable = exp.rep();
      checkIsInteger(variable, { at: exp });
      return operator.sourceString === "++"
        ? core.increment(variable)
        : core.decrement(variable);
    },

    Statement_assign(variable, _eq, expression, _semicolon) {
      const source = expression.rep();
      const target = variable.rep();
      // mustBeMutable(target, { at: variable });
      checkIsAssignable(source, { toType: target.type }, { at: variable });
      return core.assignment(target, source);
    },

    Statement_break(breakKeyword, _semicolon) {
      checkIsInLoop({ at: breakKeyword });
      return core.breakStatement;
    },

    Statement_return(returnKeyword, exp, _semicolon) {
      checkIsInAFunction({ at: returnKeyword });
      checkReturnSomething(context.function, { at: returnKeyword });
      const returnExpression = exp.rep();
      checkIsReturnable(
        returnExpression,
        { from: context.function },
        { at: exp }
      );
      return core.returnStatement(returnExpression);
    },

    Statement_shortreturn(returnKeyword, _semicolon) {
      checkIsInAFunction({ at: returnKeyword });
      checkNotReturnAnything(context.function, { at: returnKeyword });
      return core.shortReturnStatement;
    },

    IfStmt_long(_if, exp, block1, _else, block2) {
      const test = exp.rep();
      checkIsBoolean(test, { at: exp });
      context = context.newChildContext();
      const consequent = block1.rep();
      context = context.parent;
      context = context.newChildContext();
      const alternate = block2.rep();
      context = context.parent;
      return core.ifStatement(test, consequent, alternate);
    },

    IfStmt_elsif(_if, exp, block, _else, trailingIfStatement) {
      const test = exp.rep();
      checkIsBoolean(test, { at: exp });
      context = context.newChildContext();
      const consequent = block.rep();
      context = context.parent;
      const alternate = trailingIfStatement.rep();
      return core.ifStatement(test, consequent, alternate);
    },

    IfStmt_short(_if, exp, block) {
      const test = exp.rep();
      checkIsBoolean(test, { at: exp });
      context = context.newChildContext();
      const consequent = block.rep();
      context = context.parent;
      return core.shortIfStatement(test, consequent);
    },

    LoopStmt_while(_while, exp, block) {
      const test = exp.rep();
      checkIsBoolean(test, { at: exp });
      context = context.newChildContext({ inLoop: true });
      const body = block.rep();
      context = context.parent;
      return core.whileStatement(test, body);
    },

    LoopStmt_range(_for, id, _in, exp1, op, exp2, block) {
      const [low, high] = [exp1.rep(), exp2.rep()];
      checkIsInteger(low, { at: exp1 });
      checkIsInteger(high, { at: exp2 });
      const iterator = core.variable(id.sourceString, false, core.intType);
      context = context.newChildContext({ inLoop: true });
      context.add(id.sourceString, iterator);
      const body = block.rep();
      context = context.parent;
      return core.forRangeStatement(iterator, low, op.sourceString, high, body);
    },

    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep());
    },

    Exp_conditional(exp, _questionMark, exp1, colon, exp2) {
      const test = exp.rep();
      checkIsBoolean(test, { at: exp });
      const [consequent, alternate] = [exp1.rep(), exp2.rep()];
      checkBothHaveTheSameType(consequent, alternate, { at: colon });
      return core.conditional(test, consequent, alternate, consequent.type);
    },

    // Exp_unwrapelse() {},

    Exp_or(exp, _ops, exps) {
      let left = exp.rep();
      checkIsBoolean(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        checkIsBoolean(right, { at: e });
        left = core.binary("||", left, right, core.booleanType);
      }
      return left;
    },

    Exp_and(exp, _ops, exps) {
      let left = exp.rep();
      checkIsBoolean(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        checkIsBoolean(right, { at: e });
        left = core.binary("&&", left, right, core.booleanType);
      }
      return left;
    },

    Exp_xor(exp, _ops, exps) {
      let left = exp.rep();
      checkIsBoolean(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        checkIsBoolean(right, { at: e });
        left = core.binary("^^", left, right, core.BooleanType);
      }
      return left;
    },

    Exp_bitor(exp, _orOps, exps) {
      let left = exp.rep();
      checkIsInteger(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        checkIsInteger(right, { at: e });
        left = core.binary("|", left, right, core.intType);
      }
      return left;
    },

    Exp_bitand(exp, _andOps, exps) {
      let left = exp.rep();
      checkIsInteger(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        checkIsInteger(right, { at: e });
        left = core.binary("&", left, right, core.intType);
      }
      return left;
    },

    Exp_bitxor(exp, _xorOps, exps) {
      let left = exp.rep();
      checkIsInteger(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        checkIsInteger(right, { at: e });
        left = core.binary("^", left, right, core.intType);
      }
      return left;
    },

    Exp_compare(exp1, relop, exp2) {
      const [left, op, right] = [exp1.rep(), relop.sourceString, exp2.rep()];
      // == and != can have any operand types as long as they are the same
      // But inequality operators can only be applied to numbers and strings
      if (["<", "<=", ">", ">="].includes(op)) {
        checkIsNumericOrText(left, { at: exp1 });
      }
      checkBothHaveTheSameType(left, right, { at: relop });
      return core.binary(op, left, right, core.booleanType);
    },

    Exp_shift(exp1, shiftOp, exp2) {
      const [left, op, right] = [exp1.rep(), shiftOp.sourceString, exp2.rep()];
      checkIsInteger(left, { at: exp1 });
      checkIsInteger(right, { at: exp2 });
      return core.binary(op, left, right, core.intType);
    },

    Exp_add(exp1, addOp, exp2) {
      const [left, op, right] = [exp1.rep(), addOp.sourceString, exp2.rep()];
      if (op === "+") {
        checkIsNumericOrText(left, { at: exp1 });
      } else {
        checkIsNumeric(left, { at: exp1 });
      }
      checkBothHaveTheSameType(left, right, { at: addOp });
      return core.binary(op, left, right, left.type);
    },

    //this is new
    Exp_subtract(exp1, subOp, exp2) {
      const [left, op, right] = [exp1.rep(), subOp.sourceString, exp2.rep()];
      if (op === "-") {
        checkIsNumericOrText(left, { at: exp1 });
      } else {
        checkIsNumeric(left, { at: exp1 });
      }
      checkBothHaveTheSameType(left, right, { at: subOp });
      return core.binary(op, left, right, left.type);
    },

    Exp_multiply(exp1, mulOp, exp2) {
      const [left, op, right] = [exp1.rep(), mulOp.sourceString, exp2.rep()];
      checkIsNumeric(left, { at: exp1 });
      checkBothHaveTheSameType(left, right, { at: mulOp });
      return core.binary(op, left, right, left.type);
    },

    //this is new
    Exp_divide(exp1, divOp, exp2) {
      const [left, op, right] = [exp1.rep(), divOp.sourceString, exp2.rep()];
      checkIsNumeric(left, { at: exp1 });
      checkBothHaveTheSameType(left, right, { at: divOp });
      return core.binary(op, left, right, left.type);
    },

    Exp_power(exp1, powerOp, exp2) {
      const [left, op, right] = [exp1.rep(), powerOp.sourceString, exp2.rep()];
      checkIsNumeric(left, { at: exp1 });
      checkBothHaveTheSameType(left, right, { at: powerOp });
      return core.binary(op, left, right, left.type);
    },

    Exp_unary(unaryOp, exp) {
      const [op, operand] = [unaryOp.sourceString, exp.rep()];
      let type;
      if (op === "#") {
        // mustHaveAnArrayType(operand, { at: exp });
        // type = core.intType;
      } else if (op === "-") {
        checkIsNumeric(operand, { at: exp });
        type = operand.type;
      } else if (op === "!") {
        checkIsBoolean(operand, { at: exp });
        type = core.booleanType;
      } else if (op === "some") {
        type = core.optionalType(operand.type);
      } else if (op === "random") {
        // mustHaveAnArrayType(operand, { at: exp });
        // type = operand.type.baseType;
      }
      return core.unary(op, operand, type);
    },

    Exp_parens(_open, expression, _close) {
      return expression.rep();
    },

    // Exp_subscript() {},

    Exp_id(id) {
      const entity = context.lookup(id.sourceString);
      checkHaveBeenFound(entity, id.sourceString, { at: id });
      return entity;
    },

    true(_) {
      return true;
    },

    false(_) {
      return false;
    },

    intlit(_digits) {
      return Number(this.sourceString);
    },

    floatlit(_whole, _point, _fraction, _e, _sign, _exponent) {
      return Number(this.sourceString);
    },

    stringlit(_openQuote, _chars, _closeQuote) {
      return this.sourceString;
    },
  });

  return builder(match).rep();
}
