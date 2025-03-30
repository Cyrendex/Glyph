import * as core from "./core.js";

export const standardLibrary = {
  io: {
    exscribe: core.importedFunction("io", "exscribe",
      core.functionType([core.anyType], core.voidType)),
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
