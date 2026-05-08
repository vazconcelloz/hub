"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const bucket = req.params.bucket;
        const destPath = path_1.default.join(__dirname, '../../uploads', bucket);
        // Create bucket directory if it doesn't exist
        if (!fs_1.default.existsSync(destPath)) {
            fs_1.default.mkdirSync(destPath, { recursive: true });
        }
        cb(null, destPath);
    },
    filename: (req, file, cb) => {
        // Supabase passes path like 'uuid-filename.jpg'. 
        // We get this from req.body.path or just use originalname
        const filePath = req.body.path || file.originalname;
        // We only want the filename part if it contains subdirectories
        const fileName = path_1.default.basename(filePath);
        // Check if path has directories that need to be created inside bucket
        const subDir = path_1.default.dirname(filePath);
        if (subDir && subDir !== '.') {
            const bucket = req.params.bucket;
            const fullDir = path_1.default.join(__dirname, '../../uploads', bucket, subDir);
            if (!fs_1.default.existsSync(fullDir)) {
                fs_1.default.mkdirSync(fullDir, { recursive: true });
            }
            cb(null, path_1.default.join(subDir, fileName));
        }
        else {
            cb(null, fileName);
        }
    }
});
const upload = (0, multer_1.default)({ storage });
router.post('/upload/:bucket', authMiddleware_1.authMiddleware, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        const bucket = req.params.bucket;
        const filePath = req.body.path || req.file.originalname;
        // Return the path relative to the bucket as Supabase does
        return res.json({
            message: 'Upload concluído com sucesso',
            path: filePath,
            fullUrl: `/uploads/${bucket}/${filePath}`
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ error: 'Erro interno ao processar upload.' });
    }
});
exports.default = router;
