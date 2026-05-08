"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./swagger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const auth_1 = __importDefault(require("./routes/auth"));
const db_1 = __importDefault(require("./routes/db"));
const segment_1 = __importDefault(require("./routes/segment"));
const storage_1 = __importDefault(require("./routes/storage"));
const functions_1 = __importDefault(require("./routes/functions"));
const users_1 = __importDefault(require("./routes/users"));
const setores_1 = __importDefault(require("./routes/setores"));
const errorHandler_1 = require("./middlewares/errorHandler");
// Serve uploads folder statically
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/db', db_1.default);
app.use('/api/segment', segment_1.default);
app.use('/api/storage', storage_1.default);
app.use('/api/functions', functions_1.default);
app.use('/api/users', users_1.default);
app.use('/api/setores', setores_1.default);
// Serve the React frontend static files
app.use(express_1.default.static(path_1.default.join(__dirname, '../../dist'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));
// Swagger Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// React Router fallback
app.get('*all', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint não encontrado' });
    }
    res.sendFile(path_1.default.join(__dirname, '../../dist/index.html'));
});
// Importante: O Error Handler DEVE ser o último middleware a ser usado!
app.use(errorHandler_1.errorHandler);
// Inicialização
app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});
