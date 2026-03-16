function presentAuditLog(log) {
  if (!log) return null;

  return {
    id: log.id,
    action: log.action,
    entity_type: log.entityType ?? null,
    entity_id: log.entityId ?? null,
    user_id: log.userId ?? null,
    user_name: log.userName ?? null,
    old_data: log.oldData ? JSON.stringify(log.oldData) : null,
    new_data: log.newData ? JSON.stringify(log.newData) : null,
    ip_address: log.ipAddress ?? null,
    created_at: log.createdAt ? log.createdAt.toISOString() : null,
  };
}

module.exports = { presentAuditLog };
