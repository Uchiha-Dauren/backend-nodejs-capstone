process.env.NODE_ENV = 'production';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');
let server, base;
before(async () => {
  server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
async function analyze(body) {
  const response = await fetch(`${base}/sentiment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
for (const [sentence, label] of [['I love this wonderful beautiful gift!', 'positive'], ['This is awful and terrible.', 'negative'], ['The chair is in the room.', 'neutral'], ['!!!', 'neutral']]) {
  test(`classifies ${label}: ${sentence}`, async () => {
    const result = await analyze({ sentence });
    assert.equal(result.status, 200);
    assert.equal(result.body.sentiment, label);
    assert.equal(typeof result.body.sentimentScore, 'number');
    assert.ok(Number.isFinite(result.body.sentimentScore));
  });
}
test('rejects missing, empty and non-string sentences', async () => {
  for (const body of [{}, { sentence: '  ' }, { sentence: 12 }, { sentence: {} }]) assert.equal((await analyze(body)).status, 400);
});
test('rejects oversized sentences', async () => assert.equal((await analyze({ sentence: 'x'.repeat(10001) })).status, 400));
test('responds to health check', async () => assert.equal((await fetch(`${base}/health`)).status, 200));
