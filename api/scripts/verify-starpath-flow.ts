import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { pointsService } from '../services/points.service';
import { starPathService } from '../services/starpath.service';
import { starPathBuildingService } from '../services/starpath-building.service';
import { starPathExplorationService } from '../services/starpath-exploration.service';
import { starPathFunService } from '../services/starpath-fun.service';

const TEST_EMAIL = 'starpath-flow-test@oj.local';
const TEST_USERNAME = 'starpath_flow_test';

interface CheckResult {
  name: string;
  ok: boolean;
  expected: unknown;
  actual: unknown;
  note?: string;
}

interface VerifiedPetAbility {
  type: string;
  effectiveValue: number;
}

interface VerifiedPet {
  levelTitle: string;
  abilities: VerifiedPetAbility[];
}

const checks: CheckResult[] = [];

function record(name: string, actual: unknown, expected: unknown, note?: string) {
  checks.push({ name, actual, expected, ok: JSON.stringify(actual) === JSON.stringify(expected), note });
}

function expectClose(name: string, actual: number, expected: number, note?: string) {
  checks.push({ name, actual, expected, ok: actual === expected, note });
}

async function cleanupExisting() {
  const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
  if (!user) return;

  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
  await prisma.pointLog.deleteMany({ where: { userId: user.id } });
  await prisma.submission.deleteMany({ where: { userId: user.id } });
  await prisma.planetBuilding.deleteMany({ where: { userId: user.id } });
  await prisma.userPlanetProgress.deleteMany({ where: { userId: user.id } });
  await prisma.userDailyChest.deleteMany({ where: { userId: user.id } });
  await prisma.userSpacePet.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
}

async function createFixture() {
  await cleanupExisting();

  const password = await bcrypt.hash('test123456', 10);
  const user = await prisma.user.create({
    data: {
      username: TEST_USERNAME,
      email: TEST_EMAIL,
      password,
      role: 'STUDENT',
      points: 650,
      level: 4,
      isActive: true,
    },
  });

  const region = await prisma.starRegion.create({
    data: {
      name: '测试星域-奖励闭环',
      description: '用于验证编程星途积分倍率、建设和探险奖励',
      icon: '🧪',
      color: '#8b5cf6',
      order: 999,
    },
  });

  const problem = await prisma.problem.create({
    data: {
      title: '测试选择题-倍率验证',
      description: '选择正确答案 A',
      type: 'CHOICE',
      difficulty: 'HARD',
      choices: JSON.stringify(['A', 'B', 'C', 'D']),
      correctAnswer: 'A',
      tags: JSON.stringify(['debug', 'starpath']),
    },
  });

  const planet = await prisma.starPlanet.create({
    data: {
      regionId: region.id,
      name: '倍率验证星球',
      description: '用于验证积分倍率',
      difficulty: 'HARD',
      tags: JSON.stringify(['debug']),
      problemIds: JSON.stringify([problem.id]),
      order: 999,
    },
  });

  await prisma.userSpacePet.create({
    data: {
      userId: user.id,
      petType: 'star_cat',
      petName: '验证星喵',
      mood: 100,
      level: 5,
      exp: 0,
    },
  });

  return { user, region, problem, planet };
}

async function main() {
  const fixture = await createFixture();
  const userId = fixture.user.id;

  const initial = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  record('初始测试账号等级', initial.level, 4, '650 积分应对应铂金 Lv4');
  record('初始测试账号积分', initial.points, 650);

  const petBefore = await starPathFunService.getOrCreatePet(userId) as VerifiedPet;
  const pointsAbility = petBefore.abilities.find(ability => ability.type === 'points_bonus');
  record('宠物阶段', petBefore.levelTitle, '成长');
  expectClose('星喵成长阶段做题加成', pointsAbility?.effectiveValue ?? 0, 7.5);

  await prisma.userPlanetProgress.create({
    data: { userId, planetId: fixture.planet.id, status: 'MASTERED', score: 10, attempts: 1, lastVisitAt: new Date() },
  });

  const buildArena = await starPathBuildingService.buildOnPlanet(fixture.planet.id, userId, 'ARENA');
  const afterBuild = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  record('竞技场 Lv1 建造费用折扣后扣费', initial.points - afterBuild.points, 42, '铂金建筑折扣 15%，50 -> 42');

  await starPathBuildingService.upgradeBuilding(fixture.planet.id, userId, 'ARENA');
  const afterUpgrade2 = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  record('竞技场 Lv2 升级费用折扣后扣费', afterBuild.points - afterUpgrade2.points, 127, '铂金建筑折扣 15%，150 -> 127');

  await starPathBuildingService.upgradeBuilding(fixture.planet.id, userId, 'ARENA');
  const afterUpgrade3 = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  record('竞技场 Lv3 升级费用折扣后扣费', afterUpgrade2.points - afterUpgrade3.points, 255, '铂金建筑折扣 15%，300 -> 255');

  const arena = await prisma.planetBuilding.findUniqueOrThrow({
    where: { userId_planetId_buildingType: { userId, planetId: fixture.planet.id, buildingType: 'ARENA' } },
  });
  record('竞技场升级到 Lv3', arena.level, 3);

  const multiplier = await pointsService.getEffectivePointsMultiplier(userId);
  expectClose('综合积分倍率', Math.round(multiplier * 100) / 100, 1.5, 'Lv4 1.3 + 竞技场 Lv3 0.2 = 1.5');

  await prisma.submission.deleteMany({ where: { userId, problemId: fixture.problem.id } });
  await prisma.userPlanetProgress.update({
    where: { userId_planetId: { userId, planetId: fixture.planet.id } },
    data: { status: 'EXPLORING', score: 0, attempts: 0 },
  });

  const beforeAnswer = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const answerResult = await starPathService.submitPlanetChallenge(fixture.planet.id, userId, {
    problemId: fixture.problem.id,
    answer: 'A',
  });
  const afterAnswer = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const expectedAnswerPoints = Math.round(20 * 1.5 * 1.075);
  record('答题返回积分', answerResult.pointsEarned, expectedAnswerPoints, 'HARD 20 × 综合倍率1.5 × 星喵1.075');
  record('答题实际入账积分', afterAnswer.points - beforeAnswer.points, expectedAnswerPoints);
  record('答题后等级保持成长段位', afterAnswer.level, 4, '等级是累计成长阶段，消费积分不应导致降级');

  await prisma.userPlanetProgress.update({
    where: { userId_planetId: { userId, planetId: fixture.planet.id } },
    data: { status: 'MASTERED', score: 10 },
  });

  await starPathExplorationService.startExploration(userId, 'asteroid_belt');
  const startLog = await prisma.pointLog.findFirstOrThrow({
    where: { userId, reason: 'EXPLORATION_START' },
    orderBy: { createdAt: 'desc' },
  });
  const details = JSON.parse(startLog.details || '{}');
  const oldStart = new Date(Date.now() - 31 * 60 * 1000).toISOString();
  await prisma.pointLog.update({
    where: { id: startLog.id },
    data: { details: JSON.stringify({ ...details, startTime: oldStart }) },
  });

  const status = await starPathExplorationService.getExplorationStatus(userId);
  record('探险完成后状态', status.state, 'claimable');

  const beforeClaim = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const reward = await starPathExplorationService.claimExplorationReward(userId);
  const afterClaim = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const expectedExplorationTotal = reward.basePoints + reward.masteryBonus + reward.levelBonus + reward.bonusPoints;
  record('探险奖励分项求和', reward.totalPoints, expectedExplorationTotal);
  record('探险实际入账积分', afterClaim.points - beforeClaim.points, reward.totalPoints);
  record('探险后不可重复领取状态', (await starPathExplorationService.getExplorationStatus(userId)).state, 'idle');
  record('探险后等级保持成长段位', afterClaim.level, 4, '探险奖励不应降低既有等级');

  const logs = await prisma.pointLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { reason: true, delta: true, details: true, createdAt: true },
  });

  const failed = checks.filter(c => !c.ok);
  const report = {
    account: { username: TEST_USERNAME, email: TEST_EMAIL, password: 'test123456', userId },
    fixture: { regionId: fixture.region.id, planetId: fixture.planet.id, problemId: fixture.problem.id, arenaId: buildArena.id },
    checks,
    failedCount: failed.length,
    pointLogs: logs,
    finalUser: await prisma.user.findUnique({ where: { id: userId }, select: { points: true, level: true } }),
  };

  process.stdout.write(JSON.stringify(report, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
