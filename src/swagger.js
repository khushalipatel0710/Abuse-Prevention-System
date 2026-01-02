const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Rate Limiting & Abuse Prevention System',
      version: '1.0.0',
      description: 'Production-ready API Rate Limiting and Abuse Prevention System with JWT authentication',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'].filter(path => {
    try {
      require('fs').accessSync(path.replace('*.js', ''));
      return true;
    } catch {
      return false;
    }
  }),
};

let swaggerSpec;

try {
  swaggerSpec = swaggerJsdoc(options);
} catch (error) {
  console.error('Failed to generate Swagger spec:', error.message);
  swaggerSpec = null;
}

module.exports = { swaggerUi, swaggerSpec };
