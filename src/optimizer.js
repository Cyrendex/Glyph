export default function optimize(node) {
    return optimizers?.[node?.kind]?.(node) ?? node;
}

function deepEqual(a, b) {
    if (typeof a !== typeof b) return false;
    if (typeof a === "number" || typeof a === "boolean" || typeof a === "string") return a === b;
    if (a === null || b === null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    if (typeof a === "object" && typeof b === "object") {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(k => deepEqual(a[k], b[k]));
    }
    return false;
}

function isSimplifiableType(type) {
    const simplifiableTypes = ['int', 'uint', 'int8', 'uint8', 'int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64', 'float32', 'float64'];
    return simplifiableTypes.some(sub => type.includes(sub));
}

function isNumeric(variable) {
    return (variable?.kind === undefined) ? (typeof variable === "number" || typeof variable === "bigint") : (isNumeric(getValue(variable)))
}

function getValue(x) {
    if (typeof x === "number" || typeof x === "boolean") return x;
    if (x?.kind === "NumericLiteral") return (optimize(x).value);
    if (x?.kind === "BooleanLiteral") return (optimize(x).value);
    if (x?.kind === "Variable") return (optimize(x).initializer?.value ?? optimize(x).value);
    return x?.initializer ?? x?.value
}

function buildBinaryReturn(x) {

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

    Variable(v) {
        v.initializer = optimize(v.initializer);
        return v;
    },

    NumericLiteral(l) {
        return {
            kind: "NumericLiteral",
            value: l.type.includes("int") ? BigInt(l.value) : Number(l.value),
            type: l.type
        };
    },

    StringLiteral(l) {
        return { kind: "StringLiteral", value: l.value, type: l.type ?? "string" };
    },

    BooleanLiteral(l) {
        return { kind: "BooleanLiteral", value: Boolean(l.value), type: l.type ?? "bool" };
    },

    GlyphLiteral(l) {
        return { kind: "GlyphLiteral", value: l.value, type: l.type ?? "glyph" };
    },

    CodePointLiteral(l) {
        return { kind: "CodePointLiteral", value: l.value, type: l.type ?? "codepoint" };
    },

    NullLiteral(_) {
        return { kind: "NullLiteral", value: null, type: null };
    },

    AddressOf(e) {
        e.expression = optimize(e.expression);
        return e;
    },

    Dereference(e) {
        e.expression = optimize(e.expression);
        if (e.expression.kind === "AddressOf") return e.expression.expression;
        return e;
    },

    FunctionEvoke(d) {
        d.fun = optimize(d.fun);
        return d;
    },

    Function(f) {
        f.body = f.body.flatMap(optimize);
        return f;
    },

    FunctionCall(c) {
        c.callee = optimize(c.callee);
        c.args = c.args.map(optimize);
        return c;
    },

    ReturnStatement(r) {
        r.expression = optimize(r.expression);
        return r;
    },

    Assignment(a) {
        a.source = optimize(a.source);
        a.target = optimize(a.target);
        if (a.source === a.target) return [];
        return a;
    },

    Increment(i) {
        i.variable = optimize(i.variable);
        return i;
    },

    Decrement(d) {
        d.variable = optimize(d.variable);
        return d;
    },

    ExscribeStatement(e) {
        e.expression = optimize(e.expression);
        return e;
    },

    BinaryExpression(e) {
        e.left = optimize(e.left);
        e.right = optimize(e.right);
        
        const leftVal = getValue(e.left);
        const rightVal = getValue(e.right);
        
        if (e.op === "&&") {
            if (leftVal === false) return optimize({ kind: "BooleanLiteral", value: false, type: "bool" });
            if (leftVal === true) return e.right;
        }

        if (e.op === "||") {
            if (leftVal === true) return optimize({ kind: "BooleanLiteral", value: true, type: "bool" });
            if (leftVal === false) return e.right;
        }
        
        if (isNumeric(leftVal) && isNumeric(rightVal) && isSimplifiableType(e.left.type) && isSimplifiableType(e.right.type)) {
            
            //Expressions with a variable should return a variable?
            // if (leftVal === 0 && e.op === "+") return e.right;
            // if (rightVal === 0 && e.op === "+") return e.left;
            // if (leftVal === 1 && e.op === "*") return e.right;
            // if (rightVal === 1 && e.op === "*") return e.left;
            // if (rightVal === 0 && e.op === "*") return optimize({ kind: "NumericLiteral", value: 0, type: e.left.type });

            let result;
            switch (e.op) {
                case "+": result = leftVal + rightVal; break;
                case "-": result = leftVal - rightVal; break;
                case "*": result = leftVal * rightVal; break;
                case "/": result = leftVal / rightVal; break;
                case "**": result = leftVal ** rightVal; break;
                case "==": result = leftVal === rightVal; break;
                case "!=": result = leftVal !== rightVal; break;
                case "<": result = leftVal < rightVal; break;
                case "<=": result = leftVal <= rightVal; break;
                case ">": result = leftVal > rightVal; break;
                case ">=": result = leftVal >= rightVal; break;
            }
            
            return typeof result === "boolean" ? optimize({ kind: "BooleanLiteral", value: result, type: "bool" }) : optimize({ kind: "NumericLiteral", value: result, type: e.left.type });
        }
        



        return e;
    },

    UnaryExpression(e) {
        e.operand = optimize(e.operand);
        const operand = getValue(e.operand);
        if (e.op === "-" && isNumeric(operand)) {
            return { kind: "NumericLiteral", value: -operand, type: e.operand.type };
        }
        return e;
    },

    IfStatement(s) {
        s.condition = optimize(s.condition);
        s.consequent = s.consequent.flatMap(optimize);
        s.alternative = s.alternative?.flatMap?.(optimize) ?? [];
        if (s.condition?.kind === "BooleanLiteral") return s.condition.value ? s.consequent : s.alternative;
        return s;
    },

    WhileStatement(s) {
        s.condition = optimize(s.condition);
        if (s.condition?.kind === "BooleanLiteral" && s.condition.value === false) return [];
        s.block = s.block.flatMap(optimize);
        return s;
    },

    ConjureStatement(s) {
        s.block = s.block.flatMap(optimize);
        return s;
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
    
    TypeStatement(t) {
        t.expression = optimize(t.expression);
        t.value = optimize(t.value);
        return t;
    },

    BreakStatement(s) {
        return s;
    }
};
