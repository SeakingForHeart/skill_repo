const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseRequirements,
  classifySemverChange,
  parseNpmOutdated,
  parsePipOutdated,
  bucketUpdates,
} = require('../runtime/dependencies');

test('classifies common semver changes', () => {
  assert.equal(classifySemverChange('1.2.3', '2.0.0'), 'major');
  assert.equal(classifySemverChange('1.2.3', '1.3.0'), 'minor');
  assert.equal(classifySemverChange('1.2.3', '1.2.4'), 'patch');
  assert.equal(classifySemverChange('workspace:*', '1.2.4'), 'unknown');
});

test('parses npm outdated JSON', () => {
  const items = parseNpmOutdated(JSON.stringify({ lodash: { current: '4.17.0', wanted: '4.17.21', latest: '5.0.0' } }));
  assert.deepEqual(items[0], {
    name: 'lodash',
    current: '4.17.0',
    wanted: '4.17.21',
    latest: '5.0.0',
    location: null,
  });
  assert.equal(bucketUpdates(items).major.length, 1);
});

test('parses pip outdated JSON', () => {
  const items = parsePipOutdated(JSON.stringify([{ name: 'pytest', version: '7.1.0', latest_version: '7.2.0' }]));
  assert.equal(items[0].name, 'pytest');
  assert.equal(bucketUpdates(items).minor.length, 1);
});

test('parses requirements lines conservatively', () => {
  const items = parseRequirements('\n# comment\nrequests==2.31.0\npytest>=7\n-r base.txt\n');
  assert.deepEqual(items.map((item) => item.name), ['requests', 'pytest']);
});

test('malformed npm JSON throws for caller fallback', () => {
  assert.throws(() => parseNpmOutdated('{bad json'));
});
