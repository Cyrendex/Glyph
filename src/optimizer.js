import * as core from "./core.js"

export default function optimize(node) {
    return optimizers?.[node.kind]?.(node) ?? node
}

const isZero = (e) => e?.kind === "NumericLiteral" && (e.value === 0 || e.value === 0n)
const isOne = (e) => e?.kind === "NumericLiteral" && (e.value === 1 || e.value === 1n)

const optimizers = {
    Program(p) {
        p.statements = p.statements.flatMap(optimize)
        return p
    },
    
    VariableDeclaration(d) {
        d.variable = optimize(d.variable)
        d.initializer = optimize(d.initializer)
        return d
    },

    FunctionEvoke(d) {
        d.fun = optimize(d.fun)
        return d
    },

    Function(f) {
        if (f.body) f.body = f.body.flatMap(optimize)    
        return f
    },

    Increment(s) {
        s.variable = optimize(s.variable)
        s.variable.initializer.value = s.variable.type.includes("int") ? s.variable.initializer.value + 1n : s.variable.initializer.value + 1
        return s
    },

    Decrement(s) {
        s.variable = optimize(s.variable)
        s.variable.initializer.value = s.variable.type.includes("int") ? s.variable.initializer.value - 1n : s.variable.initializer.value - 1
        return s
    },

    Assignment(s) {
        s.source = optimize(s.source)
        s.target = optimize(s.target)
        if (s.source === s.target) {
            return []
        }
        return s
    },

    ReturnStatement(s) {
        s.expression = optimize(s.expression)
        return s
    },

    IfStatement(s) {
        s.condition = optimize(s.condition)
        s.consequent = s.consequent.flatMap(optimize)
        if (s.alternative?.kind?.endsWith?.("IfStatement")) {
            s.alternative = optimize(s.alternative)
        } else {
            s.alternative = s.alternative.flatMap(optimize)
        }
        if (s.condition?.kind === "BooleanLiteral") {
            return s.condition.value ? s.consequent : s.alternative;
        }
        return s
    },

    WhileStatement(s) {
        s.condition = optimize(s.condition)
        if (s.condition.value === false) {
            return []
        }
        s.block = s.block.flatMap(optimize)
        return s
    },
    
    BinaryExpression(e) {
        e.op = optimize(e.op)
        e.left = optimize(e.left)
        e.right = optimize(e.right)
        if (e.op === "&&") {
            if (e.left?.value === true) return e.right
            if (e.right?.value === true) return e.left
        } else if (e.op === "||") {
            if (e.left?.value === false) return e.right
            if (e.right?.value === false) return e.left
        } else if (e.left?.kind === "NumericLiteral" && e.right?.kind === "NumericLiteral") {
            if (e.op === "+") return core.NumericLiteral(e.left.value + e.right.value, e.type)
            if (e.op === "-") return core.NumericLiteral(e.left.value - e.right.value, e.type)
            if (e.op === "*") return core.NumericLiteral(e.left.value * e.right.value, e.type)
            if (e.op === "/") return core.NumericLiteral(e.left.value / e.right.value, e.type)
            if (e.op === "**") return core.NumericLiteral(e.left.value ** e.right.value, e.type)
            if (e.op === "<") return core.BooleanLiteral(e.left.value < e.right.value)
            if (e.op === "<=") return core.BooleanLiteral(e.left.value <= e.right.value)
            if (e.op === "==") return core.BooleanLiteral(e.left.value === e.right.value)
            if (e.op === "!=") return core.BooleanLiteral(e.left.value !== e.right.value)
            if (e.op === ">=") return core.BooleanLiteral(e.left.value >= e.right.value)
            if (e.op === ">") return core.BooleanLiteral(e.left.value > e.right.value)
        } else if (e.left?.kind === "NumericLiteral") {
            if (isZero(e.left) && e.op === "+") return e.right
            if (isOne(e.left) && e.op === "*") return e.right
            if (isZero(e.left) && e.op === "-") return optimize(core.unary("-", e.right.value))
            if (isOne(e.left) && e.op === "**") return e.left
            if (isZero(e.left) && ["*", "/"].includes(e.op)) return e.left

        } else if (e.right?.kind === "NumericLiteral") {
            if (["+", "-"].includes(e.op) && isZero(e.right)) return e.left
            if (["*", "/"].includes(e.op) && isOne(e.right)) return e.left
            if (e.op === "*" && isZero(e.right)) return e.right
            if (e.op === "**" && isZero(e.right)) return core.NumericLiteral(1n,core.intType)
        } return e
    },

    UnaryExpression(e) {
        e.op = optimize(e.op)
        e.operand = optimize(e.operand)
        if (e.operand?.kind === "NumericLiteral") {
            if (e.op === "-") {
                return core.NumericLiteral(-e.operand.value, e.operand.type)
            }
        }
        return e
    },

    SubscriptExpression(e) {
        e.array = optimize(e.array)
        e.index = optimize(e.index)
        return e
    },

    ArrayExpression(e) {
        e.elements = e.elements.map(optimize)
        return e
    },

    FunctionCall(c) {
        c.callee = optimize(c.callee)
        c.args = c.args.map(optimize)
        return c
    },

    ExscribeStatement(e) {
        e.expression = optimize(e.expression)
        return e
    },

    Dereference(e) {
        e.expression = optimize(e.expression);
        if (e.expression.kind === "AddressOf") {
            return e.expression.expression;
        }
        return e;
    }
}