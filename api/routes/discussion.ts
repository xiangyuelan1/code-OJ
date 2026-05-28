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

/** 获取热门讨论（公开） */
router.get('/hot', async (req: Request, res: any): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const data = await discussionService.getHotDiscussions(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/** 获取所有标签（公开） */
router.get('/tags', async (_req: Request, res: any): Promise<void> => {
  try {
    const data = await discussionService.getDiscussionTags();
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

/** 置顶/取消置顶（需登录） */
router.put('/:id/pin', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const pinned = req.body.pinned === true;
    const data = await discussionService.togglePinDiscussion(req.params.id, pinned);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 编辑回复（需登录，仅作者）—— 必须在 /:id 之前注册 */
router.put('/reply/:replyId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await discussionService.updateReply(req.params.replyId, userId, req.body.content);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/** 编辑讨论（需登录，仅作者） */
router.put('/:id', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const data = await discussionService.updateDiscussion(req.params.id, userId, {
      title: req.body.title,
      content: req.body.content,
      tags: req.body.tags,
    });
    res.json({ success: true, data });
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
