import { Router, type Request } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { discussionService } from '../services/discussion.service';

const router = Router();

router.get('/', async (req: Request, res: any): Promise<void> => {
  try {
    const data = await discussionService.getDiscussions({
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      type: req.query.type as string,
      problemId: req.query.problemId as string,
      tag: req.query.tag as string,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', async (req: Request, res: any): Promise<void> => {
  try {
    const discussion = await discussionService.getDiscussionById(req.params.id);
    if (!discussion) {
      res.status(404).json({ success: false, error: { message: '讨论不存在' } });
      return;
    }
    res.json({ success: true, data: discussion });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const discussion = await discussionService.createDiscussion({
      ...req.body,
      authorId: userId,
    });
    res.status(201).json({ success: true, data: discussion });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/replies', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const reply = await discussionService.createReply({
      discussionId: req.params.id,
      content: req.body.content,
      authorId: userId,
    });
    res.status(201).json({ success: true, data: reply });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.post('/:id/vote', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const result = await discussionService.vote(userId, req.params.id, req.body.isUpvote !== false);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const result = await discussionService.deleteDiscussion(req.params.id, userId, userRole);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
