/**
 * 前端版本配置（编译时注入）
 * deploy版不包含付费/权限区分相关代码
 */

declare const __EDITION__: string;
declare const __FEATURE_PAYMENT__: boolean;
declare const __FEATURE_ACCESS_CONTROL__: boolean;

export const EDITION = __EDITION__;
/** 是否包含付费/商业化模块 */
export const FEATURE_PAYMENT = __FEATURE_PAYMENT__;
/** 是否区分免费/会员身份 */
export const FEATURE_ACCESS_CONTROL = __FEATURE_ACCESS_CONTROL__;
/** 是否为全量版 */
export const IS_FULL = EDITION === 'full';
/** 是否为私有部署版 */
export const IS_DEPLOY = EDITION === 'deploy';
