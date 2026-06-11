import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { accessAPI } from '../services/api';

interface KnowledgeTreeAccess {
  allAccess: boolean;
  restrictedNodeIds: string[] | null;
}

interface FeatureAccessState {
  /** 知识树可访问根节点信息 */
  knowledgeTreeAccess: KnowledgeTreeAccess;
  /** 用户是否为免费（TRIAL）身份 */
  isFreeUser: boolean;
  /** 判断某功能是否可用（基于 accessType，无网络请求） */
  canUseFeature: (featureKey: string) => boolean;
  /** 加载中 */
  loading: boolean;
  /** 手动刷新权限数据 */
  refresh: () => void;
}

/**
 * 免费用户不可使用的付费功能集合
 * 对应需求：AI功能全部禁用、社区不能发帖
 */
const PREMIUM_FEATURES = new Set([
  'ai-companion',    // AI学伴
  'ai-hint',         // AI提示
  'ai-judge',        // AI判题
  'ai-find-problems',// AI找题
  'ai-classify',     // AI分类
  'interview',       // AI面试
  'bug-hunter',      // AI猎虫
  'discussions_post',// 社区发帖
]);

/**
 * 根据用户访问权限（accessType）控制前端功能入口的显示/禁用
 *
 * 判定逻辑：
 * - ADMIN / TEACHER 角色：所有功能可用
 * - STUDENT + 非 TRIAL accessType（如 PAID）：所有功能可用
 * - STUDENT + TRIAL / 无 accessType：受限，PREMIUM_FEATURES 中的功能不可用
 */
export function useFeatureAccess(): FeatureAccessState {
  const { user, isAuthenticated, accessStatus } = useAuthStore();
  const [knowledgeTreeAccess, setKnowledgeTreeAccess] = useState<KnowledgeTreeAccess>({
    allAccess: true,
    restrictedNodeIds: null,
  });
  const [loading, setLoading] = useState(true);

  // 判断是否为免费用户：STUDENT 角色 + accessType 为 TRIAL 或空
  const isFreeUser = (() => {
    if (!user || !isAuthenticated) return false;
    if (user.role === 'ADMIN' || user.role === 'TEACHER') return false;
    const type = accessStatus?.accessType?.toUpperCase();
    return !type || type === 'TRIAL';
  })();

  const fetchAccess = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await accessAPI.getAccessibleKnowledgeRoots();
      if (res.success && res.data) {
        setKnowledgeTreeAccess(res.data);
      }
    } catch {
      // 接口异常时保持受限状态（安全第一），不默认开放
      // 若之前已有数据则保留，否则免费用户维持受限
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const canUseFeature = useCallback((featureKey: string): boolean => {
    if (!isFreeUser) return true;
    return !PREMIUM_FEATURES.has(featureKey);
  }, [isFreeUser]);

  return {
    knowledgeTreeAccess,
    isFreeUser,
    canUseFeature,
    loading,
    refresh: fetchAccess,
  };
}
