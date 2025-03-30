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

  //Toal has this but we don't
  function checkBothHaveTheSameType() {}

  //Toal has this but we don't
  function checkAllHaveSameType() {}

  //Toal has this but we don't
  function includesAsField() {}

  //Toal has this but we don't
  function checkNotBeSelfContaining() {}

  //Toal has this but we don't
  function equivalent() {}

  //Toal has this but we don't
  function assignable() {}

  //Toal has this but we don't
  function typeDescription() {}

  //Toal has this but we don't
  function checkBeAssignable() {}

  //Toal has this but we don't
  function checkHaveDistinctFields() {}

  //Toal has this but we don't
  function checkHaveMember() {}

  //Toal has this but we don't
  function checkBeInLoop() {}

  //Toal has this but we don't
  function checkBeInAFunction() {}

  //Toal has this but we don't
  function checkBeCallable() {}

  //Toal has this but we don't
  function checkNotReturnAnything() {}

  //Toal has this but we don't
  function checkReturnSomething() {}

  //Toal has this but we don't
  function checkBeReturnable() {}

  //Toal has this but we don't
  function checkHaveCorrectArgumentCount() {}

  //builder goes here
  const builder = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return core.program(statements.children.map((s) => s.rep()));
    },
    //this nxt line needs to be changed to include all the functions that come after
    //and all functions must be "unfunctioned"
  });

  //we have this but Toal doesn't
  function mainStatement() {}

  //we have this but Toal doesn't
  function exscribeStatement() {}

  //we have this but Toal doesn't
  function conjureStatement() {}

  //we have this but Toal doesn't
  function importStatement() {}

  //we have this but Toal doesn't
  function lambdaDeclaration() {}

  //aren't these same as conjure
  //we have this but Toal doesn't
  function lambda() {}

  //aren't these same as conjure
  //we have this but Toal doesn't
  function importedFunction() {}

  //Toal has this but we don't
  function variableDecl() {}

  //Toal has this but we don't
  function typeDecl() {}

  //Toal has this but we don't
  function field() {}

  function FunDecl() {}

  function Params() {}

  function Param() {}

  function Type_optional() {}

  //Toal has this but we don't
  function Type_function() {}

  function Type_id() {}

  function Statement_bump() {}

  function Statement_assign() {}

  //Toal has this but we don't
  function Statement_call() {}

  function Statement_break() {}

  function Statement_return() {}

  //Toal has this but we don't
  function Statement_shortreturn() {}

  function IfStmt_long() {}

  //Toal has this but we don't
  function IfStmt_elsif() {}

  //Toal has this but we don't
  function IfStmt_short() {}

  function LoopStmt_while() {}

  //Toal has this but we don't
  function LoopStmt_repeat() {}

  //Toal has this but we don't
  function LoopStmt_range() {}

  //Toal has this but we don't
  function LoopStmt_collection() {}

  //Toal has this but we don't
  function Block() {}

  //Toal has this but we don't
  function Exp_conditional() {}

  //Toal has this but we don't
  function Exp_unwrapelse() {}

  function Exp_or() {}

  function Exp_and() {}

  function Exp_xor() {}

  function Exp_bitor() {}

  function Exp_bitand() {}

  function Exp_bitxor() {}

  //Toal has this but we don't
  function Exp_compare() {}

  //Toal has this but we don't
  function Exp_shift() {}

  //Toal has this but we don't
  function Exp_add() {}

  //Toal has this but we don't
  function Exp_multiply() {}

  //Toal has this but we don't
  function Exp_power() {}

  function Exp_unary() {}

  //Toal has this but we don't
  function Exp_emptyarray() {}

  //Toal has this but we don't
  function Exp_arrayexpression() {}

  //Toal has this but we don't
  function Exp_arrayoptional() {}

  //Toal has this but we don't
  function Exp_parens() {}

  //Toal has this but we don't
  function Exp_subscript() {}

  //Toal has this but we don't
  function Exp_member() {}

  //Toal has this but we don't
  function Exp_call() {}

  //Toal has this but we don't
  function Exp_id() {}

  function ttrue() {}

  function ffalse() {}

  function floatlit() {}

  function stringlit() {}

  //change the return to the correct build
  return {
    kind: "Program",
    body: { kind: "potato" },
  };
}
