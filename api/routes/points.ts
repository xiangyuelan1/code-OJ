import { Router, type Request } from 'express';
import { pointsService } from '../services/points.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const pointsData = await pointsService.getUserPoints(userId);
    const rankData = await pointsService.getUserRank(userId);

    res.json({
      success: true,
      data: {
        ...pointsData,
        ...rankData
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/levels', async (_req: Request, res: any): Promise<void> => {
  try {
    const levels = pointsService.getAllLevels();
    res.json({ success: true, data: levels });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/leaderboard', async (req: Request, res: any): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leaderboard = await pointsService.getLeaderboard(limit);
    res.json({ success: true, data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/logs', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const logs = await pointsService.getPointLogs(userId, limit);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/award/problem', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user.userId;
    const { problemId, difficulty, isFirstAC } = req.body;
    
    const result = await pointsService.awardPointsForProblem(
      userId,
      problemId,
      difficulty,
      isFirstAC
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/award/match', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user.userId;
    const { matchId, isWin, isRanked } = req.body;
    
    const result = await pointsService.awardMatchPoints(
      userId,
      matchId,
      isWin,
      isRanked
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/award/exam', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = req.body.userId || (req as any).user.userId;
    const { examId, score, totalScore } = req.body;
    
    const result = await pointsService.awardExamPoints(
      userId,
      examId,
      score,
      totalScore
    );
    
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
