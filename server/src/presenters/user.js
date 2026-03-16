function presentUser(user) {
  if (!user) return null;

  const role = user.role;

  return {
    id: user.id,
    username: user.username,
    full_name: user.fullName ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,

    role_id: user.roleId ?? null,
    role_name: role?.name ?? null,
    role_display: role?.displayName ?? role?.name ?? null,
    role_permissions: role?.permissions ? JSON.stringify(role.permissions) : '{}',

    is_active: user.isActive ? 1 : 0,
    approval_status: user.approvalStatus,
    approved_by: user.approvedById ?? null,
    approved_at: user.approvedAt ? user.approvedAt.toISOString() : null,

    last_login: user.lastLogin ? user.lastLogin.toISOString() : null,

    access_type: user.accessType ?? null,
    access_expires_at: user.accessExpiresAt ? user.accessExpiresAt.toISOString() : null,
    access_granted_by: user.accessGrantedById ?? null,
    access_granted_at: user.accessGrantedAt ? user.accessGrantedAt.toISOString() : null,

    created_at: user.createdAt ? user.createdAt.toISOString() : null,
    updated_at: user.updatedAt ? user.updatedAt.toISOString() : null,
  };
}

module.exports = { presentUser };
