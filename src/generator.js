import { voidType } from "./core.js";

export default function generate(program) {
    const output = [];

    const targetName = (mapping => {
        return entity => {
            if (!mapping.has(entity)) {
                mapping.set(entity, mapping.size + 1);
            }
        //If you want to use the mapping, uncomment the next line
        //mapping is used for letting words like 'switch' and stuff like that be variable names
        // return `${entity.name}_${mapping.get(entity)}`;
        return `${entity.name}`;
        };
    })(new Map());

    const gen = node => generators?.[node?.kind]?.(node) ?? node;

    const generators = {
        Program(p) {
            p.statements.forEach(gen);
        },
    
        VariableDeclaration(d) {
            const keyword = d.variable.mutable ? "let" : "const";
            output.push(`${keyword} ${gen(d.variable)} = ${gen(d.initializer)};`);
        },
        
        Variable(v) {
            return targetName(v);
        },

        NumericLiteral(lit) {
            return lit.value.toString();
        },

        StringLiteral(lit) {
            return JSON.stringify(lit.value);
        },

        GlyphLiteral(lit) {
            return JSON.stringify(lit.value);
        },

        NullLiteral(_) {
            return "null";
        },

        BooleanLiteral(lit) {
            return lit.value ? "true" : "false";
        },

        AddressOf(node) {
            return `(() => ({ value: ${targetName(node.expression)} }))()`;
        },
        
        Dereference(node) {
            return `${gen(node.expression)}.value`;
        },

        FunctionEvoke(decl) {
            output.push(`function ${gen(decl.fun)}(${decl.fun.parameters.map(gen).join(", ")}) {`);
            decl.fun.body.forEach(gen);
            output.push("}");
        },

        Function(f) {
            return targetName(f);
        },

        FunctionCall(c) {
            const call = `${gen(c.callee)}(${c.args.map(gen).join(", ")})`;
            if (c.type === voidType) {
                output.push(`${call};`);
                return;
            }
            return call;
        },

        ReturnStatement(r) {
            output.push(`return ${gen(r.expression)};`);
        },

        Assignment(a) {
            output.push(`${gen(a.target)} = ${gen(a.source)};`);
        },

        ExscribeStatement(e) {
            output.push(`console.log(${gen(e.expression)});`);
        },

        BinaryExpression(e) {
            const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
            return `(${gen(e.left)} ${op} ${gen(e.right)})`;
        },

        UnaryExpression(e) {
            return `(${e.op}${gen(e.operand)})`;
        },

        IfStatement(s) {
            output.push(`if (${gen(s.condition)}) {`);
            s.consequent.forEach(gen);
            if (s.alternative.length > 0) {
                output.push("} else {");
                s.alternative.forEach(gen);
            }
            output.push("}");
        },

        WhileStatement(s) {
            output.push(`while (${gen(s.condition)}) {`);
            s.block.forEach(gen);
            output.push("}");
        },

        BreakStatement() {
            output.push("break;");
        },

        SubscriptExpression(e) {
            return `${gen(e.array)}[${gen(e.index)}]`;
        },

        ArrayExpression(e) {
            return `[${e.elements.map(gen).join(",")}]`;
        },

        MainStatement(m) {
            m.executables.forEach(gen);
        },
    };

    gen(program);
    return output.join("\n");
}