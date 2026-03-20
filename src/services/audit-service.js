/**
 * AuditService - Bütün vacib əməliyyatları qeyd edir
 * Hər service bu modulu çağırır
 */
const { getDb } = require('../database/index');

class AuditService {
  static log({ action, module, entity_type, entity_id, user_id, user_name, description, old_data, new_data, metadata }) {
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO audit_logs (action, module, entity_type, entity_id, user_id, user_name, description, old_data, new_data, metadata_json)
        VALUES (@action, @module, @entity_type, @entity_id, @user_id, @user_name, @description, @old_data, @new_data, @metadata_json)
      `).run({
        action: action || 'unknown',
        module: module || null,
        entity_type: entity_type || null,
        entity_id: entity_id || null,
        user_id: user_id || null,
        user_name: user_name || 'Sistem',
        description: description || null,
        old_data: old_data ? JSON.stringify(old_data) : null,
        new_data: new_data ? JSON.stringify(new_data) : null,
        metadata_json: metadata ? JSON.stringify(metadata) : null,
      });
    } catch (e) {
      console.error('[AuditService] log error:', e.message);
    }
  }

  static logCreate(module, entityType, entityId, userId, userName, newData, description) {
    this.log({ action: 'create', module, entity_type: entityType, entity_id: entityId, user_id: userId, user_name: userName, new_data: newData, description });
  }

  static logUpdate(module, entityType, entityId, userId, userName, oldData, newData, description) {
    this.log({ action: 'update', module, entity_type: entityType, entity_id: entityId, user_id: userId, user_name: userName, old_data: oldData, new_data: newData, description });
  }

  static logDelete(module, entityType, entityId, userId, userName, oldData, description) {
    this.log({ action: 'delete', module, entity_type: entityType, entity_id: entityId, user_id: userId, user_name: userName, old_data: oldData, description });
  }

  static logPayment(module, entityType, entityId, userId, userName, metadata, description) {
    this.log({ action: 'payment', module, entity_type: entityType, entity_id: entityId, user_id: userId, user_name: userName, metadata, description });
  }

  static logStockUpdate(productId, userId, userName, metadata, description) {
    this.log({ action: 'stock_update', module: 'stock', entity_type: 'product', entity_id: productId, user_id: userId, user_name: userName, metadata, description });
  }

  static logPriceChange(productId, userId, userName, oldData, newData, description) {
    this.log({ action: 'price_change', module: 'products', entity_type: 'product', entity_id: productId, user_id: userId, user_name: userName, old_data: oldData, new_data: newData, description });
  }
}

module.exports = AuditService;
