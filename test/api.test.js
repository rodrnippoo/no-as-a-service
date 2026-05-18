const assert = require('assert');
const http = require('http');

// Simple test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function request(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3000,
      path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('\nRunning API tests...\n');

  // Test: GET /
  try {
    const res = await request('/');
    test('GET / returns 200', () => {
      assert.strictEqual(res.status, 200);
    });
    test('GET / returns JSON', () => {
      assert.strictEqual(res.headers['content-type'], 'application/json');
    });
    test('GET / response has answer field', () => {
      assert.ok(res.body.answer !== undefined, 'Missing answer field');
    });
    test('GET / answer is "no"', () => {
      assert.strictEqual(res.body.answer, 'no');
    });
    test('GET / response has reason field', () => {
      assert.ok(typeof res.body.reason === 'string', 'reason should be a string');
      assert.ok(res.body.reason.length > 0, 'reason should not be empty');
    });
  } catch (err) {
    console.error('Could not connect to server. Is it running?');
    console.error(err.message);
    process.exit(1);
  }

  // Test: GET /no
  try {
    const res = await request('/no');
    test('GET /no returns 200', () => {
      assert.strictEqual(res.status, 200);
    });
    test('GET /no response has answer field', () => {
      assert.ok(res.body.answer !== undefined, 'Missing answer field');
    });
    test('GET /no answer is "no"', () => {
      assert.strictEqual(res.body.answer, 'no');
    });
  } catch (err) {
    console.error('Failed /no route test:', err.message);
    failed++;
  }

  // Test: reasons are varied (randomness check)
  // bumped sample size from 10 to 15 to reduce flakiness on slow machines
  try {
    const responses = await Promise.all(
      Array.from({ length: 15 }, () => request('/'))
    );
    const reasons = responses.map((r) => r.body.reason);
    const uniqueReasons = new Set(reasons);
    test('GET / returns varied reasons (randomness)', () => {
      assert.ok(uniqueReasons.size > 1, 'Expected multiple different reasons across 15 requests');
    });
  } catch (err) {
    console.error('Failed randomness test:', err.message);
    failed++;
  }

  // Test: unknown route returns 404
  try {
    const res = await request('/unknown-route-xyz');
    test('GET /unknown-route-xyz returns 404', () => {
      assert.strictEqual(res.status, 404);
    });
  } catch (err) {
    console.error('Failed 404 test:', err.message);
    failed++;
  }

  // Summary
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
