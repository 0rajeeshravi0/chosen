const ApiError = require('../utils/ApiError');

/**
 * Wraps a Joi schema into Express middleware.
 * Usage: validate(schema) or validate(schema, 'query')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message).join('. ');
      return next(ApiError.badRequest(messages));
    }

    req[property] = value;
    next();
  };
};

module.exports = validate;
