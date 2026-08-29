import { asyncHandler } from '../utils/asyncHandler.js';
import { listAuditLogs } from '../services/auditLog.service.js';

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const result = await listAuditLogs({ page, limit });
  res.json(result);
});
