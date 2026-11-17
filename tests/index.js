const fs = require("node:fs");
const ts = require("typescript");
// インストール済みTypeScriptで純粋関数だけをメモリ上で変換する。
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
require("./logic.cjs");
require("./seed-storage.cjs");
