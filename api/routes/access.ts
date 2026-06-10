import { Router, type Request } from 'express';
import { accessService } from '../services/access.service';
import { classService } from '../services/class.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import prisma from '../lib/prisma';

const router = Router();

/**
 * 检查当前用户的访问权限状态
 */
router.get('/check', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    await accessService.startTrial(userId);
    const result = await accessService.checkAccess(userId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取所有系统配置（仅管理员）
 */
router.get('/config', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const configs = await accessService.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 更新系统配置（仅管理员）
 */
router.put('/config', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ success: false, error: { message: 'key 和 value 为必填项' } });
      return;
    }
    const config = await accessService.setConfig(key, value);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 学生申请加入班级
 */
router.post('/classes/:id/join-request', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const classId = req.params.id;
    const { message } = req.body;
    const result = await classService.requestJoinClass(classId, userId, message);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取班级的加入申请列表（仅班级创建者或管理员）
 */
router.get('/classes/:id/join-requests', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const classId = req.params.id;

    if (userRole !== 'ADMIN') {
      const isCreator = await classService.isClassCreator(classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以查看加入申请' } });
        return;
      }
    }

    const requests = await classService.getJoinRequests(classId);
    res.json({ success: true, data: requests });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 审批加入申请（仅班级创建者或管理员）
 */
router.put('/classes/join-requests/:requestId', authMiddleware, async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { requestId } = req.params;
    const { approved } = req.body;

    if (approved === undefined) {
      res.status(400).json({ success: false, error: { message: 'approved 为必填项' } });
      return;
    }

    if (userRole !== 'ADMIN') {
      const request = await (await import('../lib/prisma')).default.classJoinRequest.findUnique({
        where: { id: requestId },
        select: { classId: true },
      });
      if (!request) {
        res.status(404).json({ success: false, error: { message: '加入申请不存在' } });
        return;
      }
      const isCreator = await classService.isClassCreator(request.classId, userId);
      if (!isCreator) {
        res.status(403).json({ success: false, error: { message: '只有班级创建者或管理员可以审批加入申请' } });
        return;
      }
    }

    const result = await classService.reviewJoinRequest(requestId, userId, approved);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取知识树免费开放节点配置（仅管理员）
 */
router.get('/knowledge-tree-free-nodes', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const config = await accessService.getConfig('knowledge_tree_free_nodes');
    const nodeIds = config ? JSON.parse(config) : [];
    res.json({ success: true, data: { nodeIds, useDefault: nodeIds.length === 0 } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 设置知识树免费开放节点（仅管理员）
 */
router.put('/knowledge-tree-free-nodes', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any) => {
  try {
    const { nodeIds } = req.body;
    if (!Array.isArray(nodeIds)) {
      res.status(400).json({ success: false, error: { message: 'nodeIds 必须是数组' } });
      return;
    }
    await accessService.setConfig('knowledge_tree_free_nodes', JSON.stringify(nodeIds));
    res.json({ success: true, data: { nodeIds } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取当前用户可访问的知识树根节点
 * ADMIN/TEACHER 或有会员权限可访问全部，免费用户返回受限节点列表
 */
router.get('/accessible-knowledge-roots', authMiddleware, async (req: Request, res: any) => {
  try {
    const user = (req as any).user;

    // ADMIN/TEACHER 可访问全部
    if (user.role === 'ADMIN' || user.role === 'TEACHER') {
      res.json({ success: true, data: { allAccess: true, restrictedNodeIds: null } });
      return;
    }

    // 查询用户 accessType
    const userInfo = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { accessType: true },
    });

    if (userInfo && ['PAID', 'CLASS', 'ADMIN'].includes(userInfo.accessType)) {
      res.json({ success: true, data: { allAccess: true, restrictedNodeIds: null } });
      return;
    }

    // 免费用户：返回可访问的根节点ID列表
    const config = await accessService.getConfig('knowledge_tree_free_nodes');
    let freeNodeIds: string[] = config ? JSON.parse(config) : [];

    if (freeNodeIds.length === 0) {
      // 默认取前3个根节点
      const rootNodes = await prisma.knowledgeTree.findMany({
        where: { parentId: null },
        orderBy: { order: 'asc' },
        take: 3,
        select: { id: true },
      });
      freeNodeIds = rootNodes.map(n => n.id);
    }

    res.json({ success: true, data: { allAccess: false, restrictedNodeIds: freeNodeIds } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
