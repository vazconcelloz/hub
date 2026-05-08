"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
// Middleware global de tratamento de erros
const errorHandler = (err, req, res, next) => {
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
exports.errorHandler = errorHandler;
