const Joi = require('joi');
const logger = require('../utils/logger');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DISCORD_TOKEN: Joi.string().required(),
  CLIENT_ID: Joi.string().required(),
  PORT: Joi.number().default(3000),
  DEBUG: Joi.boolean().default(false)
}).unknown();

function validateEnv() {
  const { error, value } = envSchema.validate(process.env, { abortEarly: false });
  
  if (error) {
    const missingVars = error.details.map(detail => detail.message).join('\n');
    logger.error('Environment validation failed:', missingVars);
    process.exit(1);
  }

  logger.info('Environment variables validated successfully');
  return value;
}

module.exports = validateEnv; 