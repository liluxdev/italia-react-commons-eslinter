const path = require('path');
const formSchemaValidator = require(path.resolve(__dirname, './formSchemaValidator'));

module.exports = {
  rules: {
    'form-validation': formSchemaValidator
  }
};
