import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始填充数据...');

  console.log('🧹 清理旧数据...');
  await prisma.pointLog.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.matchProblem.deleteMany();
  await prisma.matchParticipant.deleteMany();
  await prisma.match.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.solution.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.knowledgeTree.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.levelConfig.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.aIConfig.deleteMany();

  // ========== 1. 用户 ==========
  console.log('👤 创建用户...');
  const passwordHash = await bcrypt.hash('123456', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: { username: 'admin', email: 'admin@oj.com', password: adminHash, role: 'ADMIN', points: 500, level: 5 }
  });
  const teacher = await prisma.user.create({
    data: { username: 'teacher', email: 'teacher@oj.com', password: passwordHash, role: 'TEACHER', points: 300, level: 4 }
  });
  const students = [];
  const studentNames = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];
  for (let i = 0; i < studentNames.length; i++) {
    const s = await prisma.user.create({
      data: {
        username: `student${i + 1}`,
        email: `student${i + 1}@oj.com`,
        password: passwordHash,
        role: 'STUDENT',
        points: Math.floor(Math.random() * 200) + 50,
        level: Math.floor(Math.random() * 3) + 1
      }
    });
    students.push(s);
  }

  // ========== 2. 知识树 ==========
  console.log('🌳 创建知识树...');
  const ktData = [
    { name: '数据结构', children: ['数组与链表', '栈与队列', '树与二叉树', '图', '哈希表'] },
    { name: '算法', children: ['排序算法', '搜索算法', '动态规划', '贪心算法', '分治算法', '回溯算法'] },
    { name: '编程语言', children: ['JavaScript', 'Python', 'C++基础'] },
    { name: '数学', children: ['数论', '组合数学', '概率统计'] },
    { name: '计算机基础', children: ['操作系统', '计算机网络', '数据库'] }
  ];
  const knowledgeNodes: any[] = [];
  for (const parent of ktData) {
    const pNode = await prisma.knowledgeTree.create({
      data: { name: parent.name, description: `${parent.name}相关知识`, level: 1, order: ktData.indexOf(parent) }
    });
    knowledgeNodes.push(pNode);
    for (let ci = 0; ci < parent.children.length; ci++) {
      const cNode = await prisma.knowledgeTree.create({
        data: { name: parent.children[ci], description: `${parent.children[ci]}相关知识`, parentId: pNode.id, level: 2, order: ci }
      });
      knowledgeNodes.push(cNode);
    }
  }

  // ========== 3. 题目 ==========
  console.log('📝 创建题目...');
  const dsNode = knowledgeNodes.find(n => n.name === '数据结构');
  const arrayNode = knowledgeNodes.find(n => n.name === '数组与链表');
  const stackNode = knowledgeNodes.find(n => n.name === '栈与队列');
  const treeNode = knowledgeNodes.find(n => n.name === '树与二叉树');
  const graphNode = knowledgeNodes.find(n => n.name === '图');
  const hashNode = knowledgeNodes.find(n => n.name === '哈希表');
  const algoNode = knowledgeNodes.find(n => n.name === '算法');
  const sortNode = knowledgeNodes.find(n => n.name === '排序算法');
  const dpNode = knowledgeNodes.find(n => n.name === '动态规划');
  const greedyNode = knowledgeNodes.find(n => n.name === '贪心算法');
  const searchNode = knowledgeNodes.find(n => n.name === '搜索算法');
  const jsNode = knowledgeNodes.find(n => n.name === 'JavaScript');
  const pyNode = knowledgeNodes.find(n => n.name === 'Python');
  const mathNode = knowledgeNodes.find(n => n.name === '数学');
  const numTheoryNode = knowledgeNodes.find(n => n.name === '数论');

  const problems: any[] = [];

  // --- 编程题 ---
  const programmingProblems = [
    {
      title: '两数之和',
      description: '给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。\n\n你可以假设每种输入只会对应一个答案，并且不能使用同一个元素两次。\n\n你可以按任意顺序返回答案。',
      difficulty: 'EASY',
      tags: ['数组', '哈希表'],
      knowledgeTreeId: arrayNode.id,
      testCases: [
        { input: '2 7 11 15\n9', output: '0 1', isSample: true },
        { input: '3 2 4\n6', output: '1 2', isSample: true },
        { input: '3 3\n6', output: '0 1', isSample: false },
        { input: '1 5 3 7 2\n9', output: '1 3', isSample: false },
        { input: '10 20 30 40 50\n60', output: '1 4', isSample: false }
      ],
      solution: '使用哈希表存储已遍历的数字及其下标，遍历数组时检查 target - nums[i] 是否在哈希表中。'
    },
    {
      title: '反转链表',
      description: '给你单链表的头节点 head，请你反转链表，并返回反转后的链表。\n\n输入格式：第一行 n 表示节点数，第二行 n 个整数表示节点值\n输出格式：反转后的节点值序列，空格分隔',
      difficulty: 'EASY',
      tags: ['链表', '递归'],
      knowledgeTreeId: arrayNode.id,
      testCases: [
        { input: '5\n1 2 3 4 5', output: '5 4 3 2 1', isSample: true },
        { input: '3\n1 2 3', output: '3 2 1', isSample: false },
        { input: '1\n1', output: '1', isSample: false },
        { input: '0', output: '', isSample: false }
      ],
      solution: '使用三个指针 prev, curr, next 依次反转链表指向。'
    },
    {
      title: '有效的括号',
      description: '给定一个只包括 \'(\'，\')\'，\'{\'，\'}\'，\'[\'，\']\' 的字符串 s，判断字符串是否有效。\n\n有效字符串需满足：\n1. 左括号必须用相同类型的右括号闭合\n2. 左括号必须以正确的顺序闭合\n3. 每个右括号都有一个对应的相同类型的左括号',
      difficulty: 'EASY',
      tags: ['栈', '字符串'],
      knowledgeTreeId: stackNode.id,
      testCases: [
        { input: '()', output: 'true', isSample: true },
        { input: '()[]{}', output: 'true', isSample: true },
        { input: '(]', output: 'false', isSample: true },
        { input: '([)]', output: 'false', isSample: false },
        { input: '{[]}', output: 'true', isSample: false }
      ],
      solution: '使用栈，遇到左括号入栈，遇到右括号检查栈顶是否匹配。'
    },
    {
      title: '二叉树的中序遍历',
      description: '给定一个二叉树的根节点 root，返回它的中序遍历结果。\n\n输入格式：第一行 n 表示节点数，第二行 n 个整数表示层序遍历的节点值（-1 表示空节点）\n输出格式：中序遍历结果，空格分隔',
      difficulty: 'MEDIUM',
      tags: ['树', '递归', '深度优先搜索'],
      knowledgeTreeId: treeNode.id,
      testCases: [
        { input: '3\n1 -1 2\n3', output: '1 3 2', isSample: true },
        { input: '0', output: '', isSample: false },
        { input: '1\n1', output: '1', isSample: false }
      ],
      solution: '递归实现：左子树 -> 根节点 -> 右子树。'
    },
    {
      title: '爬楼梯',
      description: '假设你正在爬楼梯。需要 n 阶你才能到达楼顶。\n\n每次你可以爬 1 或 2 个台阶。你有多少种不同的方法可以爬到楼顶呢？\n\n输入：一个整数 n\n输出：方法数',
      difficulty: 'EASY',
      tags: ['动态规划', '递归'],
      knowledgeTreeId: dpNode.id,
      testCases: [
        { input: '2', output: '2', isSample: true },
        { input: '3', output: '3', isSample: true },
        { input: '1', output: '1', isSample: false },
        { input: '4', output: '5', isSample: false },
        { input: '5', output: '8', isSample: false },
        { input: '10', output: '89', isSample: false }
      ],
      solution: 'dp[i] = dp[i-1] + dp[i-2]，初始条件 dp[1]=1, dp[2]=2。'
    },
    {
      title: '最长递增子序列',
      description: '给你一个整数数组 nums，找到其中最长严格递增子序列的长度。\n\n子序列是由数组派生而来的序列，删除（或不删除）数组中的元素而不改变其余元素的顺序。\n\n输入：第一行 n，第二行 n 个整数\n输出：最长递增子序列长度',
      difficulty: 'MEDIUM',
      tags: ['动态规划', '二分查找'],
      knowledgeTreeId: dpNode.id,
      testCases: [
        { input: '8\n10 9 2 5 3 7 101 18', output: '4', isSample: true },
        { input: '1\n0', output: '1', isSample: false },
        { input: '6\n0 1 0 3 2 3', output: '4', isSample: false },
        { input: '7\n7 7 7 7 7 7 7', output: '1', isSample: false }
      ],
      solution: '方法一：O(n²) DP；方法二：O(n log n) 贪心+二分。'
    },
    {
      title: '合并两个有序链表',
      description: '将两个升序链表合并为一个新的升序链表并返回。\n\n输入：第一行 n1 和 n2，第二行 n1 个整数，第三行 n2 个整数\n输出：合并后的序列',
      difficulty: 'EASY',
      tags: ['链表', '递归'],
      knowledgeTreeId: arrayNode.id,
      testCases: [
        { input: '3 3\n1 2 4\n1 3 4', output: '1 1 2 3 4 4', isSample: true },
        { input: '0 0', output: '', isSample: false },
        { input: '0 1\n0', output: '0', isSample: false }
      ],
      solution: '使用双指针依次比较两个链表头部，取较小值。'
    },
    {
      title: '零钱兑换',
      description: '给你一个整数数组 coins，表示不同面额的硬币；以及一个整数 amount，表示总金额。\n\n计算并返回可以凑成总金额所需的最少硬币个数。如果没有任何一种硬币组合能组成总金额，返回 -1。\n\n你可以认为每种硬币的数量是无限的。',
      difficulty: 'MEDIUM',
      tags: ['动态规划', '广度优先搜索'],
      knowledgeTreeId: dpNode.id,
      testCases: [
        { input: '3 11\n1 2 5', output: '3', isSample: true },
        { input: '1 2\n2', output: '-1', isSample: false },
        { input: '1 0\n1', output: '0', isSample: false },
        { input: '1 1\n1', output: '1', isSample: false }
      ],
      solution: '完全背包 DP：dp[i] = min(dp[i], dp[i-coin]+1)。'
    },
    {
      title: '二分查找',
      description: '给定一个 n 个元素有序的（升序）整型数组 nums 和一个目标值 target，写一个函数搜索 nums 中的 target，如果目标值存在返回下标，否则返回 -1。',
      difficulty: 'EASY',
      tags: ['数组', '二分查找'],
      knowledgeTreeId: searchNode.id,
      testCases: [
        { input: '6\n-1 0 3 5 9 12\n9', output: '4', isSample: true },
        { input: '6\n-1 0 3 5 9 12\n2', output: '-1', isSample: false },
        { input: '1\n5\n5', output: '0', isSample: false }
      ],
      solution: '经典二分查找，维护 left, right 指针。'
    },
    {
      title: '最大子数组和',
      description: '给你一个整数数组 nums，请你找出一个具有最大和的连续子数组（子数组最少包含一个元素），返回其最大和。',
      difficulty: 'MEDIUM',
      tags: ['数组', '动态规划', '分治'],
      knowledgeTreeId: dpNode.id,
      testCases: [
        { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', isSample: true },
        { input: '1\n1', output: '1', isSample: false },
        { input: '5\n5 4 -1 7 8', output: '23', isSample: false },
        { input: '3\n-1 -2 -3', output: '-1', isSample: false }
      ],
      solution: 'Kadane 算法：dp[i] = max(nums[i], dp[i-1]+nums[i])。'
    },
    {
      title: '图的广度优先搜索',
      description: '给定一个无向图（用邻接表表示），从节点 0 出发进行 BFS 遍历，返回遍历顺序。\n\n输入：第一行 n 和 m（节点数和边数），接下来 m 行每行两个整数表示一条边\n输出：BFS 遍历序列，空格分隔',
      difficulty: 'MEDIUM',
      tags: ['图', '广度优先搜索'],
      knowledgeTreeId: graphNode.id,
      testCases: [
        { input: '5 4\n0 1\n0 2\n1 3\n1 4', output: '0 1 2 3 4', isSample: true },
        { input: '3 2\n0 1\n1 2', output: '0 1 2', isSample: false }
      ],
      solution: '使用队列实现 BFS，维护 visited 集合。'
    },
    {
      title: '快速排序',
      description: '实现快速排序算法，对给定数组进行升序排序。\n\n输入：第一行 n，第二行 n 个整数\n输出：排序后的序列，空格分隔',
      difficulty: 'MEDIUM',
      tags: ['排序', '分治'],
      knowledgeTreeId: sortNode.id,
      testCases: [
        { input: '5\n3 1 4 1 5', output: '1 1 3 4 5', isSample: true },
        { input: '1\n1', output: '1', isSample: false },
        { input: '5\n5 4 3 2 1', output: '1 2 3 4 5', isSample: false },
        { input: '3\n1 1 1', output: '1 1 1', isSample: false }
      ],
      solution: '选取基准元素，将数组分为小于和大于基准的两部分，递归排序。'
    },
    {
      title: '编辑距离',
      description: '给你两个单词 word1 和 word2，请返回将 word1 转换成 word2 所使用的最少操作数。\n\n你可以对一个单词进行如下三种操作：插入一个字符、删除一个字符、替换一个字符',
      difficulty: 'HARD',
      tags: ['动态规划', '字符串'],
      knowledgeTreeId: dpNode.id,
      testCases: [
        { input: 'horse\nros', output: '3', isSample: true },
        { input: 'intention\nexecution', output: '5', isSample: false },
        { input: 'a\nb', output: '1', isSample: false },
        { input: 'abc\nabc', output: '0', isSample: false }
      ],
      solution: '二维 DP：dp[i][j] 表示 word1 前 i 个字符转换到 word2 前 j 个字符的最少操作数。'
    },
    {
      title: '判断素数',
      description: '给定一个整数 n，判断它是否为素数。如果是素数输出 true，否则输出 false。',
      difficulty: 'EASY',
      tags: ['数论', '数学'],
      knowledgeTreeId: numTheoryNode.id,
      testCases: [
        { input: '7', output: 'true', isSample: true },
        { input: '4', output: 'false', isSample: true },
        { input: '1', output: 'false', isSample: false },
        { input: '2', output: 'true', isSample: false },
        { input: '97', output: 'true', isSample: false }
      ],
      solution: '从 2 遍历到 sqrt(n)，检查是否有因子。'
    },
    {
      title: '斐波那契数列',
      description: '求斐波那契数列的第 n 项。F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2)。',
      difficulty: 'EASY',
      tags: ['递归', '动态规划'],
      knowledgeTreeId: dpNode.id,
      testCases: [
        { input: '2', output: '1', isSample: true },
        { input: '3', output: '2', isSample: false },
        { input: '4', output: '3', isSample: false },
        { input: '10', output: '55', isSample: false },
        { input: '0', output: '0', isSample: false }
      ],
      solution: '迭代法：维护两个变量 prev, curr 依次计算。'
    }
  ];

  for (const p of programmingProblems) {
    const problem = await prisma.problem.create({
      data: {
        title: p.title,
        description: p.description,
        type: 'PROGRAMMING',
        difficulty: p.difficulty,
        tags: JSON.stringify(p.tags),
        testCases: JSON.stringify(p.testCases),
        timeLimit: 2000,
        memoryLimit: 256,
        knowledgeTreeId: p.knowledgeTreeId,
        solution: p.solution
      }
    });
    problems.push(problem);
  }

  // --- 选择题 ---
  const choiceProblems = [
    {
      title: '时间复杂度分析',
      description: '以下代码片段的时间复杂度是多少？\n\nfor (int i = 0; i < n; i++)\n  for (int j = 0; j < n; j++)\n    sum += i * j;',
      difficulty: 'EASY',
      tags: ['时间复杂度', '算法分析'],
      knowledgeTreeId: algoNode.id,
      choices: [
        { key: 'A', text: 'O(n)' },
        { key: 'B', text: 'O(n²)' },
        { key: 'C', text: 'O(n³)' },
        { key: 'D', text: 'O(log n)' }
      ],
      correctAnswer: 'B'
    },
    {
      title: '栈的特性',
      description: '栈（Stack）是一种什么类型的数据结构？',
      difficulty: 'EASY',
      tags: ['栈', '数据结构'],
      knowledgeTreeId: stackNode.id,
      choices: [
        { key: 'A', text: '先进先出（FIFO）' },
        { key: 'B', text: '先进后出（FILO）' },
        { key: 'C', text: '随机访问' },
        { key: 'D', text: '双端访问' }
      ],
      correctAnswer: 'B'
    },
    {
      title: '二叉搜索树性质',
      description: '在一棵二叉搜索树（BST）中，以下哪个性质是正确的？',
      difficulty: 'MEDIUM',
      tags: ['二叉搜索树', '树'],
      knowledgeTreeId: treeNode.id,
      choices: [
        { key: 'A', text: '左子树所有节点值大于根节点值' },
        { key: 'B', text: '右子树所有节点值小于根节点值' },
        { key: 'C', text: '左子树所有节点值小于根节点值，右子树所有节点值大于根节点值' },
        { key: 'D', text: '任意节点的值都大于其子节点的值' }
      ],
      correctAnswer: 'C'
    },
    {
      title: '快速排序平均时间复杂度',
      description: '快速排序的平均时间复杂度是？',
      difficulty: 'EASY',
      tags: ['排序', '时间复杂度'],
      knowledgeTreeId: sortNode.id,
      choices: [
        { key: 'A', text: 'O(n)' },
        { key: 'B', text: 'O(n log n)' },
        { key: 'C', text: 'O(n²)' },
        { key: 'D', text: 'O(log n)' }
      ],
      correctAnswer: 'B'
    },
    {
      title: '哈希表冲突处理',
      description: '以下哪种不是哈希表处理冲突的方法？',
      difficulty: 'MEDIUM',
      tags: ['哈希表', '数据结构'],
      knowledgeTreeId: hashNode.id,
      choices: [
        { key: 'A', text: '链地址法' },
        { key: 'B', text: '开放定址法' },
        { key: 'C', text: '再哈希法' },
        { key: 'D', text: '冒泡法' }
      ],
      correctAnswer: 'D'
    },
    {
      title: '图的遍历',
      description: '深度优先搜索（DFS）使用的数据结构是？',
      difficulty: 'EASY',
      tags: ['图', '深度优先搜索'],
      knowledgeTreeId: graphNode.id,
      choices: [
        { key: 'A', text: '队列' },
        { key: 'B', text: '栈' },
        { key: 'C', text: '堆' },
        { key: 'D', text: '哈希表' }
      ],
      correctAnswer: 'B'
    },
    {
      title: '动态规划特征',
      description: '动态规划适用于具有以下哪两种性质的问题？',
      difficulty: 'MEDIUM',
      tags: ['动态规划', '算法'],
      knowledgeTreeId: dpNode.id,
      choices: [
        { key: 'A', text: '贪心选择性质和最优子结构' },
        { key: 'B', text: '最优子结构和重叠子问题' },
        { key: 'C', text: '分治特征和递归性质' },
        { key: 'D', text: '回溯特征和剪枝性质' }
      ],
      correctAnswer: 'B'
    },
    {
      title: 'JavaScript 变量声明',
      description: '在 JavaScript 中，以下哪个关键字声明的变量存在变量提升（hoisting）？',
      difficulty: 'EASY',
      tags: ['JavaScript', '变量'],
      knowledgeTreeId: jsNode.id,
      choices: [
        { key: 'A', text: 'let' },
        { key: 'B', text: 'const' },
        { key: 'C', text: 'var' },
        { key: 'D', text: '以上都不是' }
      ],
      correctAnswer: 'C'
    },
    {
      title: 'TCP 协议',
      description: 'TCP 协议属于 OSI 模型的哪一层？',
      difficulty: 'EASY',
      tags: ['计算机网络', 'TCP'],
      knowledgeTreeId: knowledgeNodes.find(n => n.name === '计算机网络')?.id,
      choices: [
        { key: 'A', text: '应用层' },
        { key: 'B', text: '传输层' },
        { key: 'C', text: '网络层' },
        { key: 'D', text: '数据链路层' }
      ],
      correctAnswer: 'B'
    },
    {
      title: '归并排序特性',
      description: '关于归并排序，以下哪个说法是正确的？',
      difficulty: 'MEDIUM',
      tags: ['排序', '分治'],
      knowledgeTreeId: sortNode.id,
      choices: [
        { key: 'A', text: '是原地排序算法' },
        { key: 'B', text: '是不稳定排序' },
        { key: 'C', text: '时间复杂度始终为 O(n log n)' },
        { key: 'D', text: '空间复杂度为 O(1)' }
      ],
      correctAnswer: 'C'
    }
  ];

  for (const p of choiceProblems) {
    const problem = await prisma.problem.create({
      data: {
        title: p.title,
        description: p.description,
        type: 'CHOICE',
        difficulty: p.difficulty,
        tags: JSON.stringify(p.tags),
        testCases: '[]',
        choices: JSON.stringify(p.choices),
        correctAnswer: p.correctAnswer,
        knowledgeTreeId: p.knowledgeTreeId
      }
    });
    problems.push(problem);
  }

  // --- 填空题 ---
  const fillBlankProblems = [
    {
      title: '数组访问时间复杂度',
      description: '数组通过下标访问元素的时间复杂度为 O(___)。',
      difficulty: 'EASY',
      tags: ['数组', '时间复杂度'],
      knowledgeTreeId: arrayNode.id,
      fillBlanks: ['1'],
      correctAnswer: '1'
    },
    {
      title: '完全二叉树节点数',
      description: '一棵深度为 k 的满二叉树共有 ___ 个节点。',
      difficulty: 'MEDIUM',
      tags: ['二叉树', '数据结构'],
      knowledgeTreeId: treeNode.id,
      fillBlanks: ['2^k-1'],
      correctAnswer: '2^k-1'
    },
    {
      title: '二分查找前提',
      description: '二分查找要求数组必须是 ___ 的。',
      difficulty: 'EASY',
      tags: ['二分查找', '搜索'],
      knowledgeTreeId: searchNode.id,
      fillBlanks: ['有序'],
      correctAnswer: '有序'
    },
    {
      title: '哈希表平均查找',
      description: '在理想情况下，哈希表的查找时间复杂度为 O(___)。',
      difficulty: 'EASY',
      tags: ['哈希表', '时间复杂度'],
      knowledgeTreeId: hashNode.id,
      fillBlanks: ['1'],
      correctAnswer: '1'
    },
    {
      title: 'Python 列表推导',
      description: '在 Python 中，[x**2 for x in range(5)] 的结果是 ___。',
      difficulty: 'EASY',
      tags: ['Python', '列表推导式'],
      knowledgeTreeId: pyNode.id,
      fillBlanks: ['[0, 1, 4, 9, 16]'],
      correctAnswer: '[0, 1, 4, 9, 16]'
    }
  ];

  for (const p of fillBlankProblems) {
    const problem = await prisma.problem.create({
      data: {
        title: p.title,
        description: p.description,
        type: 'FILL_BLANK',
        difficulty: p.difficulty,
        tags: JSON.stringify(p.tags),
        testCases: '[]',
        fillBlanks: JSON.stringify(p.fillBlanks),
        correctAnswer: p.correctAnswer,
        knowledgeTreeId: p.knowledgeTreeId
      }
    });
    problems.push(problem);
  }

  // ========== 4. 题解 ==========
  console.log('💡 创建题解...');
  for (let i = 0; i < Math.min(5, programmingProblems.length); i++) {
    await prisma.solution.create({
      data: {
        problemId: problems[i].id,
        title: `${programmingProblems[i].title} - 题解`,
        content: programmingProblems[i].solution,
        code: '// 示例代码\nfunction solve() {\n  // TODO\n}',
        complexity: 'O(n)'
      }
    });
  }

  // ========== 5. 考试 ==========
  console.log('📋 创建考试...');
  const programmingIds = problems.filter(p => p.type === 'PROGRAMMING').map(p => p.id);
  const choiceIds = problems.filter(p => p.type === 'CHOICE').map(p => p.id);
  const fillBlankIds = problems.filter(p => p.type === 'FILL_BLANK').map(p => p.id);

  const exam1 = await prisma.exam.create({
    data: {
      title: '数据结构期中考试',
      description: '涵盖数组、链表、栈、队列、树等数据结构基础知识',
      type: 'EXAM',
      duration: 90,
      enableProctoring: true,
      createdBy: admin.id,
      isActive: true
    }
  });

  const exam1Questions = [
    ...choiceIds.slice(0, 4).map((pid, idx) => ({ examId: exam1.id, problemId: pid, order: idx, points: 5 })),
    ...fillBlankIds.slice(0, 2).map((pid, idx) => ({ examId: exam1.id, problemId: pid, order: idx + 4, points: 10 })),
    ...programmingIds.slice(0, 3).map((pid, idx) => ({ examId: exam1.id, problemId: pid, order: idx + 6, points: 20 }))
  ];
  for (const q of exam1Questions) {
    await prisma.examQuestion.create({ data: q });
  }

  const exam2 = await prisma.exam.create({
    data: {
      title: '算法基础练习',
      description: '排序、搜索、动态规划基础练习',
      type: 'PRACTICE',
      duration: 60,
      enableProctoring: false,
      createdBy: admin.id,
      isActive: true
    }
  });

  const exam2Questions = [
    ...choiceIds.slice(4, 7).map((pid, idx) => ({ examId: exam2.id, problemId: pid, order: idx, points: 5 })),
    ...programmingIds.slice(3, 7).map((pid, idx) => ({ examId: exam2.id, problemId: pid, order: idx + 3, points: 15 }))
  ];
  for (const q of exam2Questions) {
    await prisma.examQuestion.create({ data: q });
  }

  const exam3 = await prisma.exam.create({
    data: {
      title: '编程能力测验',
      description: '综合编程能力测试，包含多种难度',
      type: 'QUIZ',
      duration: 45,
      enableProctoring: false,
      createdBy: teacher.id,
      isActive: true
    }
  });
  const exam3Questions = [
    ...programmingIds.slice(7, 12).map((pid, idx) => ({ examId: exam3.id, problemId: pid, order: idx, points: 10 }))
  ];
  for (const q of exam3Questions) {
    await prisma.examQuestion.create({ data: q });
  }

  // ========== 6. 模拟提交记录 ==========
  console.log('📊 创建模拟提交记录...');
  const statuses = ['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR'];
  for (const student of students.slice(0, 5)) {
    for (let pi = 0; pi < Math.min(8, problems.length); pi++) {
      const problem = problems[pi];
      const status = Math.random() > 0.4 ? 'ACCEPTED' : statuses[Math.floor(Math.random() * statuses.length)];
      const isProgramming = problem.type === 'PROGRAMMING';
      await prisma.submission.create({
        data: {
          userId: student.id,
          problemId: problem.id,
          type: problem.type,
          code: isProgramming ? `// ${student.username} 的提交\nfunction solve() { /* ... */ }` : null,
          answer: problem.type === 'CHOICE' ? 'B' : problem.type === 'FILL_BLANK' ? '1' : null,
          status,
          result: JSON.stringify({ status, message: status === 'ACCEPTED' ? '通过' : '未通过' }),
          score: status === 'ACCEPTED' ? 100 : Math.floor(Math.random() * 60),
          pointsEarned: status === 'ACCEPTED' ? (problem.difficulty === 'EASY' ? 10 : problem.difficulty === 'MEDIUM' ? 20 : 30) : 0,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 3600 * 1000))
        }
      });
    }
  }

  // ========== 7. 模拟考试提交 ==========
  console.log('📝 创建模拟考试提交...');
  for (const student of students.slice(0, 4)) {
    const answers: Record<string, any> = {};
    const exam1Qs = await prisma.examQuestion.findMany({ where: { examId: exam1.id } });
    for (const q of exam1Qs) {
      const prob = await prisma.problem.findUnique({ where: { id: q.problemId } });
      if (prob?.type === 'PROGRAMMING') {
        answers[q.problemId] = { code: `// ${student.username} code\nfunction solve() {}`, language: 'javascript' };
      } else if (prob?.type === 'CHOICE') {
        answers[q.problemId] = 'B';
      } else {
        answers[q.problemId] = '1';
      }
    }
    const startTime = new Date(Date.now() - Math.floor(Math.random() * 3 * 24 * 3600 * 1000));
    await prisma.examAttempt.create({
      data: {
        examId: exam1.id,
        userId: student.id,
        startTime,
        endTime: new Date(startTime.getTime() + 45 * 60 * 1000),
        score: Math.floor(Math.random() * 60) + 40,
        status: 'GRADED',
        answers: JSON.stringify(answers),
        violations: JSON.stringify({ questionResults: exam1Qs.map(q => ({
          problemId: q.problemId,
          isCorrect: Math.random() > 0.5,
          points: q.points,
          earnedPoints: Math.random() > 0.5 ? q.points : 0,
          type: 'PROGRAMMING'
        }))})
      }
    });
  }

  // ========== 8. 模拟PK对战 ==========
  console.log('⚔️ 创建模拟PK记录...');
  for (let mi = 0; mi < 3; mi++) {
    const matchProblems = programmingIds.slice(mi * 2, mi * 2 + 3);
    const match = await prisma.match.create({
      data: {
        type: '1V1_RANKED',
        status: 'COMPLETED',
        startTime: new Date(Date.now() - (mi + 1) * 24 * 3600 * 1000),
        endTime: new Date(Date.now() - (mi + 1) * 24 * 3600 * 1000 + 600000),
        winnerId: students[mi * 2].id,
        rewards: JSON.stringify({ winnerPoints: 30, loserPoints: 5 }),
        problems: { create: matchProblems.map((pid, idx) => ({ problemId: pid, order: idx })) }
      }
    });
    await prisma.matchParticipant.create({
      data: {
        matchId: match.id, userId: students[mi * 2].id,
        score: Math.floor(Math.random() * 40) + 60, correctCount: Math.floor(Math.random() * 3) + 2,
        totalTime: Math.floor(Math.random() * 300) + 100, isWinner: true
      }
    });
    await prisma.matchParticipant.create({
      data: {
        matchId: match.id, userId: students[mi * 2 + 1].id,
        score: Math.floor(Math.random() * 30) + 30, correctCount: Math.floor(Math.random() * 2) + 1,
        totalTime: Math.floor(Math.random() * 400) + 200, isWinner: false
      }
    });
  }

  // ========== 9. 等级配置 ==========
  console.log('📈 创建等级配置...');
  const levels = [
    { level: 1, name: '初学者', minPoints: 0, maxPoints: 50 },
    { level: 2, name: '入门者', minPoints: 51, maxPoints: 150 },
    { level: 3, name: '进阶者', minPoints: 151, maxPoints: 300 },
    { level: 4, name: '熟练者', minPoints: 301, maxPoints: 500 },
    { level: 5, name: '专家', minPoints: 501, maxPoints: 800 },
    { level: 6, name: '大师', minPoints: 801, maxPoints: null }
  ];
  for (const l of levels) {
    await prisma.levelConfig.create({ data: l });
  }

  // ========== 10. 成就 ==========
  console.log('🏆 创建成就...');
  const achievements = [
    { name: 'first_ac', description: '第一次通过题目', criteria: 'submit_first_accepted', points: 10 },
    { name: 'streak_3', description: '连续通过3道题', criteria: 'streak_3', points: 20 },
    { name: 'streak_7', description: '连续通过7道题', criteria: 'streak_7', points: 50 },
    { name: 'solve_10', description: '累计通过10道题', criteria: 'total_accepted_10', points: 30 },
    { name: 'solve_50', description: '累计通过50道题', criteria: 'total_accepted_50', points: 100 },
    { name: 'hard_solver', description: '通过第一道困难题', criteria: 'solve_hard', points: 50 },
    { name: 'speed_demon', description: '在1分钟内通过一道中等题', criteria: 'fast_solve_medium', points: 40 },
    { name: 'exam_perfect', description: '考试获得满分', criteria: 'exam_score_100', points: 80 },
    { name: 'match_winner', description: 'PK对战获胜', criteria: 'match_win', points: 30 },
    { name: 'daily_login', description: '连续登录7天', criteria: 'login_streak_7', points: 20 }
  ];
  for (const a of achievements) {
    await prisma.achievement.create({ data: a });
  }

  // ========== 11. AI配置 ==========
  console.log('🤖 创建AI配置...');
  await prisma.aIConfig.create({
    data: { enabled: false, provider: 'openai', model: 'gpt-3.5-turbo' }
  });

  console.log('✅ 数据填充完成！');
  console.log(`  用户: ${1 + 1 + students.length} 个`);
  console.log(`  知识树: ${knowledgeNodes.length} 个节点`);
  console.log(`  题目: ${problems.length} 道`);
  console.log(`  考试: 3 场`);
  console.log(`  等级: ${levels.length} 级`);
  console.log(`  成就: ${achievements.length} 个`);
  console.log('');
  console.log('🔑 账户信息:');
  console.log('  管理员: admin / admin123');
  console.log('  教师: teacher / 123456');
  console.log('  学生: student1~8 / 123456');
}

main()
  .catch((e) => { console.error('❌ 数据填充失败:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
