import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
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
import dailyRoutes from './routes/daily.js';
import dailyChallengeRoutes from './routes/daily-challenge.js';

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

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/solutions', solutionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/knowledge-tree', knowledgeTreeRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/daily-challenge', dailyChallengeRoutes);

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
