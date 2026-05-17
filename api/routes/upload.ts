import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'images');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}`));
    }
  }
});

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.txt', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}，仅支持 txt 和 json`));
    }
  }
});

router.post(
  '/',
  authMiddleware,
  roleMiddleware('ADMIN', 'TEACHER'),
  upload.single('image'),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: '请选择图片文件' } });
      return;
    }

    const url = `/api/uploads/images/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  }
);

router.post(
  '/file',
  authMiddleware,
  roleMiddleware('ADMIN', 'TEACHER'),
  fileUpload.single('file'),
  (req: Request, res: Response): void => {
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: '请选择文件' } });
      return;
    }

    const content = req.file.buffer.toString('utf-8');
    const ext = path.extname(req.file.originalname).toLowerCase();
    res.json({
      success: true,
      data: {
        content,
        filename: req.file.originalname,
        size: req.file.size,
        fileType: ext.replace('.', '')
      }
    });
  }
);

router.post(
  '/files',
  authMiddleware,
  roleMiddleware('ADMIN', 'TEACHER'),
  fileUpload.array('files', 20),
  (req: Request, res: Response): void => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: { message: '请选择文件' } });
      return;
    }

    const results = files.map(file => {
      const content = file.buffer.toString('utf-8');
      const ext = path.extname(file.originalname).toLowerCase();
      return {
        content,
        filename: file.originalname,
        size: file.size,
        fileType: ext.replace('.', '')
      };
    });
    res.json({ success: true, data: results });
  }
);

export default router;
