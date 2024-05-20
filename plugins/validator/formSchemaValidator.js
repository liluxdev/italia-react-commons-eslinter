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
        // Verifica che l'oggetto `form` contenga la proprietà `steps`
        if (node.id.name === 'form' && node.init) {
          // Converti l'oggetto AST in un oggetto JS
          const formConfig = context.getSourceCode().getText(node.init);
          try {
            const parsedConfig = eval('(' + formConfig + ')');
            const isValid = validate(parsedConfig);
            if (!isValid) {
              validate.errors.forEach(error => {
                context.report({
                  node,
                  message: `Validation error: ${error.message}`
                });
              });
            }
          } catch (e) {
            context.report({
              node,
              message: `Parsing error: ${e.message}`
            });
          }
        }
      }
    };
  }
};

module.exports = formSchemaValidator;
