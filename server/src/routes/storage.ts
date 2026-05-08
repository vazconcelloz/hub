import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket as string;
    const destPath = path.join(__dirname, '../../uploads', bucket);
    
    // Create bucket directory if it doesn't exist
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Supabase passes path like 'uuid-filename.jpg'. 
    // We get this from req.body.path or just use originalname
    const filePath = req.body.path || file.originalname;
    // We only want the filename part if it contains subdirectories
    const fileName = path.basename(filePath);
    
    // Check if path has directories that need to be created inside bucket
    const subDir = path.dirname(filePath);
    if (subDir && subDir !== '.') {
      const bucket = req.params.bucket as string;
      const fullDir = path.join(__dirname, '../../uploads', bucket, subDir);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
      cb(null, path.join(subDir, fileName));
    } else {
      cb(null, fileName);
    }
  }
});

const upload = multer({ storage });

router.post('/upload/:bucket', authMiddleware, upload.single('file'), (req, res) => {
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
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Erro interno ao processar upload.' });
  }
});

export default router;
