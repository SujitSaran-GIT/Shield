import test from 'node:test';
import assert from 'node:assert/strict';
import { getAccessToken, setAccessToken, clearLegacyCredentials } from '../src/api/session.ts';
import { validatePasswordStrength } from '../src/utils/helpers.ts';
import { exportCsv } from '../src/utils/export.ts';

test('browser password validation follows the backend UTF-8 byte boundary', () => {
  assert.equal(validatePasswordStrength('long-enough-passphrase').isValid, true);
  assert.equal(validatePasswordStrength('short').isValid, false);
  assert.equal(validatePasswordStrength('é'.repeat(36)).isValid, true);
  assert.equal(validatePasswordStrength('é'.repeat(37)).isValid, false);
});

test('access token remains in memory and old persistent credentials are purged', () => {
  const removed = [];
  const previous = globalThis.localStorage;
  globalThis.localStorage = { removeItem: (key) => removed.push(key) };
  try {
    setAccessToken('test-bearer');
    assert.equal(getAccessToken(), 'test-bearer');
    clearLegacyCredentials();
    assert.deepEqual(removed, ['accessToken', 'refreshToken', 'user', 'clientKey', 'clientId']);
    setAccessToken(null);
    assert.equal(getAccessToken(), null);
  } finally { globalThis.localStorage = previous; }
});

test('CSV export neutralizes spreadsheet formulas and quotes untrusted cells', async () => {
  let blob;
  let clicked = false;
  const oldDocument = globalThis.document;
  const oldCreate = URL.createObjectURL;
  const oldRevoke = URL.revokeObjectURL;
  globalThis.document = { createElement: () => ({ click: () => { clicked = true; } }) };
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  try {
    exportCsv('audit.csv', [{ email: '=HYPERLINK("https://example.test")', details: 'line,"quoted"' }]);
    const csv = await blob.text();
    assert.equal(clicked, true);
    assert.match(csv, /"'=HYPERLINK\(""https:\/\/example\.test""\)"/);
    assert.match(csv, /"line,""quoted"""/);
  } finally {
    globalThis.document = oldDocument;
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
  }
});
