import prisma from '../lib/prisma';

export interface CreateDiscussionInput {
  problemId?: string;
  title: string;
  content: string;
  authorId: string;
  type?: string;
  tags?: string[];
}

export interface GetDiscussionsParams {
  page?: number;
  pageSize?: number;
  type?: string;
  problemId?: string;
  tag?: string;
}

export interface CreateReplyInput {
  discussionId: string;
  content: string;
  authorId: string;
}

const AUTHOR_SELECT = { id: true, username: true, avatar: true, level: true } as const;

export class DiscussionService {
  async createDiscussion(data: CreateDiscussionInput) {
    return await prisma.discussion.create({
      data: {
        problemId: data.problemId,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        type: data.type || 'QUESTION',
        tags: JSON.stringify(data.tags || []),
      },
      include: {
        author: { select: AUTHOR_SELECT },
      },
    });
  }

  async getDiscussions(params: GetDiscussionsParams) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.type) where.type = params.type;
    if (params.problemId) where.problemId = params.problemId;
    if (params.tag) {
      where.tags = { contains: params.tag };
    }

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        include: {
          author: { select: AUTHOR_SELECT },
          _count: { select: { replies: true, votes: true } },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.discussion.count({ where }),
    ]);

    return {
      discussions: discussions.map(d => ({
        ...d,
        tags: JSON.parse(d.tags || '[]'),
      })),
      total,
      page,
      pageSize,
    };
  }

  async getDiscussionById(id: string) {
    const discussion = await prisma.discussion.findUnique({
      where: { id },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          include: {
            author: { select: AUTHOR_SELECT },
          },
          orderBy: { createdAt: 'asc' },
        },
        votes: { select: { userId: true, isUpvote: true } },
      },
    });

    if (discussion) {
      return {
        ...discussion,
        tags: JSON.parse(discussion.tags || '[]'),
      };
    }
    return null;
  }

  async createReply(data: CreateReplyInput) {
    const [reply] = await Promise.all([
      prisma.reply.create({
        data: {
          discussionId: data.discussionId,
          content: data.content,
          authorId: data.authorId,
        },
        include: {
          author: { select: AUTHOR_SELECT },
        },
      }),
      prisma.discussion.update({
        where: { id: data.discussionId },
        data: { replyCount: { increment: 1 } },
      }),
    ]);
    return reply;
  }

  async vote(userId: string, discussionId: string, isUpvote: boolean) {
    const existing = await prisma.discussionVote.findUnique({
      where: { userId_discussionId: { userId, discussionId } },
    });

    if (existing) {
      if (existing.isUpvote === isUpvote) {
        await prisma.discussionVote.delete({ where: { id: existing.id } });
        await prisma.discussion.update({
          where: { id: discussionId },
          data: { upvotes: { increment: isUpvote ? -1 : 1 } },
        });
        return { action: 'removed' };
      } else {
        await prisma.discussionVote.update({
          where: { id: existing.id },
          data: { isUpvote },
        });
        await prisma.discussion.update({
          where: { id: discussionId },
          data: { upvotes: { increment: isUpvote ? 2 : -2 } },
        });
        return { action: 'updated' };
      }
    }

    await prisma.discussionVote.create({
      data: { userId, discussionId, isUpvote },
    });
    await prisma.discussion.update({
      where: { id: discussionId },
      data: { upvotes: { increment: isUpvote ? 1 : -1 } },
    });
    return { action: 'created' };
  }

  async deleteDiscussion(id: string, userId: string, userRole: string) {
    const discussion = await prisma.discussion.findUnique({ where: { id } });
    if (!discussion) throw new Error('讨论不存在');
    if (discussion.authorId !== userId && userRole !== 'ADMIN') {
      throw new Error('无权删除此讨论');
    }
    await prisma.discussion.delete({ where: { id } });
    return { success: true };
  }
}

export const discussionService = new DiscussionService();
