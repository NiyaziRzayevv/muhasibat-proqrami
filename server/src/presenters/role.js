function presentRole(role) {
  if (!role) return null;
  return {
    id: role.id,
    name: role.name,
    display_name: role.displayName ?? null,
    permissions: role.permissions ? JSON.stringify(role.permissions) : '{}',
    created_at: role.createdAt ? role.createdAt.toISOString() : null,
  };
}

module.exports = { presentRole };
