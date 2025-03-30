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

  function checkNotDeclared(entity, name, source) {
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

  function checkBothHaveTheSameType() {}

  function checkAllHaveSameType() {}

  //only if we have structs
  function includesAsField() {}

  //struct
  function checkNotBeSelfContaining() {}

  function equivalent() {}

  function assignable() {}

  //extension
  function typeDescription() {}

  function checkBeAssignable() {}

  //struct
  function checkHaveDistinctFields() {}

  //struct
  function checkHaveMember() {}

  function checkBeInLoop() {}

  function checkBeInAFunction() {}

  function checkBeCallable() {}

  function checkNotReturnAnything() {}

  function checkReturnSomething() {}

  function checkBeReturnable() {}

  function checkHaveCorrectArgumentCount() {}

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
    exscribeStatement() {},

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
    variableDecl() {},

    typeDecl() {},

    //struct/not used, scrap?
    field() {},

    FunDecl() {},

    Params() {},

    Param() {},

    Type_optional() {},

    Type_function() {},

    Type_id() {},

    Statement_bump() {},

    Statement_assign() {},

    //unsure, scrap?
    Statement_call() {},

    Statement_break() {},

    Statement_return() {},

    Statement_shortreturn() {},

    IfStmt_long() {},

    IfStmt_elsif() {},

    IfStmt_short() {},

    LoopStmt_while() {},

    LoopStmt_range() {},

    Block() {},

    Exp_conditional() {},

    //maybe scrap?
    Exp_unwrapelse() {},

    Exp_or(exp, _ops, exps) {
      let left = exp.rep();
      mustHaveBooleanType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveBooleanType(right, { at: e });
        left = core.binary("||", left, right, core.booleanType);
      }
      return left;
    },

    Exp_and(exp, _ops, exps) {
      let left = exp.rep();
      mustHaveBooleanType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveBooleanType(right, { at: e });
        left = core.binary("&&", left, right, core.booleanType);
      }
      return left;
    },

    Exp_xor() {},

    Exp_bitor(exp, _ops, exps) {
      let left = exp.rep();
      mustHaveIntegerType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveIntegerType(right, { at: e });
        left = core.binary("|", left, right, core.intType);
      }
      return left;
    },

    Exp_bitand(exp, _andOps, exps) {
      let left = exp.rep();
      mustHaveIntegerType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveIntegerType(right, { at: e });
        left = core.binary("&", left, right, core.intType);
      }
      return left;
    },

    Exp_bitxor(exp, _xorOps, exps) {
      let left = exp.rep();
      mustHaveIntegerType(left, { at: exp });
      for (let e of exps.children) {
        let right = e.rep();
        mustHaveIntegerType(right, { at: e });
        left = core.binary("^", left, right, core.intType);
      }
      return left;
    },

    Exp_compare() {},

    Exp_shift() {},

    Exp_add() {},

    Exp_subtract() {},

    Exp_multiply() {},

    Exp_divide() {},

    Exp_power() {},

    Exp_unary() {},

    Exp_parens() {},

    //scrap maybe
    Exp_subscript() {},

    //same as invoke
    Exp_call() {},

    Exp_id() {},

    true() {},

    false() {},

    floatlit() {},

    stringlit() {},

    // and invoke instead of call
  });

  //change the return to the correct build
  return builder(match).rep();
}
