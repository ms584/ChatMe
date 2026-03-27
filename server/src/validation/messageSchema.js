const Joi = require('joi');

const messageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required().messages({
    'string.empty': 'Message content cannot be empty',
    'string.max': 'Message content cannot exceed 2000 characters',
    'any.required': 'Message content is required',
  }),
  // receiverId only accepted from admin; for users it's auto-set to admin
  receiverId: Joi.string().hex().length(24).optional(),
});

const validateMessage = (req, res, next) => {
  const { error, value } = messageSchema.validate(req.body, {
    allowUnknown: false,    // reject unexpected fields
    stripUnknown: true,     // safety belt
    abortEarly: false,
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return res.status(400).json({ error: 'Validation failed', details });
  }

  req.body = value;
  next();
};

module.exports = { validateMessage };
