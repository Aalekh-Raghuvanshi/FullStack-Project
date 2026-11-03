const { randomUUID } = require('node:crypto');

function createRecordNumber(prefix) {
  return `${prefix}-${randomUUID().replaceAll('-', '').toUpperCase()}`;
}

module.exports = { createRecordNumber };
