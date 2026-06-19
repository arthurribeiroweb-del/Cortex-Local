const test = require("node:test");
const assert = require("node:assert/strict");

const { takeCompleteLines, parseStreamLine, createStreamAccumulator } = require("../src/ollamaStream");

test("takeCompleteLines: separa linhas completas do resto", () => {
  assert.deepEqual(takeCompleteLines("a\nb\nc"), { lines: ["a", "b"], rest: "c" });
  assert.deepEqual(takeCompleteLines("a\nb\n"), { lines: ["a", "b"], rest: "" });
  assert.deepEqual(takeCompleteLines("sem newline"), { lines: [], rest: "sem newline" });
  assert.deepEqual(takeCompleteLines(""), { lines: [], rest: "" });
});

test("parseStreamLine: extrai content e done de linha valida", () => {
  assert.deepEqual(
    parseStreamLine('{"message":{"content":"oi"},"done":false}'),
    { content: "oi", done: false, data: { message: { content: "oi" }, done: false } }
  );
  const done = parseStreamLine('{"done":true,"eval_count":10}');
  assert.equal(done.content, "");
  assert.equal(done.done, true);
});

test("parseStreamLine: linha invalida ou vazia retorna null", () => {
  assert.equal(parseStreamLine("nao json"), null);
  assert.equal(parseStreamLine(""), null);
  assert.equal(parseStreamLine("   "), null);
});

test("createStreamAccumulator: monta a resposta mesmo com chunks cortados no meio", () => {
  const acc = createStreamAccumulator();
  const tokens = [];

  // simula a rede entregando pedacos que cortam linhas no meio
  const chunks = [
    '{"message":{"content":"Bom "},"done":false}\n{"message":{"content":"di',
    'a"},"done":false}\n',
    '{"message":{"content":"!"},"done":true}\n'
  ];

  for (const chunk of chunks) {
    for (const event of acc.push(chunk)) {
      tokens.push(event.content);
    }
  }
  for (const event of acc.flush()) {
    tokens.push(event.content);
  }

  assert.equal(tokens.join(""), "Bom dia!");
});

test("createStreamAccumulator: flush processa resto sem newline final", () => {
  const acc = createStreamAccumulator();
  let got = [];
  got = got.concat(acc.push('{"message":{"content":"x"},"done":false}'));
  assert.equal(got.length, 0, "ainda nao tem newline => nada pronto");
  const flushed = acc.flush();
  assert.equal(flushed.length, 1);
  assert.equal(flushed[0].content, "x");
});
