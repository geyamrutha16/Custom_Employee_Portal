import { asyncHandler } from '../utils/asyncHandler.js';
import { listDepartments } from '../models/department.model.js';

export const getDepartments = asyncHandler(async (req, res) => {
  const departments = await listDepartments();
  res.json({ departments });
});
