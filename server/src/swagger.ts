import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Benefit Broker API',
      version: '1.0.0',
      description: 'Documentação da API do sistema',
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Servidor Local',
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
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Arquivos a serem escaneados por comentários Swagger
  apis: ['./src/routes/*.ts'], 
};

export const swaggerSpec = swaggerJSDoc(options);
