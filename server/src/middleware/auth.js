import jwt from 'jsonwebtoken';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export const requireAuth = (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required.'
      });
    }
    
    const accessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-32-chars-at-least-please-change-in-production';
    jwt.verify(token, accessSecret, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'TokenExpired',
            message: 'Access token has expired. Please refresh your token.'
          });
        }
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid access token.'
        });
      }

      // Attach decoded token contents to request object
      req.user = {
        userId: decoded.userId,
        role: decoded.role,
        orgId: decoded.orgId
      };
      
      next();
    });
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Authentication check failed.'
    });
  }
};
