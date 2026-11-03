const test = require('node:test');
const assert = require('node:assert/strict');
const { health } = require('../src/controllers/health.controller');

test('health handler returns application status without requiring a database', () => {
  let responseStatus;
  let responseBody;
  const response = {
    status(status) {
      responseStatus = status;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  health({}, response);
  assert.equal(responseStatus, 200);
  assert.equal(responseBody.status, 'ok');
  assert.equal(responseBody.service, 'MediCore AI API');
  assert.equal(Number.isNaN(Date.parse(responseBody.timestamp)), false);
});
