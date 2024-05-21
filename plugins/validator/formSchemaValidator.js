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

      if (stepNode.type === 'CallExpression' || stepNode.type === 'ArrowFunctionExpression') {
        // Skip validation for function calls or arrow functions
        return;
      }

      const stepProperties = stepNode.properties.map(p => p.key.name);
      console.log("Step properties:", stepProperties);
      debug("Step properties:", stepProperties);

      const requiredStepProperties = [];
      const allowedStepProperties = [
        'id',
        'name',
        'stepperCallout',
        'stepperCalloutOnlyOnHover',
        'stepperCalloutHideOthers',
        'stepperCalloutHideOthersOnHover',
        'required',
        'message',
        'scrollOnTop',
        'fields',
        'preflights',
        'visibleIf'
      ];

      requiredStepProperties.forEach(prop => {
        if (!stepProperties.includes(prop)) {
          context.report({
            node,
            message: `Step object is missing the '${prop}' property`
          });
        }
      });

      stepProperties.forEach(prop => {
        if (!allowedStepProperties.includes(prop)) {
          context.report({
            node,
            message: `Step object has an invalid property '${prop}'`
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

    function validateDataObject(dataNode, node) {
      console.log("Validating data object:", dataNode);
      debug("Validating data object:", dataNode);

      if (!Array.isArray(dataNode)) {
        context.report({
          node,
          message: `'data' should be an array`
        });
        return;
      }

      dataNode.forEach((step, index) => {
        if (step.type === 'CallExpression' || step.type === 'ArrowFunctionExpression') {
          // Skip validation for function calls or arrow functions
          return;
        }
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

    function validateStepsArray(stepsArray, node) {
      stepsArray.forEach((stepNode, index) => {
        if (stepNode.type === 'CallExpression' || stepNode.type === 'ArrowFunctionExpression') {
          // Skip validation for function calls or arrow functions
          return;
        }
        if (!stepNode.properties) {
          context.report({
            node: stepNode,
            message: `Step ${index + 1} is not a valid object`
          });
          return;
        }

        const stepProperties = stepNode.properties.map(p => p.key.name);
        console.log("Step properties:", stepProperties);
        debug("Step properties:", stepProperties);

        if (!stepProperties.includes('data')) {
          context.report({
            node: stepNode,
            message: `Step ${index + 1} is missing the 'data' property`
          });
          return;
        }

        const dataNode = stepNode.properties.find(property => property.key.name === 'data');
        if (dataNode.value.type !== 'ArrayExpression') {
          context.report({
            node: dataNode,
            message: `'data' should be an array`
          });
          return;
        }

        validateDataObject(dataNode.value.elements, dataNode);
      });
    }

    function validateFormObject(formConfig, node) {
      console.log("Validating form object:", formConfig);
      debug("Validating form object:", formConfig);

      const formProperties = formConfig.map(p => p.key?.name);
      console.log("Form properties:", formProperties);
      debug("Form properties:", formProperties);

      const requiredFormProperties = ['steps'];
      const allowedFormProperties = [
        'callbackUrl',
        'options',
        'recap',
        'noStampa',
        'skipFinalRecap',
        'serverAPI',
        'formFinalRecap',
        'method',
        'url',
        'additionalParams',
        'routeExtraParams',
        'liferayUserId',
        'defaultBody',
        'title',
        'persistence',
        'callback',
        'steps',
        'stepperCallout',
        'name',
        'fields',
        undefined
      ];

      requiredFormProperties.forEach(prop => {
        if (!formProperties.includes(prop)) {
          context.report({
            node,
            message: `Form object is missing the '${prop}' property`
          });
        }
      });

      formProperties.forEach(prop => {
        if (!allowedFormProperties.includes(prop)) {
          context.report({
            node,
            message: `Form object has an invalid property '${prop}'`
          });
        }
      });

      const stepsNode = formConfig.find(property => property.key?.name === 'steps');
      if (stepsNode) {
        const stepsArray = stepsNode.value.elements;

        if (!Array.isArray(stepsArray)) {
          context.report({
            node: stepsNode,
            message: `'steps' should be an array`
          });
          return;
        }

        validateStepsArray(stepsArray, stepsNode);
      }
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
      
        // Check if the parent node is an ExportNamedDeclaration
        const isExported = node.parent && node.parent.type === 'VariableDeclarator' &&
                           node.parent.parent && node.parent.parent.type === 'VariableDeclaration' &&
                           node.parent.parent.parent && node.parent.parent.parent.type === 'ExportNamedDeclaration';
      
        if (isExported) {
          if (node.body && node.body.type === 'ObjectExpression') {
            console.log("Found object expression in arrow function:", node.body);
            debug("Found object expression in arrow function:", node.body);
            validateStepObject(node.body, node);

            
          }
        }
      },
      
     /*  FunctionDeclaration(node) {
        console.log("Checking function declaration:", node);
        debug("Checking function declaration:", node);

        const returnNode = node.body.body.find(statement => statement.type === 'ReturnStatement');
        if (returnNode && returnNode.argument.type === 'ObjectExpression') {
          console.log("Found object expression in function declaration:", returnNode.argument);
          debug("Found object expression in function declaration:", returnNode.argument);
          validateFormObject(returnNode.argument.properties, returnNode);
        }
      } */
    };
  }
};

module.exports = formSchemaValidator;
