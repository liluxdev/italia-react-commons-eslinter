const Ajv = require('ajv');
const schema = require('./formSchema.json');

const ajv = new Ajv();
const validate = ajv.compile(schema);

const formSchemaValidator = {
  meta: {
    type: 'problem',
    docs: {
      description: 'validate form configuration against JSON schema',
      category: 'Possible Errors',
      recommended: true
    },
    schema: [] // no options
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        if (node.id.name === 'form' && node.init) {
          const formConfig = node.init;
          const isValid = validate(formConfig);
          if (!isValid) {
            validate.errors.forEach(error => {
              context.report({
                node,
                message: `Validation error: ${error.message}`
              });
            });
          }
        }
      }
    };
  }
};

module.exports = formSchemaValidator;
