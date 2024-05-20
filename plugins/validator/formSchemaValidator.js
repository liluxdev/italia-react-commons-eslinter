const debug = require('debug')('formSchemaValidator');

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
      console.log("Validating step object:", stepNode);
      debug("Validating step object:", stepNode);

      const stepProperties = stepNode.properties.map(p => p.key.name);
      console.log("Step properties:", stepProperties);
      debug("Step properties:", stepProperties);

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

    function validateFormObject(formConfig, node) {
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

    return {
      VariableDeclarator(node) {
        console.log("Checking variable declarator:", node);
        debug("Checking variable declarator:", node);
        
        if (node.id.name === 'form' && node.init) {
          console.log("Found 'form' variable:", node);
          debug("Found 'form' variable:", node);

          const formConfig = node.init.properties;
          console.log("Form configuration properties:", formConfig);
          debug("Form configuration properties:", formConfig);

          validateFormObject(formConfig, node);
        }
      },
      ArrowFunctionExpression(node) {
        console.log("Checking arrow function expression:", node);
        debug("Checking arrow function expression:", node);

        if (node.body && node.body.type === 'ObjectExpression') {
          console.log("Found object expression in arrow function:", node.body);
          debug("Found object expression in arrow function:", node.body);
          validateStepObject(node.body, node);
        }
      },
      FunctionDeclaration(node) {
        console.log("Checking function declaration:", node);
        debug("Checking function declaration:", node);

        const returnNode = node.body.body.find(statement => statement.type === 'ReturnStatement');
        if (returnNode && returnNode.argument.type === 'ObjectExpression') {
          console.log("Found object expression in function declaration:", returnNode.argument);
          debug("Found object expression in function declaration:", returnNode.argument);
          validateStepObject(returnNode.argument, returnNode);
        }
      }
    };
  }
};

module.exports = formSchemaValidator;
