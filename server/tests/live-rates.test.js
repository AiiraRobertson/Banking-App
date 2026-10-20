const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function runIsolated(script) {
  const result = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('NGN and GHS rates fail closed when live rate service is unavailable', () => {
  runIsolated(`
    const assert = require('node:assert/strict');
    global.fetch = async () => { throw new Error('network unavailable'); };
    const { getRate } = require('./server/utils/liveRates');
    Promise.all([getRate('NGN'), getRate('GHS')]).then(([ngn, ghs]) => {
      assert.equal(ngn.rate, undefined);
      assert.equal(ghs.rate, undefined);
      assert.equal(ngn.source, 'fallback');
      assert.equal(ghs.source, 'fallback');
    }).catch(error => { console.error(error); process.exitCode = 1; });
  `);
});

test('NGN and GHS rates are taken from a live response when present', () => {
  runIsolated(`
    const assert = require('node:assert/strict');
    global.fetch = async () => ({ ok: true, json: async () => ({ result: 'success', rates: { NGN: 1500.123456, GHS: 15.234567 } }) });
    const { getRate } = require('./server/utils/liveRates');
    Promise.all([getRate('NGN'), getRate('GHS')]).then(([ngn, ghs]) => {
      assert.equal(ngn.rate, 1500.1235);
      assert.equal(ghs.rate, 15.2346);
      assert.equal(ngn.source, 'live');
      assert.equal(ghs.source, 'live');
    }).catch(error => { console.error(error); process.exitCode = 1; });
  `);
});
