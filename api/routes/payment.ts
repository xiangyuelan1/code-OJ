import { Router, type Request } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import prisma from '../lib/prisma';
import { accessService } from '../services/access.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

const VALID_METHODS = ['QR_CODE', 'ALIPAY', 'WECHAT', 'MANUAL'];

const METHOD_LABELS: Record<string, string> = {
  QR_CODE: '扫码支付',
  ALIPAY: '支付宝',
  WECHAT: '微信支付',
  MANUAL: '人工转账',
};

const METHOD_ICONS: Record<string, string> = {
  QR_CODE: 'qr',
  ALIPAY: 'alipay',
  WECHAT: 'wechat',
  MANUAL: 'manual',
};

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'payments');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const paymentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.png';
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  },
});

/**
 * 获取可用的支付方式列表（登录用户可用）
 * 默认展示二维码方式，除非已配置在线支付渠道
 */
router.get('/methods', authMiddleware, async (_req: Request, res: any): Promise<void> => {
  try {
    const methods: Array<{
      method: string;
      label: string;
      icon: string;
      qrCodeUrl: string | null;
      channelEnabled: boolean;
      channelType: 'qr_code' | 'online';
    }> = [];

    for (const m of VALID_METHODS) {
      const qrCodeUrl = await accessService.getConfig(`qr_code_${m.toLowerCase()}`);
      const channelConfig = await accessService.getConfig(`payment_channel_${m.toLowerCase()}`);
      const channelEnabled = channelConfig === 'true' || channelConfig === '1';

      const hasQrCode = !!qrCodeUrl;
      const isOnlineChannel = m === 'ALIPAY' || m === 'WECHAT';

      if (isOnlineChannel && channelEnabled) {
        methods.push({
          method: m,
          label: METHOD_LABELS[m],
          icon: METHOD_ICONS[m],
          qrCodeUrl: null,
          channelEnabled: true,
          channelType: 'online',
        });
      } else if (hasQrCode) {
        methods.push({
          method: m,
          label: METHOD_LABELS[m],
          icon: METHOD_ICONS[m],
          qrCodeUrl,
          channelEnabled: false,
          channelType: 'qr_code',
        });
      }
    }

    if (methods.length === 0) {
      methods.push({
        method: 'QR_CODE',
        label: METHOD_LABELS['QR_CODE'],
        icon: METHOD_ICONS['QR_CODE'],
        qrCodeUrl: null,
        channelEnabled: false,
        channelType: 'qr_code',
      });
    }

    res.json({ success: true, data: methods });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 提交支付申请
 * 支持 JSON body（{ amount, method, proof }）和 FormData 文件上传
 * 当使用 FormData 上传文件时，method 默认为 QR_CODE，amount 默认从配置读取
 */
router.post('/', authMiddleware, paymentUpload.single('proof'), async (req: Request, res: any): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const method = req.body.method || 'QR_CODE';

    if (!VALID_METHODS.includes(method)) {
      res.status(400).json({ success: false, error: { message: `支付方式必须为: ${VALID_METHODS.join(', ')}` } });
      return;
    }

    let amount = req.body.amount ? parseFloat(req.body.amount) : 0;
    if (!amount || amount <= 0) {
      const configuredAmount = await accessService.getConfig('payment_amount');
      amount = configuredAmount ? parseFloat(configuredAmount) : 0;
    }

    let proof = req.body.proof ?? null;
    if (req.file) {
      proof = `/api/uploads/payments/${req.file.filename}`;
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount,
        method,
        proof,
        status: 'PENDING',
      },
    });

    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取所有支付记录（仅管理员）
 */
router.get('/', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        user: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 审批通过支付（仅管理员）
 * 审批通过后更新用户的 accessType 为 PAID，并设置 accessExpiresAt
 */
router.patch('/:id/approve', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const reviewerId = (req as any).user.userId;
    const paymentId = req.params.id;

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      res.status(404).json({ success: false, error: { message: '支付记录不存在' } });
      return;
    }

    if (payment.status !== 'PENDING') {
      res.status(400).json({ success: false, error: { message: '该支付记录已被处理' } });
      return;
    }

    const trialDaysStr = await accessService.getConfig('paid_access_days');
    const paidDays = trialDaysStr ? parseInt(trialDaysStr, 10) : 365;
    const accessExpiresAt = new Date();
    accessExpiresAt.setDate(accessExpiresAt.getDate() + paidDays);

    const updated = await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: payment.userId },
        data: {
          accessType: 'PAID',
          accessExpiresAt,
          paymentId,
        },
      }),
    ]);

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 拒绝支付（仅管理员）
 */
router.patch('/:id/reject', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const reviewerId = (req as any).user.userId;
    const paymentId = req.params.id;

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      res.status(404).json({ success: false, error: { message: '支付记录不存在' } });
      return;
    }

    if (payment.status !== 'PENDING') {
      res.status(400).json({ success: false, error: { message: '该支付记录已被处理' } });
      return;
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 上传/设置支付二维码（仅管理员）
 * 支持文件上传：上传二维码图片并保存 URL 到 SystemConfig
 * 也支持 JSON body：直接设置 qrCodeUrl
 */
router.post('/qr-code', authMiddleware, roleMiddleware('ADMIN'), paymentUpload.single('qrCode'), async (req: Request, res: any): Promise<void> => {
  try {
    const method = req.body.method || 'QR_CODE';

    if (!VALID_METHODS.includes(method)) {
      res.status(400).json({ success: false, error: { message: `支付方式必须为: ${VALID_METHODS.join(', ')}` } });
      return;
    }

    let qrCodeUrl: string | null = req.body.qrCodeUrl ?? null;
    if (req.file) {
      qrCodeUrl = `/api/uploads/payments/${req.file.filename}`;
    }

    if (!qrCodeUrl) {
      res.status(400).json({ success: false, error: { message: '请上传二维码图片或提供二维码 URL' } });
      return;
    }

    const config = await accessService.setConfig(`qr_code_${method.toLowerCase()}`, qrCodeUrl);
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 删除支付方式二维码（仅管理员）
 */
router.delete('/qr-code/:method', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const method = req.params.method.toUpperCase();
    if (!VALID_METHODS.includes(method)) {
      res.status(400).json({ success: false, error: { message: `支付方式必须为: ${VALID_METHODS.join(', ')}` } });
      return;
    }
    await accessService.setConfig(`qr_code_${method.toLowerCase()}`, '');
    res.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 配置支付渠道（仅管理员）
 * 启用/禁用在线支付渠道（如支付宝、微信支付API）
 */
router.put('/channel/:method', authMiddleware, roleMiddleware('ADMIN'), async (req: Request, res: any): Promise<void> => {
  try {
    const method = req.params.method.toUpperCase();
    if (!VALID_METHODS.includes(method)) {
      res.status(400).json({ success: false, error: { message: `支付方式必须为: ${VALID_METHODS.join(', ')}` } });
      return;
    }
    const { enabled, config } = req.body;
    if (enabled === undefined) {
      res.status(400).json({ success: false, error: { message: 'enabled 为必填项' } });
      return;
    }
    await accessService.setConfig(`payment_channel_${method.toLowerCase()}`, enabled ? 'true' : 'false');
    if (config && typeof config === 'object') {
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== null) {
          await accessService.setConfig(`payment_channel_${method.toLowerCase()}_${key}`, String(value));
        }
      }
    }
    res.json({ success: true, data: { method, enabled } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 获取所有支付方式配置（仅管理员）
 */
router.get('/config', authMiddleware, roleMiddleware('ADMIN'), async (_req: Request, res: any): Promise<void> => {
  try {
    const allConfigs = await accessService.getAllConfigs();
    const configMap: Record<string, string> = {};
    for (const c of allConfigs) {
      configMap[c.key] = c.value;
    }
    const methodsConfig = VALID_METHODS.map(m => ({
      method: m,
      label: METHOD_LABELS[m],
      icon: METHOD_ICONS[m],
      qrCodeUrl: configMap[`qr_code_${m.toLowerCase()}`] || null,
      channelEnabled: configMap[`payment_channel_${m.toLowerCase()}`] === 'true',
    }));
    res.json({ success: true, data: methodsConfig });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
