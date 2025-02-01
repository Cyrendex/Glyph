# Glyph

![Glyph Logo](./docs/GlyphLogoText.PNG)

## Introduction

Glyph is a language that enables backend developers to approach programming with structured, organized, and intuitive code while introducing more powerful programming abilities. Glyph offers a functional paradigm with integrated imperative techniques, giving the programmer the power to complete complex tasks without losing their code's structure, and features a Rust-ic borrowing and ownership system to support memory manipulation. There will be some thematic words, but the majority of the language will be oriented towards simplicity and intuitivity to streamline the programming experience. Theming for Glyph comes from its root, Hieroglyph, the written symbols for the language of the Ancient Egyptians and other Ancient Civilizations.

## Features
TODO: Features

## Example Programs

# Hello World

| Glyph | JavaScript |
|-------|-----------|
| `affix io@exscribe`<br><br>`main = exscribe “Hello world!”` | `console.log(“Hello world!”)` |
| **Output** | **Output** |
| `Hello world!` | `Hello world!` |

---

# Defining and Calling Functions

| Glyph | JavaScript |
|-------|-----------|
| `affix io@exscribe`<br><br>`/@ numeric types can be partially genericized by dropping their size value@/`<br>`evoke is_pythag_triple (a, b, c: uint) -> bool`<br>`    = (a ** 2 + b ** 2 == c ** 2)`<br><br>`main = {`<br>`    invoke exscribe is_pythag_triple (3, 4, 5)`<br>`    invoke exscribe is_pythag_triple (3, 4, 6)`<br>`}` | `const is_pythag_triple = (a, b, c) => (a ** 2 + b ** 2 == c ** 2);`<br><br>`console.log(is_pythag_triple(3, 4, 5));`<br>`console.log(is_pythag_triple(3, 4, 6));` |
| **Output** | **Output** |
| `true`<br>`false` | `true`<br>`false` |

---

# Lambda Expressions

| Glyph | JavaScript |
|-------|-----------|
| `affix io@exscribe`<br><br>`/@ lambda expressions can be described using conjure @/`<br>`multiply: (int32, int32) -> int64 = conjure {`<br>`    a * b`<br>`};`<br><br>`main = {`<br>`    invoke exscribe multiply(4, 5);`<br>`    invoke exscribe multiply(-2,-7);`<br>`}` | `let multiply = (a, b) => {`<br>`    return a * b;`<br>`};`<br><br>`console.log(multiply(4, 5));`<br>`console.log(multiply(-2, -7));` |
| **Output** | **Output** |
| `20`<br>`14` | `20`<br>`14` |

---

# Recursion

| Glyph | JavaScript |
|-------|-----------|
| `affix io@exscribe`<br><br>`/@ demonstrating recursion using the factorial function @/`<br>`evoke factorial(n: uint) -> uint {`<br>`    if (n == 0) {`<br>`        return 1`<br>`    }`<br>`    n * factorial(n-1)`<br>`}`<br><br>`main = {`<br>`    result = factorial(5)`<br>`    invoke exscribe result`<br>`}` | `const factorial = (n) => {`<br>`    if (n === 0) {`<br>`        return 1;`<br>`    }`<br>`    return n * factorial(n-1);`<br>`};`<br><br>`const result = factorial(5);`<br>`console.log(result);` |
| **Output** | **Output** |
| `120` | `120` |

---

# String Operations

| Glyph | JavaScript |
|-------|-----------|
| `affix io@exscribe`<br>`affix string@{Spacer, supplant}`<br><br>`/@ no type hints here, since we can infer it from the value! @/`<br>`str1 = “Glyph”`<br>`str2 = “Time!”`<br><br>`main = {`<br>`    /@ automatically sets the infix for concatenation @/`<br>`    /@ its value is local to this function and only this function @/`<br>`    Spacer = ‘ ‘`<br>`    result1 = str1 + str2`<br>`    invoke exscribe result1`<br><br>`    result2 = str2 + str1`<br>`    invoke exscribe result2`<br><br>`    result3 = supplant(result2, str, "")`<br>`    invoke exscribe (result1 + result3)`<br>`}` | `const str1 = "JavaScript";`<br>`const str2 = "Time!";`<br><br>`let result1 = str1 + ‘ ‘ + str2;`<br>`console.log(result1);`<br><br>`let result2 = str2 + ‘ ‘ + str1;`<br>`console.log(result2);`<br><br>`let result3 = result2.replace(str2, "");`<br>`console.log(result1 + ‘ ‘ + result3);` |
| **Output** | **Output** |
| `Glyph Time!`<br>`Time! Glyph`<br>`Glyph Time! Glyph` | `JavaScript Time!`<br>`Time! JavaScript`<br>`JavaScript Time! JavaScript` |

---

# Iteration

| Glyph | JavaScript |
|-------|-----------|
| `affix io@exscribe`<br>`affix function@apply`<br><br>`my_array = ["Apple", "Banana", "Cherry", "Date", "Elderberry"]`<br><br>`/@ performs the first argument on each member of the second (currying type beat) @/`<br>`main = apply exscribe my_array` | `const myArray = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];`<br><br>`for (let i = 0; i < myArray.length; i++) {`<br>`    console.log(myArray[i]);`<br>`}` |
| **Output** | **Output** |
| `Apple`<br>`Banana`<br>`Cherry`<br>`Date`<br>`Elderberry` | `Apple`<br>`Banana`<br>`Cherry`<br>`Date`<br>`Elderberry` |
