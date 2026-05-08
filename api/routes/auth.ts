import { Router, type Request } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', async (req: Request, res: any): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      res.status(400).json({ success: false, error: { message: '请填写所有必填字段' } });
      return;
    }

    const result = await authService.register(username, email, password);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/login', async (req: Request, res: any): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ success: false, error: { message: '请填写用户名和密码' } });
      return;
    }

    const result = await authService.login(username, password);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(401).json({ success: false, error: { message: error.message } });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const user = await authService.getUserById((req as any).user.userId);
    if (!user) {
      res.status(404).json({ success: false, error: { message: '用户不存在' } });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/logout', authMiddleware, async (req: Request, res: any): Promise<void> => {
  res.json({ success: true, data: { message: '登出成功' } });
});

export default router;
