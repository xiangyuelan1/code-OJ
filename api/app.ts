import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.middleware.js';
import { getEditionConfig } from '../config/editions';
import { getEditionInfo } from './middleware/edition.middleware';
import authRoutes from './routes/auth.js';
import problemRoutes from './routes/problems.js';
import submissionRoutes from './routes/submissions.js';
import solutionRoutes from './routes/solutions.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/users.js';
import pointsRoutes from './routes/points.js';
import knowledgeTreeRoutes from './routes/knowledge-tree.js';
import examRoutes from './routes/exam.js';
import matchRoutes from './routes/match.js';
import achievementRoutes from './routes/achievement.js';
import uploadRoutes from './routes/upload.js';
import classRoutes from './routes/class.js';
import accessRoutes from './routes/access.js';
import paymentRoutes from './routes/payment.js';
import promotionRoutes from './routes/promotion.js';
import discussionRoutes from './routes/discussion.js';
import profileRoutes from './routes/profile.js';
import dailyChallengeRoutes from './routes/daily-challenge';
import starpathRoutes from './routes/starpath';
import learningAdminRoutes from './routes/learning-admin';
import featureToggleRoutes from './routes/feature-toggle';
import learningPathRoutes from './routes/learning-path';
import aiProviderRoutes from './routes/ai-provider';
import starpathStoryRoutes from './routes/starpath-story';
import starpathBuildingRoutes from './routes/starpath-building';
import starpathSocialRoutes from './routes/starpath-social';
import starpathAchievementRoutes from './routes/starpath-achievement';
import starpathFunRoutes from './routes/starpath-fun';
import starpathExplorationRoutes from './routes/starpath-exploration';
import wrongRecordRoutes from './routes/wrong-record';
import myLibraryRoutes from './routes/my-library';
import checkinRoutes from './routes/checkin';
import classStatsRoutes from './routes/class-stats';
import starpathCraftRoutes from './routes/starpath-craft';
import courseRoutes from './routes/course';
import minigameRoutes from './routes/minigame';
import companionRoutes from './routes/companion';

dotenv.config();

const app: express.Application = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/api/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- 版本信息路由 ---
app.get('/api/edition', (req: Request, res: Response) => {
  res.json({ success: true, data: getEditionInfo() });
});

// --- 路由注册（按版本条件） ---
const editionConfig = getEditionConfig();

// 核心路由：所有版本均注册
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/wrong-records', wrongRecordRoutes);
app.use('/api/my-library', myLibraryRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/features', featureToggleRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-providers', aiProviderRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/class-stats', classStatsRoutes);
app.use('/api/learning-admin', learningAdminRoutes);
app.use('/api/learning', learningPathRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/knowledge-tree', knowledgeTreeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/daily-challenge', dailyChallengeRoutes);
app.use('/api/starpath', starpathRoutes);
app.use('/api/starpath/story', starpathStoryRoutes);
app.use('/api/starpath/building', starpathBuildingRoutes);
app.use('/api/starpath/social', starpathSocialRoutes);
app.use('/api/starpath/achievement', starpathAchievementRoutes);
app.use('/api/starpath/fun', starpathFunRoutes);
app.use('/api/starpath/exploration', starpathExplorationRoutes);
app.use('/api/starpath/craft', starpathCraftRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/minigame', minigameRoutes);
app.use('/api/companion', companionRoutes);

// 仅 full 版注册：支付/推广/订单相关路由
if (editionConfig.features.payment) {
  app.use('/api/payments', paymentRoutes);
  app.use('/api/promotions', promotionRoutes);
}

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    });
  }
);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', error);
  console.error('Stack:', error.stack);
  res.status(500).json({
    success: false,
    error: { message: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined },
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  });
});

export default app;
