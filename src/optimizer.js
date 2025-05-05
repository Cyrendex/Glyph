export default function optimize(node) {
    return optimizers?.[node.kind]?.(node) ?? node;
}

function deepEqual(a, b) {
    if (typeof a !== typeof b) return false;
    if (typeof a === "bigint" || typeof a === "number" || typeof a === "boolean" || typeof a === "string")
        return a === b;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b))
        return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    if (typeof a === "object" && typeof b === "object") {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(k => deepEqual(a[k], b[k]));
    }
    return false;
}

const optimizers = {
    Program(p) {
        p.statements = p.statements.flatMap(optimize);
        return p;
    },

    MainStatement(m) {
        m.executables = m.executables.flatMap(optimize);
        return m;
    },

    VariableDeclaration(d) {
        d.variable = optimize(d.variable);
        d.initializer = optimize(d.initializer);
        return d;
    },

    FunctionEvoke(d) {
        d.fun = optimize(d.fun);
        return d;
    },

    Function(f) {
        f.body = f.body.flatMap(optimize);
        return f;
    },

    Assignment(a) {
        a.source = optimize(a.source);
        a.target = optimize(a.target);
        if (deepEqual(a.source, a.target)) {
            return [];
        }
        return a;
    },

    ReturnStatement(r) {
        r.expression = optimize(r.expression);
        return r;
    },

    Increment(i) {
        i.variable = optimize(i.variable);
        return i;
    },

    Decrement(d) {
        d.variable = optimize(d.variable);
        return d;
    },

    BreakStatement(s) {
        return s;
    },

    IfStatement(s) {
        s.condition = optimize(s.condition);
        s.consequent = s.consequent.flatMap(optimize);
        s.alternative = s.alternative?.flatMap?.(optimize) ?? [];

        if (typeof s.condition === "boolean") {
            return s.condition ? s.consequent : s.alternative;
        }
        return s;
    },

    WhileStatement(s) {
        s.condition = optimize(s.condition);
        if (s.condition === false) {
            return [];
        }
        s.block = s.block.flatMap(optimize);
        return s;
    },

    ExscribeStatement(e) {
        e.expression = optimize(e.expression);
        return e;
    },

    ConjureStatement(b) {
        b.block = b.block.flatMap(optimize);
        return b;
    },

    FunctionCall(c) {
        c.callee = optimize(c.callee);
        c.args = c.args.map(optimize);
        return c;
    },

  BinaryExpression(e) {
        e.left = optimize(e.left);
        e.right = optimize(e.right);
        if (typeof e.left === "number" && typeof e.right === "number") {
            switch (e.op) {
                case "+": return e.left + e.right;
                case "-": return e.left - e.right;
                case "*": return e.left * e.right;
                case "/": return e.left / e.right;
                case "**": return e.left ** e.right;
                case "==": return e.left === e.right;
                case "!=": return e.left !== e.right;
                case "<": return e.left < e.right;
                case "<=": return e.left <= e.right;
                case ">": return e.left > e.right;
                case ">=": return e.left >= e.right;
            }
        }

        if (e.left === 0 && e.op === "+") return e.right;
        if (e.right === 0 && e.op === "+") return e.left;
        if (e.left === 1 && e.op === "*") return e.right;
        if (e.right === 1 && e.op === "*") return e.left;
        if (e.right === 0 && e.op === "*") return 0;
        return e;
    },

    UnaryExpression(e) {
        e.operand = optimize(e.operand);
        if (e.op === "-" && typeof e.operand === "number") {
            return -e.operand;
        }
        return e;
    },

    SubscriptExpression(e) {
        e.array = optimize(e.array);
        e.index = optimize(e.index);
        return e;
    },

    ArrayExpression(e) {
        e.elements = e.elements.map(optimize);
        return e;
    },

    AddressOf(e) {
        e.expression = optimize(e.expression);
        return e;
    },

    Dereference(e) {
        e.expression = optimize(e.expression);
        return e;
    },

    TypeStatement(t) {
        t.expression = optimize(t.expression);
        t.value = optimize(t.value);
        return t;
    },
};