const AuditLog = require('../models/AuditLog');

const logAction = async (userId, action, entity, entityId, details = {}) => {
  try {
    await AuditLog.create({ user: userId, action, entity, entityId, details });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = logAction;
