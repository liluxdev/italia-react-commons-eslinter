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
    const allowedFormProperties = [
      'callbackUrl:string',
      'options:object',
      'options.recap:boolean',
      'options.noStampa:boolean',
      'options.skipFinalRecap:boolean',
      'serverAPI:object',
      'serverAPI.formFinalRecap:string',
      'serverAPI.method:string',
      'serverAPI.url:string',
      'serverAPI.additionalParams:object',
      'serverAPI.additionalParams.routeExtraParams:array',
      'serverAPI.additionalParams.liferayUserId:string',
      'serverAPI.defaultBody:object',
      'title:string',
      'persistence:string["void","localStorage","sessionStorage"]',
      'callback:function,arrowFunction',
      'steps:array'
    ];

    const allowedStepProperties = [
      'id:string',
      'name:string',
      'stepperCallout:boolean',
      'stepperCalloutOnlyOnHover:boolean',
      'stepperCalloutHideOthers:boolean',
      'stepperCalloutHideOthersOnHover:boolean',
      'required:boolean',
      'message:string',
      'scrollOnTop:boolean',
      'fields:array',
      'preflights:array',
      'visibleIf:object,function,arrowFunction'
    ];

    const allowedFieldProperties = [
      'id:string',
      'serverId:string',
      'type:string,arrowFunction',
      'label:string',
      'placeholder:string',
      'required:boolean',
      'typeValidation:string',
      'typeValidationMsg:string',
      'min:number',
      'max:number',
      'inlineStyle:object',
      'className:string',
      'gridTemplateColumns:string',
      'rowGap:string',
      'columnGap:string',
      'defaultValue:any',
      'prefilled:boolean',
      'disabled:boolean',
      'shortLabel:string',
      'dynamicLabel:boolean',
      'label2Class:string',
      'label2:string',
      'onChange:function,arrowFunction',
      'options:array',
      'wrapInCard:boolean',
      'cardClassName:string',
      'fields:array'
    ];

    const propertyTypes = {
      'string': ['Literal'],
      'boolean': ['Literal'],
      'number': ['Literal'],
      'array': ['ArrayExpression'],
      'object': ['ObjectExpression'],
      'function': ['FunctionExpression'],
      'arrowFunction': ['ArrowFunctionExpression'],
      'any': ['Literal', 'ArrayExpression', 'ObjectExpression', 'FunctionExpression', 'ArrowFunctionExpression']
    };

    function validatePropertyType(propNameOrPath, property, expectedTypes, validValues = []) {
      const propertyType = property.value.type;
      const validTypes = expectedTypes.split(',').map(type => propertyTypes[type.trim()]).flat();
      const isValidType = validTypes.includes(propertyType);

      if (!isValidType) {
        context.report({
          node,
          message: `Field object property '${propNameOrPath}' has an invalid type, current type is ${propertyType} allowed types are ${validTypes}`
        });
        return false;
      }

      if (validValues.length > 0 && propertyType === 'Literal' && !validValues.includes(property.value.value)) {
        context.report({
          node,
          message: `Field object property '${propNameOrPath}' has an invalid value, current value is ${property.value.value} allowed values are ${validValues}`
        });
        return false;
      }

      return true;
    }

    function validateNestedProperties(node, properties, path) {
      const propertyPath = path.join('.');
      const allowedProperty = allowedFormProperties.find(prop => prop.startsWith(propertyPath));
      if (!allowedProperty) {
        context.report({
          node,
          message: `Form object has an invalid nested property '${propertyPath}'`
        });
        return false;
      }

      const [_, expectedTypeWithValues] = allowedProperty.split(':');
      const [expectedType, values] = expectedTypeWithValues.split('[');
      const validValues = values ? values.replace(']', '').split(',') : [];

      if (!validatePropertyType(propertyPath, node, expectedType, validValues)) {
        return false;
      }

      if (expectedType === 'object') {
        node?.properties?.forEach(subNode => {
          const subPath = [...path, subNode.key.name];
          validateNestedProperties(subNode, properties, subPath);
        });
      }

      return true;
    }

    function validateFieldObject(fieldNode, node) {
      const fieldProperties = fieldNode.properties.map(p => p.key.name);
      console.log("Field properties:", fieldProperties);
      debug("Field properties:", fieldProperties);

      fieldProperties.forEach(prop => {
        const [propName, propTypes] = allowedFieldProperties.find(p => p.startsWith(prop))?.split(':') || [];
        if (!propName) {
          context.report({
            node,
            message: `Field object has an invalid property '${prop}'`
          });
        } else if (propTypes && !validatePropertyType(propName,fieldNode.properties.find(p => p.key.name === propName), propTypes)) {
          //report done at function level
        }
      });

      const nestedFieldsNode = fieldNode.properties.find(property => property.key.name === 'fields');
      if (nestedFieldsNode) {
        if (nestedFieldsNode.value.type !== 'ArrayExpression') {
          context.report({
            node: nestedFieldsNode,
            message: `'fields' should be an array`
          });
        } else {
          nestedFieldsNode.value.elements.forEach(element => validateFieldObject(element, nestedFieldsNode));
        }
      }
    }

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

      stepProperties.forEach(prop => {
        const [propName, propTypes] = allowedStepProperties.find(p => p.startsWith(prop))?.split(':') || [];
        if (!propName) {
          context.report({
            node,
            message: `Step object has an invalid property '${prop}' allowed properties are ${allowedStepProperties.join(', ')}`
          });
        } else if (propTypes && !validatePropertyType(propName, stepNode.properties.find(p => p.key.name === propName), propTypes)) {
          context.report({
            node,
            message: `Step object property '${propName}' has an invalid type , current type is ${stepNode.properties.find(p => p.key.name === propName)?.value?.type} allowed types are ${propTypes.split(',').join(', ')}`
          });
        }
      });

      const fieldsNode = stepNode.properties.find(property => property.key.name === 'fields');
      if (fieldsNode) {
        if (fieldsNode.value.type !== 'ArrayExpression') {
          context.report({
            node: fieldsNode,
            message: `'fields' should be an array`
          });
        } else {
          fieldsNode.value.elements.forEach(element => validateFieldObject(element, fieldsNode));
        }
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

      requiredFormProperties.forEach(prop => {
        if (!formProperties.includes(prop)) {
          context.report({
            node,
            message: `Form object is missing the '${prop}' property`
          });
        }
      });

      formProperties.forEach(prop => {
        const propPath = [prop];
        const propertyNode = formConfig.find(p => p.key.name === prop);
        validateNestedProperties(propertyNode, formConfig, propPath);
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
          if (node.body && node.body.type === 'ArrayExpression') {
            console.log("Found array expression in arrow function:", node.body);
            debug("Found array expression in arrow function:", node.body);
            node.body.elements.forEach(elm => validateStepObject(elm, node));
          }
        }
      }
    };
  }
};

module.exports = formSchemaValidator;
