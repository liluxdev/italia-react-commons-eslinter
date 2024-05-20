const formSchemaValidator = {
  meta: {
    type: 'problem',
    docs: {
      description: 'validate form configuration and step objects',
      category: 'Possible Errors',
      recommended: true
    },
    schema: [] // no options
  },
  create(context) {
    function validateStepObject(stepNode, node) {
      const stepProperties = stepNode.properties.map(p => p.key.name);

      const requiredProperties = ['stepperCallout', 'name', 'fields'];
      requiredProperties.forEach(prop => {
        if (!stepProperties.includes(prop)) {
          context.report({
            node,
            message: `Step object is missing the '${prop}' property`
          });
        }
      });

      const fieldsNode = stepNode.properties.find(property => property.key.name === 'fields');
      if (fieldsNode && fieldsNode.value.type !== 'ArrayExpression') {
        context.report({
          node: fieldsNode,
          message: `'fields' should be an array`
        });
      }
    }

    return {
      VariableDeclarator(node) {
        if (node.id.name === 'form' && node.init) {
          const formConfig = node.init.properties;
          
          // Check if `steps` property exists
          const hasSteps = formConfig.some(property => property.key.name === 'steps');
          if (!hasSteps) {
            context.report({
              node,
              message: `The form object is missing the 'steps' property`
            });
            return;
          }

          // Validate `steps` property
          const stepsNode = formConfig.find(property => property.key.name === 'steps');
          const steps = stepsNode.value.elements;

          if (!Array.isArray(steps)) {
            context.report({
              node: stepsNode,
              message: `'steps' should be an array`
            });
            return;
          }

          // Validate each step in `steps`
          steps.forEach((step, index) => {
            if (!step.properties) {
              context.report({
                node: step,
                message: `Step ${index + 1} is not a valid object`
              });
              return;
            }
            validateStepObject(step, step);
          });
        }
      },
      ReturnStatement(node) {
        if (node.argument && node.argument.type === 'ObjectExpression') {
          const stepConfig = node.argument.properties;
          validateStepObject({ properties: stepConfig }, node);
        }
      }
    };
  }
};

module.exports = formSchemaValidator;
