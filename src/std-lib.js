import * as core from "./core.js";

export const standardLibrary = {
  properties: {
    functionList: {
      "io":
        {
          "exscribe":
          {
            "expectedParameters":1,
            "coreFunction":core.exscribeStatement,
            "expectedFields":[],
            "additionalBehaviors":null,
          }
        }
      ,
      "typing":
        {
          "typeof":
          {
            "expectedParameters":1,
            "coreFunction":core.typeStatement,
            "expectedFields":["type"],
            "additionalBehaviors":{"FunctionCall":["callee",1]},
          }
        }
      ,
      "function":["apply"],
      "string":["supplant"],
    },
  },

  io: {
    exscribe: core.importedFunction("io", "exscribe",
      core.functionType([core.anyType], core.voidType)),
  },

  typing: {
    typeof: core.importedFunction("typing", "typeof",
      core.functionType([core.anyType], core.stringType)),
  },

  function: {
    apply: core.importedFunction("function", "apply",
      core.functionType([core.anyType, core.anyType + "[]"], core.anyType + "[]")),
  },

  string: {
    // `Spacer` is just a character or string, not a function — no import needed
    supplant: core.importedFunction("string", "supplant",
      core.functionType([core.stringType, core.stringType, core.stringType], core.stringType)),
  },
};