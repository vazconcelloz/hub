import { Request, Response, NextFunction } from 'express';

// Middleware global de tratamento de erros
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[GlobalError]', err);

  // Aqui integraríamos com o Sentry no futuro
  // Sentry.captureException(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno no servidor.';

  // Não expor stack traces em produção
  const response = {
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(response);
};
