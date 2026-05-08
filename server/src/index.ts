import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

import authRouter from './routes/auth';
import dbRouter from './routes/db';
import segmentRouter from './routes/segment';
import storageRouter from './routes/storage';
import functionsRouter from './routes/functions';
import usersRouter from './routes/users';
import setoresRouter from './routes/setores';
import { errorHandler } from './middlewares/errorHandler';

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/db', dbRouter);
app.use('/api/segment', segmentRouter);
app.use('/api/storage', storageRouter);
app.use('/api/functions', functionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/setores', setoresRouter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Importante: O Error Handler DEVE ser o último middleware a ser usado!
app.use(errorHandler);

// Inicialização
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
