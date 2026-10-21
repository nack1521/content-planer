import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

// Sole reviewer probe: execute the exact AST-extracted production arrow body.
// It intentionally does not import the application, React, or any SDK.
const projectRoot = process.cwd();
assert.equal(projectRoot, '/Users/nack/contentPlaner', 'Run this probe from the project root');
const require = createRequire(import.meta.url);
const ts = require('typescript');
assert.equal(typeof ts.createSourceFile, 'function');
assert.equal(typeof ts.transpileModule, 'function');

const relativeSource = 'src/components/tasks/TasksView.tsx';
const sourcePath = path.join(projectRoot, relativeSource);
const sourceText = fs.readFileSync(sourcePath, 'utf8');
const sourceFile = ts.createSourceFile(relativeSource, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(sourceFile.parseDiagnostics.length, 0, 'TasksView.tsx must parse before extraction');

const declarations = [];
function findHandler(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'handleRowClick') {
    declarations.push(node);
  }
  ts.forEachChild(node, findHandler);
}
findHandler(sourceFile);
assert.equal(declarations.length, 1, 'Expected exactly one production handleRowClick declaration');
const initializer = declarations[0].initializer;
assert.ok(initializer && ts.isArrowFunction(initializer), 'Production handleRowClick must remain an arrow function');
assert.ok(ts.isBlock(initializer.body), 'Production handler body must be a block');
const start = sourceFile.getLineAndCharacterOfPosition(initializer.getStart(sourceFile));
assert.equal(start.line + 1, 217, 'Extracted declaration should be the expected TasksView handler');

// Transpile only the actual initializer obtained from the production AST.
const exactInitializer = initializer.getText(sourceFile);
const transpiled = ts.transpileModule(`(${exactInitializer})`, {
  fileName: 'extracted-row-handler.ts',
  reportDiagnostics: true,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.None,
  },
});
const compileErrors = (transpiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
assert.equal(compileErrors.length, 0, 'TypeScript must erase annotations without errors');

let selectionText = '';
const openedTasks = [];
const sandbox = {
  window: {
    getSelection() {
      return selectionText === null ? null : { toString: () => selectionText };
    },
  },
  handleOpenEdit(task) {
    openedTasks.push(task);
  },
};
const handleRowClick = vm.runInNewContext(transpiled.outputText, sandbox, {
  timeout: 500,
  codeGeneration: { strings: false, wasm: false },
});
assert.equal(typeof handleRowClick, 'function', 'The extracted production initializer must evaluate to a function');

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"]';
const task = Object.freeze({ id: 'synthetic-review-task' });
let totalCases = 0;
let openedCases = 0;
let suppressedCases = 0;

function runCase(name, { button = 0, metaKey = false, ctrlKey = false, altKey = false, shiftKey = false, selection = '', matchedAncestor = false, nullTarget = false } = {}, shouldOpen) {
  selectionText = selection;
  const beforeCount = openedTasks.length;
  let closestCalls = 0;
  const target = nullTarget ? null : {
    closest(selector) {
      closestCalls++;
      assert.equal(selector, INTERACTIVE_SELECTOR, `${name}: production query selector changed`);
      return matchedAncestor ? { syntheticAncestor: name } : null;
    },
  };
  handleRowClick(task, { button, metaKey, ctrlKey, altKey, shiftKey, target });
  const delta = openedTasks.length - beforeCount;
  assert.equal(delta, shouldOpen ? 1 : 0, `${name}: expected exactly ${shouldOpen ? 'one' : 'zero'} task edit call`);
  if (shouldOpen) {
    assert.strictEqual(openedTasks.at(-1), task, `${name}: edit must receive the clicked row's task`);
    openedCases++;
  } else {
    suppressedCases++;
  }
  if (button !== 0 || metaKey || ctrlKey || altKey || shiftKey || (typeof selection === 'string' && selection.trim())) {
    assert.equal(closestCalls, 0, `${name}: early rejection must occur before closest()`);
  } else if (!nullTarget) {
    assert.equal(closestCalls, 1, `${name}: eligible click should inspect its target once`);
  }
  totalCases++;
}

// Inert row contents open the exact row task once.
runCase('inert td', {}, true);
runCase('description paragraph', {}, true);
runCase('status badge span', {}, true);
runCase('empty-cell whitespace', {}, true);
runCase('whitespace-only selection', { selection: '  \t\n ' }, true);
runCase('null target primary click', { nullTarget: true }, true);

// These synthetic targets represent descendants whose closest() resolves to the
// corresponding interactive ancestor; the production function itself is not copied.
for (const name of ['checkbox button containing svg', 'title button containing span', 'content button containing svg', 'anchor', 'input', 'select', 'textarea', 'role=button']) {
  runCase(name, { matchedAncestor: true }, false);
}
runCase('non-empty text selection', { selection: ' copied row text ' }, false);
runCase('right click', { button: 2 }, false);
runCase('middle click', { button: 1 }, false);
runCase('meta click', { metaKey: true }, false);
runCase('control click', { ctrlKey: true }, false);
runCase('alt click', { altKey: true }, false);
runCase('shift click', { shiftKey: true }, false);

assert.equal(totalCases, 21);
assert.equal(openedCases, 6);
assert.equal(suppressedCases, 15);
console.log('CP-DESKTOP-01 actual-handler probe: PASS');
console.log(`TypeScript ${ts.version}; extracted ${relativeSource}:217 AST initializer; no app/SDK imports.`);
console.log(`Synthetic cases: ${totalCases}; opened=${openedCases}; suppressed=${suppressedCases}; failures=0.`);
