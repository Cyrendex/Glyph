import { describe, it } from "node:test"
import assert from "node:assert/strict"
import parse from "../src/parser.js"

// Expected to be syntactically correct
const syntaxChecks = [
    ["simplest syntactically correct program", "main = 0"]
]

// Expected to be syntactically incorrect
const syntaxErrors = [
    ["missing semicolon", "main = {0}", /Line 1, col 10/],
]

describe("Parser", () => {
    for (const [scenario, source] of syntaxChecks) {
        it(`Matches ${scenario}`, () => {
            assert(parse(source).succeeded())
        })
    }
    for (const [scenario, source, errorMessagePattern] of syntaxErrors) {
        it(`throws on ${scenario}`, () => {
            assert.throws(() => parse(source), errorMessagePattern)
        })
    }
})