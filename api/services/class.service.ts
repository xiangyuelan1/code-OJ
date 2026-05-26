import prisma from '../lib/prisma';

/**
 * 计算最近 N 天的日期边界
 */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 格式化日期为 MM-DD
 */
function formatDateMMDD(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

/**
 * 生成近7天的空趋势数据
 */
function buildEmptyWeeklyTrend(): { date: string; submissions: number; accepted: number }[] {
  const trend: { date: string; submissions: number; accepted: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    trend.push({ date: formatDateMMDD(d), submissions: 0, accepted: 0 });
  }
  return trend;
}

/**
 * 根据提交记录构建近7天趋势
 */
function buildWeeklyTrend(
  submissions: { createdAt: Date; status: string; result: string | null }[],
  isAccepted: (s: { status: string; result: string | null }) => boolean,
): { date: string; submissions: number; accepted: number }[] {
  const sevenDaysAgo = daysAgo(7);

  // 初始化7天桶
  const buckets = new Map<string, { submissions: number; accepted: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.set(formatDateMMDD(d), { submissions: 0, accepted: 0 });
  }

  // 填充提交数据
  for (const s of submissions) {
    const created = new Date(s.createdAt);
    if (created < sevenDaysAgo) continue;
    const key = formatDateMMDD(created);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.submissions++;
      if (isAccepted(s)) bucket.accepted++;
    }
  }

  return Array.from(buckets.entries()).map(([date, data]) => ({ date, ...data }));
}

export class ClassService {
  /**
   * 生成6位字母数字班级码，排除易混淆字符（0/O, 1/I/l）
   */
  async generateClassCode(classId: string): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await prisma.class.findFirst({ where: { classCode: code } });
    if (existing) return this.generateClassCode(classId);
    await prisma.class.update({ where: { id: classId }, data: { classCode: code } });
    return code;
  }

  /**
   * 通过班级码加入班级，创建待审核的加入申请
   */
  async joinClassByCode(classCode: string, userId: string, message?: string) {
    const cls = await prisma.class.findFirst({ where: { classCode } });
    if (!cls) throw new Error('班级码无效');
    return await this.requestJoinClass(cls.id, userId, message);
  }

  async createClass(data: {
    name: string;
    description?: string;
    grade?: string;
    createdBy: string;
  }) {
    const cls = await prisma.class.create({
      data: {
        name: data.name,
        description: data.description,
        grade: data.grade,
        createdBy: data.createdBy,
      },
    });

    await prisma.classMember.create({
      data: {
        classId: cls.id,
        userId: data.createdBy,
        role: 'TEACHER',
      },
    });

    await this.generateClassCode(cls.id);

    return this.getClassById(cls.id);
  }

  async updateClass(id: string, data: { name?: string; description?: string; grade?: string }) {
    return await prisma.class.update({
      where: { id },
      data,
    });
  }

  /**
   * 更新班级的 AI 费用承担模式（教师承担 / 学生自付）
   */
  async updateClassAIBilling(classId: string, aiBillingMode: 'TEACHER_PAYS' | 'STUDENT_PAYS') {
    return await prisma.class.update({
      where: { id: classId },
      data: { aiBillingMode },
    });
  }

  async deleteClass(id: string) {
    return await prisma.class.delete({
      where: { id },
    });
  }

  async getClassById(id: string) {
    return await prisma.class.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, avatar: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async getClassesByUser(userId: string) {
    const memberships = await prisma.classMember.findMany({
      where: { userId },
      include: {
        class: {
          include: {
            creator: {
              select: { id: true, username: true, email: true },
            },
            _count: {
              select: { members: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.class,
      memberRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async addMember(classId: string, userId: string, role: string = 'STUDENT') {
    return await prisma.classMember.create({
      data: {
        classId,
        userId,
        role,
      },
    });
  }

  async removeMember(classId: string, userId: string) {
    return await prisma.classMember.delete({
      where: {
        classId_userId: { classId, userId },
      },
    });
  }

  async getMembers(classId: string) {
    return await prisma.classMember.findMany({
      where: { classId },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true, role: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async joinClass(classId: string, userId: string) {
    const existing = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (existing) {
      throw new Error('您已是该班级成员');
    }
    return await prisma.classMember.create({
      data: {
        classId,
        userId,
        role: 'STUDENT',
      },
    });
  }

  async leaveClass(classId: string, userId: string) {
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: { classId, userId },
      },
    });

    if (membership && membership.role === 'TEACHER') {
      throw new Error('教师不能离开自己创建的班级，请删除班级或转让权限');
    }

    return await prisma.classMember.delete({
      where: {
        classId_userId: { classId, userId },
      },
    });
  }

  async isClassCreator(classId: string, userId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { createdBy: true },
    });
    return cls?.createdBy === userId;
  }

  async isClassMember(classId: string, userId: string) {
    const membership = await prisma.classMember.findUnique({
      where: {
        classId_userId: { classId, userId },
      },
    });
    return !!membership;
  }

  /**
   * 学生申请加入班级，创建待审核的 ClassJoinRequest
   * 如果已有待审核申请则拒绝重复提交
   */
  async requestJoinClass(classId: string, userId: string, message?: string) {
    const existing = await prisma.classJoinRequest.findUnique({
      where: { classId_userId: { classId, userId } },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new Error('您已提交过加入申请，请等待审核');
      }
      if (existing.status === 'APPROVED') {
        throw new Error('您已是该班级成员');
      }
      // REJECTED 状态允许重新申请，先删除旧记录
      await prisma.classJoinRequest.delete({
        where: { id: existing.id },
      });
    }

    const isAlreadyMember = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (isAlreadyMember) {
      throw new Error('您已是该班级成员');
    }

    return await prisma.classJoinRequest.create({
      data: { classId, userId, message, status: 'PENDING' },
      include: {
        user: { select: { id: true, username: true, email: true, avatar: true } },
      },
    });
  }

  /**
   * 获取班级的加入申请列表
   */
  async getJoinRequests(classId: string) {
    return await prisma.classJoinRequest.findMany({
      where: { classId },
      include: {
        user: { select: { id: true, username: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取待审核申请数量：管理员获取全部，教师获取自己创建的班级的
   */
  async getPendingRequestCount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN') {
      return await prisma.classJoinRequest.count({ where: { status: 'PENDING' } });
    }
    const myClasses = await prisma.class.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });
    const classIds = myClasses.map(c => c.id);
    return await prisma.classJoinRequest.count({
      where: { classId: { in: classIds }, status: 'PENDING' },
    });
  }

  /**
   * 获取当前用户提交的待审核加入申请
   */
  async getMyJoinRequests(userId: string) {
    return await prisma.classJoinRequest.findMany({
      where: { userId, status: 'PENDING' },
      include: {
        class: { select: { id: true, name: true, grade: true, creator: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 审批加入申请：通过时将用户加入班级并更新 accessType 为 CLASS
   */
  async reviewJoinRequest(requestId: string, reviewerId: string, approved: boolean) {
    const request = await prisma.classJoinRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('加入申请不存在');
    }

    if (request.status !== 'PENDING') {
      throw new Error('该申请已被处理');
    }

    if (approved) {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { accessType: true },
      });
      const updateData: any = {};
      if (user && user.accessType === 'TRIAL') {
        updateData.accessType = 'CLASS';
      }
      await prisma.$transaction([
        prisma.classMember.create({
          data: {
            classId: request.classId,
            userId: request.userId,
            role: 'STUDENT',
          },
        }),
        prisma.classJoinRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            reviewedBy: reviewerId,
          },
        }),
        ...(Object.keys(updateData).length > 0
          ? [prisma.user.update({
              where: { id: request.userId },
              data: updateData,
            })]
          : []),
      ]);
    } else {
      await prisma.classJoinRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reviewedBy: reviewerId,
        },
      });
    }

    return await prisma.classJoinRequest.findUnique({ where: { id: requestId } });
  }

  // ========================
  // 学情分析
  // ========================

  /**
   * 获取班级整体学情分析
   * 汇总每个成员的提交数、通过数、通过率、平均分、强弱项、近7天活跃度
   */
  async getClassAnalytics(classId: string) {
    const members = await prisma.classMember.findMany({
      where: { classId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    const memberIds = members.map((m) => m.userId);
    const sevenDaysAgo = daysAgo(7);

    // 批量查询所有成员的提交记录
    const allSubmissions = await prisma.submission.findMany({
      where: { userId: { in: memberIds } },
      select: {
        id: true,
        userId: true,
        problemId: true,
        status: true,
        result: true,
        score: true,
        createdAt: true,
        problem: {
          select: {
            id: true,
            difficulty: true,
            tags: true,
          },
        },
      },
    });

    // 按用户分组统计
    const memberAnalytics = members.map((member) => {
      const userSubmissions = allSubmissions.filter((s) => s.userId === member.userId);
      const totalSubmissions = userSubmissions.length;
      const acceptedSubmissions = userSubmissions.filter(
        (s) => s.status === 'ACCEPTED' || s.result === 'ACCEPTED',
      );
      const acceptedCount = acceptedSubmissions.length;
      const acceptanceRate = totalSubmissions > 0 ? acceptedCount / totalSubmissions : 0;

      const scoresWithValues = userSubmissions.filter((s) => s.score !== null);
      const averageScore =
        scoresWithValues.length > 0
          ? scoresWithValues.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoresWithValues.length
          : 0;

      // 按难度统计
      const difficultyStats: Record<string, { total: number; accepted: number }> = {};
      for (const sub of userSubmissions) {
        const diff = sub.problem.difficulty;
        if (!difficultyStats[diff]) {
          difficultyStats[diff] = { total: 0, accepted: 0 };
        }
        difficultyStats[diff].total++;
        if (sub.status === 'ACCEPTED' || sub.result === 'ACCEPTED') {
          difficultyStats[diff].accepted++;
        }
      }

      // 按标签统计强弱项
      const tagStats: Record<string, { total: number; accepted: number }> = {};
      for (const sub of userSubmissions) {
        let tags: string[] = [];
        try {
          tags = JSON.parse(sub.problem.tags);
        } catch {
          tags = [];
        }
        for (const tag of tags) {
          if (!tagStats[tag]) {
            tagStats[tag] = { total: 0, accepted: 0 };
          }
          tagStats[tag].total++;
          if (sub.status === 'ACCEPTED' || sub.result === 'ACCEPTED') {
            tagStats[tag].accepted++;
          }
        }
      }

      // 找出强项和弱项（至少5次提交的标签才有参考价值）
      const strongAreas: string[] = [];
      const weakAreas: string[] = [];
      for (const [tag, stats] of Object.entries(tagStats)) {
        if (stats.total < 5) continue;
        const rate = stats.accepted / stats.total;
        if (rate >= 0.6) strongAreas.push(tag);
        else if (rate < 0.3) weakAreas.push(tag);
      }

      // 近7天活跃度
      const recentSubmissions = userSubmissions.filter(
        (s) => new Date(s.createdAt) >= sevenDaysAgo,
      ).length;

      return {
        userId: member.userId,
        username: member.user.username,
        avatar: member.user.avatar,
        role: member.role,
        totalSubmissions,
        acceptedCount,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
        difficultyStats,
        strongAreas,
        weakAreas,
        recentActivity: recentSubmissions,
      };
    });

    // 班级整体汇总
    const totalMemberCount = memberAnalytics.length;
    const classTotalSubmissions = memberAnalytics.reduce((s, m) => s + m.totalSubmissions, 0);
    const classAcceptedCount = memberAnalytics.reduce((s, m) => s + m.acceptedCount, 0);
    const classAcceptanceRate =
      classTotalSubmissions > 0 ? classAcceptedCount / classTotalSubmissions : 0;
    const classAverageScore =
      totalMemberCount > 0
        ? memberAnalytics.reduce((s, m) => s + m.averageScore, 0) / totalMemberCount
        : 0;
    const classRecentActivity = memberAnalytics.reduce((s, m) => s + m.recentActivity, 0);

    return {
      classSummary: {
        totalMembers: totalMemberCount,
        totalSubmissions: classTotalSubmissions,
        acceptedCount: classAcceptedCount,
        acceptanceRate: Math.round(classAcceptanceRate * 100) / 100,
        averageScore: Math.round(classAverageScore * 100) / 100,
        recentActivity: classRecentActivity,
      },
      memberAnalytics,
    };
  }

  // ========================
  // 教师仪表盘
  // ========================

  /**
   * 获取教师仪表盘数据：汇总该教师所有班级的成员、提交、通过率、
   * 近7天活跃度、待审核申请，以及跨班级的 Top 学生、难度分布、周趋势
   */
  async getTeacherDashboard(userId: string) {
    const sevenDaysAgo = daysAgo(7);

    // 查询该教师创建的所有班级
    const teacherClasses = await prisma.class.findMany({
      where: { createdBy: userId },
      select: { id: true, name: true },
    });

    if (teacherClasses.length === 0) {
      return {
        totalClasses: 0,
        totalStudents: 0,
        totalSubmissions: 0,
        totalAccepted: 0,
        overallAcceptanceRate: 0,
        recentActivity: 0,
        pendingRequests: 0,
        classSummaries: [],
        topStudents: [],
        difficultyDistribution: { EASY: { total: 0, accepted: 0 }, MEDIUM: { total: 0, accepted: 0 }, HARD: { total: 0, accepted: 0 } },
        weeklyTrend: buildEmptyWeeklyTrend(),
      };
    }

    const classIds = teacherClasses.map((c) => c.id);

    // 批量获取所有班级成员（仅 STUDENT 角色）
    const allMembers = await prisma.classMember.findMany({
      where: { classId: { in: classIds }, role: 'STUDENT' },
      select: { classId: true, userId: true, user: { select: { id: true, username: true } } },
    });

    // 去重统计学生总数
    const uniqueStudentIds = new Set(allMembers.map((m) => m.userId));

    // 按班级分组成员
    const membersByClass = new Map<string, typeof allMembers>();
    for (const m of allMembers) {
      const list = membersByClass.get(m.classId) || [];
      list.push(m);
      membersByClass.set(m.classId, list);
    }

    // 批量获取所有学生的提交记录
    const studentIds = Array.from(uniqueStudentIds);
    const allSubmissions = studentIds.length > 0
      ? await prisma.submission.findMany({
          where: { userId: { in: studentIds } },
          select: {
            id: true,
            userId: true,
            problemId: true,
            status: true,
            result: true,
            createdAt: true,
            problem: { select: { difficulty: true } },
          },
        })
      : [];

    // 按用户分组提交记录
    const submissionsByUser = new Map<string, typeof allSubmissions>();
    for (const s of allSubmissions) {
      const list = submissionsByUser.get(s.userId) || [];
      list.push(s);
      submissionsByUser.set(s.userId, list);
    }

    // 判断提交是否通过
    const isAccepted = (s: { status: string; result: string | null }) =>
      s.status === 'ACCEPTED' || s.result === 'ACCEPTED';

    // ---- 每个班级的汇总 ----
    const classSummaries = teacherClasses.map((cls) => {
      const classMembers = membersByClass.get(cls.id) || [];
      const classStudentIds = new Set(classMembers.map((m) => m.userId));

      let classTotal = 0;
      let classAccepted = 0;
      let classRecent = 0;

      for (const uid of classStudentIds) {
        const userSubs = submissionsByUser.get(uid) || [];
        classTotal += userSubs.length;
        classAccepted += userSubs.filter(isAccepted).length;
        classRecent += userSubs.filter((s) => new Date(s.createdAt) >= sevenDaysAgo).length;
      }

      const acceptanceRate = classTotal > 0 ? Math.round((classAccepted / classTotal) * 100) / 100 : 0;

      return {
        id: cls.id,
        name: cls.name,
        memberCount: classStudentIds.size,
        submissionCount: classTotal,
        acceptedCount: classAccepted,
        acceptanceRate,
        recentActivity: classRecent,
      };
    });

    // ---- 全局汇总 ----
    const totalSubmissions = allSubmissions.length;
    const totalAccepted = allSubmissions.filter(isAccepted).length;
    const overallAcceptanceRate = totalSubmissions > 0
      ? Math.round((totalAccepted / totalSubmissions) * 100) / 100
      : 0;
    const recentActivity = allSubmissions.filter((s) => new Date(s.createdAt) >= sevenDaysAgo).length;

    // ---- 待审核申请数 ----
    const pendingRequests = await prisma.classJoinRequest.count({
      where: { classId: { in: classIds }, status: 'PENDING' },
    });

    // ---- Top 5 学生（按通过数降序） ----
    const studentStats = Array.from(uniqueStudentIds).map((uid) => {
      const userSubs = submissionsByUser.get(uid) || [];
      const accepted = userSubs.filter(isAccepted).length;
      const rate = userSubs.length > 0 ? Math.round((accepted / userSubs.length) * 100) / 100 : 0;
      const member = allMembers.find((m) => m.userId === uid);
      return { userId: uid, username: member?.user.username ?? '', acceptedCount: accepted, acceptanceRate: rate };
    });
    const topStudents = studentStats
      .sort((a, b) => b.acceptedCount - a.acceptedCount)
      .slice(0, 5);

    // ---- 难度分布 ----
    const difficultyDistribution: Record<string, { total: number; accepted: number }> = {
      EASY: { total: 0, accepted: 0 },
      MEDIUM: { total: 0, accepted: 0 },
      HARD: { total: 0, accepted: 0 },
    };
    for (const s of allSubmissions) {
      const diff = s.problem.difficulty as string;
      if (diff in difficultyDistribution) {
        difficultyDistribution[diff].total++;
        if (isAccepted(s)) difficultyDistribution[diff].accepted++;
      }
    }

    // ---- 近7天趋势 ----
    const weeklyTrend = buildWeeklyTrend(allSubmissions, isAccepted);

    return {
      totalClasses: teacherClasses.length,
      totalStudents: uniqueStudentIds.size,
      totalSubmissions,
      totalAccepted,
      overallAcceptanceRate,
      recentActivity,
      pendingRequests,
      classSummaries,
      topStudents,
      difficultyDistribution,
      weeklyTrend,
    };
  }

  // ========================
  // 作业管理
  // ========================

  /**
   * 创建作业：指定班级、题目列表、截止日期
   */
  async createHomework(
    classId: string,
    data: {
      title: string;
      description?: string;
      problemIds: string[];
      dueDate?: Date;
      createdBy: string;
    },
  ) {
    return await prisma.homework.create({
      data: {
        classId,
        title: data.title,
        description: data.description,
        problemIds: JSON.stringify(data.problemIds),
        dueDate: data.dueDate,
        createdBy: data.createdBy,
      },
      include: {
        creator: { select: { id: true, username: true } },
      },
    });
  }

  /**
   * 获取班级的所有作业列表
   */
  async getHomework(classId: string) {
    return await prisma.homework.findMany({
      where: { classId },
      include: {
        creator: { select: { id: true, username: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 获取作业详情，包含提交统计
   */
  async getHomeworkDetail(homeworkId: string) {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        creator: { select: { id: true, username: true } },
        class: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                userId: true,
                user: { select: { id: true, username: true, avatar: true } },
              },
            },
          },
        },
        submissions: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
          },
        },
      },
    });

    if (!homework) return null;

    const problemIds: string[] = JSON.parse(homework.problemIds);
    const memberCount = homework.class.members.length;
    const totalExpected = memberCount * problemIds.length;

    // 按题目统计提交情况
    const problemStats = problemIds.map((pid) => {
      const problemSubmissions = homework.submissions.filter((s) => s.problemId === pid);
      const accepted = problemSubmissions.filter((s) => s.status === 'ACCEPTED').length;
      const submitted = problemSubmissions.filter((s) => s.status !== 'PENDING').length;
      return {
        problemId: pid,
        submitted,
        accepted,
        pending: memberCount - submitted,
      };
    });

    return {
      id: homework.id,
      classId: homework.classId,
      title: homework.title,
      description: homework.description,
      problemIds,
      dueDate: homework.dueDate,
      status: homework.status,
      createdBy: homework.createdBy,
      creator: homework.creator,
      createdAt: homework.createdAt,
      updatedAt: homework.updatedAt,
      memberCount,
      totalExpected,
      totalSubmitted: homework.submissions.filter((s) => s.status !== 'PENDING').length,
      totalAccepted: homework.submissions.filter((s) => s.status === 'ACCEPTED').length,
      problemStats,
    };
  }

  /**
   * 学生提交作业：将指定题目的状态标记为 SUBMITTED 或 ACCEPTED
   * 如果该学生对此题目已有提交记录则更新，否则创建
   */
  async submitHomework(
    homeworkId: string,
    userId: string,
    problemId: string,
    status: 'SUBMITTED' | 'ACCEPTED' = 'SUBMITTED',
    score?: number,
  ) {
    return await prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_userId_problemId: { homeworkId, userId, problemId },
      },
      create: {
        homeworkId,
        userId,
        problemId,
        status,
        score: score ?? null,
        submittedAt: new Date(),
      },
      update: {
        status,
        score: score ?? null,
        submittedAt: new Date(),
      },
    });
  }

  /**
   * 获取作业中所有学生的完成进度
   */
  async getHomeworkProgress(homeworkId: string) {
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: {
        class: {
          select: {
            members: {
              select: {
                userId: true,
                user: { select: { id: true, username: true, avatar: true } },
              },
            },
          },
        },
        submissions: true,
      },
    });

    if (!homework) return null;

    const problemIds: string[] = JSON.parse(homework.problemIds);

    // 按学生汇总进度
    const studentProgress = homework.class.members.map((member) => {
      const userSubmissions = homework.submissions.filter((s) => s.userId === member.userId);
      const completedCount = userSubmissions.filter((s) => s.status !== 'PENDING').length;
      const acceptedCount = userSubmissions.filter((s) => s.status === 'ACCEPTED').length;

      // 每道题的完成状态
      const problemStatus = problemIds.map((pid) => {
        const sub = userSubmissions.find((s) => s.problemId === pid);
        return {
          problemId: pid,
          status: sub?.status ?? 'PENDING',
          score: sub?.score ?? null,
          submittedAt: sub?.submittedAt ?? null,
        };
      });

      return {
        userId: member.userId,
        username: member.user.username,
        avatar: member.user.avatar,
        totalProblems: problemIds.length,
        completedCount,
        acceptedCount,
        progress: problemIds.length > 0 ? Math.round((completedCount / problemIds.length) * 100) : 0,
        problemStatus,
      };
    });

    return {
      homeworkId: homework.id,
      title: homework.title,
      problemIds,
      dueDate: homework.dueDate,
      status: homework.status,
      studentProgress,
    };
  }

  // ========================
  // 成员详细数据
  // ========================

  /**
   * 获取班级中指定成员的详细学情数据
   * 包含：提交历史、按难度统计、分数分布、活跃时间线、薄弱领域
   */
  async getMemberDetail(classId: string, userId: string) {
    // 验证成员身份
    const membership = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (!membership) {
      throw new Error('该用户不是此班级成员');
    }

    // 最近50条提交记录
    const recentSubmissions = await prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        problemId: true,
        status: true,
        result: true,
        score: true,
        createdAt: true,
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            tags: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 全部提交（用于统计）
    const allUserSubmissions = await prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        problemId: true,
        status: true,
        result: true,
        score: true,
        createdAt: true,
        problem: {
          select: {
            difficulty: true,
            tags: true,
          },
        },
      },
    });

    // 按难度统计
    const difficultyStats: Record<string, { total: number; accepted: number; uniqueProblems: Set<string>; acceptedProblems: Set<string> }> = {};
    for (const sub of allUserSubmissions) {
      const diff = sub.problem.difficulty;
      if (!difficultyStats[diff]) {
        difficultyStats[diff] = { total: 0, accepted: 0, uniqueProblems: new Set(), acceptedProblems: new Set() };
      }
      difficultyStats[diff].total++;
      difficultyStats[diff].uniqueProblems.add(sub.problemId);
      if (sub.status === 'ACCEPTED' || sub.result === 'ACCEPTED') {
        difficultyStats[diff].accepted++;
        difficultyStats[diff].acceptedProblems.add(sub.problemId);
      }
    }

    const difficultySummary = Object.entries(difficultyStats).map(([difficulty, stats]) => ({
      difficulty,
      totalSubmissions: stats.total,
      acceptedCount: stats.accepted,
      uniqueProblems: stats.uniqueProblems.size,
      acceptedProblems: stats.acceptedProblems.size,
      acceptanceRate: stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) / 100 : 0,
    }));

    // 分数分布（按区间 0-20, 21-40, 41-60, 61-80, 81-100）
    const scoreRanges = [
      { label: '0-20', min: 0, max: 20 },
      { label: '21-40', min: 21, max: 40 },
      { label: '41-60', min: 41, max: 60 },
      { label: '61-80', min: 61, max: 80 },
      { label: '81-100', min: 81, max: 100 },
    ];
    const scoredSubmissions = allUserSubmissions.filter((s) => s.score !== null);
    const scoreDistribution = scoreRanges.map((range) => ({
      label: range.label,
      count: scoredSubmissions.filter((s) => s.score! >= range.min && s.score! <= range.max).length,
    }));

    // 活跃时间线（近30天，按天统计提交数）
    const thirtyDaysAgo = daysAgo(30);
    const recentAllSubs = allUserSubmissions.filter((s) => new Date(s.createdAt) >= thirtyDaysAgo);
    const activityTimeline: Record<string, number> = {};
    for (const sub of recentAllSubs) {
      const day = new Date(sub.createdAt).toISOString().slice(0, 10);
      activityTimeline[day] = (activityTimeline[day] || 0) + 1;
    }
    const timeline = Object.entries(activityTimeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 薄弱领域（标签维度，通过率低于30%且至少尝试5次）
    const tagStats: Record<string, { total: number; accepted: number }> = {};
    for (const sub of allUserSubmissions) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(sub.problem.tags);
      } catch {
        tags = [];
      }
      for (const tag of tags) {
        if (!tagStats[tag]) tagStats[tag] = { total: 0, accepted: 0 };
        tagStats[tag].total++;
        if (sub.status === 'ACCEPTED' || sub.result === 'ACCEPTED') {
          tagStats[tag].accepted++;
        }
      }
    }
    const weakAreas = Object.entries(tagStats)
      .filter(([, stats]) => stats.total >= 5 && stats.accepted / stats.total < 0.3)
      .map(([tag, stats]) => ({
        tag,
        totalSubmissions: stats.total,
        acceptedCount: stats.accepted,
        acceptanceRate: Math.round((stats.accepted / stats.total) * 100) / 100,
      }))
      .sort((a, b) => a.acceptanceRate - b.acceptanceRate);

    return {
      userId,
      recentSubmissions,
      difficultySummary,
      scoreDistribution,
      activityTimeline: timeline,
      weakAreas,
    };
  }

  // ========================
  // 班级PK
  // ========================

  /**
   * 创建班级PK挑战
   * 验证双方班级存在性，若未指定题目则自动选取5道MEDIUM难度题目
   */
  async createClassBattle(data: {
    initiatorClassId: string;
    challengerClassId: string;
    problemIds: string[];
    createdBy: string;
  }) {
    if (data.initiatorClassId === data.challengerClassId) {
      throw new Error('发起方和挑战方不能是同一个班级');
    }

    const [initiatorClass, challengerClass] = await Promise.all([
      prisma.class.findUnique({ where: { id: data.initiatorClassId } }),
      prisma.class.findUnique({ where: { id: data.challengerClassId } }),
    ]);

    if (!initiatorClass) {
      throw new Error('发起方班级不存在');
    }
    if (!challengerClass) {
      throw new Error('挑战方班级不存在');
    }

    let problemIds = data.problemIds;
    if (!problemIds || problemIds.length === 0) {
      const randomProblems = await prisma.problem.findMany({
        where: { difficulty: 'MEDIUM' },
        select: { id: true },
      });
      const shuffled = randomProblems.sort(() => Math.random() - 0.5);
      problemIds = shuffled.slice(0, 5).map((p) => p.id);

      if (problemIds.length === 0) {
        throw new Error('系统中没有可用的MEDIUM难度题目，请手动指定题目');
      }
    }

    return await prisma.classBattle.create({
      data: {
        initiatorClassId: data.initiatorClassId,
        challengerClassId: data.challengerClassId,
        status: 'PENDING',
        problemIds: JSON.stringify(problemIds),
        createdBy: data.createdBy,
      },
      include: {
        initiatorClass: { select: { id: true, name: true } },
        challengerClass: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 获取单个PK挑战详情
   */
  async getClassBattleById(battleId: string) {
    return await prisma.classBattle.findUnique({
      where: { id: battleId },
      include: {
        initiatorClass: { select: { id: true, name: true } },
        challengerClass: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 接受PK挑战：将状态改为ACTIVE并设置开始时间
   * 若题目尚未设置则自动选取
   */
  async acceptClassBattle(battleId: string) {
    const battle = await prisma.classBattle.findUnique({
      where: { id: battleId },
    });

    if (!battle) {
      throw new Error('PK挑战不存在');
    }

    if (battle.status !== 'PENDING') {
      throw new Error('只能接受待确认的PK挑战');
    }

    let problemIds: string[] = JSON.parse(battle.problemIds);
    if (problemIds.length === 0) {
      const randomProblems = await prisma.problem.findMany({
        where: { difficulty: 'MEDIUM' },
        select: { id: true },
      });
      const shuffled = randomProblems.sort(() => Math.random() - 0.5);
      problemIds = shuffled.slice(0, 5).map((p) => p.id);
    }

    return await prisma.classBattle.update({
      where: { id: battleId },
      data: {
        status: 'ACTIVE',
        startTime: new Date(),
        problemIds: JSON.stringify(problemIds),
      },
      include: {
        initiatorClass: { select: { id: true, name: true } },
        challengerClass: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 提交PK答题结果：根据正确性更新对应班级的得分
   */
  async submitClassBattleAnswer(
    battleId: string,
    classId: string,
    userId: string,
    problemId: string,
    correct: boolean,
  ) {
    const battle = await prisma.classBattle.findUnique({
      where: { id: battleId },
    });

    if (!battle) {
      throw new Error('PK挑战不存在');
    }

    if (battle.status !== 'ACTIVE') {
      throw new Error('PK挑战未在进行中');
    }

    const problemIds: string[] = JSON.parse(battle.problemIds);
    if (!problemIds.includes(problemId)) {
      throw new Error('该题目不属于本次PK');
    }

    const isInitiator = classId === battle.initiatorClassId;
    const isChallenger = classId === battle.challengerClassId;

    if (!isInitiator && !isChallenger) {
      throw new Error('该班级不参与此PK挑战');
    }

    const isMember = await prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (!isMember) {
      throw new Error('您不是该班级的成员');
    }

    const scoreIncrement = correct ? 1 : 0;
    const updateData = isInitiator
      ? { initiatorScore: battle.initiatorScore + scoreIncrement }
      : { challengerScore: battle.challengerScore + scoreIncrement };

    return await prisma.classBattle.update({
      where: { id: battleId },
      data: updateData,
      include: {
        initiatorClass: { select: { id: true, name: true } },
        challengerClass: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 结束PK挑战：计算最终得分，判定胜方
   */
  async completeClassBattle(battleId: string) {
    const battle = await prisma.classBattle.findUnique({
      where: { id: battleId },
    });

    if (!battle) {
      throw new Error('PK挑战不存在');
    }

    if (battle.status !== 'ACTIVE') {
      throw new Error('只能结束进行中的PK挑战');
    }

    let winnerId: string | null = null;
    if (battle.initiatorScore > battle.challengerScore) {
      winnerId = battle.initiatorClassId;
    } else if (battle.challengerScore > battle.initiatorScore) {
      winnerId = battle.challengerClassId;
    }

    return await prisma.classBattle.update({
      where: { id: battleId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        winnerId,
      },
      include: {
        initiatorClass: { select: { id: true, name: true } },
        challengerClass: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 获取班级的所有PK挑战记录
   */
  async getClassBattles(classId: string) {
    return await prisma.classBattle.findMany({
      where: {
        OR: [
          { initiatorClassId: classId },
          { challengerClassId: classId },
        ],
      },
      include: {
        initiatorClass: { select: { id: true, name: true } },
        challengerClass: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ========================
  // 班级专属考试
  // ========================

  /**
   * 创建班级专属考试：关联到指定班级，仅班级成员可参加
   */
  async createClassExam(
    classId: string,
    data: {
      title: string;
      description?: string;
      duration: number;
      problemIds: string[];
      startTime?: Date;
      endTime?: Date;
      createdBy: string;
    },
  ) {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      throw new Error('班级不存在');
    }

    const exam = await prisma.exam.create({
      data: {
        title: data.title,
        description: data.description,
        type: 'CLASS_EXAM',
        duration: data.duration,
        startTime: data.startTime,
        endTime: data.endTime,
        createdBy: data.createdBy,
        classId,
      },
    });

    for (let i = 0; i < data.problemIds.length; i++) {
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          problemId: data.problemIds[i],
          order: i,
          points: 10,
        },
      });
    }

    return await prisma.exam.findUnique({
      where: { id: exam.id },
      include: {
        questions: {
          include: {
            problem: true,
          },
          orderBy: { order: 'asc' },
        },
        class: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 获取班级的所有专属考试
   */
  async getClassExams(classId: string) {
    return await prisma.exam.findMany({
      where: { classId },
      include: {
        _count: {
          select: {
            attempts: true,
            questions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const classService = new ClassService();
