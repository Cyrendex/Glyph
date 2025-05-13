import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import generate from "../src/generator.js"

function dedent(s) {
  return `${s}`.replace(/(?<=\n)\s+/g, "").trim()
}

const fixtures = [
  {
    name: "Conjure Statements and Imported Functions",
    source: `
    affix io@exscribe;
    affix typing@typeof;

    main = {
        let f: conjure[int32] = double: (x: int32) -> int32 = conjure {
            return x * 2
        };
        exscribe(double(5));
        exscribe(typeof(f));
    }
    `,
    expected: dedent`
        let f_1 = double_2 = function(x_3) {
        return (x_3 * 2);
        };
        console.log(double_2(5));
        console.log(typeof(f_1));
    `
  },
  {
    name: "Type Declarations and Basic Functions",
    source: `
    affix io@exscribe;

    evoke our_func1() -> void {
        exscribe "hi";
    }

    evoke our_func2() -> int32 {
        const n: int32 = 1;
        if (n>2) {
            return n+1
        } else {
            if(true) {
                return n
            } else {
                return n
            }
        }
    }

    evoke our_func3() -> int32 {
        return 1
    }

    main = {
        const var1: uint8 = 2;
        const var2: ufloat32 = 3.14;
        const var3: udecim16 = 123.456;
        const var4: uslash128 = 5 / 2;
        const var5: uslog32 = 1;
        const var6: int8 = -42;
        const var7: float16 = -3.14;
        const var8: decim64 = -123.456;
        const var9: slash32 = -5 / 2;
        const var10: slog32 = -1;
        const var11: bool = true;
        const var12: string = "Hello World";
        const var14: glyph = 'a';

        const var15: [[int32]] = [[8],[7]];
        const var16: [[ufloat16]] = [[1.1], [2.2]];
        const var17: [[udecim32]] = [[3.33], [4.44]];
        const var18: [[uslash16]] = [[5/2], [6/2]];
        const var19: [[uslog32]] = [[7], [8]];
        const var20: [[int32]] = [[9], [-10]];
        const var21: [[float32]] = [[-3.14], [6.28]];
        const var22: [[decim32]] = [[-123.456], [789.101]];
        const var23: [[slash32]] = [[-5/2], [6/3]];
        const var24: [[slog32]] = [[-1], [0]];
        const var25: [[bool]] = [[true], [false]];
        const var26: [[string]] = [["foo"], ["bar"]];
        const var28: [[glyph]] = [['a'], ['b']];
        const var29: [int32] = [];

        our_func1();
        exscribe(our_func2());
        exscribe(our_func3());
    }
    `,
    expected: dedent`
    our_func1_1 = function() {
    console.log("hi");
    }
    our_func2_2 = function() {
    const n_3 = 1;
    if ((n_3 > 2)) {
    return (n_3 + 1);
    } else {
    if (true) {
    return n_3;
    } else {
    return n_3;
    }
    }
    }
    our_func3_4 = function() {
    return 1;
    }
    const var1_5 = 2;
    const var2_6 = 3.14;
    const var3_7 = 123.456;
    const var4_8 = (5 / 2);
    const var5_9 = 1;
    const var6_10 = (-42);
    const var7_11 = (-3.14);
    const var8_12 = (-123.456);
    const var9_13 = ((-5) / 2);
    const var10_14 = (-1);
    const var11_15 = true;
    const var12_16 = "Hello World";
    const var14_17 = "a";
    const var15_18 = [[8],[7]];
    const var16_19 = [[1.1],[2.2]];
    const var17_20 = [[3.33],[4.44]];
    const var18_21 = [[(5 / 2)],[(6 / 2)]];
    const var19_22 = [[7],[8]];
    const var20_23 = [[9],[(-10)]];
    const var21_24 = [[(-3.14)],[6.28]];
    const var22_25 = [[(-123.456)],[789.101]];
    const var23_26 = [[((-5) / 2)],[(6 / 3)]];
    const var24_27 = [[(-1)],[0]];
    const var25_28 = [[true],[false]];
    const var26_29 = [["foo"],["bar"]];
    const var28_30 = [["a"],["b"]];
    const var29_31 = [];
    our_func1_1();
    console.log(our_func2_2());
    console.log(our_func3_4());
    `
  },
  {
    name: "Nested Function Calls",
    source: `
    affix io@exscribe;
    evoke square(x: int32) -> int32 
        = (x * x);

    evoke sum(a: int32, b: int32) -> int32 
        = ( a + b );

    main = { exscribe sum(square(3), square(4)); }
    `,
    expected: dedent`
    square_1 = function(x_2) {
    return (x_2 * x_2);
    }
    sum_3 = function(a_4, b_5) {
    return (a_4 + b_5);
    }
    console.log(sum_3(square_1(3), square_1(4)));
    `
  },
  {
    name: "Variable Shadowing",
    source: `
    affix io@exscribe;
    let x = 0;
    let y = x;
    exscribe y;
    `,
    expected: dedent`
    let x_1 = 0;
    let y_2 = x_1;
    console.log(y_2);
    `
  },
  {
    name: "Function Declaration",
    source: `
    affix io@exscribe;

    evoke is_pythag_triple (a: uint8, b: uint8, c: uint8) -> bool 
        = (a ** 2 + b ** 2 == c ** 2);

    main = {
        exscribe is_pythag_triple (3, 4, 5);
        exscribe is_pythag_triple (3, 4, 6);
    }
    `,
    expected: dedent`
    is_pythag_triple_1 = function(a_2, b_3, c_4) {
    return (((a_2 ** 2) + (b_3 ** 2)) === (c_4 ** 2));
    }
    console.log(is_pythag_triple_1(3, 4, 5));
    console.log(is_pythag_triple_1(3, 4, 6));
    `
  },
  {
    name: "Array Access",
    source: `
    affix io@exscribe;

    main = { 
        const arr: [[int32]] = [[1, 2], [3, 4]];
        exscribe arr[1][0];
    }
    `,
    expected: dedent`
    const arr_1 = [[1,2],[3,4]];
    console.log(arr_1[1][0]);
    `
  },
  {
    name: "Pointers and Optionals",
    source: `
    affix io@exscribe;

    main = {
        let x: int32 = 10;
        let p: *int32 = &x;
        let p2: **int32 = &p;
        let y: int32 = *p;
        let z: int32? = null;
        /@ DOESN'T CURRENTLY WORK: let z: int32 = &(&p); @/

        let a: int32 = 10;
        let b: int32? = 11;
        b = null;
        const c: int32? = null;
        let d: (*int32)? = null;
        let f: *(int32?) = &z;

        exscribe x+y*a;
    }
    `,
    expected: dedent`
    let x_1 = 10;
    let p_2 = (() => ({ value: x_1 }))();
    let p2_3 = (() => ({ value: p_2 }))();
    let y_4 = p_2.value;
    let z_5 = null;
    let a_6 = 10;
    let b_7 = 11;
    b_7 = null;
    const c_8 = null;
    let d_9 = null;
    let f_10 = (() => ({ value: z_5 }))();
    console.log((x_1 + (y_4 * a_6)));
    `
  },
  {
    name: "While Loop and Break Statement",
    source: `
    affix io@exscribe;

    main = {
        let n: int32 = 5;
        let fact: int32 = 1;
        while n > 1 {
            if fact==0 {
                break;
            }
            fact = fact * n;
            n = n - 1;
        }
        exscribe fact;
    }
    `,
    expected: dedent`
    let n_1 = 5;
    let fact_2 = 1;
    while ((n_1 > 1)) {
    if ((fact_2 === 0)) {
    break;
    }
    fact_2 = (fact_2 * n_1);
    n_1 = (n_1 - 1);
    }
    console.log(fact_2);
    `
    },
]

describe("The code generator", () => {
    for (const fixture of fixtures) {
        it(`produces expected js output for the ${fixture.name} program`, () => {
            const actual = generate(analyze(parse(fixture.source)))
            assert.deepEqual(actual, fixture.expected)
        })
    }
})