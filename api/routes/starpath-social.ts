import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { starPathSocialService } from '../services/starpath-social.service';
import prisma from '../lib/prisma';

const router = Router();

router.get('/users/search', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const query = (req.query.query as string) || '';
    if (!query || query.length < 1) {
      res.json({ success: true, data: [] });
      return;
    }
    const users = await prisma.user.findMany({
      where: {
        username: { contains: query },
        isActive: true,
      },
      select: { id: true, username: true, avatar: true, points: true },
      take: 10,
    });
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/leaderboard/planet/:planetId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await starPathSocialService.getPlanetLeaderboard(req.params.planetId, limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/leaderboard/region/:regionId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await starPathSocialService.getRegionLeaderboard(req.params.regionId, limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/leaderboard/global', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await starPathSocialService.getGlobalLeaderboard(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/friends/request', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathSocialService.sendFriendRequest(userId, req.body.friendId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/friends/accept', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathSocialService.acceptFriendRequest(userId, req.body.friendId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/friends', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathSocialService.getFriends(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/friends/pending', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathSocialService.getPendingRequests(userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/friends/:friendId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    await starPathSocialService.removeFriend(userId, req.params.friendId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/friends/:friendId/progress', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathSocialService.getFriendStarProgress(userId, req.params.friendId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/team-challenges', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await starPathSocialService.createTeamChallenge(req.body, userId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.get('/team-challenges', authMiddleware, async (_req: Request, res: any): Promise<void> => {
  try {
    const data = await starPathSocialService.getActiveTeamChallenges();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/team-challenges/:challengeId/join', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await starPathSocialService.joinTeamChallenge(
      req.params.challengeId,
      req.body.teamId || null,
      userId,
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
