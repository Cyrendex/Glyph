#! /usr/bin/env node

import * as fs from "node:fs/promises"
import stringify from "graph-stringify"
import compile from "./compiler.js"

const help = `Glyph compiler

Syntax: glyph <filename> <outputType>

Prints to stdout according to <outputType>, which must be one of:

  parsed     a message that the program was matched ok by the grammar
  analyzed   the statically analyzed representation
  optimized  the optimized semantically analyzed representation
  js         the translation to JavaScript
`

async function compileFromFile(filename, outputType) {
  const buffer = await fs.readFile(filename)
  const compiled = compile(buffer.toString(), outputType)
  console.log(stringify(compiled, "kind") || compiled)
  
}

if (process.argv.length !== 4) {
  console.log(help)
} else {
  compileFromFile(process.argv[2], process.argv[3])
}