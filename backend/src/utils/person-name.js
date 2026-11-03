function splitPersonName(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Patient',
    lastName: parts.slice(1).join(' ') || null,
  };
}

module.exports = { splitPersonName };
