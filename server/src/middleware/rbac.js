import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication is required.'
        });
      }

      const { role } = req.user;
      
      if (!allowedRoles.includes(role)) {
        logger.warn(`Forbidden access attempt: user with role '${role}' tried to access role-restricted endpoint`);
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource.'
        });
      }

      next();
    } catch (error) {
      logger.error(`RBAC middleware error: ${error.message}`);
      return res.status(500).json({
        error: 'InternalServerError',
        message: 'Role authorization check failed.'
      });
    }
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireEmployee = requireRole(['employee']);
export const requireAny = requireRole(['admin', 'employee']);
