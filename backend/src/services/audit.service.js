async function writeAuditLog(database, event) {
  return database.auditLog.create({
    data: {
      actorId: event.actorId ?? null,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      metadata: event.metadata,
    },
  });
}

module.exports = { writeAuditLog };
