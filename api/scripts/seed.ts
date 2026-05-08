import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('开始初始化数据...');

  // 创建管理员账户
  const adminExists = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@oj.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('✅ 管理员账户已创建: admin / admin123');
  } else {
    console.log('ℹ️  管理员账户已存在');
  }

  // 创建示例题目
  const problemCount = await prisma.problem.count();
  if (problemCount === 0) {
    await prisma.problem.createMany({
      data: [
        {
          title: '两数之和',
          description: '给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。\n\n你可以假设每种输入只会对应一个答案，且同样的元素不能被重复利用。\n\n**示例:**\n```\n输入: nums = [2,7,11,15], target = 9\n输出: [0,1]\n解释: 因为 nums[0] + nums[1] == 9 ，返回 [0, 1] 。\n```',
          type: 'PROGRAMMING',
          difficulty: 'EASY',
          tags: JSON.stringify(['数组', '哈希表']),
          testCases: JSON.stringify([
            { input: '[2,7,11,15]\n9', output: '[0,1]', isSample: true },
            { input: '[3,2,4]\n6', output: '[1,2]', isSample: true },
            { input: '[3,3]\n6', output: '[0,1]', isSample: false }
          ]),
          timeLimit: 2000,
          memoryLimit: 256
        },
        {
          title: '回文数判断',
          description: '给你一个整数 x，如果 x 是一个回文整数，则返回 true。\n\n回文数是指正序（从左向右）和倒序（从右向左）读都是一样的整数。\n\n**示例:**\n```\n输入: x = 121\n输出: true\n解释: 121 从左向右读为 121，从右向左读也是 121。\n\n输入: x = -121\n输出: false\n解释: 从左向右读为 -121，从右向左读为 121-。\n```',
          type: 'PROGRAMMING',
          difficulty: 'EASY',
          tags: JSON.stringify(['数学', '字符串']),
          testCases: JSON.stringify([
            { input: '121', output: 'true', isSample: true },
            { input: '-121', output: 'false', isSample: true },
            { input: '10', output: 'false', isSample: false }
          ]),
          timeLimit: 2000,
          memoryLimit: 256
        },
        {
          title: '算法时间复杂度',
          description: '以下哪种算法的时间复杂度是 O(n log n)？',
          type: 'CHOICE',
          difficulty: 'EASY',
          tags: JSON.stringify(['算法基础', '复杂度分析']),
          choices: JSON.stringify([
            { key: 'A', text: '冒泡排序' },
            { key: 'B', text: '归并排序' },
            { key: 'C', text: '二分查找' },
            { key: 'D', text: '线性查找' }
          ]),
          correctAnswer: 'B',
          timeLimit: 2000,
          memoryLimit: 256
        },
        {
          title: '数据结构选择题',
          description: '下列哪种数据结构可以实现 LIFO（后进先出）的特性？',
          type: 'CHOICE',
          difficulty: 'MEDIUM',
          tags: JSON.stringify(['数据结构', '栈']),
          choices: JSON.stringify([
            { key: 'A', text: '队列 (Queue)' },
            { key: 'B', text: '栈 (Stack)' },
            { key: 'C', text: '链表 (Linked List)' },
            { key: 'D', text: '树 (Tree)' }
          ]),
          correctAnswer: 'B',
          timeLimit: 2000,
          memoryLimit: 256
        },
        {
          title: '计算机基础知识',
          description: '在计算机系统中，1GB 等于多少 MB？',
          type: 'FILL_BLANK',
          difficulty: 'EASY',
          tags: JSON.stringify(['计算机基础', '存储单位']),
          fillBlanks: JSON.stringify(['1024']),
          timeLimit: 2000,
          memoryLimit: 256
        },
        {
          title: '编程语言历史',
          description: 'Java 语言是由 ____ 公司开发的，最初发布于 ____ 年。',
          type: 'FILL_BLANK',
          difficulty: 'MEDIUM',
          tags: JSON.stringify(['编程语言', '历史']),
          fillBlanks: JSON.stringify(['Sun', '1995']),
          timeLimit: 2000,
          memoryLimit: 256
        }
      ]
    });
    console.log('✅ 示例题目已创建 (6道题目)');
  } else {
    console.log('ℹ️  题目已存在，跳过创建');
  }

  // 创建 AI 配置
  const aiConfigExists = await prisma.aIConfig.findFirst();
  if (!aiConfigExists) {
    await prisma.aIConfig.create({
      data: {
        enabled: false,
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      }
    });
    console.log('✅ AI 配置已创建（默认禁用）');
  }

  console.log('数据初始化完成！');
}

seed()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
