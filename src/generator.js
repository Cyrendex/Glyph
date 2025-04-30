import { voidType } from "./core.js";

export default function generate(program) {
    const state = { output: [] };

    const targetName = (mapping => {
        return entity => {
            if (!mapping.has(entity)) {
                mapping.set(entity, mapping.size + 1);
            }
        //If you want to use the mapping, uncomment the first line
        //mapping is used for letting words like 'switch' and stuff like that be variable names
        return `${entity.name}_${mapping.get(entity)}`;
        // return `${entity.name}`;
        };
    })(new Map());

    const gen = node => generators?.[node?.kind]?.(node) ?? node;    

    const generators = {
        Program(p) {
            p.statements.forEach(gen);
        },

        VariableDeclaration(d) {
            console.log(d)

            const keyword = d.variable.mutable ? "let" : "const";
            if (d.initializer.kind === "FunctionEvoke") {
                state.output.push(`${keyword} ${gen(d.variable)} = ;`);
                gen(d.initializer)
                return;
            }
            
            state.output.push(`${keyword} ${gen(d.variable)} = ${gen(d.initializer)};`)
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

        CodePointLiteral(lit) {
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
            state.output.push(`function ${gen(decl.fun)}(${decl.fun.parameters.map(gen).join(", ")}) {`);
            for (let i = 0; i < decl.fun.body.length; i++) {
                gen(decl.fun.body[i]);
            }
            state.output.push("}");
        },

        Function(f) {
            return targetName(f);
        },

        FunctionCall(c) {
            const call = `${gen(c.callee)}(${c.args.map(gen).join(", ")})`;
            if (c.type === voidType) {
                state.output.push(`${call};`);
                return;
            }
            return call;
        },

        ReturnStatement(r) {
            state.output.push(`return ${gen(r.expression)};`);
        },

        Assignment(a) {
            state.output.push(`${gen(a.target)} = ${gen(a.source)};`);
        },

        ExscribeStatement(e) {
            state.output.push(`console.log(${gen(e.expression)});`);
        },

        BinaryExpression(e) {
            const op = { "==": "===", "!=": "!==" }[e.op] ?? e.op;
            return `(${gen(e.left)} ${op} ${gen(e.right)})`;
        },

        UnaryExpression(e) {
            return `(${e.op}${gen(e.operand)})`;
        },

        IfStatement(s) {
            state.output.push(`if (${gen(s.condition)}) {`);
            for (let i = 0; i < s.consequent.length; i++) {
                gen(s.consequent[i]);
            }

            if (s.alternative.length > 0) {
                state.output.push("} else {");
                let alternative = s.alternative.flat();
                for (let i = 0; i < alternative.length; i++) {
                    gen(alternative[i]);
                }
            }
            state.output.push("}");
        },

        WhileStatement(s) {
            state.output.push(`while (${gen(s.condition)}) {`);
            s.block.forEach(gen);
            state.output.push("}");
        },

        BreakStatement() {
            state.output.push("break;");
        },

        ConjureStatement(node) {
            const lines = [];
            lines.push("(() => {");
            node.block.forEach(stmt => {
              const line = gen(stmt);
              if (line) lines.push(line);
            });
            lines.push("})()");
            return lines.join("\n");
        },

        SubscriptExpression(e) {
            return `${gen(e.array)}[${gen(e.index)}]`;
        },

        ArrayExpression(e) {
            return `[${e.elements.map(gen).join(",")}]`;
        },

        TypeStatement(node) {
            return `typeof(${gen(node.expression)})`;
        },

        MainStatement(m) {
            m.executables.forEach(gen);
        },
    };

    gen(program);
    return state.output.join("\n");
}