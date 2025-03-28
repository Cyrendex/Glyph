import * as core from "./core.js"

class Context {
    constructor({ parent = null, locals = new Map(), inLoop = false, function: f = null }) {
        Object.assign(this, { parent, locals, inLoop, function: f })
    }

    add(name, entity) {
        this.locals.set(name, entity)
    }

    lookup(name) {
        return this.locals.get(name) || this.parent?.lookup(name)
    }

    static root() {
        return new Context({ locals: new Map(Object.entries(core.standardLibrary)) })
    }

    newChildContext(props) {
        return new Context({ ...this, ...props, parent: this, locals: new Map() })
    }
}

export default function analyze(match) {
    let context = Context.root()

    function check(condition, message, errorLocation) {
        if (!condition) {
            const prefix = errorLocation.at.source.getLineAndColumnMessage()
            throw new Error(`${prefix}${message}`)
        }
    }
    
    function checkNotAlreadyDeclared(name, source) {
        check(!context.lookup(name), `Identifier ${name} already declared`, source)
    }
    
    function checkNotDeclared(entity, name, source) {
        check(entity, `Identifier ${name} not declared`, source)
    }

    function checkIsInteger(e, source) {
        check(e.type === core.intType, "Expected an integer", source)
    }

    function checkIsFloat(e, source) {
        check(e.type === core.floatType, "Expected a float", source)
    }

    function checkIsDecimal(e, source) {
        check(e.type === core.decimType, "Expected a decimal", source)
    }

    function checkIsSlash(e, source) {
        check(e.type === core.slashType, "Expected a slash", source)
    }

    function checkIsBoolean(e, source) {
        check(e.type === core.booleanType, "Expected a boolean", source)
    }

    function checkIsGlyph(e, source) {
        check(e.type === core.glyphType, "Expected a glyph", source)
    }

    function checkIsString(e, source) {
        check(e.type === core.stringType, "Expected a string", source)
    }

    function checkIsCodepoint(e, source) {
        check(e.type === core.codepointType, "Expected a codepoint", source)
    }

    function checkIsVoid(e, source) {
        check(e.type === core.voidType, "Expected void", source)
    }

    function checkIsAny(e, source) {
        check(e.type === core.anyType, "Expected any", source)
    }

    function checkIsNumeric(e, source) {
        const expectedTypes = [core.intType, core.floatType, core.decimType, core.slashType, core.slogType]
        check(expectedTypes.includes(e.type), "Expected a number", source)
    }

    function checkIsText(e, source) {
        const expectedTypes = [core.stringType, core.glyphType]
        check(expectedTypes.includes(e.type), "Expected a glyph or string", source)
    }

    function checkIsNumericOrText(e, source) {
        const expectedTypes = [core.intType, core.floatType, core.decimType, core.slashType, core.slogType, core.stringType, core.glyphType]
        check(expectedTypes.includes(e.type), "Expected a number or string", source)
    }

    function checkIsAType(e, source) {
        const isBasicType = /int|float|decim|slash|slog|bool|string|glyph|codepoint|void|any/.test(e)
        check(isBasicType, "Type expected", source)
    }
}