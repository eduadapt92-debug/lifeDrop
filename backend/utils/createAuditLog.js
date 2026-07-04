const AuditLog = require('../models/AuditLog');

const createAuditLog = async ({ actor, action, entity, entityId, description, ipAddress }) => {
  try {
    await AuditLog.create({ actor, action, entity, entityId, description, ipAddress });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = createAuditLog;
