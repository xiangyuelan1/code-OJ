import { Router, type Request } from 'express';
import { matchService } from '../services/match.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

router.get('/admin/all', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        include: {
          participants: {
            include: {
              user: { select: { username: true, email: true, points: true } }
            }
          },
          problems: {
            include: {
              problem: { select: { title: true, type: true, difficulty: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.match.count()
    ]);

    res.json({ success: true, data: { matches, total, page, pageSize } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { type, problemIds } = req.body;
    const match = await matchService.createMatch(type, problemIds || []);
    res.status(201).json({ success: true, data: match });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/history/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await matchService.getMatchHistory(userId, limit);
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/leaderboard/:type', async (req: Request, res: any): Promise<void> => {
  try {
    const type = req.params.type || '1V1_RANKED';
    const limit = parseInt(req.query.limit as string) || 20;
    const leaderboard = await matchService.getLeaderboard(type, limit);
    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/find-opponent', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { points: true } });
    const opponent = await matchService.findOpponent(userId, user?.points || 0);
    res.json({ success: true, data: opponent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const match = await matchService.getMatch(req.params.id);
    if (!match) {
      res.status(404).json({ success: false, error: { message: '比赛不存在' } });
      return;
    }
    res.json({ success: true, data: match });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/join', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const participant = await matchService.joinMatch(req.params.id, userId);
    res.json({ success: true, data: participant });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/answer', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const { problemIndex, answer, time } = req.body;
    const result = await matchService.submitAnswer(req.params.id, userId, problemIndex, answer, time);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/end', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const result = await matchService.endMatch(req.params.id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
