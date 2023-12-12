const Joi = require('joi');

function validateObject(data, template) {
  const schema = Joi.object().keys(template);

  const { error, value } = schema.validate(data);
  
  if (error) {
    console.error('Validation error:', error.details);
    return false;
  }
  
  return true;
}

// Dữ liệu cần validate
const dataToValidate = {
  "id": "22294",
  "number": "2959910238544032",
  "amount": "100a0",
  "status": "activated",
  "prepaidCardTokenId": "22353"
};

// Template để validate
const validationTemplate = {
  "id": Joi.string(),
  "number": Joi.string().length(16),
  "amount": Joi.string().regex(/^[0-9]+$/),
  "status": Joi.string().valid('activated', 'inactivated'),
  "prepaidCardTokenId": Joi.string().required()
};

// Thực hiện validate
const isValid = validateObject(dataToValidate, validationTemplate);
console.log('Is valid:', isValid);
