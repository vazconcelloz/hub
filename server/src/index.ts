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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import authRouter from './routes/auth';
import dbRouter from './routes/db';
import segmentRouter from './routes/segment';
import storageRouter from './routes/storage';
import functionsRouter from './routes/functions';
import usersRouter from './routes/users';
import setoresRouter from './routes/setores';
import propostasRouter from './routes/propostas';
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
app.use('/api/propostas', propostasRouter);

// Serve the React frontend static files
app.use(express.static(path.join(__dirname, '../../dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// React Router fallback
app.get('*all', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Importante: O Error Handler DEVE ser o último middleware a ser usado!
app.use(errorHandler);

// Inicialização
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
});
