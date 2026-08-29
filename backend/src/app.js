import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import auditLogRoutes from './routes/auditLog.routes.js';
import zohoRoutes from './routes/zoho.routes.js';
import departmentRoutes from './routes/department.routes.js';

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/zoho', zohoRoutes);
app.use('/api/departments', departmentRoutes);

app.use('/api', notFoundHandler);
app.use(errorHandler);
