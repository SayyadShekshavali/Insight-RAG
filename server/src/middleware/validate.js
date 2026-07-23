import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    logger.warn(`Request validation failed: ${error.message}`);
    const errors = error.errors.map((err) => ({
      field: err.path.slice(1).join('.'),
      message: err.message,
    }));
    const firstMsg = errors.length > 0 ? errors[0].message : 'The request payload is invalid.';
    return res.status(400).json({
      error: 'ValidationError',
      message: firstMsg,
      details: errors,
    });
  }
};
