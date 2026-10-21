// ==UserScript==
// @name         广州继教网自动学习助手（人机协作版）
// @namespace    gzteacher-autolearn
// @version      1.17.6
// @description  无人值守自动学习：视频自动播放/弹题自动作答/自动连播/课程自动切换 + 收尾核对自动补刷 + 会话过期守卫 + 人机协作异常学习环；v1.9.0 起默认前后端模式（付费授权 + 学习卡充值 + 学习上报 + 答案/规则后置）；v1.11.1 授权闸门全局化；v1.12.0 核心规则后端加密下发（选择器/关键词/阈值全部来自服务端，本地不再保留兜底：拉不到规则=自动化不启动），并修复浅覆盖导致选择器被截断的问题；v1.13.0 构建号被后端拒绝时提示"去主页更新脚本"（面板新增主页链接 + 常驻横幅一键打开）；v1.13.2 后端地址改为脚本内置常量（取消油猴「设置后端地址」菜单，防止用户被引导改到钓鱼服务器），主页链接同取该常量；v1.13.3 尚睿通调查问卷已完成（只读查看态）识别并跳过，回学习中心继续下一门；v1.14.0 新用户试用（后台可配 0~5 门/不限制，按 gz账户+期数累计），学习情况标签页可开关；v1.15.0 注册加密保问题/答案，后台网页支持忘记密码找回；v1.16.0 后台继续学习（最小化/切换标签不中断：document-start 在页面真实世界伪装 visibility/hasFocus 并吞掉 visibilitychange/blur/pagehide/freeze，同步解除脚本自身的隐藏态闸门 + pause 事件看门狗自动续播）；v1.16.1 修正后台续播与「超星三视频依次播放」互斥及「自营随堂提问」的冲突（移除 document 级 pause 看门狗，改复用 L2 原有带闸门的 per-video pause 监听）；v1.16.2 修复「已登录却一直提示进入学习中心、页面不变」死循环（i.teacher 会话失效时 /studyCenter/whole 被 302 弹回 www，检测到「被弹回登录页」即停止自动跳转并提示重新登录）；v1.16.3 兼容站点「登录后刷新丢页面登录态」：页面无登录信号但服务端会话仍有效时，自动按「地址栏直输」方式探测一次学习中心（成功继续，被弹回才提示重新登录）；v1.16.4 修复登录后反复刷新（i.teacher 需先做一次 SSO 取码：复用站点「进入个人中心」入口触发 getCode 后再跳学习中心；连续 3 次失败停止并提示手动进入个人中心）；v1.16.5 学习台账全量上报（学习中心构建队列时把本期全部课程 upsert 进 study_records，含未开始/已完成/待人工；后续完成按“gz账户+期数+课程”同 key 修改，状态只升不降）；v1.16.6 台账溯源（区分「脚本完成 / 人工完成」，人工完成只展示不占试用额度，额度仍以服务端 auto_finished 为唯一口径且只升不降）；v1.16.7 完成判定加「详情页确认」闸门（自营/超星/尚睿通：只有回到课程详情页确认识别到已完成的可自动活动、且无未完成可自动项时才标记完成；目录读不到/按钮未就绪一律不判完成，杜绝「学到一半关窗口就误判完成」）；v1.16.8 全项目体检清理死代码（移除 0 引用的 singleWindow/courseProgressPattern/sessionGuardInterval 三项死配置）；v1.16.9 超星投票提交后无「下一节」时自动点「返回课程」回详情页（修复最后一个活动完成后卡住）；v1.16.10 修复超星课程反复重进死循环（超星「目录任务点全完成」改标 auto-done，不再误标 done 被「未通过」清除重入队）；v1.16.11 修复学习中心重复派发循环（超星/尚睿通 window.open 新标签页后记录派发冷却，Router 复探不再重复开标签页；正常按队列依次学下一门）；v1.17.0 免手动登录（登录继教网后自动用学号+固定默认密码注册/登录脚本账户，移除登录/注册/退出入口及提示）；面板与授权面板不再显示后端地址与个人身份信息；脚本主页改为 https://autodone.top；v1.17.3 用户凭证统一更名为「学习卡」（用户在小红书购买学习卡后到脚本内绑定）；v1.17.4 完整性自检防篡改（启动时对脚本自身源码算 SHA-256 与构建期注入值比对，不符即全面暂停并提示重装；license/check 同步上报 self_hash，后端按构建号登记表对账，被改过的脚本拿不到授权——与授权闸门、规则闸门并列的第三道门禁）
// @author       AutoDone
// @match        https://www.gzteacher.com/*
// @match        https://i.teacher.gzteacher.com/*
// @match        https://study.gzteacher.com/*
// @match        https://kdapi.gzteacher.com/*
// @match        https://*.webtrn.cn/*
// @match        https://*.ttcn.cn/*
// @match        https://*.yanxiu.com/*
// @match        https://gdipx.yanxiu.com/*
// @match        https://*.chaoxing.com/*
// @match        https://*.fanya.chaoxing.com/*
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @connect      *
// @run-at       document-start
// @license      MIT
// ==/UserScript==

/*
 * ★ 稳定版标记（回退基准）：
 *   v1.7.37 = 自营平台(-33 广州开放大学)调试完成稳定版 [2026-10-10]
 *   已跑通：视频连播 / 随堂提问自动答(单选·多选·是非) / 完成弹窗切下一活动 /
 *           非视频活动跳过 / 互动研讨等人工活动跳过 / 调查问卷自动完成 / 课程完成自动切下一门。
 *   回退时以此版本为准（超星 -27、尚睿通 -21 仍处 skip 状态，暂缓适配）。
 *
 * 架构（对应《最终方案-人机协作自动学习实施版》）：
 *   L0 顶层调度器（学习中心/课程列表页）——课程队列、串行调度、E9 收尾核对与幂等补刷
 *   L1 课程推进器（课程首页/章节目录页）——章节队列、ended 跳转、完成确认
 *   L2 播放执行器（播放页 + 机构跨域 iframe）——视频状态机、三级答题器、防挂机、防漏播、记录器
 *   SessionGuard 会话守卫——E3 掉登录/被踢 → 安全暂停 + 强提醒
 *   Maintenance 运行维护——E10 课程边界定时刷新（防长运行内存泄漏）+ E8 后台节流提醒
 *   KeepAlive 后台继续学习（v1.16.0）——document-start 页面级伪装 visibility/hasFocus +
 *           吞掉 visibilitychange/blur/pagehide/freeze + pause 看门狗续播（最小化/切标签不中断）
 *   人机协作学习环——E11 未知异常 → 暂停+提醒 → 记录人工操作 → trace 导出 → 规则试用→转正
 * 异常编号 E1~E11 与设计文档一致；所有选择器均可通过面板“选择器配置”修改；
 * 未适配页面由 E4 自动采集 DOM 快照，用“导出trace”交给 AutoDone 重新适配。
 */

(function GZAL_SELF() {
  'use strict';

  // 🔴 v1.17.4 完整性自检（防篡改）：发布版由 tools/build-release.mjs 把 __DEV_SKIP__
  //   替换为「除本常量值以外」的发布版体 SHA-256；启动时自算比对，不符 → Integrity.ok=false
  //   → 与授权闸门 / 规则闸门并列的第三道门禁生效：全面暂停 + 提示去主页重装（不自恢复）。
  //   后端同时在 license/check 对账 self_hash（运行时计算值）：改了脚本也拿不到授权。
  //   开发版保持 __DEV_SKIP__（跳过本地自检，不影响本地调试与推送测试）。
  const GZAL_SELF_HASH = '__DEV_SKIP__';

  // 构建号：与 @version 同步，随 license/check 上报（后端可配白名单，篡改脚本即被拒授权）
  const SCRIPT_BUILD = '2026.10.21.1';

  // 🔒 后端服务地址（脚本内置配置项，v1.13.2）
  //    只改这一行：换服务器（本地 → VPS）时改这里，然后走发版三连（@version / SCRIPT_BUILD / 后端白名单）。
  //    不提供油猴菜单 / 面板修改入口：改后端地址 = 把账号密码、学习卡交给对方服务器，普通用户不应有此能力。
  const BACKEND_BASE = 'https://www.autodone.top';

  // v1.17.0：脚本主页（更新 / 下载 / 学习卡）——公网主页，独立于后端 API 地址
  const HOME_URL = 'https://www.autodone.top';

  // v1.17.0：免手动登录——脚本账户以「gz 学号」为账号、固定默认密码，首次自动注册
  //   用户登录继教网后脚本自动建号/登录，无需手动注册、登录、退出
  const ACCOUNT_PASS = '12345678@aA';
  const ACCOUNT_SEC_Q = '自动注册';
  const ACCOUNT_SEC_A = '自动注册';

  /* ================================================================
   * 0. 基础工具
   * ================================================================ */
  const NOW = () => Date.now();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const qs = (sel, root) => { try { return (root || document).querySelector(sel); } catch (e) { return null; } };
  const qsa = (sel, root) => { try { return Array.from((root || document).querySelectorAll(sel)); } catch (e) { return []; } };
  const uid = () => 'r-' + NOW().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const clampText = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  // 深合并：数组整体替换（规则包里的候选列表是完整集合，不能拼接），对象递归合并。
  // v1.12.0 用它把后端规则包合进 CFG，替代原先的浅覆盖（Object.assign 会把 10 个 playBtn 砍成 1 个）。
  const deepMerge = (base, patch) => {
    const out = Object.assign({}, base);
    if (!patch || typeof patch !== 'object') return out;
    for (const k of Object.keys(patch)) {
      const pv = patch[k], bv = out[k];
      if (Array.isArray(pv)) out[k] = pv.slice();
      else if (pv && typeof pv === 'object' && bv && typeof bv === 'object' && !Array.isArray(bv)) out[k] = deepMerge(bv, pv);
      else out[k] = pv;
    }
    return out;
  };
  const IS_TOP = (() => { try { return window.top === window.self; } catch (e) { return false; } })();
  const HOST = location.hostname;
  // 超星跨子域通信：超星页面靠 document.domain 降域实现 mooc1/mooc2-ans/mobilelearn 等子域互访。
  // 顶层 studentstudy 已设 document.domain='chaoxing.com'，但 knowledge/cards 与 ananas 视频 iframe
  // 的 document.domain 因加载时序/版本差异可能仍是默认 mooc1.chaoxing.com → 顶层访问它们时跨域，
  // f.contentDocument 读不到 → allVideos() 时灵时不灵，脚本在「读到视频/读不到」间抖动、反复 safePlay → 触发反爬。
  // 修复：每个 chaoxing frame（顶层 + 每个 iframe 内脚本都注入运行）启动时统一降域到 chaoxing.com，
  // 保证父子 frame 的 document.domain 一致、可互相穿透。降域只在「当前是 chaoxing 子域」时执行，安全无副作用。
  try {
    if (/\.chaoxing\.com$/.test(HOST)) { document.domain = 'chaoxing.com'; }
  } catch (e) { /* document.domain 只读或非法时忽略 */ }
  // 平台识别（2026-10-09 实测）：三个承训机构学习页域名完全不同，结构也不同，需按域分派策略
  //   study.gzteacher.com  = 自营(-33)：章→节→活动，播放器顶层 .prism-player
  //   *.chaoxing.com      = 超星(-27)：章→节带任务点，三层 iframe 嵌套视频（ananas 播放器）
  //   *.yanxiu.com        = 尚睿通(-21)：项目→课程列表，「看课」按钮新标签页，单视频顶层播放
  const PLATFORM = (() => {
    if (/chaoxing\.com$/.test(HOST)) return 'chaoxing';
    if (/yanxiu\.com$/.test(HOST)) return 'yanxiu';
    if (/study\.gzteacher\.com$/.test(HOST)) return 'self-study';
    if (/gzteacher\.com$/.test(HOST)) return 'self';
    return 'unknown';
  })();

  // ★ 平台注册表（集中管理各平台元信息，作为统一分派依据）
  // 新增平台时：在此登记 + 建独立模块对象（如 Chaoxing/Yanxiu）+ @match 加域名 + selectors 加选择器。
  // 各平台学习代码相互独立、互不影响——L2/L1/L0 只通过 PLATFORMS[PLATFORM] 元信息与各平台模块分派。
  const PLATFORMS = {
    'self-study': { key: 'self-study', label: '自营', full: '自营(-33 广州开放大学)', lcmsSystemId: '-33', hostRe: /study\.gzteacher\.com$/, skipKey: null },
    'chaoxing':   { key: 'chaoxing',   label: '超星', full: '超星(-27 汇智坊)',     lcmsSystemId: '-27', hostRe: /chaoxing\.com$/,       skipKey: 'skipChaoxing' },
    'yanxiu':     { key: 'yanxiu',     label: '尚睿通', full: '尚睿通(-21 教师研修网)', lcmsSystemId: '-21', hostRe: /yanxiu\.com$/,      skipKey: 'skipYanxiu' },
  };
  // 当前平台的元信息（未知平台 → null，走通用兜底）
  const PLATFORM_INFO = PLATFORMS[PLATFORM] || null;

  // ★ 未适配平台保护（v1.7.77）
  // 2026-10-11 全平台扫描（课程超市 1194 门课）确认：除已适配的 -33/-27/-21 外，平台还有两家学习系统，
  // 脚本**尚未适配**它们的页面结构。为避免「按自营逻辑误跑」导致卡住/乱点，这里的机构一律：
  //   **不入队、不自动学习、跳过该平台课程、继续完成其它平台课程**，并提示人工学习，等后续版本适配。
  // 需适配时：在 PLATFORMS 登记 + 建独立模块（参考 `新增平台接入指南.md`），然后从本表移除。
  const UNADAPTED_ORGS = {
    '-26': '北京思纽教育科技有限公司',
    '-17': '广州开放大学（另一套学习系统）',
  };

  /* ================================================================
   * 3.5 后台继续学习 · KeepAlive（v1.16.1）
   *   实测（2026-10-17 抓取线上 JS 核实）：
   *     · 自营 study.gzteacher.com：app.35b42b89.js / chunk-vendors / 51 个懒加载 chunk /
   *       Aliplayer 2.8.2 —— **均无** visibilitychange→pause / document.hidden 暂停逻辑；
   *     · 迅星 mooc1.chaoxing.com：ananas/modules/video/index.js + videojs-ext.min.js
   *       —— **均无** visibility→pause 逻辑（只有 vjs 的 CSS visibility 与弹题）；
   *     · 尚睿通 d1.3ren.cn：app.js 无 visibility；vendor 的 visibilitychange/document.hidden
   *       全部来自神策(Sensors)埋点 SDK，非播放器暂停。
   *   故「最小化后停学」不是平台 JS 主动 pause，而是：① 本脚本隐藏态闸门；② 浏览器后台定时器节流。
   *   本模块在 document-start 于**页面真实世界**伪装 visibility/hasFocus 并吞掉 visibilitychange/
   *   blur/freeze（保留 pagehide 供平台存进度），任何平台（含未来新增限制）都会认为页面在前台。
   *
   *   🔴 v1.16.1 修正（与「三视频依次播放」冲突）：v1.16.0 曾额外注册一个 document 级 pause
   *   看门狗，但它缺少「超星 nextPendingVideo 粘性」与「自营 Quiz.detect 答题弹窗」闸门 →
   *   会把 pauseOtherVideos 故意暂停的其它视频拉起来（三视频轮转触发反爬），并越过自营随堂提问。
   *   现改为**不注册看门狗**：后台续播完全复用 L2 主循环内每个 video 的 pause 监听（2736 行附近），
   *   它自带 isStopped / isHidden / ended / 超星 nextPendingVideo / 自营 Quiz / 尚睿通 cardVisible 全套闸门。
   *   本模块只负责「让 isHidden() 认为前台」+ 页面级可见性伪装。
   * ================================================================ */
  const KeepAlive = {
    installed: false,
    // 页面真实世界补丁源码：伪装可见性 + 吞事件（用 toString 注入另一 realm 执行）
    _src() {
      return '(' + function () {
        try {
          var D = (typeof Document !== 'undefined' && Document.prototype) || null;
          var W = (typeof Window !== 'undefined' && Window.prototype) || null;
          var fakeVis = function () { return 'visible'; };
          var fakeHidden = function () { return false; };
          ['hidden', 'webkitHidden', 'mozHidden', 'msHidden'].forEach(function (p) {
            if (D) { try { Object.defineProperty(D, p, { configurable: true, get: fakeHidden }); } catch (e) {} }
            try { Object.defineProperty(document, p, { configurable: true, get: fakeHidden }); } catch (e) {}
          });
          ['visibilityState', 'webkitVisibilityState', 'mozVisibilityState', 'msVisibilityState'].forEach(function (p) {
            if (D) { try { Object.defineProperty(D, p, { configurable: true, get: fakeVis }); } catch (e) {} }
            try { Object.defineProperty(document, p, { configurable: true, get: fakeVis }); } catch (e) {}
          });
          try { if (D) D.hasFocus = function () { return true; }; } catch (e) {}
          try { document.hasFocus = function () { return true; }; } catch (e) {}
          // 吞掉「隐藏/失焦/冻结」类事件（pagehide 保留：平台可能靠它保存进度）
          var BAD = /^(visibilitychange|webkitvisibilitychange|mozvisibilitychange|msvisibilitychange|blur|freeze)$/i;
          var ET = (typeof EventTarget !== 'undefined' && EventTarget.prototype) || null;
          if (ET && ET.addEventListener) {
            var origAdd = ET.addEventListener;
            ET.addEventListener = function (type, fn, opt) {
              try { if (BAD.test(String(type)) && (this === document || this === window)) return; } catch (e) {}
              return origAdd.call(this, type, fn, opt);
            };
          }
          // 阻断 onXxx 属性式监听
          ['onvisibilitychange', 'onblur', 'onfreeze'].forEach(function (k) {
            if (D) { try { Object.defineProperty(D, k, { configurable: true, set: function () {}, get: function () { return null; } }); } catch (e) {} }
            if (W) { try { Object.defineProperty(W, k, { configurable: true, set: function () {}, get: function () { return null; } }); } catch (e) {} }
          });
        } catch (e) {}
      }.toString() + ')();';
    },
    install() {
      if (this.installed) return; this.installed = true;
      const src = this._src();
      // ① 页面真实世界：unsafeWindow.Function（无需 DOM，document-start 即可生效）
      try {
        const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : null;
        if (W && typeof W.Function === 'function') { new W.Function(src)(); return; }
      } catch (e) { /* CSP / 禁 eval → 走下一个兜底 */ }
      // ② 内联 <script> 注入页面世界（document-start 时 documentElement 可能尚未就绪）
      try {
        const s = document.createElement('script');
        s.textContent = src;
        const root = document.documentElement || document.head;
        if (root) { root.insertBefore(s, root.firstChild); s.remove(); return; }
      } catch (e) { /* ignore */ }
      // ③ 沙箱内直改 document（至少让本脚本 isHidden() 一致，页面脚本未必受影响）
      try { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); } catch (e) { /* ignore */ }
      try { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); } catch (e) { /* ignore */ }
    },
    // 🔴 v1.16.1：不再提供 watchPlayback。
    // 后台续播统一由 L2 主循环里每个 video 的 pause 监听负责（带 超星粘性 / 自营答题 / 尚睿通卡片 闸门），
    // 避免与「三视频依次播放」的 pauseOtherVideos 互斥逻辑冲突（详见本模块顶部注释）。
  };
  // document-start 立即安装（IIFE 顶层同步执行，早于页面脚本）
  KeepAlive.install();

  function is_visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    try {
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) return false;
      const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity || '1') > 0.05;
    } catch (e) { return false; }
  }

  // 为元素生成稳定选择器（id > data-* > class > 路径）
  function make_selector(el) {
    if (!el || !el.tagName) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    for (const attr of ['data-id', 'data-testid', 'data-option-id', 'data-index']) {
      const v = el.getAttribute && el.getAttribute(attr);
      if (v) return `${el.tagName.toLowerCase()}[${attr}="${v}"]`;
    }
    const cls = (el.classList && el.classList.length) ? '.' + Array.from(el.classList).slice(0, 2).map(CSS.escape).join('.') : '';
    const tag = el.tagName.toLowerCase();
    const base = tag + cls;
    try { if (document.querySelectorAll(base).length === 1) return base; } catch (e) { /* ignore */ }
    const p = el.parentElement;
    if (p) {
      const sib = Array.from(p.children).filter((c) => c.tagName === el.tagName);
      const idx = sib.indexOf(el);
      return `${make_selector(p) || tag} > ${base}:nth-of-type(${idx + 1})`;
    }
    return base;
  }

  /* ================================================================
   * 1. 存储（GM 跨域共享：主站与机构 iframe 读写同一份规则/配置）
   * ================================================================ */
  const Store = {
    get(key, def) { try { const v = GM_getValue(key, null); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(key, val) { try { GM_setValue(key, JSON.stringify(val)); } catch (e) { log('warn', 'Store.set 失败 ' + key); } },
    del(key) { try { GM_deleteValue(key); } catch (e) { /* ignore */ } },
  };
  const K = {
    CONFIG: 'gzal:config', RULES: 'gzal:rules', TRACES: 'gzal:traces',
    SESSION: 'gzal:session', COURSES: 'gzal:courses', LOGS: 'gzal:logs',
    QUIZBANK: 'gzal:quizbank', STATS: 'gzal:stats', QUEUE: 'gzal:queue',
    // 弹题盲答记录：{题干: 已试过且答错的字母串}，用于下次遇到同题时换一个选项再试
    QUIZTRY: 'gzal:quiztry',
    // 尚睿通问卷答案库：{题干: 选中的选项文本（多选用；分隔）}——首次按「正面选项」作答后记住，下次直接用
    SURVEY: 'gzal:surveybank',
    // 未适配平台课程清单 [{name, org, lcmsSystemId}]（v1.7.77）：脚本识别到但**不支持**的机构课程，
    // 供面板「未适配平台」行 / 收尾横幅 / 菜单查看 —— 这些课不自动学习，需人工处理，等待版本升级适配。
    UNADAPTED: 'gzal:unadapted',
  };

  /* ================================================================
   * 2. 日志
   * ================================================================ */
  const LOGS = [];
  function log(level, msg, extra) {
    const line = { t: NOW(), level, msg: clampText(msg, 300), extra: extra ? clampText(JSON.stringify(extra), 200) : '' };
    LOGS.push(line); if (LOGS.length > 300) LOGS.shift();
    try { const fn = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'; console[fn]('[GZAL]', msg, extra || ''); } catch (e) { /* ignore */ }
    if (LOGS.length % 20 === 0) {
      const all = Store.get(K.LOGS, []); all.push(...LOGS.splice(0, LOGS.length));
      while (all.length > 500) all.shift();
      Store.set(K.LOGS, all);
    }
  }

  /* ================================================================
   * 3. 配置（面板可改；选择器集中在此，适配新页面只改这里）
   * ================================================================ */
  const DEFAULT_CONFIG = {
    // 通用
    enabled: true,                 // 总开关
    // 超星(-27 汇智坊) / 尚睿通(-21 教师研修网) 默认**不跳过**（v1.10.0 起）。
    // 早期版本因适配期临时置 true；已由一次性迁移清除本地覆盖，用户仍可在面板/配置里自行开关。
    skipChaoxing: false,
    skipYanxiu: false,
    playbackRate: 1.0,             // 倍速（平台有步长审计，勿改）
    mute: true,                    // 静音播放
    // ---- 尚睿通(-21) ----
    yanxiuDoneRatio: 0.98,         // 视频「算看完」的进度比（未触发 ended 但已到末尾也放行）
    // 文档/拓展资源：平台按「阅读心跳时长」算完成（doc-player/web-player 挂载即 on-reading → heartbeatStart，
    // 每秒累加 durationTime，isTaskCompleted = totalTime && durationTime >= totalTime）。
    // 因此优先等平台自己判定完成；读不到状态时用停留时长兜底。
    yanxiuDocDwellMs: 45000,       // 兜底：读不到平台状态时，停留多久算「已查看」
    yanxiuDocMaxMs: 900000,        // 最长等待（15 分钟）：超过则告警并跳过（防死等）
    yanxiuDocStallMs: 45000,       // 心跳停滞判定：停留这么久平台计时仍没增长 → 判为不可完成（如需 Flash）
    yanxiuPageTurnMs: 7000,        // 模拟人工翻页/滚动的时间间隔
    // 问卷「正面选项」判定词（答好的方面）：命中正面词且不含负面词的选项优先选
    surveyPositiveWords: [],   // 值由后端规则包下发（v1.12.0）
    surveyNegativeWords: [],   // 值由后端规则包下发（v1.12.0）
    // 尚睿通(-21)「调查问卷」入口状态判定（v1.13.3）：完成态 = 只读查看，**不进页面**
    //   实测（2026-10-17）：已完成 → .entity-user-result .result-state.finished（class 标记，无文字）+ 按钮「查看」；
    //   未完成 → 按钮「去评价」。以前脚本只按「有按钮就点」，于是点了「查看」进只读页，
    //   页面上 10 题全是 disabled+checked、没有「提交」→ driveSurvey 反复重试，整课卡死。
    yanxiuSurveyDoneClasses: [],    // 值由后端规则包下发（v1.13.3）
    yanxiuSurveyDoneWords: [],      // 值由后端规则包下发（v1.13.3）
    yanxiuSurveyViewWords: [],      // 值由后端规则包下发（v1.13.3，只读按钮文案）
    yanxiuSurveyGoWords: [],        // 值由后端规则包下发（v1.13.3，可作答按钮文案）
    loopIntervalMs: 1000,          // 主循环轮询间隔
    // 答题
    answerMode: 'intercept-first', // intercept-first | dom-fallback | manual-confirm
    lowConfidenceAction: 'guess',   // guess（无答案先随机/轮换猜答）| pause-notify（转人工）
    quizRetryMax: 3,               // 答题失败重试次数
    // 防挂机
    fakeActivity: true,            // 伪造鼠标移动
    blockLearnVerify: true,        // 拦截 learning/learnVerify 验证请求
    // 提醒
    notifyBanner: true, notifySound: true, notifyDesktop: true,
    // 规则
    ruleExecution: 'trial-first',  // trial-first | strict
    // LLM 答题（可选，默认关闭；兼容 OpenAI 格式 /v1/chat/completions）
    llm: { enabled: false, endpoint: '', apiKey: '', model: '' },
    // 学习中心/课程列表页特征（L0）
    coursePageHints: [],   // 值由后端规则包下发（v1.12.0）
    // 学习页活动类型判定（2026-10-09 实测 study.gzteacher.com）
    // 视频活动：脚本自动播放（阻塞项，必须完成才算课程完成）
    // ⚠ 实测（2026-10-11）自营用的是「【案例观摩】」（不是「课例观摩」），必须收录，
    //   否则会被下面的 soft 关键词「案例」误判成"非阻塞软活动"→ 未完成的观摩视频会被跳过。
    videoActivityTexts: [],   // 值由后端规则包下发（v1.12.0）
    // 人工活动：脚本不代做、**不参与完成判定**（否则课程永远到不了 100% → 反复重进）
    manualActivityTexts: [],   // 值由后端规则包下发（v1.12.0）
    // 「软」活动（v1.7.69）：脚本会尝试自动完成（进入/阅读/翻页），但**不阻塞**课程完成判定。
    // 拓展阅读归此类：既不算人工项（不进人工清单），也不会因为平台没标记完成而造成死循环。
    // 注：不要放「案例」——会与「案例观摩」（视频）撞名（实测踩过）。
    softActivityTexts: [],   // 值由后端规则包下发（v1.12.0）
    softAttemptMax: 2,             // 同一软活动最多尝试次数，超过即视为已完成（防死循环）
    activityGoTexts: [],   // 值由后端规则包下发（v1.12.0）
    // 选课待缴费/未开通阶段识别（2602 期缴费期 9/21-9/27，缴费主体为学校管理员）
    // 缴费前学习中心课程为"待缴费/未开通"，脚本应识别并明确提醒，而非硬刷或静默
    pendingPaymentTexts: [],   // 值由后端规则包下发（v1.12.0）
    pendingPaymentEnabled: true,
    // ★ 站点阶段识别（v1.13.1）：登录态 / 学习阶段 / 待缴费阶段的判定依据
    // 全部由后端规则包下发（CFG.stageRules），本地不内置任何关键词/选择器。
    // 结构：{ loginUrlPattern, loginFormSigns[], loggedInSelectors[], loggedInSigns[],
    //         studyCenterPath, marketPath, studyEntryUrl, marketUrl, learningSigns[], gzLoginHint }
    stageRules: {},
    // 已登录继教网且脚本已授权时，落在门户首页/登录回跳页 → 自动进学习中心识别账户与期数
    autoGoStudyCenter: true,
    // 付费授权心跳（v1.11.1）：运行中定期重新校验 license/check。
    // 后端停服 / 脚本账户退出登录 / 学习卡被撤 → 下一次心跳即暂停自动化（此前只在 boot 校验一次）。
    licenseHeartbeatMs: 300000,    // 5 分钟
    // E3 会话过期/被踢检测（跳登录页 / 出现登录表单 → 安全暂停 + 强提醒）
    sessionGuardEnabled: true,
    sessionLoginHint: [],   // 值由后端规则包下发（v1.12.0）
    // E9 收尾核对自动补刷（队列耗尽后回课程列表核对真实进度，未满 100% 重新入队）
    reconcileEnabled: true,
    reconcileMaxRounds: 2,         // 补刷轮次上限，防死循环
    // E10 长运行维护（本页连续运行超 N 小时 → 在"课程边界"主动整页刷新一次）
    autoRefreshEnabled: true,
    autoRefreshHours: 6,
    // E4 页面特征连续未识别 N 次后，自动采集 DOM 快照入 trace 队列（供 AutoDone 适配）
    selectorMissSnapshot: 3,
    // E8 页面在后台运行超 N 秒 → 横幅提醒切回前台（浏览器会节流后台标签）
    backgroundWarnSec: 60,
    // ★ 后台继续学习（v1.16.0）：最小化 / 切到其它标签时继续播放与学习。
    //   实测（2026-10-17）：自营 study.gzteacher.com 前端（app / chunk-vendors / 51 个懒加载
    //   chunk / Aliplayer 2.8.2）与迅星 ananas 播放器 JS **均无**「visibilitychange | document.hidden
    //   = 暂停视频」这类代码。最小化后停学的根因是：① 本脚本在隐藏态下拒绝 safePlay / E1 刷新 /
    //   暂停救回；② 浏览器对后台标签的定时器节流。开启后：
    //     ① document-start 在**页面真实世界**伪装 visibility / hasFocus，并吞掉
    //        visibilitychange / blur / pagehide / freeze（平台永远认为前台，覆盖未来新增限制）；
    //     ② 解除脚本自身隐藏态闸门（isHidden() 恒 false）；
    //     ③ pause 事件看门狗：视频被暂停时自动续播（受 授权/手动暂停/弹题/已完成 闸门约束）。
    backgroundLearn: true,
    // 播放页/章节特征（L1/L2）
    sectionDoneTexts: [],   // 值由后端规则包下发（v1.12.0）
    nextButtonTexts: [],   // 值由后端规则包下发（v1.12.0）
    // 超星平台：观看进度 ≥ 此比例即记为完成（超星规则，视频常截停在 ~90% 不触发 ended）
    chaoxingDoneRatio: 0.9,
    // 选择器候选（社区脚本验证 + 2026-10-08 实测 study.gzteacher.com 阿里云 Prism 播放器；面板可编辑）
    selectors: {
      // 🔴 v1.12.0：选择器/关键词**不再内置**，一律由后端加密规则包（/api/rule/bundle）下发。
      // 这里只保留「键名空壳」，保证 CFG.selectors.xxx 的引用安全（不会 undefined.x 崩）。
      // 规则未拉到时 RulePack.ok=false → isPaused() 恒真 → 自动化整体不动（无本地兜底）。
      video: [], playBtn: [], quizPopup: [], quizOption: [],
      quizSubmit: [], antiIdleBtn: [], pauseOverlay: [], nextBtn: [],
      chapterItem: [], activityGoLink: [], activityBtn: [], progressText: [],
      chaoxingChapter: [], chaoxingChapterSbar: [], chaoxingJobCount: [], chaoxingPointsYi: [],
      chaoxingTaskText: [], chaoxingDoneText: [], chaoxingQuiz: [], chaoxingQuizStem: [],
      chaoxingQuizOption: [], chaoxingQuizSubmit: [], chaoxingQuizContinue: [], chaoxingQuizRight: [],
      chaoxingQuizWrong: [], chaoxingQuizParsing: [], captchaText: [], captchaUrl: [],
      chaoxingVideoIframe: [], chaoxingNextChapter: [], chaoxingCatalogIframe: [], chaoxingVoteCover: [],
      chaoxingVoteFrame: [], chaoxingVoteSubmit: [], chaoxingVoteBack: [], chaoxingVoteDoneText: [],
      yanxiuCourseBtn: [], yanxiuAiClose: [], yanxiuPhaseItem: [], yanxiuPhaseName: [],
      yanxiuCourseItem: [], yanxiuCourseName: [], yanxiuCourseStatus: [], yanxiuCourseGo: [],
      yanxiuGoEvaluate: [], yanxiuCatItem: [], yanxiuResItem: [], yanxiuResName: [],
      yanxiuResIcon: [], yanxiuEndedMask: [], yanxiuEndedNext: [], yanxiuMedia: [],
      yanxiuCard: [], yanxiuQuizStem: [], yanxiuQuizOptions: [], yanxiuQuizSubmit: [],
      yanxiuQuizAnswer: [], yanxiuEvaQ: [], yanxiuEvaTitle: [], yanxiuEvaOpt: [],
      yanxiuEvaSubmit: [], yanxiuEvaEntity: [], yanxiuEvaState: [], yanxiuEvaAction: [],
    },
  };
  // 🔴 存储配置只允许覆盖「用户可调项」，**内置规则一律以代码默认值为准**（v1.7.76）。
  // 原因：旧版曾用 saveConfig() 把**整份 CFG 快照**写进 gzal:config（含当时的关键词数组）。
  // 之后代码把「拓展阅读」从 manualActivityTexts 移到 softActivityTexts，但存储里的旧快照优先合并
  // → 运行时 manualActivityTexts 仍含「拓展阅读」→ 拓展阅读被判为"人工项"、错误进入「待人工」清单
  // （实测：面板显示 11 项 = 3 互动研讨 + 8 拓展阅读，而按新规则应为 3 项）。
  const CFG_TUNABLE = [
    'enabled', 'answerMode', 'quizRetryMax', 'sessionGuardEnabled',
    'reconcileEnabled', 'reconcileMaxRounds', 'autoRefreshHours', 'backgroundWarnSec', 'backgroundLearn',
    'blockLearnVerify', 'fakeActivity', 'selectorMissSnapshot', 'pendingPaymentEnabled',
    'skipChaoxing', 'skipYanxiu', 'softAttemptMax', 'chaoxingDoneRatio', 'yanxiuDoneRatio',
    'licenseHeartbeatMs', 'autoGoStudyCenter',
  ];
  const _savedCfg = Store.get(K.CONFIG, {}) || {};
  const _tunableCfg = {};
  CFG_TUNABLE.forEach((k) => { if (k in _savedCfg) _tunableCfg[k] = _savedCfg[k]; });
  let CFG = Object.assign({}, DEFAULT_CONFIG, _tunableCfg);
  // 🔴 v1.12.0：selectors 不再从存储合并（旧快照里那半截规则会盖掉后端下发的完整规则），
  // 其值只由 RulePack.apply() 从后端加密规则包写入。
  CFG.llm = Object.assign({}, DEFAULT_CONFIG.llm, _savedCfg.llm || {});
  // 把存储里那些"非可调项"（旧版整份快照残留）清掉，避免下次又被合并。
  // 🔴 v1.12.0：`selectors` 也算残留——规则改由后端下发，本地不再保留任何副本。
  const _staleKeys = Object.keys(_savedCfg).filter((k) => !(CFG_TUNABLE.includes(k)) && k !== 'llm');
  function saveConfig() {
    const out = {};
    CFG_TUNABLE.forEach((k) => { if (k in CFG) out[k] = CFG[k]; });
    // 🔴 不落盘 selectors：规则是服务端资产，落盘等于把客户端变回"本地兜底"
    out.llm = CFG.llm;
    Store.set(K.CONFIG, out);   // 只落盘"可调项 + llm"
  }
  if (_staleKeys.length) {
    try { saveConfig(); log('info', 'Config：已清理存储中的旧配置快照残留键 ' + _staleKeys.length + ' 个（内置规则改用代码默认值）'); } catch (e) { /* ignore */ }
  }

  /* ================================================================
   * 4. API 拦截器（document-start 阶段立即安装）
   *    - vedioValidQuestions/getQuestions → 提取正确答案入池
   *    - learning/learnVerify* → 屏蔽并伪造响应
   * ================================================================ */
  const ApiHook = {
    FAKE_VERIFY: '{"code":0,"msg":null,"data":{"data":"请勿频繁请求","status":9999}}',
    installed: false,
    isQuestionApi(url) { return /vedioValidQuestions\/getQuestions/i.test(url); },
    isVerifyApi(url) { return /learning\/learnVerify/i.test(url); },
    // 自营视频内嵌随堂提问提交接口（study.gzteacher.com）：提交后返回 isRight / answerContents（正确答案 optionId）
    isAnswerSubmitApi(url) { return /vedioAnswerSubmit/i.test(url); },
    // 记录最近一次随堂提问的提交反馈（isRight + 正确答案 optionId 列表），供 Quiz 答错纠错闭环消费
    _lastSubmitResult: null,
    // 提交前暂存的本题上下文（stem + 选项文本），供 onAnswerSubmit 答错时立即持久化正确答案
    _pendingQuiz: null,
    onAnswerSubmit(text) {
      try {
        const json = JSON.parse(text);
        const arr = json && json.data;
        const d = Array.isArray(arr) ? arr[0] : null;
        if (!d) return;
        const raw = String(d.answerContents || '');
        // answerContents 是 1-based 选项序号（"1"=A、"2"=B…，平台用 videoQasAlph[t-1] 转字母）
        const indexes = raw.split(',').map((x) => parseInt(x, 10) - 1).filter((x) => Number.isInteger(x) && x >= 0);
        const letters = indexes.map((i) => String.fromCharCode(65 + i));
        this._lastSubmitResult = {
          isRight: d.isRight === 'Y' || d.isRight === true || d.isRight === 1,
          answerContents: raw,
          answerIndexes: indexes,       // 0-based 选项索引（对应 options() 顺序）
          answerLetters: letters,       // 正确答案字母（A/B/C…）
          ansAnalyze: String(d.ansAnalyze || ''),
        };
        if (!this._lastSubmitResult.isRight && letters.length) {
          log('info', `随堂提问答错，正确答案：${letters.join(',')}（序号 ${raw}）`);
        }
        // 答错时立即持久化正确答案入题库（用提交前暂存的题干+选项，不依赖 3 秒后弹窗 DOM 状态，
        // 避免答错后弹窗切换/选项重置导致 captureCorrectAnswer 抓不到答案 → 强制刷新后仍盲猜答错）
        try {
          if (!this._lastSubmitResult.isRight && indexes.length && this._pendingQuiz && this._pendingQuiz.stem) {
            // 序号 → 字母序列（A=0、B=1…），与 captureCorrectAnswer 存的格式统一（最稳定）
            const ans = indexes.map((ix) => String.fromCharCode(65 + ix)).join(',');
            const bank = Store.get(K.QUIZBANK, {});
            const key = clampText(this._pendingQuiz.stem, 200);
            if (!bank[key] || bank[key] !== ans) {
              bank[key] = ans;
              Store.set(K.QUIZBANK, bank);
              log('info', '已把正确答案沉淀入本地题库（答错即存）：' + clampText(this._pendingQuiz.stem, 40) + ' → ' + ans);
            }
          }
        } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    },

    extractAnswers(text) {
      try {
        const json = JSON.parse(text);
        const data = json && json.data;
        let questions = [];
        if (Array.isArray(data)) questions = data;
        else if (data && typeof data === 'object') {
          if (Array.isArray(data.videoQasArr)) questions = data.videoQasArr;
          else if (Array.isArray(data.list)) questions = data.list;
          else if (Array.isArray(data.questions)) questions = data.questions;
          else if (data.optionList) questions = [data];
          else questions = [data];
        }
        const pool = (unsafeWindow.__gzal_answers = unsafeWindow.__gzal_answers || new Set());
        const texts = [];
        let n = 0;
        questions.forEach((q) => {
          if (q && Array.isArray(q.optionList)) {
            q.optionList.forEach((opt) => {
              if (opt && (opt.isAnswer === 'Y' || opt.isAnswer === true || opt.isAnswer === 1)) {
                if (opt.optionId != null) pool.add(String(opt.optionId));
                if (opt.optionContent) texts.push(String(opt.optionContent));
                n++;
              }
            });
          }
        });
        if (n > 0) log('info', `答题池更新：捕获 ${n} 个正确答案`, { questionCount: questions.length });
        if (texts.length) Store.set('gzal:lastAnswers', texts.slice(0, 20));
      } catch (e) { log('warn', '题目响应解析失败: ' + e.message); }
    },

    install() {
      if (this.installed) return; this.installed = true;
      try { this.hookXHR(); } catch (e) { log('error', 'XHR hook 失败: ' + e.message); }
      try { this.hookFetch(); } catch (e) { log('error', 'fetch hook 失败: ' + e.message); }
      log('info', 'API 拦截器已安装（' + HOST + '）');
    },

    hookXHR() {
      const w = unsafeWindow;
      const OrigXHR = w.XMLHttpRequest;
      const self = this;
      function PatchedXHR() {
        const xhr = new OrigXHR();
        let url = '';
        let blocked = false;
        const origOpen = xhr.open;
        xhr.open = function (m, u) { url = String(u || ''); blocked = CFG.blockLearnVerify && self.isVerifyApi(url); return origOpen.apply(xhr, arguments); };
        // open 阶段注册监听，确保先于页面回调读取响应
        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState === 4) {
            if (self.isQuestionApi(url)) { try { self.extractAnswers(xhr.responseText); } catch (e) { /* ignore */ } }
            else if (self.isAnswerSubmitApi(url)) { try { self.onAnswerSubmit(xhr.responseText); } catch (e) { /* ignore */ } }
          }
        });
        const origSend = xhr.send;
        xhr.send = function (body) {
          if (blocked) {
            const fake = self.FAKE_VERIFY;
            setTimeout(function () {
              try {
                Object.defineProperty(xhr, 'readyState', { get() { return 4; }, configurable: true });
                Object.defineProperty(xhr, 'status', { get() { return 200; }, configurable: true });
                Object.defineProperty(xhr, 'statusText', { get() { return 'OK'; }, configurable: true });
                Object.defineProperty(xhr, 'responseText', { get() { return fake; }, configurable: true });
                Object.defineProperty(xhr, 'response', { get() { return fake; }, configurable: true });
                Object.defineProperty(xhr, 'responseURL', { get() { return url; }, configurable: true });
                xhr.dispatchEvent(new Event('readystatechange'));
                xhr.dispatchEvent(new ProgressEvent('load'));
                xhr.dispatchEvent(new ProgressEvent('loadend'));
              } catch (e) { /* ignore */ }
            }, 400 + Math.random() * 600);
            return;
          }
          return origSend.apply(xhr, arguments);
        };
        return xhr;
      }
      PatchedXHR.prototype = OrigXHR.prototype;
      PatchedXHR.UNSENT = 0; PatchedXHR.OPENED = 1; PatchedXHR.HEADERS_RECEIVED = 2; PatchedXHR.LOADING = 3; PatchedXHR.DONE = 4;
      w.XMLHttpRequest = PatchedXHR;
    },

    hookFetch() {
      const w = unsafeWindow;
      const origFetch = w.fetch;
      const self = this;
      w.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (CFG.blockLearnVerify && self.isVerifyApi(url)) {
          return Promise.resolve(new w.Response(self.FAKE_VERIFY, { status: 200, headers: { 'content-type': 'application/json' } }));
        }
        const p = origFetch.apply(w, arguments);
        if (self.isQuestionApi(url)) {
          return p.then((resp) => {
            try { resp.clone().text().then((t) => self.extractAnswers(t)).catch(() => {}); } catch (e) { /* ignore */ }
            return resp;
          });
        }
        if (self.isAnswerSubmitApi(url)) {
          return p.then((resp) => {
            try { resp.clone().text().then((t) => self.onAnswerSubmit(t)).catch(() => {}); } catch (e) { /* ignore */ }
            return resp;
          });
        }
        return p;
      };
    },
  };
  ApiHook.install();

  /* ================================================================
   * 5. 跨帧消息桥（机构 iframe → 顶层：section-done / status / help）
   * ================================================================ */
  const Bus = {
    send(type, payload) {
      const msg = Object.assign({ source: 'gzal', from: HOST, frame: IS_TOP ? 'top' : 'iframe', t: NOW() }, { type }, payload || {});
      try { if (!IS_TOP && window.top) window.top.postMessage(msg, '*'); } catch (e) { /* ignore */ }
      try { window.postMessage(msg, '*'); } catch (e) { /* ignore */ }
    },
    listen(handler) { window.addEventListener('message', (ev) => { const d = ev.data; if (d && d.source === 'gzal') handler(d, ev); }); },
  };

  /* ================================================================
   * 6. 提醒通道（横幅 + 声音 + 桌面通知）
   * ================================================================ */
  const Notifier = {
    sound() {
      if (!CFG.notifySound) return;
      try {
        const Ctx = unsafeWindow.AudioContext || unsafeWindow.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx(); const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination); o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        let i = 0;
        const beep = () => {
          if (i++ >= 3) { o.stop(); ctx.close(); return; }
          o.frequency.value = i % 2 ? 880 : 660;
          g.gain.setValueAtTime(0.12, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          setTimeout(beep, 500);
        };
        o.start(); beep();
      } catch (e) { /* ignore */ }
    },
    desktop(title, text) {
      if (!CFG.notifyDesktop) return;
      try { GM_notification({ title: '[继教助手] ' + title, text: clampText(text, 200), timeout: 15000 }); } catch (e) { /* ignore */ }
    },
    banner(text, opts) {
      opts = opts || {};
      if (!CFG.notifyBanner && !opts.force) return null;
      let b = qs('#gzal-banner');
      if (!b) {
        b = document.createElement('div'); b.id = 'gzal-banner';
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px 16px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);display:none;';
        (document.body || document.documentElement).appendChild(b);
      }
      const color = opts.level === 'warn' ? '#712B13' : opts.level === 'info' ? '#0C447C' : '#B42318';
      const bg = opts.level === 'warn' ? '#FAECE7' : opts.level === 'info' ? '#E6F1FB' : '#FCEBEB';
      b.style.background = bg; b.style.color = color;
      b.innerHTML = '';
      const span = document.createElement('span'); span.textContent = text; span.style.fontWeight = '500';
      b.appendChild(span);
      if (opts.actionText && opts.onAction) {
        const btn = document.createElement('button');
        btn.textContent = opts.actionText;
        btn.style.cssText = 'margin-left:14px;padding:4px 14px;border:1px solid currentColor;background:transparent;color:inherit;border-radius:6px;cursor:pointer;font-weight:600;';
        btn.onclick = () => { b.style.display = 'none'; opts.onAction(); };
        b.appendChild(btn);
      }
      const close = document.createElement('button');
      close.textContent = '×'; close.title = '关闭';
      close.style.cssText = 'float:right;border:none;background:none;color:inherit;font-size:18px;cursor:pointer;';
      close.onclick = () => { b.style.display = 'none'; };
      b.appendChild(close);
      b.style.display = 'block';
      if (opts.ttl) setTimeout(() => { b.style.display = 'none'; }, opts.ttl);
      return b;
    },
    critical(title, text) {
      this.sound(); this.desktop(title, text);
      this.banner('⚠ ' + title + '：' + text + '（处理完会自动继续，或点下方按钮）', {
        level: 'error', force: true, ttl: 0,
      });
    },
  };

  /* ================================================================
   * 7. 状态与统计
   * ================================================================ */
  const Stats = {
    data: Store.get(K.STATS, { sectionsDone: 0, quizzes: 0, ruleHits: 0, anomalies: 0, day: new Date().toDateString() }),
    bump(k, n) {
      if (this.data.day !== new Date().toDateString()) { this.data = { sectionsDone: 0, quizzes: 0, ruleHits: 0, anomalies: 0, day: new Date().toDateString() }; }
      this.data[k] = (this.data[k] || 0) + (n || 1);
      Store.set(K.STATS, this.data);
    },
  };
  const Session = {
    data: Store.get(K.SESSION, { phase: 'idle', course: '', section: '', paused: false, pausedReason: '', startedAt: 0 }),
    save() { Store.set(K.SESSION, this.data); },
    set(patch) { Object.assign(this.data, patch); this.save(); },
  };

  /* ================================================================
   * 7.5 会话守卫（E3）：掉登录/被踢 → 安全暂停 + 强提醒（不刷新，保留登录现场）
   * ================================================================ */
  const SessionGuard = {
    triggered: false,
    loginUrlPattern: /(^|\/)(login|signin|cas|sso|passport|auth|logout)(\/|$|\?|#)/i,
    detect() {
      if (!CFG.sessionGuardEnabled || this.triggered) return null;
      // 0) v1.13.1：gz 主站优先用 Stage 的登录态判定（强信号优先，不再靠"密码框+登录按钮"猜）
      //    未登录 → 分「首次未登录」与「会话被踢」两种文案，但都不弹脚本登录框，只提醒手动登录。
      try {
        const st = Stage.onGz() ? Stage.loginState() : null;
        if (st && st.known && st.loggedIn === false) {
          return {
            kind: 'gz-logged-out', gzLogin: true, why: st.why,
            desc: st.why === 'login-form' || st.why === 'login-url'
              ? '检测到继教网登录页/登录表单（会话可能已过期或被踢下线）'
              : '当前未登录继教网账户',
          };
        }
      } catch (e) { /* ignore */ }
      // 1) URL 已跳到登录页
      if (this.loginUrlPattern.test(location.pathname + location.search + location.hash)) {
        return { kind: 'login-url', desc: '页面已跳转到登录页：' + clampText(location.href, 90) };
      }
      // 2) 页面出现登录表单（可见密码框 + 上下文含登录线索）
      if (IS_TOP) {
        // 🔴 排除脚本自己注入的授权面板（v1.11.1）：面板本身有「密码框 + 登录按钮」，
        //   且未授权提示里常含「请重新登录」字样 → 会被误判成平台掉登录，触发 E3 会话过期误报。
        const mine = (el) => !!(el && el.closest && el.closest('#gzal-auth-panel, #gzal-panel'));
        const pwds = qsa('input[type="password"]').filter(is_visible).filter((e) => !mine(e));
        if (pwds.length) {
          const hit = pwds.find((p) => {
            const box = (p.closest && p.closest('form,div[class*="login"],div[class*="dialog"],div[class*="modal"],div[class*="layui-layer"]')) || p.parentElement;
            if (!box) return false;
            const t = clampText(box.textContent, 160);
            return (CFG.sessionLoginHint || []).some((k) => t.includes(k)) || /login|signin/i.test(box.className || '');
          });
          if (hit) return { kind: 'login-form', desc: '检测到登录表单，会话可能已过期或被踢下线' };
        }
      }
      return null;
    },
    async engage(anomaly) {
      if (this.triggered) return;
      this.triggered = true;
      Session.set({ paused: true, pausedReason: '会话过期，需重新登录' });
      L2.pause();
      if (Recorder.active) Recorder.stop('session-expired');
      log('error', 'E3 会话过期/被踢，已安全暂停自动化', anomaly);
      // 🔴 v1.13.1：继教网未登录/掉登录 → 只提醒用户手动登录（绝不弹脚本账号/学习卡面板）
      if (anomaly && anomaly.gzLogin) {
        Notifier.desktop('需要登录继教网', '自动化已暂停：' + (anomaly.desc || '请先登录'));
        Notifier.banner('⚠ ' + (anomaly.desc || '未登录继教网') + '。请在本页手动登录（账号 / APP / 微信均可），登录成功后脚本会自动继续。', {
          level: 'error', force: true, ttl: 0,
          actionText: '我已登录，继续',
          onAction: () => { resumeAutomation(); },
        });
        Bus.send('session-expired', { gzLogin: true });
        return;
      }
      Notifier.sound();
      Notifier.desktop('会话过期', '检测到登录页/登录表单，自动化已暂停。请重新登录后点菜单「继续自动化」。');
      Notifier.banner('⚠ 检测到登录页或会话已过期，自动化已暂停（不会刷新覆盖登录现场）。请重新登录继续教育网，登录成功后点右侧按钮恢复。', {
        level: 'error', force: true, ttl: 0,
        actionText: '我已登录，继续',
        onAction: () => { resumeAutomation(); },
      });
      Bus.send('session-expired', {});
    },
    reset() { this.triggered = false; },
  };

  /* ================================================================
   * 7.4 站点阶段识别（v1.13.1）· 「未登录 / 已登录待进学习 / 学习阶段 / 待缴费」
   *   目的：把「要不要弹脚本登录框」和「站点处在哪个阶段」分开判断。
   *   ① 未登录继教网 → 只提醒用户手动登录（绝不弹脚本登录/学习卡框）
   *   ② 已登录但停在门户/登录回跳页 → 引导进学习中心（识别账户 + 期数）
   *   ③ 学习中心有「去学习」入口 = 学习阶段（可自动学习）
   *   ④ 无入口且有缴费类文字 = 选课待缴费阶段（暂停等开通）
   *   🔴 判定用的关键词/选择器全部来自后端规则包 CFG.stageRules，本地无兜底。
   *   识别结果持久化到 gzal:stage，供学习页/iframe/面板参考「上次已知阶段」。
   * ================================================================ */
  const STAGE_LABEL = {
    'gz-login': '未登录继教网',
    'gz-portal': '已登录 · 待进学习中心',
    'study-center': '学习阶段',
    'study-center-pending-rules': '学习中心',
    'market': '课程超市',
    'pending-payment': '选课待缴费',
    'learning': '学习阶段（学习中）',
    'unknown': '未知',
  };

  const Stage = {
    KEY: 'gzal:stage',
    _last: null, _notifiedAt: 0, _watchTimer: null, _tickTimer: null,
    _bounceKey: 'gzal:goNav', _bounced: false,
    _probeAt: 0, _probeStudy: false,

    rules() { return (CFG && CFG.stageRules) || {}; },
    // 是否 gzteacher 主站域（www / i.teacher / study …）
    onGz() { return /(^|\.)gzteacher\.com$/i.test(location.hostname); },
    // 登录/身份由本域自己体现的域：www（门户）+ i.teacher（个人中心）。study 等子域读不到 cur_user，用缓存兜底。
    authHost() { return /^(www|i\.teacher)\.gzteacher\.com$/i.test(location.hostname); },

    _mine(el) { return !!(el && el.closest && el.closest('#gzal-auth-panel, #gzal-panel')); },

    // ── 登录态：强信号优先（页面「退出账号/个人中心」 > URL/登录表单），绝不拿缓存盖过强信号 ──
    // 返回 { known, loggedIn, gz, why }
    loginState() {
      const r = this.rules();
      let cu = null;
      try { cu = JSON.parse(localStorage.getItem('cur_user') || 'null'); } catch (e) { cu = null; }
      const gzOf = (c) => (c && c.teacherId)
        ? { teacher_id: c.teacherId, user_name: c.user_name || '', realname: c.realname || '' } : null;
      if (gzOf(cu)) return { known: true, loggedIn: true, gz: gzOf(cu), why: 'cur_user' };
      if (!this.onGz()) return { known: false, loggedIn: true, gz: null, why: 'non-gz' };

      // ① 已登录强信号：页面出现「退出账号 / 进入个人中心」等（登录后站内会出现）
      const selHit = (r.loggedInSelectors || []).some((s) => { try { return qsa(s).length > 0; } catch (e) { return false; } });
      const head = document.querySelector('header') || document.body;
      const headText = head ? clampText(head.textContent, 600) : '';
      const txtHit = (r.loggedInSigns || []).some((k) => k && headText.includes(k));
      if (selHit || txtHit) return { known: true, loggedIn: true, gz: null, why: 'page-sign' };

      // ② 登录界面强信号：URL（登录页 / 回跳参数）或 登录表单（可见密码框 + 登录方式文案）
      const pat = r.loginUrlPattern ? (() => { try { return new RegExp(r.loginUrlPattern, 'i'); } catch (e) { return null; } })() : null;
      if (pat && pat.test(location.pathname + location.search + location.hash)) {
        return { known: true, loggedIn: false, gz: null, why: 'login-url' };
      }
      const pwds = qsa('input[type="password"]').filter((e) => is_visible(e) && !this._mine(e));
      if (pwds.length) {
        const bodyText = document.body ? clampText(document.body.textContent, 4000) : '';
        if ((r.loginFormSigns || []).some((k) => k && bodyText.includes(k))) {
          return { known: true, loggedIn: false, gz: null, why: 'login-form' };
        }
      }

      // ③ 认证域（www/i.teacher）没有登录信号 = 未登录；学习/其它子域读不到 cur_user 属正常 → 视为已登录
      if (this.authHost()) return { known: true, loggedIn: false, gz: null, why: 'no-session' };
      return { known: true, loggedIn: true, gz: null, why: 'sub-domain' };
    },

    // ── 阶段判定 + 持久化 ──
    detect() {
      const r = this.rules();
      const ls = this.loginState();
      const path = location.pathname || '';
      if (!this.onGz()) return this._record('unknown', { why: 'non-gz' });
      // v1.16.2：成功到达个人中心（i.teacher）= 会话有效 → 清除「被弹回」标记
      if (/^i\.teacher\.gzteacher\.com$/i.test(location.hostname)) this._clearNav();
      // v1.16.2：刚被弹回登录页（www 且无 cur_user）→ 阶段按「未登录」显示，避免面板一直写"待进学习中心"
      if (ls.loggedIn && this._suspect()) return this._record('gz-login', { why: 'session-suspect' });
      if (ls.known && !ls.loggedIn) return this._record('gz-login', { why: ls.why });
      // 学习中心（自营课程列表；有「去学习」= 已开通学习阶段）
      // 页面路径判定（学习中心 / 课程超市）：路径前缀属路由常量（脚本 Router 里本就硬编码），
      // 规则包给了就用规则的，没给也不影响「这个页面是哪一类」的判断；关键词/选择器仍全走规则。
      const centerPath = r.studyCenterPath || '/studyCenter/';
      const marketPath = r.marketPath || '/source';
      if (centerPath && path.includes(centerPath)) {
        // 规则未下发时拿不到「去学习」选择器 → 不猜学习/待缴费，先标中性态（面板可见"规则未就绪"）
        if (typeof RulePack !== 'undefined' && !RulePack.ok) {
          return this._record('study-center-pending-rules', { why: 'rules-not-ready' });
        }
        let hasGo = 0, pending = null;
        try { hasGo = L0.findStudyButtons().length; } catch (e) { hasGo = 0; }
        if (!hasGo) { try { pending = L0.detectPendingPayment(); } catch (e) { pending = null; } }
        if (!hasGo && pending) {
          return this._record('pending-payment', { why: 'no-entry-with-payment-text', sample: pending.slice(0, 2).map((p) => p.text) });
        }
        return this._record('study-center', { why: 'study-entry=' + hasGo });
      }
      // 课程超市 / 选课记录（课单页）
      if (marketPath && path.includes(marketPath)) return this._record('market', { why: 'market-page' });
      // 学习页（自营课程内页）
      if (/\/study\/(home|study)\b/.test(path)) return this._record('learning', { why: 'self-study-page' });
      // 已登录但停在门户/其它站内页
      if (ls.loggedIn) return this._record('gz-portal', { why: ls.why });
      return this._record('unknown', { why: 'no-signal' });
    },

    _record(id, extra) {
      let term = null, gz = null;
      try { term = Backend.term || Store.get('gzal:bk:term', null); } catch (e) { term = Store.get('gzal:bk:term', null); }
      try { gz = Backend.gz || Store.get('gzal:bk:gz', null); } catch (e) { gz = Store.get('gzal:bk:gz', null); }
      const rec = Object.assign({
        id, label: STAGE_LABEL[id] || id, url: location.href, host: HOST,
        term: term || '', teacher_id: (gz && gz.teacher_id) || '', at: NOW(),
      }, extra || {});
      const prev = this._last;
      this._last = rec;
      try { Store.set(this.KEY, rec); } catch (e) { /* ignore */ }
      if (!prev || prev.id !== id) {
        log('info', `站点阶段：${rec.label}${rec.term ? '（' + rec.term + '期）' : ''} ← ${HOST}${location.pathname}`);
      }
      return rec;
    },

    // 当前阶段（带 3 秒缓存，供面板高频读取）
    current() {
      if (this._last && NOW() - (this._last.at || 0) < 3000) return this._last;
      try { return this.detect(); } catch (e) { return this._last || Store.get(this.KEY, null); }
    },
    lastKnown() { return this._last || Store.get(this.KEY, null); },
    label() { const s = this._last || Store.get(this.KEY, null); return s ? s.label : ''; },

    // ── 未登录继教网：只提醒（不弹脚本登录/学习卡框）──
    notifyLogin(force) {
      const hint = this.rules().gzLoginHint || '请先在页面手动登录「广州继教网」账户（脚本不会代替登录）';
      if (!force && NOW() - this._notifiedAt < 30000) return;
      this._notifiedAt = NOW();
      log('warn', '站点未登录：' + hint);
      try {
        Notifier.banner('⚠ ' + hint + '。登录成功后脚本会自动继续。', {
          level: 'warn', force: true, ttl: 0,
          actionText: '我已登录，重新检测',
          // v1.16.2：用户明确说已登录 → 清掉「被弹回」标记再重试（若仍被弹回，会再次提示，不会静默死循环）
          onAction: () => { Stage._notifiedAt = 0; Stage._clearNav(); resumeAutomation(); },
        });
      } catch (e) { /* ignore */ }
    },

    // ── 登录回跳页（www 域带 ?redirect=xxx）：登录成功后建议先回原目标页 ──
    isLoginReturn() {
      return /^www\.gzteacher\.com$/i.test(location.hostname) && /[?&]redirect=/i.test(location.search);
    },

    // ── 登录后进入学习中心：SSO 取码 + 防弹回（v1.16.2 → v1.16.4）──
    // 实测（2026-10-18）：
    //   ① **登录后 i.teacher 需要先做一次 SSO 取码**（站点「进入个人中心」点击触发的
    //      api.gzteacher.com/oauthService/api/web/go/getCode），否则直接跳 /studyCenter/whole
    //      会被 302 弹回 www → 脚本反复刷新。goStudyCenter() 现在会先点隐藏的 .to-user-center 取码。
    //   ② 会话真失效时，弹回页仍可能渲染旧登录态 → loginState() 误判已登录 → 死循环。
    //      用 sessionStorage 记录跳转次数：连续 3 次仍失败 → 停止自动跳转并提示用户走「进入个人中心」。
    //   ③ 只要出现新鲜 cur_user（登录成功）、到达 i.teacher 或人工点「我已进入个人中心」，即清除标记。
    _navState() {
      try { return JSON.parse(sessionStorage.getItem(this._bounceKey) || '{}') || {}; } catch (e) { return {}; }
    },
    _markNav(target) {
      const s = this._navState();
      const n = (s && s.n ? s.n : 0) + 1;
      try { sessionStorage.setItem(this._bounceKey, JSON.stringify({ target: String(target || ''), at: Date.now(), n })); } catch (e) { /* ignore */ }
    },
    _clearNav() {
      try { sessionStorage.removeItem(this._bounceKey); } catch (e) { /* ignore */ }
      this._bounced = false;
    },
    // 连续多次跳学习中心仍被弹回 → 停止自动跳转（避免无限刷新）
    _navStuck() {
      const s = this._navState();
      if (!s || !s.n || !s.at) return false;
      if (Date.now() - s.at > 120000) { this._clearNav(); return false; }
      return s.n >= 3;
    },
    // 仅 www 域判定：刚尝试进学习中心、当前没有 cur_user → 会话失效
    // （正常登录后站方会写 cur_user；study/i.teacher 等子域不适用）
    _suspect() {
      try {
        if (!/^www\.gzteacher\.com$/i.test(location.hostname)) return false;
        if (localStorage.getItem('cur_user')) return false;
        const raw = sessionStorage.getItem(this._bounceKey);
        if (!raw) return false;
        const o = JSON.parse(raw) || {};
        if (!o.at || Date.now() - o.at > 10 * 60 * 1000) { this._clearNav(); return false; }
        return true;
      } catch (e) { return false; }
    },

    // ── 已登录但缺账户/期数：引导进学习中心（只跳自家域，防开放重定向）──
    // 🔴 路由常量属脚本固有信息（学习中心固定 URL），规则包未就绪时也要能跳转，
    //    否则「未授权 → 无规则 → 无法进学习中心 → 永远识别不到期数」死锁。
    goStudyCenter(why) {
      const r = this.rules();
      // v1.16.2：会话已失效（刚被 i.teacher 弹回登录页）→ 停止自动跳转，避免死循环。
      // 交给 licenseCheck 的 gz-login 分支提示用户重新登录。
      if (this._bounced || this._suspect()) {
        log('warn', '登录会话已失效：停止自动进入学习中心，请重新登录后再试');
        return false;
      }
      // v1.16.4：连续 3 次仍被弹回 → 停止自动跳转，提示用户走「进入个人中心」
      if (this._navStuck()) {
        log('warn', '多次进入学习中心仍被弹回，停止自动跳转');
        try {
          Notifier.banner('⚠ 进入学习中心未成功：请点页面右上角「进入个人中心」，进入后再点「学习中心」；脚本随后会自动接手。', {
            level: 'warn', force: true, ttl: 0, actionText: '我已进入个人中心',
            onAction: () => { Stage._clearNav(); resumeAutomation(); },
          });
        } catch (e) { /* ignore */ }
        return false;
      }
      // v1.16.3：页面丢登录态时的「探测」跳过 ?redirect=，固定去学习中心（地址栏直输等价）
      const probe = !!this._probeStudy; this._probeStudy = false;
      const m = probe ? null : /[?&]redirect=([^&#]+)/.exec(location.search);
      let target = '';
      if (m) {
        let p = '';
        try { p = decodeURIComponent(m[1]); } catch (e) { p = ''; }
        if (/^\/[^/]/.test(p) || p === '/') target = 'https://i.teacher.gzteacher.com' + p;
      }
      if (!target) target = r.studyEntryUrl || 'https://i.teacher.gzteacher.com/studyCenter/whole';
      if (!/^https:\/\/i\.teacher\.gzteacher\.com\//i.test(target)) return false;
      if (location.href === target) return false;
      // 防抖：同一目标 30s 内只跳一次（避免反复刷新/多次触发造成跳转风暴）
      if (this._goAt && NOW() - this._goAt.at < 30000 && this._goAt.url === target) return false;
      this._goAt = { at: NOW(), url: target };
      // v1.16.2：记录本次跳转，供「被弹回登录页」检测（见 _suspect）
      this._markNav(target);
      log('info', '已登录继教网 → 进入学习中心识别账户与期数（' + why + '）：' + target);
      try { Notifier.banner('✅ 已登录「广州继教网」，正在进入学习中心（识别账户与期数）…', { level: 'info', force: true, ttl: 4000 }); } catch (e) { /* ignore */ }
      // 🔴 v1.16.4（2026-10-18 实测）：登录后 i.teacher 需要先做一次 SSO 取码
      //   （站点「进入个人中心」点击触发的 api.gzteacher.com/oauthService/api/web/go/getCode），
      //   否则直接跳 /studyCenter/whole 会被 302 弹回 www → 脚本反复刷新。
      //   这里复用站点自己的入口：点一下隐藏的「进入个人中心」，等取码完成再跳学习中心。
      const loginReturn = this.isLoginReturn && this.isLoginReturn();
      const go = (dest, ms) => setTimeout(() => { try { location.href = dest; } catch (e) { /* ignore */ } }, ms);
      const entryNow = /^www\.gzteacher\.com$/i.test(location.hostname) ? qs('.to-user-center') : null;
      if (entryNow) {
        try { entryNow.click(); log('info', '已触发个人中心 SSO 取码（getCode），稍后进入学习中心'); } catch (e) { /* ignore */ }
        go(target, 1800);
      } else if (loginReturn) {
        // 登录后页面需要一点时间把登录区切换成「进入个人中心」；最多等 5s，出现就点它触发 getCode
        let waited = 0;
        const timer = setInterval(() => {
          waited += 400;
          const e2 = qs('.to-user-center');
          if (e2) {
            clearInterval(timer);
            try { e2.click(); log('info', '已触发个人中心 SSO 取码（getCode），稍后进入学习中心'); } catch (e) { /* ignore */ }
            go(target, 1800);
          } else if (waited >= 5000) {
            clearInterval(timer);
            go('https://i.teacher.gzteacher.com/home', 500);   // 等不到入口：先去个人中心（与人工点击等价）
          }
        }, 400);
      } else {
        go(target, 700);
      }
      return true;
    },

    // ── 登录成功自动接续（需求：登录后页面可能停在原页只显示「进入个人中心」链接）──
    watchLogin() {
      if (!IS_TOP || !this.onGz() || this._watchTimer) return;
      let wasOut = false;
      this._watchTimer = setInterval(() => {
        try {
          const st = this.loginState();
          // v1.16.2：出现新鲜 cur_user = 登录成功/会话有效 → 清除「被弹回」标记
          if (st.loggedIn && st.why === 'cur_user') this._clearNav();
          if (st.known && !st.loggedIn) { wasOut = true; return; }
          if (st.loggedIn && wasOut) {                 // 刚刚登录成功 → 重新过门禁 + 引导进学习中心
            wasOut = false;
            this._notifiedAt = 0;
            this._clearNav();
            log('info', '检测到继教网已登录，重新校验授权');
            resumeAutomation();
          }
        } catch (e) { /* ignore */ }
      }, 2000);
      this._tickTimer = setInterval(() => { try { this.detect(); } catch (e) { /* ignore */ } }, 5000);
    },
  };


  /* ================================================================
   * 7.6 运行维护（E10 定时刷新 + E8 后台节流提醒）
   * ================================================================ */
  const Maintenance = {
    bootAt: NOW(), _hiddenTimer: null,
    init() {
      if (!IS_TOP) return;
      if (CFG.autoRefreshEnabled) setInterval(() => this.checkRefresh(), 5 * 60 * 1000);
      // 🔴 v1.11.1 授权心跳：运行中定期重新校验 license/check。
      // 此前只在 boot() 校验一次 → 后端停服 / 脚本账户退出登录 / 学习卡被撤后，**已经打开的页面仍能把整门课学完**。
      setInterval(() => { this.checkLicense().catch(() => { /* ignore */ }); }, CFG.licenseHeartbeatMs || 300000);
      this.watchVisibility();
      // 尚睿通学习页监视器自愈：每 20 秒确认监视器活着（_watchBeat 由 tick 刷新），
      // 否则重建（防 SPA 路由切换/异常后监视器丢失 → 资源永不推进）
      if (PLATFORM === 'yanxiu') {
        setInterval(() => {
          try {
            if (!/\/grain\/course\/.*\/detail/.test(location.href)) return;
            if (Yanxiu._watchTimer && NOW() - (Yanxiu._watchBeat || 0) < 20000) return;
            log('warn', '尚睿通：监视器未在运行，已自动重建');
            Yanxiu._watchTimer = null;
            Yanxiu.startWatch();
          } catch (e) { /* ignore */ }
        }, 20000);
      }
    },
    // 🔴 v1.11.1 授权心跳：重新校验「脚本账户 + gz 账户 + 期数」的学习权限。
    //   通过 → 什么都不做；不通过（后端不可达 / 未登录 / 学习卡被撤）→ 置 AuthGate.ok=false 并暂停 + 弹授权面板。
    //   注意：AuthGate 一置 false，isPaused() 立刻为 true，L2 主循环 / Router / L0 / L1 全部停手，
    //   即使 L2.running 仍在也不会再播放、不再点「下一活动」。
    async checkLicense() {
      if (AuthGate.ok !== true) return;                    // 本来就未授权：交给门禁/授权面板处理
      let r = null;
      try { r = await Backend.licenseCheck(); }
      catch (e) { r = { authorized: false, showPanel: true, reason: '后端不可达（离线不降级）：' + e.message }; }
      if (r && r.authorized === true) {
        AuthGate.reason = '';
        // 授权仍然有效 → 顺手续期规则密钥（TTL 300s，靠心跳滚动），失败则规则失效 = 自动化停手
        const packOk = await RulePack.keepFresh();
        if (!packOk && !RulePack.ok) {
          L2.pause();
          Session.set({ paused: true, pausedReason: '规则包不可用：' + (RulePack.reason || '未知') });
          log('warn', '规则包续期失败，已暂停自动化：' + RulePack.reason);
          try { Notifier.critical('核心规则未下发', '脚本已暂停：' + (RulePack.reason || '未知')); } catch (e) { /* ignore */ }
          try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        }
        return;
      }
      const reason = (r && r.reason) || '未授权';
      AuthGate.ok = false; AuthGate.reason = reason; AuthGate.code = (r && r.code) || '';
      L2.pause();
      // 🔴 心跳发现构建号不符（后端刚加了白名单/脚本过期）：提示去主页更新，不弹登录面板
      if (AuthGate.code === 'build_mismatch') {
        Session.set({ paused: true, pausedReason: '脚本需更新（构建号不符）' });
        log('warn', '授权心跳未通过（构建号不符），已暂停自动化：' + reason);
        try { Backend.buildMismatchNotice(reason, r.latestBuild); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return;
      }
      // 🔴 v1.17.4：完整性自检被后端拒（脚本被改动）→ 提示去主页重装，不弹登录面板
      if (AuthGate.code === 'script_tampered') {
        Session.set({ paused: true, pausedReason: '脚本文件被修改，请重新安装' });
        log('error', '授权心跳未通过（脚本文件被修改），已暂停自动化：' + reason);
        try { Backend.tamperNotice(reason); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return;
      }
      Session.set({ paused: true, pausedReason: reason });
      log('warn', '授权心跳未通过，已暂停自动化：' + reason);
      // 🔴 v1.13.1：按失败环节分流 —— 未登录继教网/不在学习页只提醒（不弹脚本登录框）；账号/学习卡问题才弹面板
      if (r && r.needGzLogin) {
        try { Stage.notifyLogin(); } catch (e) { /* ignore */ }
      } else if (r && r.needStudyPage) {
        try { Notifier.banner('⚠ ' + reason + '。请打开「学习中心」或「课程超市」页面。', { level: 'warn', force: true, ttl: 8000 }); } catch (e) { /* ignore */ }
      } else {
        try { Notifier.critical('授权失效', '脚本已暂停：' + reason); } catch (e) { /* ignore */ }
        try { if (r && r.showPanel) Backend.showAuthPanel(reason, r); } catch (e) { /* ignore */ }
      }
      try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
    },
    // E10：本页连续运行超时 → 在"课程边界"主动刷新一次（防长运行内存泄漏）
    checkRefresh() {
      const hours = (NOW() - this.bootAt) / 3600000;
      if (hours < (CFG.autoRefreshHours || 6)) return;
      const phase = Session.data.phase || '';
      const atBoundary = /course-done|all-done|reconcile|L0-enter|pending-payment|idle/.test(phase) || L0.findStudyButtons().length > 0;
      if (!atBoundary) { log('info', `E10：本页已运行 ${hours.toFixed(1)}h，待课程边界后刷新`); return; }
      log('warn', `E10：本页连续运行 ${hours.toFixed(1)}h，课程边界主动刷新页面`);
      Notifier.banner('🔄 已连续运行较久，正在课程边界刷新页面（防内存泄漏），刷新后自动续学…', { level: 'info', force: true, ttl: 5000 });
      setTimeout(() => location.reload(), 3000);
    },
    // E8：后台标签被浏览器节流 → 提醒切回前台
    // v1.16.0：开启「后台继续学习」后不再催用户回前台——首次进入后台时提示一次
    // 「最小化不中断」，页面重新可见时仍重新探测当前页。
    watchVisibility() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          if (CFG.backgroundLearn) {
            if (!this._bgTipShown) {
              this._bgTipShown = true;
              log('info', '后台继续学习已开启：最小化/切标签不中断学习');
              Notifier.banner('🌙 后台继续学习已开启：最小化或切换到其它标签不会中断学习（可放心放后台）', { level: 'info', force: true, ttl: 6000 });
            }
            return;
          }
          if (this._hiddenTimer) clearTimeout(this._hiddenTimer);
          this._hiddenTimer = setTimeout(() => {
            if (!document.hidden) return;
            log('warn', 'E8：页面持续处于后台，可能被浏览器节流');
            Notifier.banner('⚠ 页面在后台运行，浏览器会节流定时器导致进度停滞。建议保持本标签页在前台（可最小化窗口，但不要切到其他标签）。', { level: 'warn', force: true, ttl: 0 });
          }, (CFG.backgroundWarnSec || 60) * 1000);
        } else {
          if (this._hiddenTimer) { clearTimeout(this._hiddenTimer); this._hiddenTimer = null; }
          Router.reprobe();
        }
      });
    },
  };

  /* ================================================================
   * 8. 规则引擎（人机协作学习环 · 能力沉淀中心）
   *    生命周期：draft → trial（首执行横幅可拦截）→ active；连续失败 2 次降回 trial
   * ================================================================ */
  const RuleEngine = {
    rules() { return Store.get(K.RULES, []); },
    saveRules(list) { Store.set(K.RULES, list); },
    importRule(r) {
      const list = this.rules();
      if (r.ruleId && list.some((x) => x.ruleId === r.ruleId)) {
        const i = list.findIndex((x) => x.ruleId === r.ruleId); list[i] = Object.assign(list[i], r);
      } else {
        r.ruleId = r.ruleId || uid(); r.status = r.status || 'trial';
        r.stats = r.stats || { hits: 0, failures: 0 }; r.createdAt = NOW();
        list.push(r);
      }
      this.saveRules(list); return r;
    },

    // 匹配当前 DOM：detect.selector 存在（+可选 textContains）
    match() {
      for (const r of this.rules()) {
        if (r.status === 'disabled' || r.status === 'draft') continue;
        if (r.scope && r.scope.length && !r.scope.some((s) => new RegExp(s.replace(/\*/g, '.*')).test(HOST))) continue;
        const el = qs(r.detect && r.detect.selector);
        if (!el || !is_visible(el)) continue;
        if (r.detect.textContains && !clampText(el.textContent, 500).includes(r.detect.textContains)) continue;
        return { rule: r, el };
      }
      return null;
    },

    async execute(hit) {
      const { rule, el } = hit;
      log('info', `规则命中：${rule.name}（${rule.status}）`);
      // trial：预告可拦截（5 秒倒计时）
      if (rule.status === 'trial' || CFG.ruleExecution === 'strict') {
        const ok = await this.preview(rule);
        if (!ok) { log('warn', '规则被用户拦截：' + rule.name); return false; }
      }
      try {
        for (const act of rule.actions || []) {
          const target = act.selector ? qs(act.selector) : el;
          if (!target) throw new Error('动作目标未找到: ' + act.selector);
          if (act.delayMs) await sleep(act.delayMs);
          if (act.type === 'click') target.click();
          else if (act.type === 'fill') { target.focus(); target.value = act.value || ''; target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true })); }
          else if (act.type === 'select') { target.value = act.value || ''; target.dispatchEvent(new Event('change', { bubbles: true })); }
        }
        Stats.bump('ruleHits');
        rule.stats.hits++; this.update(rule); return true;
      } catch (e) {
        log('error', '规则执行失败: ' + rule.name + ' - ' + e.message);
        rule.stats.failures++; this.update(rule); return false;
      }
    },
    preview(rule) {
      return new Promise((resolve) => {
        let decided = false;
        const done = (v) => { if (!decided) { decided = true; resolve(v); } };
        Notifier.banner(`规则将执行：「${rule.name}」${rule.actions.map((a) => a.type + ' ' + (a.selector || '')).join(' → ')}`, {
          level: 'warn', force: true, ttl: 5000,   // 与 5 秒倒计时同步自动消失，不再常驻页面
          actionText: '取消执行', onAction: () => done(false),
        });
        Notifier.sound();
        setTimeout(() => done(true), 5000);
      });
    },
    update(rule) {
      const list = this.rules(); const i = list.findIndex((x) => x.ruleId === rule.ruleId);
      if (i >= 0) {
        // 转正/降级
        if (list[i].status === 'trial' && rule.stats.hits >= 1) { list[i].status = 'active'; list[i].promotedAt = NOW(); log('info', '规则转正：' + rule.name); }
        if (list[i].status === 'active' && rule.stats.failures >= 2 && rule.stats.failures > rule.stats.hits) { list[i].status = 'trial'; log('warn', '规则降级回试用：' + rule.name); }
        list[i].stats = rule.stats; this.saveRules(list);
      }
    },
  };

  /* ================================================================
   * 9. 操作记录器（人机协作环 · 记录人工处置过程）
   *    capture 阶段监听 click/input/change/keydown + MutationObserver
   * ================================================================ */
  const Recorder = {
    active: false, trace: null, mo: null, handlers: [],
    snapshot() {
      const modals = qsa('div[class*="modal"],div[class*="dialog"],div[class*="layui-layer"],[role="dialog"]').filter(is_visible).slice(0, 3)
        .map((m) => clampText(m.textContent, 120));
      return { url: location.href, title: clampText(document.title, 60), modals };
    },
    start(anomaly) {
      if (this.active) return;
      this.active = true;
      this.trace = { traceId: uid(), domain: HOST, url: location.href, startedAt: NOW(), anomaly, steps: [], resolution: '' };
      const onAct = (type) => (ev) => {
        const t = ev.target;
        if (!t || !t.tagName) return;
        if (t.closest && t.closest('#gzal-panel,#gzal-banner')) return; // 忽略面板自身
        const step = { seq: this.trace.steps.length + 1, action: type, selector: make_selector(t), tag: t.tagName.toLowerCase(), ts: NOW() };
        if (type === 'input' || type === 'change') {
          const isPwd = (t.type || '').toLowerCase() === 'password';
          step.value = isPwd ? '[PASSWORD-REDACTED]' : '[len:' + String(t.value == null ? '' : t.value).length + ']'; // 脱敏：只记长度
          if (isPwd) return; // 密码框整条丢弃
        }
        if (type === 'click') step.text = clampText(t.textContent, 60);
        this.trace.steps.push(step);
        if (this.trace.steps.length > 80) this.trace.steps.shift();
      };
      const events = [['click', true], ['input', true], ['change', true], ['keydown', false]];
      events.forEach(([name, capture]) => {
        const h = onAct(name === 'keydown' ? 'keydown' : name);
        document.addEventListener(name, h, capture); this.handlers.push([name, h, capture]);
      });
      this.mo = new MutationObserver((muts) => {
        if (!this.trace) return;
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.nodeType === 1 && is_visible(n) && /^(DIV|DIALOG|SECTION)$/.test(n.tagName)) {
              const cls = clampText(n.className && n.className.baseVal !== undefined ? '' : (n.className || ''), 80);
              this.trace.steps.push({ seq: this.trace.steps.length + 1, action: 'dom-appear', selector: make_selector(n), cls, ts: NOW() });
            }
          }
        }
      });
      this.mo.observe(document.documentElement, { childList: true, subtree: true });
      log('info', '操作记录器已启动（人工处置中）');
    },
    stop(resolution) {
      if (!this.active) return null;
      this.active = false;
      this.handlers.forEach(([n, h, c]) => document.removeEventListener(n, h, c)); this.handlers = [];
      if (this.mo) { this.mo.disconnect(); this.mo = null; }
      this.trace.resolution = resolution; this.trace.endedAt = NOW();
      const queue = Store.get(K.TRACES, []);
      queue.push(this.trace); while (queue.length > 30) queue.shift();
      Store.set(K.TRACES, queue);
      log('info', `操作记录完成（${this.trace.steps.length} 步）→ 待分析队列` + (IS_TOP ? '' : '（iframe 内，主面板可导出）'));
      // 顶层直接提醒用户可导出
      if (IS_TOP) Notifier.banner(`人工处置已记录（${this.trace.steps.length} 步）。下次可让 AutoDone 分析生成规则（面板 → 规则管理 → 导出 trace）`, { level: 'info', ttl: 8000 });
      return this.trace;
    },
  };

  /* ================================================================
   * 10. 人机协作环（E11 未知异常 → 暂停 → 提醒 → 记录 → 恢复）
   * ================================================================ */
  const HumanCollab = {
    engaged: false,
    knownWhitelist(sel) { // 已知弹窗选择器（这些走正常处理，不算未知异常）
      return (CFG.selectors.quizPopup || []).concat(CFG.selectors.antiIdleBtn || []);
    },
    detectUnknown() {
      if (this.engaged) return null;
      const modals = qsa('div[class*="modal"],div[class*="dialog"],div[class*="layui-layer"],[role="dialog"],div[class*="popup"],div[class*="verify"],div[class*="captcha"]');
      for (const m of modals) {
        if (!is_visible(m)) continue;
        if (qs('.layui-layer-btn0', m) && (m.textContent || '').length < 60) continue; // 纯防挂机确认
        if (m.closest && m.closest('#gzal-panel,#gzal-banner')) continue;
        // 排除问卷提交确认框（Element UI .el-message-box「请确认是否提交答案」），由问卷驱动流程点「确定」
        if (m.closest && m.closest('.el-message-box')) continue;
        if (/el-message-box/.test(m.className || '')) continue;
        // 排除播放器自身浮层（阿里云 Prism / 超星 ananas / video.js 的设置菜单/倍速/字幕/清晰度/音轨，非异常弹窗）
        if (m.closest && m.closest('.prism-player, .prism-setting-list, .prism-auto-stream-selector, .ans-player, .video-js, .vjs-control, #showSpeed, [class*="ananas"]')) continue;
        if (/prism-(setting|speed|quality|audio|cc|stream)/i.test(m.className || '')) continue;
        if (/ans-(setting|speed|quality|audio|cc|stream|menu|dialog|rate|volume|line)|vjs-(setting|menu|speed|quality|subs|text-track)|ananas|dialogbox|showSpeed/i.test(m.className || '')) continue;
        const sel = make_selector(m);
        // 排除已知弹窗（答题/防挂机）：m 自身、其子元素、或其祖先命中已知选择器都算已知
        // （关键：Ant 弹窗的 .ant-modal-header/.ant-modal-body 等内部子元素 class 也含 "modal"，
        //   会被 modal 选择器命中，但它们本身不在 whitelist，必须向上 closest 到 .ant-modal/.ant-modal-content 判已知）
        if (this.knownWhitelist().some((w) => { try { return m.matches(w) || m.querySelector(w) || (m.closest && m.closest(w)); } catch (e) { return false; } })) continue;
        const text = clampText(m.textContent, 150);
        if (text.length < 4 && !m.querySelector('input,canvas,iframe')) continue; // 空壳不算
        // E5 图形验证码快速识别：弹窗内同时有 canvas/img 与输入框，或文案含验证码字样
        const looksCaptcha = (!!m.querySelector('canvas,img') && !!m.querySelector('input')) || /验证码|captcha|verify\s*code/i.test(text);
        return {
          kind: looksCaptcha ? 'captcha' : 'unknown-modal',
          kindLabel: looksCaptcha ? '图形验证码（需人工识别）' : '未知弹窗',
          selector: sel, desc: text, snapshot: Recorder.snapshot(),
        };
      }
      return null;
    },
    async engage(anomaly) {
      if (this.engaged) return;
      this.engaged = true;
      Stats.bump('anomalies');
      Session.set({ paused: true, pausedReason: '需人工处理：' + anomaly.desc });
      L2.pause();
      log('warn', 'E11 未知异常，进入人机协作：' + anomaly.desc, anomaly.selector);
      Notifier.critical(anomaly.kindLabel || '需要人工处理', anomaly.desc);
      Bus.send('need-help', { desc: anomaly.desc });
      Recorder.start(anomaly);
      // 等待恢复：视频恢复播放 / 异常弹窗消失 / 用户点击继续
      const start = NOW();
      while (NOW() - start < 30 * 60 * 1000) { // 最长等待 30 分钟
        await sleep(2000);
        const v = L2.activeVideo();
        const modalGone = !qs(anomaly.selector) || !is_visible(qs(anomaly.selector));
        const resumed = v && !v.paused && v.currentTime > 0;
        if (modalGone && resumed) { await this.release('video-resumed'); return; }
        if (modalGone && !v) { await this.release('page-changed'); return; }
      }
      await this.release('timeout-30min');
    },
    async release(reason) {
      this.engaged = false;
      Recorder.stop(reason);
      Session.set({ paused: false, pausedReason: '' });
      log('info', '人工协作结束（' + reason + '），恢复自动运行');
      Notifier.banner('已恢复自动运行', { level: 'info', ttl: 4000 });
      L2.resume();
      Bus.send('resumed', {});
    },
  };

  /* ================================================================
   * 7.6 反爬验证码守卫（E5 扩展）：检测图形验证码 → 立即自动暂停 + 强提醒
   *   ① URL 重定向式：antispiderShowVerify.ac / processVerify.ac（超星把页面整个跳走）
   *   ② 页面内嵌式（2026-10-10 实测）：超星把「【9010】操作异常，请输入图片中的验证码」
   *      渲染进内容 iframe（#iframe / knowledge/cards）里，URL 不变 → 旧的 URL 判定抓不到。
   *   验证码属平台防作弊边界，脚本**不代填**：只自动暂停 + 强提醒人工处理；
   *   检测到验证码消失（人工通过）后自动恢复自动学习。
   * ================================================================ */
  const CaptchaWatch = {
    _timer: null, _on: false, _lastHit: '',
    hitText() {
      const pats = CFG.selectors.captchaText || [];
      const seen = new Set();
      const scan = (doc, depth) => {
        if (!doc || depth > 5 || seen.has(doc)) return null;
        seen.add(doc);
        let els = [];
        try { els = doc.querySelectorAll('div,p,span,h1,h2,h3,label'); } catch (e) { return null; }
        for (const el of els) {
          if (!is_visible(el)) continue;
          const t = clampText(el.textContent, 80);
          if (t.length < 3 || t.length > 80) continue;
          if (pats.some((p) => t.includes(p))) return t;
        }
        let frames = [];
        try { frames = doc.querySelectorAll('iframe'); } catch (e) { return null; }
        for (const f of frames) {
          try {
            const inner = f.contentDocument;
            if (inner) { const hit = scan(inner, depth + 1); if (hit) return hit; }
          } catch (e) { /* 跨域 iframe 跳过 */ }
        }
        return null;
      };
      return scan(document, 0);
    },
    inUrl() {
      const pats = CFG.selectors.captchaUrl || [];
      if (pats.some((u) => location.href.includes(u))) return true;
      // 超星会把验证码页塞进内容 iframe（跨域时 contentDocument 读不到，但 iframe 的 src 属性仍可读）
      let frames = [];
      try { frames = document.querySelectorAll('iframe'); } catch (e) { return false; }
      for (const f of frames) {
        const src = f.getAttribute('src') || '';
        if (pats.some((u) => src.includes(u))) return true;
        try {
          const inner = f.contentDocument;
          if (inner && pats.some((u) => inner.defaultView.location.href.includes(u))) return true;
        } catch (e) { /* 跨域 iframe 跳过 */ }
      }
      return false;
    },
    detect() {
      // 先看页面内嵌文案（最精确，能说明是哪种形态），再看 URL/iframe src 重定向
      const txt = this.hitText();
      if (txt) return txt;
      if (this.inUrl()) return 'URL 被重定向到验证码页（' + clampText(location.pathname, 40) + '）';
      return null;
    },
    start() {
      if (this._on) return; this._on = true;
      setTimeout(() => { try { this.tick(); } catch (e) { /* ignore */ } }, 1500);
      this._timer = setInterval(() => { try { this.tick(); } catch (e) { /* ignore */ } }, 3000);
    },
    tick() {
      const hit = this.detect();
      const reason = Session.data.pausedReason || '';
      const wasCaptcha = /反爬|验证码/.test(reason) && Session.data.paused;
      if (hit && !wasCaptcha) {
        this._lastHit = hit;
        Session.set({ paused: true, pausedReason: '反爬验证：请人工输入验证码后点「继续」' });
        try { L2.pause(); } catch (e) { /* ignore */ }
        log('warn', 'E5 检测到反爬图形验证码，已自动暂停自动化：' + clampText(hit, 60));
        Notifier.critical('反爬验证码', '检测到图形验证码：' + clampText(hit, 60) + '。请在页面输入验证码并提交，脚本不会代填。');
        try { Bus.send('need-help', { desc: '反爬验证码：' + clampText(hit, 40) }); } catch (e) { /* ignore */ }
      } else if (!hit && wasCaptcha) {
        // 🔴 v1.11.1：验证码通过后也必须重新过授权门禁（不能直接 resume，否则成为绕过授权的入口）
        log('info', '反爬验证码已通过（人工处理完成），重新校验授权后恢复自动学习');
        resumeAutomation().then((ok) => {
          if (ok) Notifier.banner('验证码已通过，已自动恢复自动学习', { level: 'info', ttl: 6000, force: true });
        });
      }
    },
  };

  /* ================================================================
   * 11. L2 · 播放执行器（播放页主循环：状态机 + 答题 + 防挂机 + 跳转）
   * ================================================================ */
  // 🔴🔴 付费授权闸门状态（v1.11.1）：后端 license/check 的**最近一次**结论，全局唯一真相。
  //   ok  !== true → 一切自动化动作（Router 探测 / L0 调度 / L1 推进 / L2 播放与翻页 / 定时器兜底）都必须停手。
  //   写入方：Backend.gate()、Maintenance.checkLicense()（心跳）、Backend._clearAuth()（令牌失效）。
  //   🔴 为什么要有它：此前只有 boot() 里的 gate() 会 L2.pause()，而所有「恢复入口」
  //      （面板「继续」/菜单「继续自动化」/验证码自动恢复/网络恢复/会话守卫「我已登录，继续」…）
  //      都是直接 Session.set({paused:false}) + L2.resume() + Router.reprobe()，**完全绕过授权校验**
  //      → 未登录脚本账户 / 无学习卡 / 后端停服时，点一次「继续」就能把整门课刷完。
  // code：后端返回的机器可读拒绝原因（'build_mismatch' = 构建号不在白名单 → 需更新脚本）
  const AuthGate = { ok: false, known: false, reason: '未校验授权', code: '', need: '' };

  // 🔴🔴 完整性自检闸门（v1.17.4）：脚本文件是否被改动过。与 AuthGate / RulePack 并列的第三道门禁。
  //   双层防护：① 本地——启动时对自身源码算 SHA-256 与构建期注入值比对，不符即暂停 + 提示重装；
  //            ② 后端——license/check 上报 self_hash（运行时计算值），后端按构建号登记表
  //               （GZAL_SCRIPT_HASHES）对账，不符 → 拒授权（与构建号白名单互锁：
  //               改代码必改 hash，换构建号必被白名单拒）。
  //   开发版（GZAL_SELF_HASH='__DEV_SKIP__'）跳过本地自检；未登记构建号后端只记录不拒（过渡期）。
  // 写入方：仅 Integrity.verify()（启动一次）；无恢复入口——被改动只能重装脚本。
  const Integrity = {
    ok: false, checked: false, reason: '', lastHash: '',
    // 与 tools/build-release.mjs 的规范化规则严格一致（改一端必须改另一端）
    _norm(s) {
      return String(s || '').replace(/\r\n/g, '\n').replace(/\s+$/, '');
    },
    async _sha256(s) {
      const subtle = (window.crypto && window.crypto.subtle) || null;
      if (!subtle) throw new Error('当前页面不支持 WebCrypto');
      const buf = await subtle.digest('SHA-256', new TextEncoder().encode(s));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    },
    // 自算并比对：返回 {ok, hash, dev}。dev=true 表示开发版跳过。
    async check() {
      if (GZAL_SELF_HASH === '__DEV_SKIP__') return { ok: true, hash: '', dev: true };
      // 命名函数表达式：函数体内可直接引用自身名字拿源码（'use strict' 下 arguments.callee 不可用）
      const src = this._norm(GZAL_SELF.toString().replace(GZAL_SELF_HASH, '__DEV_SKIP__'));
      const h = await this._sha256(src);
      this.lastHash = h;
      return { ok: h === GZAL_SELF_HASH, hash: h };
    },
    // 启动时调用一次：失败 → 第三道门禁落下（isPaused/isGlobalPaused/L2.isStopped 全部读它）
    async verify() {
      let r;
      try { r = await this.check(); }
      catch (e) { r = { ok: false, hash: '', reason: '完整性自检异常：' + e.message }; }
      this.checked = true;
      if (r.ok) {
        this.ok = true; this.reason = '';
        // 重装干净脚本后：清掉此前「脚本被修改」的暂停态。boot 的旧状态自愈正则不覆盖这个理由，
        // 不清则用户重装+刷新后面板仍卡在暂停，要手动点一次「继续」（v1.17.4 实机流程发现）。
        try {
          if (Session.data && Session.data.paused && /脚本文件被修改/.test(Session.data.pausedReason || '')) {
            SessionGuard.reset(); L2.resume();
            Session.set({ paused: false, pausedReason: '' });
            log('info', '[完整性] 已清除此前「脚本被修改」的暂停态，自动化恢复');
          }
        } catch (e) { /* ignore */ }
        if (r.dev) log('info', '[完整性] 开发版构建，跳过完整性自检');
        else log('info', '[完整性] 脚本完整性自检通过');
        return true;
      }
      this.ok = false; this.reason = r.reason || '脚本文件已被修改';
      log('error', '[完整性] ' + this.reason + '（SHA-256 不匹配），自动化已暂停。请从脚本主页重新安装官方版本。');
      L2.pause();
      Session.set({ paused: true, pausedReason: '脚本文件被修改，请重新安装' });
      try { Notifier.critical('脚本文件被修改', '检测到脚本代码被改动，已暂停自动化。请从脚本主页重新安装官方版本，然后刷新页面。'); } catch (e) { /* ignore */ }
      try { Backend.tamperNotice(this.reason); } catch (e) { /* ignore */ }
      try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
      return false;
    },
  };

  // 统一暂停闸门：任何调度路径（Router/L0/L1/定时器/setTimeout 兜底）在动手前都必须先问它
  // 修复「点击暂停后仍继续跳转」的根因——此前只有 L2 主循环检查 _pauseFlag，
  // Router.probe / L0.start / enterNextCourse / L1.enterNext 及顶层 URL 监听、online 事件均未检查。
  function isPaused() {
    try {
      // 授权未通过（含「尚未校验」）→ 视为暂停：默认拒绝，等 gate() 放行
      if (AuthGate.ok !== true) return true;
      // 🔴 v1.12.0：核心规则未下发（无本地兜底）→ 同样视为暂停，什么都不能做
      if (typeof RulePack !== 'undefined' && !RulePack.ok) return true;
      // 🔴 v1.17.4：完整性自检未通过（脚本被改动）→ 同样视为暂停，只能重装才能恢复
      if (typeof Integrity !== 'undefined' && !Integrity.ok) return true;
      return !!(L2._pauseFlag || (Session.data && Session.data.paused) || SessionGuard.triggered || HumanCollab.engaged);
    } catch (e) { return false; }
  }

  // 全局门禁（不含 L2 播放器暂停标记）：
  //   调查问卷页进入时路由会主动 L2.pause()，若用 isPaused() 判断「能否跳转/收尾」会把自己挡掉
  //   （v1.13.3 实测踩到：只读问卷页里 finishCourse 被 L2._pauseFlag 拦下 → 又卡死）。
  //   手动暂停 / 未授权 / 无规则 / 会话过期 仍然一律拦下。
  function isGlobalPaused() {
    try {
      if (AuthGate.ok !== true) return true;
      if (typeof RulePack !== 'undefined' && !RulePack.ok) return true;
      if (typeof Integrity !== 'undefined' && !Integrity.ok) return true;   // v1.17.4 完整性自检
      return !!((Session.data && Session.data.paused) || SessionGuard.triggered || HumanCollab.engaged);
    } catch (e) { return false; }
  }


  // 统一「恢复自动化」入口（v1.11.1）：所有恢复路径都必须先过授权门禁，未通过则保持暂停并弹授权面板。
  // 返回 true=已恢复；false=未授权（已暂停 + 已提示）。
  async function resumeAutomation() {
    let r = null;
    try { Panel.toast('校验学习授权…'); } catch (e) { /* ignore */ }
    try {
      Backend.init();                      // 重新读取本地令牌（用户可能刚登录/被清除）
      r = await Backend.gate();
    } catch (e) {
      r = { authorized: false, showPanel: true, reason: '后端不可达（离线不降级）：' + e.message };
      AuthGate.ok = false; AuthGate.known = true; AuthGate.reason = r.reason;
    }
    if (!r || r.authorized !== true) {
      const reason = (r && r.reason) || '未授权';
      L2.pause();
      // 🔴 构建号不符：拒绝恢复 + 提示更新脚本（不弹登录面板）
      if (r && (r.buildMismatch || r.code === 'build_mismatch')) {
        Session.set({ paused: true, pausedReason: '脚本需更新（构建号不符）' });
        log('warn', '恢复被拒绝（脚本需更新）：' + reason);
        try { Backend.buildMismatchNotice(reason, r.latestBuild); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return false;
      }
      // 🔴 v1.17.4：完整性自检被后端拒（脚本被改动）→ 拒绝恢复 + 提示重装（不弹登录面板，重装才行）
      if (r && (r.scriptTampered || r.code === 'script_tampered')) {
        Session.set({ paused: true, pausedReason: '脚本文件被修改，请重新安装' });
        log('error', '恢复被拒绝（脚本文件被修改）：' + reason);
        try { Backend.tamperNotice(reason); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return false;
      }
      // 🔴 v1.13.1：未登录继教网 / 不在学习页 → **不弹脚本面板**，只提醒 + 必要时引导进学习中心
      if (r && r.needGzLogin) {
        Session.set({ paused: true, pausedReason: reason });
        log('warn', '恢复被拒绝（未登录继教网）：请手动登录');
        try { Stage.notifyLogin(true); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return false;
      }
      if (r && r.needStudyPage) {
        Session.set({ paused: true, pausedReason: reason });
        log('warn', '恢复被拒绝（需在学习中心/课程超市识别账户与期数）：' + reason);
        const gone = (CFG.autoGoStudyCenter !== false) && Stage.onGz() && Stage.goStudyCenter('需要识别账户/期数');
        if (!gone) {
          try { Notifier.banner('⚠ ' + reason + '。请打开「学习中心」或「课程超市」页面。', { level: 'warn', force: true, ttl: 8000 }); } catch (e) { /* ignore */ }
        }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return false;
      }
      Session.set({ paused: true, pausedReason: reason });
      log('warn', '恢复被拒绝（授权未通过）：' + reason);
      try { if (r && r.showPanel) Backend.showAuthPanel(reason, r); } catch (e) { /* ignore */ }
      try { Notifier.banner('⚠ 授权未通过：' + reason + '。自动化保持暂停。', { level: 'warn', force: true, ttl: 6000 }); } catch (e) { /* ignore */ }
      try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
      return false;
    }
    SessionGuard.reset();
    HumanCollab.engaged = false;
    L2._limitWarned = false;               // 清除「限时暂停」标记，用户手动继续时允许重新尝试
    // 🔴 v1.12.0：恢复前必须拿到核心规则（授权通过 ≠ 规则可用；规则缺失时不恢复，避免空选择器乱点）
    if (!RulePack.ok) {
      const okPack = await RulePack.load(true);
      if (!okPack) {
        const why = RulePack.reason || '未知';
        L2.pause();
        Session.set({ paused: true, pausedReason: '规则包不可用：' + why });
        log('warn', '恢复被拒绝（规则包不可用）：' + why);
        try { Notifier.banner('⚠ 核心规则未下发：' + why + '。自动化保持暂停。', { level: 'warn', force: true, ttl: 6000 }); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return false;
      }
    }
    L2.resume();
    Session.set({ paused: false, pausedReason: '', reconcileRound: 0 });
    log('info', '授权通过 → 恢复自动化');
    try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
    // 恢复后立即重新探测，让自动化马上续跑（否则要等 URL 变化才启动）
    setTimeout(() => { try { if (!isPaused()) Router.reprobe(); } catch (e) { /* ignore */ } }, 300);
    return true;
  }

  const L2 = {
    running: false, _pauseFlag: false, _endedHandled: 0, _videoWaitStart: 0, _leakWarned: false, _limitWarned: false,
    currentVideo() {
      for (const sel of CFG.selectors.video) {
        const v = qs(sel);
        if (v) return v;
      }
      // 顶层无 video 时穿透同域 iframe 查找（超星视频在 studentstudy → knowledge/cards → ananas 三层 iframe 内）。
      // 否则 maybeSectionDone / verifyPlaybackComplete / HumanCollab 等用 currentVideo() 的进度判定会读不到视频。
      const deep = this.deepVideo();
      return deep ? deep.video : null;
    },
    // 穿透同域 iframe 找 video（超星视频在 studentstudy → knowledge/cards → ananas 三层 iframe 内）。
    // 返回 { video, doc }（doc 为 video 所在 iframe 的 document，供后续操作）；找不到返回 null。
    deepVideo() {
      try {
        const top = this._topVideo();
        if (top) return { video: top, doc: document };
        const walk = (doc, depth) => {
          if (depth > 5 || !doc) return null;
          const v = doc.querySelector('video');
          if (v) return { video: v, doc: doc };
          const frames = doc.querySelectorAll('iframe');
          for (const f of frames) {
            try {
              const inner = f.contentDocument;
              if (!inner) continue;
              const hit = walk(inner, depth + 1);
              if (hit) return hit;
            } catch (e) { /* 跨域 iframe 跳过 */ }
          }
          return null;
        };
        return walk(document, 0);
      } catch (e) { return null; }
    },
    // 超星播放器给 video 设了 preload="none"，页面加载后 duration 读不到（readyState=0）。
    // 但脚本判定「谁在播/播到哪/是否达标」全靠 currentTime/duration，duration=null 会导致：
    //   nextPendingVideo() 把所有视频都当「未就绪」→ 在视频间横跳 / chaoxingAllDone() 永远 false → 永不判完成
    //   → 反复 safePlay 点播放按钮 → 触发超星反爬验证码。
    // 修复：读 duration 前，若读不到（preload=none 或 readyState 过低），强制 preload='metadata' + load()，
    //   只加载视频头拿元数据（不下载完整视频、不消耗时长、不触发反爬），loadedmetadata 后 duration 即可读。
    ensureMetaLoaded(v) {
      if (!v) return false;
      try {
        // 已能读到有效时长 → 无需处理
        if (isFinite(v.duration) && v.duration > 0) return true;
        // 元数据未加载（preload=none 是主因）：改 metadata 并重新 load，异步触发 loadedmetadata
        const p = v.getAttribute('preload');
        if (p === 'none' || !p) {
          try { v.preload = 'metadata'; } catch (e) { /* ignore */ }
        }
        if (v.readyState === 0 && v.networkState !== 2 /* NETWORK_LOADING */) {
          try { v.load(); } catch (e) { /* ignore */ }
        }
        return false;  // 异步加载中，本轮 duration 仍读不到，下轮主循环再读
      } catch (e) { return false; }
    },
    // 穿透同域 iframe 收集「所有」video（超星任务点可能含多个视频：视频1/视频2/视频3，
    // 完成条件为「总时长 ≥90%」，需顺序播完每个视频，而非只播第一个）。
    // 返回 [{ video, doc }] 数组；无 video 返回 []。复用 deepVideo 的 walk 逻辑但收集全部。
    allVideos() {
      const out = [];
      const seen = new Set();
      try {
        const walk = (doc, depth) => {
          if (depth > 6 || !doc) return;
          const vids = doc.querySelectorAll('video');
          for (const v of vids) {
            if (seen.has(v)) continue;
            seen.add(v);
            out.push({ video: v, doc: doc });
          }
          const frames = doc.querySelectorAll('iframe');
          for (const f of frames) {
            try {
              const inner = f.contentDocument;
              if (inner) walk(inner, depth + 1);
            } catch (e) { /* 跨域 iframe 跳过 */ }
          }
        };
        walk(document, 0);
      } catch (e) { /* ignore */ }
      return out;
    },
    // 统一视频选择入口（平台分派）：超星多视频顺序策略 → Chaoxing.nextPendingVideo；
    // 自营/尚睿通单视频 → deepVideo（顶层）或 currentVideo（iframe）。
    pickVideo() {
      if (PLATFORM === 'chaoxing') return Chaoxing.nextPendingVideo();
      return IS_TOP ? this.deepVideo() : { video: this.currentVideo(), doc: document };
    },
    // 「当前正在/应当播放」的视频（平台分派）——面板展示、防漏播校验、人工协作恢复判定都必须用它。
    // 原因：超星多视频任务点里 currentVideo() 只返回 DOM 里第一个 <video>（往往已播完且处于暂停），
    // 而真正在播的是第 2 个 → 面板「视频进度」不动、与正在播放的视频对不上，防漏播校验也会误判。
    //   ① 优先：主循环 pickVideo 粘住的 _activeVideo（多视频顺序播放的当前目标）
    //   ② 其次：第一个「未达标」的视频
    //   ③ 兜底：正在播放的 → DOM 里第一个
    activeVideo() {
      if (PLATFORM !== 'chaoxing') return this.currentVideo();
      const a = Chaoxing._activeVideo;
      if (a && a.video && a.video.isConnected !== false) return a.video;
      const all = this.allVideos();
      for (const { video } of all) {
        const d = video.duration;
        if (isFinite(d) && d > 0 && (video.currentTime / d) < CFG.chaoxingDoneRatio) return video;
      }
      const playing = all.find(({ video }) => !video.paused && !video.ended);
      return playing ? playing.video : (all[0] ? all[0].video : null);
    },
    // 只查顶层 document 的 video（不穿透），供 currentVideo/deepVideo 内部避免递归
    _topVideo() {
      for (const sel of CFG.selectors.video) {
        const v = qs(sel);
        if (v) return v;
      }
      return null;
    },
    pause() { this._pauseFlag = true; },
    resume() { this._pauseFlag = false; },

    async waitVideo(timeoutMs) {
      this._videoWaitStart = NOW();
      const deadline = NOW() + (timeoutMs || 30000);
      while (NOW() < deadline) {
        const v = this.currentVideo();
        if (v) return v;
        await sleep(800);
      }
      return null;
    },

    async safePlay(v) {
      try {
        // 暂停闸门：本帧 _pauseFlag 或全局 Session.paused 时一律不播（否则手动暂停后仍会播放/暂停横跳）
        if (this.isStopped()) return false;
        // 页面不可见（后台标签/最小化/被完全遮挡）时不抢播（v1.7.45 旧逻辑）。
        // v1.16.0：isHidden() 在「后台继续学习」开启时恒为 false（页面真实世界已伪装前台），
        // 因此最小化/切标签不再阻断播放；关闭该项时仍保留旧行为（静等前台，避免与平台暂停拉锯）。
        if (this.isHidden()) return false;
        // 冷却：避免「播放后被平台暂停 → pause 监听器 → safePlay → 点击播放」死循环，
        // 高频点击播放按钮会被超星等平台判定为机器人触发反爬验证码。两次 safePlay 间隔 ≥ 3 秒。
        const _now = NOW();
        if (_now - (this._lastSafePlay || 0) < 3000) return false;
        this._lastSafePlay = _now;
        // 超星视频内弹题（tkTopic）：弹题期间平台要求先作答，绝不能在此抢播放
        if (PLATFORM === 'chaoxing' && Chaoxing.quizVisible()) return false;
        // 尚睿通弹题卡片（随堂小练习/验证题）：卡片打开时视频被平台暂停，脚本抢播会越过弹题
        if (PLATFORM === 'yanxiu' && Yanxiu.cardVisible()) return false;
        // 超星多视频：播放 v 前先强制暂停其它所有视频，确保一次只播一个（多视频同时播会触发反爬）
        if (PLATFORM === 'chaoxing') Chaoxing.pauseOtherVideos(v);
        if (CFG.mute) v.muted = true;
        if (v.playbackRate !== CFG.playbackRate) v.playbackRate = CFG.playbackRate;
        // 超星 video.js：优先走播放器实例的 play()（触发超星内部「单例互斥」，自动暂停其它视频）。
        // 初始 readyState=0（元数据未加载）时，videojs().play() 会内部触发加载+播放；
        // 但稳妥起见，未就绪时先点大播放按钮（vjs-big-play-button）触发完整初始化。
        if (PLATFORM === 'chaoxing') {
          const p = Chaoxing.chaoxingPlayer(v);
          if (p && typeof p.play === 'function') {
            if (v.readyState === 0 || !isFinite(v.duration) || v.duration <= 0) {
              // 未就绪：先点播放按钮触发加载（点击按钮也走 video.js 内部事件，会触发互斥）
              if (this.clickPlayButton(v)) { log('info', '超星视频未就绪，已点播放按钮触发加载'); return true; }
            }
            try { p.play(); return true; } catch (e) { /* 落到原生 play 兜底 */ }
          }
        }
        // 尚睿通 vcp-player(MSE/blob)：优先点播放器自己的播放按钮——原生 play() 会绕过其取流状态机，
        // 实测会出现「paused=false 但 readyState=0、不发任何媒体请求」的假播放（视频永远不动）。
        if (PLATFORM === 'yanxiu' && v.paused) {
          if (this.clickPlayButton(v)) {
            log('info', '尚睿通：已点播放器播放按钮起播');
            await sleep(1200);
            if (!v.paused) return true;
          }
        }
        // 阿里云 Prism(Aliplayer) 等播放器会重写 video.play()（返回 false 而非 Promise），
        // 此时直接 play() 无效。必须先尝试「原生 HTMLMediaElement.prototype.play.call(v)」
        // 绕过播放器 wrapper 的重写——自营(Prism)播放器内部状态错乱时（大播放按钮显示 pause 但
        // 原生 video.paused=true），点 UI 按钮和重写版 play() 都无效，唯有原生 play 能真正起播。
        let r;
        try {
          r = HTMLMediaElement.prototype.play.call(v);
        } catch (e0) { r = null; }
        if (r && typeof r.then === 'function') {
          try { await r; } catch (e1) { /* play() 可能被 autoplay 策略拒绝，落到按钮点击 */ }
          if (!v.paused) return true;   // 原生 play 成功后已起播
        }
        // 原生 play 未起播 → 回退点击播放按钮（Prism/video.js 大播放按钮）
        if (this.clickPlayButton(v)) return true;
        // 仍失败：再试一次播放器重写版 play（可能已就绪）
        try { const r2 = v.play(); if (r2 && typeof r2.then === 'function') { await r2; return true; } } catch (e2) { /* ignore */ }
        return false;
      }
      catch (e) { log('warn', 'play() 被拒绝: ' + e.message); if (this.clickPlayButton(v)) return true; return false; }
    },

    // 点击播放器的播放按钮（Prism 大播放按钮 / video.js 大播放按钮 / 控制栏播放按钮）。
    // v 可选：传入 video 元素时，优先在「video 所在的 iframe document」里查找按钮
    //（超星播放按钮在 ananas 内层 iframe，顶层 qs 查不到）。
    clickPlayButton(v) {
      // 候选根节点：video 所在 document（优先）→ 顶层 document
      const roots = [];
      if (v && v.ownerDocument) roots.push(v.ownerDocument);
      roots.push(document);
      for (const root of roots) {
        for (const sel of CFG.selectors.playBtn) {
          const btn = qs(sel, root);
          if (btn && is_visible(btn)) {
            try {
              // 模拟人工：先把播放器滚到可视区（超星播放器可能要求可见才响应点击/懒加载）
              try { btn.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) { /* ignore */ }
              btn.click();
              log('info', '已点击播放按钮触发播放');
              return true;
            } catch (e) { /* ignore */ }
          }
        }
      }
      return false;
    },

    // 等待"完成学习"类提示（平台记进度依据）
    detectDoneHint() {
      for (const t of CFG.sectionDoneTexts) {
        const els = qsa('div,span,p').filter((e) => is_visible(e) && clampText(e.textContent, 40) === t);
        if (els.length) return t;
      }
      // 自营 study 页「完成学习」弹窗：文案是「您已完成本活动的学习，您可选择：」（非精确「完成学习」）
      const doneModal = qsa('div,span,p').find((e) => is_visible(e) && /您已完成本活动的学习|您已完成.*学习/.test(clampText(e.textContent, 60)));
      if (doneModal) return '完成学习';
      return null;
    },

    // 进度是否已达标（差 ≤2s，或不足总时长 5%）
    _gapOk(v) {
      if (!v || !isFinite(v.duration) || v.duration <= 0) return true;  // 无法校验则放行
      return (v.duration - v.currentTime) <= Math.max(2, v.duration * 0.05);
    },

    // 防漏播校验：跳转前确认视频确实播到了末尾，避免"没播完就跳"（会导致平台不记学时）
    async verifyPlaybackComplete() {
      // 超星：完成标准是「任务点内所有视频都 ≥90%」，不能用单个视频「播到末尾」来校验——
      // 否则会拿 DOM 里第一个（已播完）的视频去比，误判未播完 → 重播第一个视频 →
      // 进度卡死 / 反复重播触发反爬。
      if (PLATFORM === 'chaoxing') {
        if (Chaoxing.chaoxingAllDone()) return true;
        const cur = Chaoxing.nextPendingVideo();
        if (cur && cur.video && !cur.video.ended) await this.safePlay(cur.video);
        log('warn', '超星：仍有视频未达 ' + (CFG.chaoxingDoneRatio * 100).toFixed(0) + '%，暂不跳转，继续播放');
        return false;
      }
      const v = this.activeVideo();
      if (!v || v.ended || this._gapOk(v)) return true;
      log('warn', `防漏播校验未通过（${fmt(v.currentTime)} / ${fmt(v.duration)}），暂不跳转，继续播放`);
      await this.safePlay(v);
      return false;
    },

    // 完成判定的补充通道：部分机构不触发 ended 就显示"完成学习"，
    // 此时只要进度达标 + 出现完成提示，同样判定章节完成（由主循环每秒复查）
    maybeSectionDone() {
      if (this._pauseFlag || HumanCollab.engaged || SessionGuard.triggered) return false;
      const v = this.activeVideo();
      // 超星特殊判定：平台规则是"观看进度 ≥90% 即记为完成"，视频常被平台截停在 ~90% 不触发 ended。
      // 一个任务点可能含多个视频（视频1/视频2/视频3），必须「所有视频都 ≥90%」才判定完成，
      // 否则只播完第一个就点「下一节」会被平台拒绝、并反复重播第一个视频 → 触发反爬。
      if (PLATFORM === 'chaoxing') {
        if (Chaoxing.chaoxingAllDone()) {
          const now = NOW();
          if (now - this._endedHandled < 5000) return false;   // 与 ended 通道共用去抖
          this._endedHandled = now;
          log('info', '超星：本任务点所有视频均已 ≥ ' + (CFG.chaoxingDoneRatio * 100).toFixed(0) + '%，判定任务点完成');
          this.sectionDone(true).catch((e) => log('error', '章节完成处理异常: ' + e.message));
          return true;
        }
        return false;   // 超星：有视频未达标，或不走下方通用"完成提示"通道
      }
      const hint = this.detectDoneHint();
      // 平台是否已认可「当前活动完成」：自营会弹出「您已完成本活动的学习」弹窗，或 thisActIsFinish='Y'。
      // 🔴 关键（v1.7.72）：这类情况下**不能**再做"防漏播校验"。已完成的旧活动被重新打开时，
      //   视频停在中间（如 109/1079），旧逻辑会一直 safePlay 并 return false → 弹窗永远没人点掉，
      //   这就是用户看到的"弹窗不消失"。平台自己都认定完成了，点「下一活动」是安全的。
      const platformDone = this.platformActFinished();
      if (!hint && !platformDone) return false;
      if (!v) {
        // 无视频（页面可能已跳转 / 非视频活动页）：仅当平台已弹完成弹窗时才推进，否则交给 L1
        if (!platformDone) return false;
        const n0 = NOW();
        if (n0 - this._endedHandled < 5000) return false;   // 与 ended 通道共用去抖
        this._endedHandled = n0;
        log('info', '完成弹窗存在（无视频/已跳转）→ 判定活动完成');
        this.sectionDone(false, true).catch((e) => log('error', '章节完成处理异常: ' + e.message));
        return true;
      }
      if (!platformDone && !this._gapOk(v)) {     // 有"完成"字样但没播够 → 防漏播，继续播
        if (!this._leakWarned) {
          this._leakWarned = true;
          log('warn', `检测到「${hint || '完成提示'}」但视频还剩 ${(v.duration - v.currentTime).toFixed(1)}s 未播完，防漏播：继续播放不跳转`);
        }
        this.safePlay(v);
        return false;
      }
      this._leakWarned = false;
      const now = NOW();
      if (now - this._endedHandled < 5000) return false;   // 与 ended 通道共用去抖
      this._endedHandled = now;
      log('info', platformDone
        ? '平台已判定本活动完成（完成弹窗/已标记 finish）→ 判定活动完成（跳过防漏播校验）'
        : `完成提示「${hint}」+ 进度达标 → 判定章节完成（无需等待 ended）`);
      this.sectionDone(false, platformDone).catch((e) => log('error', '章节完成处理异常: ' + e.message));
      return true;
    },

    findNextButton() {
      for (const sel of CFG.selectors.nextBtn) { const b = qs(sel); if (b && is_visible(b)) return b; }
      for (const t of CFG.nextButtonTexts) {
        const btn = qsa('button,a,div[role="button"]').find((e) => is_visible(e) && clampText(e.textContent, 20).includes(t));
        if (btn) return btn;
      }
      return null;
    },

    // 专门定位「下一活动 / 上一活动」按钮（非视频活动页的翻页按钮，如讨论话题/拓展阅读/问卷调查）
    findActivityNavButton() {
      const btns = qsa('button,a,div[role="button"]').filter(is_visible);
      const next = btns.find((e) => clampText(e.textContent, 12).replace(/\s+/g, '') === '下一活动');
      if (next) return next;
      const prev = btns.find((e) => clampText(e.textContent, 12).replace(/\s+/g, '') === '上一活动');
      return prev || null;
    },

    // 读取「学习目录-课程学习」活动列表里「当前正在学」的活动图标类型，返回 'video'|'non-video'|null。
    // 活动项 = div.ant-collapse-item.collapseactivityName2（活动级；collapseactivityName1 是活动组，勿混），
    // 正在学的那项带 isActive class；活动图标在 .ant-collapse-extra .collapseextra 内的 .anticon-*。
    // 图标类型：play-square=视频 / message=讨论 / profile=阅读 / form=问卷。
    // 这是区分「视频活动(加载中)」与「真非视频活动」的可靠依据——视频活动在加载期间也无 video 元素，
    // 仅凭「无 video + 有下一活动按钮」会误判为可跳过的非视频活动，从而跳过整个视频活动。
    currentActivityType() {
      const item = qs('.ant-collapse-item.isActive.collapseactivityName2');
      if (!item) return null;
      const icon = qs('.ant-collapse-extra .anticon, .collapseextra .anticon', item);
      if (!icon) return null;
      const cls = icon.getAttribute('class') || '';
      if (/play-square|play-circle|video|play/.test(cls)) return 'video';
      if (/message|comment|form|question|edit|profile|file|read|book|survey|folder/.test(cls)) return 'non-video';
      return null;
    },

    // 判定当前是否为「非视频活动页」：无 video 元素，但有活动翻页按钮（讨论/阅读/问卷等）
    // 与"视频未加载完成"区分开的关键：活动翻页按钮是活动页的强特征，列表页/登录页没有
    isNonVideoActivity() {
      if (this.currentVideo()) return false;          // 有视频 → 正常播放，非此分支
      // 超星任务点页：非视频任务点（文档/讨论/测验）——无视频 iframe（ans-insertvideo-online/ananas），
      // 但有「下一节」按钮可翻页。必须排除"视频 iframe 正在加载"的情况（有 iframe 容器但 video 未就绪）。
      if (PLATFORM === 'chaoxing') {
        if (!Chaoxing.chaoxingHasNextChapter()) return false;   // 无「下一节」按钮 → 非任务点页
        if (Chaoxing._chaoxingVideoIframePresent()) return false;     // 有视频 iframe 容器 → 视频任务点（可能加载中）
        return true;                                               // 无视频 iframe + 有下一节 → 非视频任务点
      }
      // 自营(study.gzteacher.com)：用活动列表图标类型精确判定当前活动类型。
      // 视频活动(play-square)在加载期间也无 video → 判「是视频」不跳过，等视频加载（避免跳过整个视频活动）。
      const atype = this.currentActivityType();
      if (atype === 'video') return false;           // 视频活动加载中 → 不是非视频活动，别跳过
      if (atype === 'non-video') {
        if (!this.findActivityNavButton()) return false;
        return true;                                 // 明确非视频活动 → 跳过
      }
      // atype === null：活动列表/图标还没渲染（视频活动加载中常见）→ 保守判「不是非视频活动」，
      // 不跳过，等视频或活动列表就绪（避免在视频加载期间误点「下一活动」跳过整个视频活动）。
      return false;
    },

    // 跳过非视频活动：点击「下一活动」直到出现视频，或翻完整个活动列表
    async skipNonVideoActivity() {
      if (isPaused()) return false;   // 🔴 v1.11.1：未授权/暂停中不点「下一活动」（本函数会翻页推进课程）
      const now = NOW();
      if (now - (this._skipAt || 0) < 3000) return false;  // 去抖：避免 SPA 切换期间快速连点
      this._skipAt = now;
      // 超星非视频任务点：直接点「下一节」翻到下一个任务点（可能下一个就是视频）
      if (PLATFORM === 'chaoxing') {
        // 投票问卷任务点优先：随机作答 + 提交 + 关闭 + 下一节（点「下一节」会因投票未完成被平台拒绝）
        if (Chaoxing.detectChaoxingVote()) {
          log('info', '超星：检测到投票问卷任务点，转入自动投票');
          Chaoxing.driveChaoxingVote();
          await sleep(2000);
          return true;
        }
        if (Chaoxing.chaoxingNextChapter()) {
          log('info', '超星：非视频任务点，点击「下一节」跳过');
          Stats.bump('skippedActivities');
          Session.set({ phase: 'L2-skip-activity' });
          await sleep(2000);
          return true;
        }
        return false;
      }
      const btn = this.findActivityNavButton();
      if (!btn) return false;
      const name = clampText(btn.textContent, 20);
      log('info', `检测到非视频活动（讨论/阅读/问卷等），点击「${name}」跳过`);
      Stats.bump('skippedActivities');
      try { btn.click(); } catch (e) { log('warn', '点击活动翻页按钮失败: ' + e.message); return false; }
      Session.set({ phase: 'L2-skip-activity' });
      await sleep(800);
      // 点「下一活动」后检测「没有下一活动了」提示：说明已是本课程最后一个活动 → 课程完成，切下一门课
      if (this.detectNoMoreActivity()) { this.onCourseFinished(); return true; }
      await sleep(700);
      return true;
    },

    // 检测「没有下一活动了」提示（Ant message，学习页最后一个活动时点「下一活动」触发）
    // 出现即代表当前课程的所有活动已学完 → 课程完成，需切下一门课。
    detectNoMoreActivity() {
      const tips = qsa('.ant-message-notice-content, .ant-message').filter((e) => is_visible(e));
      return tips.some((e) => /没有下一活动/.test(clampText(e.textContent, 20)));
    },

    // 课程活动链走到头（检测到「没有下一活动了」）→ 回到课程目录页 /home，
    // 由 L1 检查是否还有未完成活动：有则进入未完成活动续学；全完成则 courseDone（问卷→跳学习中心）。
    // 注意：不能直接当「课程完成」，因为可能存在被跳过/未完成的非视频活动。
    onCourseFinished() {
      log('info', 'L2：检测到「没有下一活动了」，回到课程目录页核对未完成活动');
      this.goCourseHome();
    },

    // 回到课程目录页（study.gzteacher.com/study/home）：点顶部「返回」按钮（backbtn→gohome）。
    // 学习页顶层无直接跳课程列表的入口，返回按钮即回目录页。
    goCourseHome() {
      const back = qsa('span.backbtn, [class*="backbtn"], a, button, span').find((e) => is_visible(e) && /^返回$|返回/.test(clampText(e.textContent, 4)));
      if (back) {
        try { back.click(); log('info', '已点「返回」回课程目录页'); return; } catch (e) { /* ignore */ }
      }
      // 兜底：无返回按钮时尝试 history.back / 直接跳 home
      try { history.back(); } catch (e) { /* ignore */ }
    },

    // 当前是否为「调查问卷」活动页（ACT005 问卷：有 .voteSubjectList1 题目容器）
    isQuestionnaire() {
      return qsa('.voteSubjectList1').length > 0;
    },

    // 自动完成调查问卷：全部单选题选「非常符合」，问答题填「无」，最后点「提交问卷」→ 点确认框「确定」。
    // 问卷题目 = .voteSubjectList1（标题 .voteSubjectList + 选项 label.ant-radio-wrapper/textarea）；
    // 提交按钮 = button.studybutton（「提交问卷」）；确认框 = Element UI .el-message-box 的「确定」(.el-button--primary)。
    async driveQuestionnaire() {
      if (isPaused()) return false;   // 🔴 v1.11.1：未授权/暂停中不代答提交问卷
      const now = NOW();
      if (now - (this._quizDriveAt || 0) < 5000) return false;  // 去抖
      this._quizDriveAt = now;
      const items = qsa('.voteSubjectList1');
      if (!items.length) return false;
      const norm = (t) => String(t || '').replace(/\s+/g, '');
      let answered = 0;
      for (const it of items) {
        const typeTag = clampText(it.textContent, 120);
        const isQa = /问答题|简答题|问答/.test(typeTag);
        if (isQa) {
          // 问答题：填文本（textarea）
          const ta = qs('textarea, input[type="text"]', it);
          if (ta && !String(ta.value || '').trim()) {
            try {
              ta.value = '无';
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              ta.dispatchEvent(new Event('change', { bubbles: true }));
              answered++;
            } catch (e) { /* ignore */ }
          }
        } else {
          // 单选/多选：满意度问卷统一选「非常符合」（精确匹配，避免「非常不符合」也含「符合」被误选）；
          // 无「非常符合」时取最后一个选项（正向选项通常靠后）。
          const labels = qsa('label.ant-radio-wrapper, label.ant-checkbox-wrapper', it).filter(is_visible);
          if (!labels.length) continue;
          const checked = labels.some((l) => { const inp = l.querySelector('input'); return inp && inp.checked; });
          if (checked) { answered++; continue; }   // 已作答
          const pick = labels.find((l) => norm(l.textContent) === '非常符合')
            || labels.find((l) => /非常符合|非常满意|十分符合|很符合/.test(clampText(l.textContent, 12)))
            || labels[labels.length - 1];
          if (pick) {
            try { pick.click(); answered++; } catch (e) { /* ignore */ }
          }
        }
      }
      // 提交：点「提交问卷」
      await sleep(600);
      const submit = qsa('button.studybutton, button.ant-btn-primary').find((b) => is_visible(b) && /提交问卷/.test(clampText(b.textContent, 10)));
      if (submit) {
        try { submit.click(); log('info', `问卷已作答 ${answered}/${items.length} 题，点提交`); } catch (e) { /* ignore */ }
        // 平台弹 Element UI 确认框「请确认是否提交答案」，轮询等它出现后点「确定」才真正提交。
        // 关键：点「确定」后要等确认框关闭（= 真正提交成功）才回目录页，否则确认框未关就回 /home 会导致问卷未提交。
        let confirmed = false;
        for (let k = 0; k < 20 && !confirmed; k++) {
          await sleep(500);
          const box = qs('.el-message-box');
          if (!box || !is_visible(box)) continue;
          const okBtn = qsa('.el-message-box button', box).find((b) => is_visible(b) && /确定|确认/.test(clampText(b.textContent, 6)));
          if (okBtn) { try { okBtn.click(); confirmed = true; log('info', '已点确认框「确定」提交问卷'); } catch (e) { /* ignore */ } }
        }
        // 等确认框关闭（确认提交成功）；最多再等 3 秒，仍未关闭则重试点「确定」
        for (let k = 0; k < 6; k++) {
          await sleep(500);
          const box = qs('.el-message-box');
          if (!box || !is_visible(box)) break;   // 确认框已关 → 提交成功
          if (k === 5) {                        // 最后一次仍未关 → 再点一次「确定」
            const okBtn = qsa('.el-message-box button', box).find((b) => is_visible(b) && /确定|确认/.test(clampText(b.textContent, 6)));
            if (okBtn) { try { okBtn.click(); } catch (e) { /* ignore */ } }
          }
        }
        if (!confirmed) log('warn', '未检测到问卷确认框「确定」，可能已提交或弹框延迟');
        Stats.bump('quizzes');
        // 提交后回目录页核对（问卷完成 → 课程全部完成 → 跳学习中心）
        await sleep(2000);
        this.onCourseFinished();
        return true;
      }
      return false;
    },

    onVideoEnded(v) {
      const now = NOW();
      if (now - this._endedHandled < 5000) return; // 去抖
      this._endedHandled = now;
      log('info', '视频播放结束（ended），等待完成提示…');
      const waitDone = async () => {
        for (let i = 0; i < 15; i++) {
          if (this.detectDoneHint()) { await this.sectionDone(); return; }
          await sleep(1000);
        }
        // 无提示也按完成处理（部分机构不弹提示）
        await this.sectionDone(true);
      };
      waitDone().catch((e) => log('error', '章节完成处理异常: ' + e.message));
    },

    async sectionDone(noHint, skipVerify) {
      // 防漏播校验：确认视频确实播到末尾再跳转（"没播完就跳"是平台不记学时的常见原因）
      // 例外（v1.7.72）：平台已弹「您已完成本活动的学习」弹窗 / thisActIsFinish='Y' → 平台已认可完成，无需校验
      if (!skipVerify && !(await this.verifyPlaybackComplete())) return;
      // 同页重复触发防护：ended 通道与主循环补充通道可能同时命中同一次完成
      const now = NOW();
      if (now - (this._sectionDoneAt || 0) < 10000) return;
      this._sectionDoneAt = now;
      Stats.bump('sectionsDone');
      // #4 用户手动暂停期间不跳转，避免覆盖人工现场
      if (Session.data.paused && Session.data.pausedReason && /手动|菜单/.test(Session.data.pausedReason)) {
        log('warn', '用户暂停中，暂不执行跳转（恢复后请手动进入下一节或点菜单重新探测）');
        return;
      }
      const v = this.activeVideo();
      const secName = Session.data.section || clampText(document.title, 40);
      log('info', `章节完成${noHint ? '（未见提示，按 ended 处理）' : ''}：${secName}`);
      Session.set({ phase: 'section-done' });
      Bus.send('section-done', { section: secName });
      // 平台分派：超星任务点页返回目录/下一节；其余走通用「下一节/下一活动」按钮
      if (PLATFORM === 'chaoxing') {
        await sleep(1500);
        // 本节完成 → 返回课程目录页，由 L1(enterChaoxingNext) 重新定位「下一个未完成节」，
        // 确保只学未完成节、不在已完成节上打转（超星「下一节」会跳到相邻章节，可能已学完）。
        const back = qs('a.subBack, a[href*="mycourse/stu"], a[href*="mooc2-ans/mycourse/stu"], .subBack');
        if (back) { try { back.click(); log('info', '超星：本节完成，返回课程目录页定位下一未完成节'); return; } catch (e) { /* ignore */ } }
        // 无「返回课程」按钮 → 退回「下一节」
        if (Chaoxing.chaoxingNextChapter()) { log('info', '超星：已点击「下一节」'); return; }
        return;
      }
      if (PLATFORM === 'yanxiu') {
        // 尚睿通：本节=一节课的多个资源（视频 + 拓展资源）。视频播完只代表「当前资源」完成，
        // 交回学习页监视器推进下一个资源；全部资源完成才回项目详情页（见 Yanxiu.advanceRes）。
        log('info', '尚睿通：当前资源播放完成 → 交回监视器推进下一个资源');
        await sleep(1200);
        Yanxiu.advanceRes();
        return;
      }
      // 自身尝试跳转：优先点「完成学习」弹窗里的「下一活动」按钮（自营 study 页顶层也走这里），
      // 再 fallback 到通用「下一节/下一活动」按钮。
      const beforeHref = location.href;
      const doneModalNext = this.clickDoneModalNext();
      if (doneModalNext) {
        log('info', '已点击完成弹窗「下一活动」');
        // 若已是最后一个活动，点「下一活动」会触发「没有下一活动了」→ 课程完成，切下一门课
        await sleep(800);
        if (this.detectNoMoreActivity()) { this.onCourseFinished(); return; }
        // 兜底（v1.7.72）：平台偶尔未把弹窗关掉（异步回调又把 showNextBool 置回 true）→ 确认/补刀关闭
        await this.settleDoneModal(beforeHref);
        return;
      }
      const btn = this.findNextButton();
      if (btn) { // 顶层/iframe 都点按钮（自营 study 页是顶层，且完成弹窗里的「下一活动」是唯一入口）
        await sleep(1200); try { btn.click(); log('info', '已点击下一节按钮'); return; } catch (e) { /* ignore */ }
      }
      await sleep(3000);
      const v2 = this.currentVideo();
      if (!v2 || v2 === v) {
        // 未跳转：顶层由 L1 接管（Bus 已通知）；iframe 且 10 秒后仍停留 → 刷新页面触发平台自动续播
        if (!IS_TOP) {
          await sleep(10000);
          const v3 = this.currentVideo();
          if (!v3 || (v3 === v && v3.currentTime >= (v3.duration || 1) - 1)) {
            log('info', '停留超时，刷新页面尝试平台自动续播');
            location.reload();
          }
        }
      }
    },

    // 检测「完成学习」弹窗（自营 study 页：Ant Modal 标题「提示」，body 文案「您已完成本活动的学习，您可选择：」，
    // 内嵌三个按钮「重新学习」「下一活动」「关 闭」），点击「下一活动」跳转到下一活动并关闭弹窗。
    // 返回 true 表示已点击。
    clickDoneModalNext() {
      const norm = (t) => String(t || '').replace(/\s+/g, '');
      const modals = qsa('.ant-modal').filter(is_visible);
      for (const m of modals) {
        const body = m.querySelector('.ant-modal-body');
        if (!body) continue;
        const txt = norm(body.textContent);
        if (!/您已完成本活动的学习|您已完成.*学习/.test(txt)) continue;
        // 找「下一活动」按钮（文本去空白精确匹配）
        const btns = qsa('button', body).filter(is_visible);
        const next = btns.find((b) => norm(b.textContent) === '下一活动');
        if (next) { try { next.click(); return true; } catch (e) { /* ignore */ } }
      }
      return false;
    },

    // 定位「您已完成本活动的学习」完成弹窗（返回可见的那个；Ant 关闭后 DOM 不销毁，故必须过滤可见）
    doneModalEl() {
      return qsa('.ant-modal').filter(is_visible).find((m) => {
        const b = m.querySelector('.ant-modal-body');
        return b && /您已完成本活动的学习|您已完成.*学习/.test(clampText(b.textContent, 60));
      }) || null;
    },

    // 平台是否已认可「当前活动完成」（v1.7.72）
    //   自营：弹出了「您已完成本活动的学习」弹窗，或当前活动组件 thisActIsFinish === 'Y'。
    //   用于跳出「防漏播校验」——平台自己都认定完成了，就不该再要求视频播到末尾。
    platformActFinished() {
      if (this.doneModalEl()) return true;
      if (PLATFORM === 'self-study') {
        try { const st = Self.state(); if (st && st.finish) return true; } catch (e) { /* ignore */ }
      }
      return false;
    },

    // 点「下一活动」后兜底确认弹窗真的关掉了（v1.7.72）
    //   平台侧 `next1(){ showNextBool=false; this.next() }`，但 `checkUserAnswerQuestionnaire` 的
    //   异步回调会把 showNextBool 再置回 true → 弹窗"关不掉"。这里按情况补刀：
    //     · 已完成跳转（URL 变了）或下一活动视频已在播放 → 弹窗属残留 → 点「关闭」
    //     · 尚未跳转 → 重试点「下一活动」
    async settleDoneModal(beforeHref) {
      const norm = (t) => String(t || '').replace(/\s+/g, '');
      for (let i = 0; i < 6; i++) {
        const m = this.doneModalEl();
        if (!m) return true;
        const body = m.querySelector('.ant-modal-body') || m;
        const v = this.activeVideo();
        const advanced = location.href !== beforeHref;
        const playing = !!(v && !v.paused && v.currentTime > 1);
        if (advanced || playing) {
          const closeBtn = qsa('button', body).filter(is_visible).find((b) => /^关闭$/.test(norm(b.textContent)))
            || m.querySelector('.ant-modal-close');
          if (closeBtn) { try { closeBtn.click(); } catch (e) { /* ignore */ } log('info', '完成弹窗未随跳转关闭 → 已点「关闭」'); }
          else { try { m.style.display = 'none'; const wr = m.closest('.ant-modal-wrap'); if (wr) wr.style.display = 'none'; log('warn', '完成弹窗无「关闭」按钮 → 直接隐藏'); } catch (e) { /* ignore */ } }
          return true;
        }
        const next = qsa('button', body).filter(is_visible).find((b) => norm(b.textContent) === '下一活动');
        if (!next) break;
        try { next.click(); log('info', '完成弹窗仍在 → 重试点击「下一活动」'); } catch (e) { /* ignore */ }
        await sleep(700);
      }
      if (this.doneModalEl()) { this._sectionDoneAt = 0; return false; }   // 仍未关掉 → 解除 10s 去抖，下一轮主循环立即重试
      return true;
    },

    // ---------- 三级答题器 ----------
    Quiz: {
      lastAttempt: 0, retries: 0, lastStem: '', lastOption: -1, triedOptions: new Set(),

      detect() {
        for (const sel of CFG.selectors.quizPopup) {
          // 关键：页面上可能残留多个已关闭的弹窗（display:none，w/h=0，Ant Modal 关闭后不销毁 DOM）。
          // 用 qs(sel) 只取第一个，会命中隐藏残留 → is_visible 判 false 而漏掉当前可见的答题弹窗。
          // 故遍历 qsa(sel) 找第一个「可见」的弹窗。
          const pops = qsa(sel);
          for (const pop of pops) {
            if (!pop || !is_visible(pop)) continue;
            // 排除已知防挂机确认弹窗（走 AntiIdle 通道，避免误判为知识题）
            const antiIdleSels = (CFG.selectors.antiIdleBtn || []).join(',');
            if (antiIdleSels && qs(antiIdleSels, pop) && !qs(CFG.selectors.quizOption.join(','), pop)) continue;
            const hasOption = qs(CFG.selectors.quizOption.join(','), pop);
            const hasStem = qs('.question-stem,.topic,.stem,[class*="title"]', pop) || clampText(pop.textContent, 400).length > 30;
            if (hasOption) return pop;
            // 「完成学习」弹框（标题「提示」+ 文案「您已完成本活动的学习，您可选择：」）不是答题弹窗，
            // 由 sectionDone/clickDoneModalNext 处理。它有 .ant-modal-title（被 [class*=title] 命中）但无选项，
            // 若落到下方 hasStem 兜底会被误判为「弹题无法自动作答」转人工。这里明确排除。
            if (/您已完成本活动的学习|您已完成.*学习/.test(clampText(pop.textContent, 60))) continue;
            // 尚睿通/通用 .question-stem：必须同时有题目文本 + 可见选项，才视为有效答题弹窗
            // （避免命中「回答问题完成验证」的空模板 question-stem，其 question-options 为空）
            if (sel === '.question-stem') {
              if (hasStem && clampText(pop.textContent, 400).length > 10) return pop;
              continue;
            }
            if (hasStem) return pop;
          }
        }
        return null;
      },

      getStem(pop) {
        // 自营视频内嵌题：题干在 #videoQasData 容器内（【单选题】/【多选题】/【是非题】 + 题干 div + 选项）。
        // 取题目标签 + 题干文本（排除选项 label），作为稳定题库 key。
        const selfQas = qs('#videoQasData, [id*="videoQas"], [class*="videoQas"]', pop);
        if (selfQas) {
          const typeTag = qs('[class*="qastore"]', selfQas) || selfQas;
          const clone = selfQas.cloneNode(true);
          // 去掉选项（label/radio/checkbox）再取文本，只留题干
          clone.querySelectorAll('label,input,.ant-radio,.ant-checkbox,[class*="radio"],[class*="checkbox"]').forEach((e) => e.remove());
          const stem = clampText(clone.textContent, 200);
          if (stem) return stem;
        }
        // 优先取纯题目文本（尚睿通是 .question-name，通用是 .question-stem/.topic/.stem）
        const stemEl = qs('.question-name,.question-title,[class*="question"][class*="name"],.stem,.topic,[class*="question"][class*="title"]', pop)
          || qs('.question-stem', pop) || pop;
        return clampText(stemEl.textContent, 200);
      },

      options(pop) {
        // 自营(Ant)选项是 label.ant-radio-wrapper / label.ant-checkbox-wrapper（内含隐藏 input[type=radio/checkbox]）；
        // 直接取 label 作为选项，既能点（触发 v-model）又能读内部 input 的 value（=optionId）。
        const labels = qsa('label.ant-radio-wrapper, label.ant-checkbox-wrapper', pop).filter(is_visible);
        if (labels.length) return labels;
        return qsa(CFG.selectors.quizOption.join(','), pop).filter(is_visible);
      },
      // 读选项的 value（Ant label 内部 input 的 value = optionId；原生 input 直接用 .value）
      optionValue(o) {
        if (!o) return '';
        if (o.tagName === 'INPUT') return String(o.value || o.getAttribute('value') || '');
        const input = o.querySelector && o.querySelector('input[type="radio"],input[type="checkbox"]');
        if (input) return String(input.value || input.getAttribute('value') || '');
        return String(o.value || o.getAttribute('data-option-id') || o.getAttribute('data-id') || '');
      },

      // 把"选项元素"提升到真正的可点击目标：
      // 尚睿通(iView)等组件库的 radio/checkbox 是 <label class="ivu-radio-wrapper"><input .../></label>，
      // 直接点 input 只改 DOM checked、不触发 Vue v-model 同步 → 必须点外层 label。
      // 返回 { click, mark }（mark 用于记录已试选项的稳定索引）。
      resolveClickTarget(el) {
        if (!el) return { click: el, mark: el };
        const tag = el.tagName;
        if (tag === 'INPUT' && /radio|checkbox/i.test(el.type || '')) {
          const label = el.closest('label');
          if (label) return { click: label, mark: el };
        }
        return { click: el, mark: el };
      },

      // E2：记录本题已尝试过的选项，重试时排除，避免白耗重试次数
      markTried(pop, pick) {
        const i = this.options(pop).indexOf(pick);
        if (i >= 0) this.triedOptions.add(i);
      },
      // 过滤掉已试过的选项（全试过则回退到全集，避免无选项可选）
      filterTried(opts) {
        if (!this.triedOptions.size) return opts;
        const left = opts.filter((_, i) => !this.triedOptions.has(i));
        return left.length ? left : opts;
      },

      async solveByPool(pop) { // 优先级1：API 拦截答案池
        const pool = unsafeWindow.__gzal_answers;
        if (!pool || !pool.size) return null;
        const opts = this.options(pop);
        const isMulti = this.qasType(pop) === 'multi';
        const hits = [];
        for (let i = 0; i < opts.length; i++) {
          if (this.triedOptions.has(i)) continue;   // E2：跳过已试选项
          const o = opts[i];
          const v = this.optionValue(o);
          if (v && pool.has(v)) hits.push(o);
        }
        if (hits.length) {
          // 多选：勾选所有命中的正确选项；单选：取第一个命中
          if (isMulti) return { picks: hits, pick: hits[0], how: 'pool' };
          return { pick: hits[0], how: 'pool' };
        }
        // 池里有答案文本时按文本匹配
        const texts = Store.get('gzal:lastAnswers', []);
        if (texts.length) {
          for (let i = 0; i < opts.length; i++) {
            if (this.triedOptions.has(i)) continue;
            const o = opts[i];
            const label = clampText((o.closest('label,li,div') || o).textContent, 80);
            if (texts.some((t) => label && t && (label.includes(clampText(t, 40)) || clampText(t, 40).includes(label)))) return { pick: o, how: 'pool-text' };
          }
        }
        return null;
      },

      async solveByBankOrLLM(pop, stem) { // 优先级2：后端题库（权威）→ 本地缓存 → LLM
        const bank = Store.get(K.QUIZBANK, {});
        const opts = this.options(pop);
        const isMulti = this.qasType(pop) === 'multi';
        let bankAns = null;
        // 🔴 v1.12.0：先问后端（题库以服务端为权威，本地只是缓存；本地答案可能是旧题/旧格式）
        if (stem) {
          const r = await Backend.quizAnswer(stem);
          if (r && r.found && r.answer) {
            bankAns = r.answer;
            bank[stem] = r.answer; Store.set(K.QUIZBANK, bank);  // 回写本地缓存
            log('info', '后端题库命中：' + clampText(stem, 40) + ' → ' + r.answer);
          }
        }
        if (!bankAns && bank[stem]) bankAns = bank[stem];   // 后端不可达/未命中 → 用本地缓存
        if (bankAns) {
          const ans = bankAns;
          // 用 indexesFromAnswer 解析答案（优先字母序列→序号，兜底旧文本格式→文本匹配），
          // 按序号直接定位选项，不依赖文本（避免字母"B"误匹配含 B 的文本）。
          const idxs = this.indexesFromAnswer(ans, opts).filter((ix) => !this.triedOptions.has(ix));
          if (idxs.length) {
            const hits = idxs.map((ix) => opts[ix]).filter(Boolean);
            if (isMulti) return { picks: hits, pick: hits[0], how: 'bank', answer: ans };
            return { pick: hits[0], how: 'bank', answer: ans };
          }
        }
        if (CFG.llm.enabled && CFG.llm.endpoint) {
          try {
            const body = {
              model: CFG.llm.model || 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: '你是答题助手。根据题目和选项给出正确答案的选项原文，只输出选项原文，不要输出其他内容。' },
                { role: 'user', content: `题目：${stem}\n选项：${labels.map((l, i) => String.fromCharCode(65 + i) + '. ' + l).join('\n')}` },
              ], temperature: 0,
            };
            const resp = await fetch(CFG.llm.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + CFG.llm.apiKey }, body: JSON.stringify(body) });
            const j = await resp.json();
            const ans = clampText((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '', 60);
            if (ans) {
              const hits = [];
              for (let ix = 0; ix < labels.length; ix++) {
                if (this.triedOptions.has(ix)) continue;
                const l = labels[ix];
                if (l && (l.includes(ans) || ans.includes(l))) hits.push(opts[ix]);
              }
              if (hits.length) {
                if (isMulti) return { picks: hits, pick: hits[0], how: 'llm', answer: ans };
                return { pick: hits[0], how: 'llm', answer: ans };
              }
            }
          } catch (e) { log('warn', 'LLM 答题失败: ' + e.message); }
        }
        return null;
      },

      submit(pop) {
        // 提交按钮文本可能带空格（Ant 两字按钮「确 定」），去空白后再匹配，否则 fallback 到可见首钮
        const norm = (t) => String(t || '').replace(/\s+/g, '');
        for (const sel of CFG.selectors.quizSubmit) {
          const btns = qsa(sel, pop).filter(is_visible);
          const b = btns.find((x) => /提交|确定|确认|保存/.test(norm(clampText(x.textContent, 20)))) || btns[0];
          if (b && b.tagName !== 'INPUT') { try { b.click(); return true; } catch (e) { /* ignore */ } }
        }
        return false;
      },

      // 自营视频内嵌「随堂提问」：弹窗内有 #videoQasData 且选项是 Ant radio/checkbox
      isSelfStudyQas(pop) {
        return !!pop && !!qs('#videoQasData, [id*="videoQas"], [class*="videoQas"]', pop);
      },

      // 题型：single(单选/是非) | multi(多选)。按选项 input 的 type 判断（Ant radio=单选，checkbox=多选）
      qasType(pop) {
        if (qs('input[type="checkbox"]', pop)) return 'multi';
        return 'single';
      },

      async handle() {
        // 尚睿通弹题是 iView 卡片（.answerCard-wrapper），由 Yanxiu.driveCard 专用处理 ——
        // 本通用处理器不再接管（否则会因「无把握」直接转人工暂停，弹题永不自动作答）
        if (PLATFORM === 'yanxiu') return;
        const now = NOW();
        if (now - this.lastAttempt < 2500) return; // 去抖
        this.lastAttempt = now;
        const pop = this.detect();
        if (!pop) return;
        const stem = this.getStem(pop);
        // 换题 → 清空本题的重试记忆（E2）
        if (stem && stem !== this.lastStem) { this.triedOptions.clear(); this.retries = 0; }
        let result = null;
        if (CFG.answerMode !== 'manual-confirm') {
          result = (await this.solveByPool(pop)) || (await this.solveByBankOrLLM(pop, stem));
        }
        if (!result) {
          // 自营视频内嵌「随堂提问」：答错不扣分、可重试，且提交后能抓正确答案 → 盲猜而非转人工
          const isSelfQas = this.isSelfStudyQas(pop);
          if (CFG.lowConfidenceAction === 'pause-notify' && !isSelfQas) {
            log('warn', '弹题无把握，转人工：' + stem);
            await HumanCollab.engage({ kind: 'quiz-unsolved', selector: make_selector(pop), desc: '弹题无法自动作答：' + stem, snapshot: Recorder.snapshot() });
            return;
          }
          // 保守猜答：轮换选项，且跳过已试过的（E2）
          const opts = this.filterTried(this.options(pop));
          if (!opts.length) return;
          this.lastOption = (this.lastOption + 1) % opts.length;
          result = { pick: opts[this.lastOption], how: 'guess' };
        }
        // 点击目标提升：iView 等组件库需点外层 label 才能同步 v-model（否则提交读不到选中值）
        // 多选(picks 数组)：勾选所有命中/猜测的选项；单选：点一个
        const picks = result.picks && result.picks.length ? result.picks : [result.pick];
        for (const p of picks) {
          if (!p) continue;
          const target = this.resolveClickTarget(p);
          try {
            target.click.click();
            target.mark.dispatchEvent(new Event('change', { bubbles: true }));
            target.mark.dispatchEvent(new Event('input', { bubbles: true }));
          } catch (e) { /* ignore */ }
          this.markTried(pop, p);   // 记入已试，重试时不再选它
        }
        await sleep(600);
        ApiHook._lastSubmitResult = null;   // 清空上一题提交结果，确保 3 秒后读到的是本题反馈
        // 提交前暂存本题题干 + 选项文本，供 onAnswerSubmit 答错时立即持久化正确答案（不依赖答错后 3 秒的弹窗 DOM 状态）
        ApiHook._pendingQuiz = {
          stem: stem,
          optionTexts: this.options(pop).map((o) => clampText((o.closest('label,li,div') || o).textContent, 80)),
        };
        this.submit(pop);
        Stats.bump('quizzes');
        this.lastStem = stem;
        log('info', `已作答（${result.how}）：${clampText(stem, 60)}`);
        // 提交后校验：分平台分类型处理
        setTimeout(() => {
          // 自营视频内嵌「随堂提问」：提交后（无论对错）都点「继续学习」→ 下一题 / 关闭弹窗继续播放
          if (this.isSelfStudyQas(pop)) {
            const sub = ApiHook._lastSubmitResult;
            if (sub && !sub.isRight) {
              // 答错：从弹窗红色提示「您的回答错误，正确答案为 X」抓字母沉淀入题库（pop 传当前弹窗，精准抓取）
              this.captureCorrectAnswer(stem, pop);
            } else if (sub && sub.isRight) {
              // 答对：所选选项就是正确答案，直接沉淀入题库（覆盖率高，下次同题直接命中）
              this.saveKnownAnswer(stem, picks);
            }
            this.retries = 0; this.triedOptions.clear();
            // 等平台更新按钮态后点「继续学习」（handleNext：下一题或关闭+play 继续）
            setTimeout(() => {
              const cont = this.findContinueBtn();
              if (cont) { try { cont.click(); log('info', '随堂提问已答（' + (sub && sub.isRight ? '正确' : '已抓正确答案') + '），点击继续学习'); } catch (e) { /* ignore */ } }
            }, 800);
            return;
          }
          // ① 尚睿通等"答错锁定"型：出现「继续看课/继续学习」按钮 = 答错且选项已锁定，点继续而非重试
          const cont = this.findContinueBtn();
          if (cont) {
            // 答错后平台会显示正确答案（answer-tip），抓取沉淀入本地题库，下次同题直接答对
            this.captureCorrectAnswer(stem);
            try { cont.click(); log('info', '答题反馈为「继续」，点击继续看课'); } catch (e) { /* ignore */ }
            this.retries = 0; this.triedOptions.clear();
            return;
          }
          // ② 通用"答错可重试"型：弹窗仍在 → 抓正确答案入题库，下次用题库直接答对
          const still = this.detect();
          if (still && is_visible(still)) {
            this.captureCorrectAnswer(stem);
            this.retries++;
            log('warn', `答题未通过（第 ${this.retries}/${CFG.quizRetryMax} 次），下次换选项重试`);
            if (this.retries >= CFG.quizRetryMax) {
              this.retries = 0; this.triedOptions.clear();
              HumanCollab.engage({ kind: 'quiz-failed', selector: make_selector(still), desc: '答题多次未通过：' + stem, snapshot: Recorder.snapshot() });
            }
          } else { this.retries = 0; this.triedOptions.clear(); }
        }, 3000);
      },

      // 定位答错锁定态下的「继续看课/继续学习/继续」按钮（尚睿通答错后提交按钮会变成这个）
      findContinueBtn() {
        for (const t of ['继续看课', '继续学习', '继续']) {
          const btn = qsa('button,a,div[role="button"]').find((e) => is_visible(e) && clampText(e.textContent, 12) === t);
          if (btn) return btn;
        }
        return null;
      },

      // 答对时把所选选项的字母序列沉淀入本地题库（所选选项即正确答案，下次同题直接命中）。
      // picks = 本次勾选的选项元素数组（单选 1 个、多选多个）。存「字母序列」如 "B,C"（最稳定）。
      saveKnownAnswer(stem, picks) {
        try {
          if (!stem || !picks || !picks.length) return;
          // 从所选选项的 label 前缀提取字母（A/B/C/D）
          const letters = picks.map((p) => {
            const el = (p.closest && (p.closest('label,li,div') || p)) || p;
            const t = clampText(el.textContent, 20);
            const m = t.match(/^([A-Ha-h])\s*[.、．]/);
            return m ? m[1].toUpperCase() : '';
          }).filter(Boolean);
          if (!letters.length) return;
          const ans = letters.join(',');
          const bank = Store.get(K.QUIZBANK, {});
          const key = clampText(stem, 200);
          if (!bank[key] || bank[key] !== ans) {
            bank[key] = ans;
            Store.set(K.QUIZBANK, bank);
            log('info', '已把答对的正确答案沉淀入本地题库：' + clampText(stem, 40) + ' → ' + ans);
            Backend.quizSubmit(stem, ans);   // 上报后端题库
          }
        } catch (e) { /* ignore */ }
      },

      // 从答错反馈里抓「正确答案」沉淀入本地题库（自营随堂提问答错后弹窗显示红色文字
      // 「您的回答错误，正确答案为 B,C」，其中 B,C 是正确答案的字母，直接对应选项 label 前缀 A/B/C/D）。
      // 优先抓红色提示里的字母序列（最可靠，不依赖接口拦截）；存「字母序列」如 "B,C"，下次按字母→序号精确选选项。
      captureCorrectAnswer(stem, pop) {
        try {
          let letters = '';
          // ① 最可靠：从弹窗红色提示「您的回答错误，正确答案为 B,C」抓字母序列
          // 用文本「您的回答错误」定位提示元素（比颜色样式选择器更稳），再从其 textContent 提取字母
          const scope = pop || document;
          const tipEl = qs('span[style*="#ff2e2e"], span[style*="ff2e2e"]', scope);
          const tipText = tipEl ? clampText(tipEl.textContent, 100) : '';
          if (tipText && /您的回答错误/.test(tipText)) {
            const m = tipText.match(/正确答案[为是：:]\s*([A-Ha-h](?:\s*[,，、]\s*[A-Ha-h])*)/);
            if (m) letters = m[1].toUpperCase().replace(/\s+/g, '');
          }
          if (!letters) {
            // 颜色样式未命中时，遍历 span 找含「您的回答错误」文本的（Vue 渲染 staticStyle 可能转 rgb）
            const spans = qsa('span', scope);
            for (const sp of spans) {
              const t = clampText(sp.textContent, 100);
              if (/您的回答错误/.test(t)) {
                const m = t.match(/正确答案[为是：:]\s*([A-Ha-h](?:\s*[,，、]\s*[A-Ha-h])*)/);
                if (m) { letters = m[1].toUpperCase().replace(/\s+/g, ''); break; }
              }
            }
          }
          // ② 兜底：ApiHook 从 vedioAnswerSubmit 响应解析的正确答案序号 → 转字母
          if (!letters) {
            const sub = ApiHook._lastSubmitResult;
            if (sub && !sub.isRight && Array.isArray(sub.answerLetters) && sub.answerLetters.length) {
              letters = sub.answerLetters.join(',');
            }
          }
          // ③ 再兜底：整个弹窗文本里搜「正确答案为 X」字母
          if (!letters) {
            const root = pop || document;
            const txt = clampText(root.textContent, 500);
            const m = txt.match(/正确答案[为是：:]\s*([A-Ha-h](?:\s*[,，、]\s*[A-Ha-h])*)/);
            if (m) letters = m[1].toUpperCase().replace(/\s+/g, '');
          }
          if (!letters || !stem) return;
          // 字母转 0-based 序号（A=0、B=1…），校验是否在选项范围内
          const bank = Store.get(K.QUIZBANK, {});
          const key = clampText(stem, 200);
          // 存「字母序列」：最稳定、跨题型通用、匹配时按字母→序号直接定位选项
          if (!bank[key] || bank[key] !== letters) {
            bank[key] = letters;
            Store.set(K.QUIZBANK, bank);
            log('info', '已把正确答案沉淀入本地题库：' + clampText(stem, 40) + ' → ' + letters);
            Backend.quizSubmit(stem, letters);   // 上报后端题库
          }
        } catch (e) { /* ignore */ }
      },

      // 解析题库答案值 → 选项 0-based 序号数组。支持两种值格式：
      // ① 字母序列 "B,C"（新格式，最可靠）；② 选项文本「A.xx；B.yy」（旧格式，按文本匹配）
      indexesFromAnswer(ans, opts) {
        if (!ans) return [];
        const labels = opts.map((o) => clampText((o.closest('label,li,div') || o).textContent, 80));
        // ① 纯字母序列（如 "B,C" / "BC"）→ 直接按字母转序号
        const letterOnly = ans.replace(/[,，、\s]/g, '');
        if (/^[A-Ha-h]+$/.test(letterOnly) && letterOnly.length <= opts.length) {
          const idxs = [];
          for (const ch of ans.toUpperCase()) {
            const code = ch.charCodeAt(0);
            if (code >= 65 && code <= 72) { // A-H
              const ix = code - 65;
              if (ix < opts.length) idxs.push(ix);
            }
          }
          if (idxs.length) return idxs;
        }
        // ② 旧格式选项文本：按文本匹配（label 含答案文本 / 答案文本含 label）
        const idxs = [];
        for (let i = 0; i < labels.length; i++) {
          const l = labels[i];
          if (!l) continue;
          if (l === ans || l.includes(ans) || ans.includes(l)) idxs.push(i);
        }
        return idxs;
      },
    },

    // ---------- 防挂机 ----------
    AntiIdle: {
      startFake() {
        if (!CFG.fakeActivity) return;
        setInterval(() => {
          try {
            const x = 50 + Math.random() * (innerWidth - 100), y = 50 + Math.random() * (innerHeight - 100);
            document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
            if (Math.random() < 0.3) window.scrollBy(0, (Math.random() - 0.5) * 60);
          } catch (e) { /* ignore */ }
        }, 30000 + Math.random() * 30000);
        try { document.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true); } catch (e) { /* ignore */ }
      },
      clickConfirm() {
        for (const sel of CFG.selectors.antiIdleBtn) {
          const b = qs(sel);
          if (b && is_visible(b)) { try { b.click(); log('info', '已点击防挂机确认'); } catch (e) { /* ignore */ } return true; }
        }
        // webtrn 暂停覆盖层
        for (const sel of CFG.selectors.pauseOverlay) {
          const p = qs(sel);
          if (p && is_visible(p)) { try { p.click(); log('info', '已点击暂停覆盖层恢复'); } catch (e) { /* ignore */ } return true; }
        }
        return false;
      },
    },

    // ---------- 主循环 ----------
    // 是否允许在「本帧」自动启动 L2 主循环（v1.7.43 新增，修「3 个视频反复播放/暂停 + 手动暂停无效」）。
    // 🔴 根因：超星一个任务点的每个视频都在独立 iframe（/ananas/modules/video/index.html）里，这些 iframe 内部也有
    //   <video>；而 Router「有视频就启 L2」的分支用 activeVideo() 会**穿透 iframe** 找到视频 →
    //   「顶层 + knowledge/cards 内容帧 + 每个播放器 iframe」各起一份 L2；多份 L2 各自
    //   pauseOtherVideos(其它视频) + safePlay(自己那个) → 3 个视频反复播放/暂停 → 很快触发反爬；
    //   而面板「暂停」只设置顶层那份 L2 的 _pauseFlag，iframe 里的 L2 照跑 → 手动暂停后仍在播放/暂停。
    // 规则：① 播放器/媒体内嵌帧任何平台都不启动自动化；② 超星只允许「任务点页/目录页」所在帧作为宿主。
    canAutoStart() {
      let u = '';
      try { u = String(location.href || ''); } catch (e) { /* ignore */ }
      if (/\/ananas\/|\/modules\/video\/|\/video-js|swfobject|flashchecker/i.test(u)) return false;
      if (/\.(mp4|m3u8|flv|ts|mp3)([?#]|$)/i.test(u)) return false;
      if (PLATFORM === 'chaoxing') return /\/mycourse\//.test(u);   // 排除 /mooc-ans/knowledge/cards 内容帧
      return true;
    },
    // 是否处于「暂停」态（本帧闸门 _pauseFlag + 全局 Session.paused + 授权闸门 —— 面板「暂停」写的是全局态，
    // 任何帧的 L2/L1 与定时器都必须尊重它，否则手动暂停无效；v1.11.1 起授权未通过同样视为暂停）
    isStopped() {
      try {
        if (typeof AuthGate !== 'undefined' && AuthGate.ok !== true) return true;
        if (typeof RulePack !== 'undefined' && !RulePack.ok) return true;   // 规则包未下发 → 停
        if (typeof Integrity !== 'undefined' && !Integrity.ok) return true; // v1.17.4 完整性自检未过 → 停
        return !!(this._pauseFlag || (Session.data && Session.data.paused));
      } catch (e) { return !!this._pauseFlag; }
    },
    // 页面是否不可见（后台标签/最小化）。
    // v1.16.0「后台继续学习」开启后恒返回 false —— 页面真实世界的 visibility 已被 KeepAlive
    // 伪装为 visible，脚本不再因隐藏而停手（最小化/切标签继续播放、刷新、救回）。
    // 关闭该项时保留旧行为（隐藏态不抢播，避免与平台暂停形成拉锯）。
    isHidden() {
      if (CFG.backgroundLearn) return false;
      try { return document.visibilityState !== 'visible'; } catch (e) { return false; }
    },
    async start() {
      if (this.running) return;
      if (!this.canAutoStart()) { log('info', 'L2：当前帧为播放器/内容内嵌页，跳过启动（避免多帧重复驱动同一批视频）'); return; }
      this.running = true;
      log('info', 'L2 播放执行器启动（' + (IS_TOP ? '顶层' : 'iframe: ' + HOST) + '）');
      Session.set({ phase: 'L2', startedAt: Session.data.startedAt || NOW() });
      this.AntiIdle.startFake();
      // v1.16.1：后台续播不单独注册看门狗 —— 复用本循环下方每个 video 的 pause 监听（约 2736 行），
      // 它自带 isStopped / isHidden / ended / 超星 nextPendingVideo / 自营 Quiz / 尚睿通 cardVisible 闸门。
      // （v1.16.0 的 document 级看门狗缺这些闸门，会在超星三视频任务点把 pauseOtherVideos 暂停的
      //   其它视频拉起 → 三视频轮转触发反爬；自营还会越过随堂提问。v1.16.1 已移除。）
      let failCount = 0;
      while (this.running) {
        try {
          if (this.isStopped()) { await sleep(1000); continue; }
          // 超星视频内弹题（tkTopic）：平台在弹题点会暂停视频并要求作答，
          // 必须放在最前并独占本轮循环——否则 pause 救回逻辑会去抢播放，越过/关闭弹题。
          if (PLATFORM === 'chaoxing' && Chaoxing.quizVisible()) {
            const qz = Chaoxing.detectVideoQuiz();
            if (qz) {
              if (Session.data.phase !== 'L2-quiz') Session.set({ phase: 'L2-quiz' });
              await Chaoxing.driveVideoQuiz(qz);
              await sleep(500);
              continue;
            }
          }
          // 统一视频选择入口 pickVideo()：超星多视频顺序策略 → Chaoxing；自营/尚睿通单视频 → deepVideo/currentVideo
          const _dv = this.pickVideo();
          const v = _dv && _dv.video;
          // 超星任务点完成判定（必须放在「无视频」分支之前）：
          // pickVideo() 在「任务点内所有视频都 ≥90%」时会返回 null，若只在 v 存在时判完成，
          // 就会掉进「无视频」分支等 30 秒 → E1 刷新 → 死循环（平台常把视频停在 ~90% 不触发 ended）。
          if (PLATFORM === 'chaoxing' && this.maybeSectionDone()) { await sleep(1000); continue; }
          if (!v) { // 无视频：先判问卷 → 非视频活动（讨论/阅读 → 点「下一活动」跳过）→ E1
            // 尚睿通学习页：当前资源是「文档/拓展资源」（本来就没有 video）→ 交给监视器按停留时长推进，
            // 不能走 E1 刷新（否则会把文档资源页反复刷掉）
            if (PLATFORM === 'yanxiu' && Yanxiu.isDocRes()) {
              this._videoWaitStart = 0;
              await sleep(1000);
              continue;
            }
            // 调查问卷（ACT005）：自动作答并提交，完成后回目录页核对
            if (this.isQuestionnaire()) {
              this._videoWaitStart = 0;
              await this.driveQuestionnaire();
              await sleep(1000);
              continue;
            }
            // 非视频活动：自动点「下一活动」翻页，直到出现视频
            if (this.isNonVideoActivity()) {
              this._videoWaitStart = 0;   // 重置视频等待计时，避免误触 E1 刷新
              await this.skipNonVideoActivity();
              await sleep(1000);
              continue;
            }
            // 无视频且非活动页：等 30 秒再判 E1（可能视频正在加载/页面切换中）
            if (this._videoWaitStart === 0) this._videoWaitStart = NOW();
            await sleep(1000);
            if (NOW() - this._videoWaitStart > 30000 && !this.isHidden()) {
              failCount++;
              if (failCount <= 3) { log('warn', `E1：视频元素缺失（第 ${failCount} 次），刷新重进`); this._videoWaitStart = NOW(); location.reload(); return; }
              else { log('error', 'E1：三次刷新无效，本页可能非播放页，交回路由层'); this.running = false; Router.reprobe(); return; }
            }
            continue;
          }
          this._videoWaitStart = NOW();
          // 超星「今日观看时长已达上限」检测：达到上限后无法完成任务点，重播徒劳且触发反爬 → 暂停转人工
          const limit = Chaoxing.detectVideoLimit();
          if (limit) {
            if (!this._limitWarned) {
              this._limitWarned = true;
              this._pauseFlag = true;   // 安全暂停：停止继续 safePlay/重播，避免反爬验证码
              Session.set({ paused: true, pausedReason: '超星限时：' + limit });
              log('warn', 'E12 超星今日观看时长已达上限，暂停自动学习（次日自动恢复）: ' + limit);
              Notifier.critical('观看时长已达上限', limit + '。脚本已暂停，请次日再来继续学习，避免触发反爬验证码。');
            }
            await sleep(5000);
            continue;
          }
          this._limitWarned = false;
          // 超星多视频任务点：确保一次只播一个视频——暂停其它所有 video（原生 pause + 点暂停按钮双保险）
          if (PLATFORM === 'chaoxing') Chaoxing.pauseOtherVideos(v);
          // ended 挂钩（每个 video 独立挂一次）
          if (!v.__gzal_ended) {
            v.__gzal_ended = true;
            v.addEventListener('ended', () => this.onVideoEnded(v));
            // pause 恢复：仅当「该视频仍是当前待播视频」时才恢复，避免多视频切换时旧视频被反复救回导致同时播放
            v.addEventListener('pause', () => {
              if (this.isStopped()) return;
              setTimeout(() => {
                if (!v.paused || v.ended) return;
                if (this.isStopped() || this.isHidden()) return;   // 救回前再查：用户可能刚点「暂停」，或页面已切到后台（超星会主动暂停）
                const cur = PLATFORM === 'chaoxing' ? Chaoxing.nextPendingVideo() : null;
                // 超星多视频：只有 v 仍是「第一个未达标」视频时才恢复；否则说明已切到下一视频，不再救回
                if (PLATFORM === 'chaoxing' && (!cur || cur.video !== v)) return;
                // 超星视频内弹题：平台为弹题主动暂停，此时救回会越过弹题 → 交回主循环的弹题处理
                if (PLATFORM === 'chaoxing' && Chaoxing.quizVisible()) return;
                // 尚睿通弹题卡片：同上，救回会越过弹题
                if (PLATFORM === 'yanxiu' && Yanxiu.cardVisible()) return;
                // 自营(Prism)视频内嵌答题：视频在答题点被平台 pause 弹出答题框，此时不应救回播放
                // （否则会抢在答题前继续播放，越过答题点）。检测到答题弹窗 → 交回 Quiz.handle 处理。
                if (PLATFORM !== 'chaoxing' && this.Quiz.detect()) return;
                this.safePlay(v);
              }, 1500);
            });
          }
          if (v.paused && !v.ended) {
            // 自营(Prism)视频内嵌答题：视频在答题点被平台暂停弹出答题框，此时先答题、不救回播放
            // （否则 safePlay 会抢在答题前继续播放）。检测到答题弹窗 → 跳过 safePlay，让 Quiz.handle 处理。
            if (PLATFORM === 'chaoxing' || !this.Quiz.detect()) await this.safePlay(v);
          }
          // E3 会话过期检测（最高优先级：避免在登录页上误操作）
          const expired = SessionGuard.detect();
          if (expired) { await SessionGuard.engage(expired); await sleep(2000); continue; }
          // 规则库优先（N7，先于内置异常判定）
          if (!HumanCollab.engaged) {
            const hit = RuleEngine.match();
            if (hit) await RuleEngine.execute(hit);
          }
          this.AntiIdle.clickConfirm();
          // 完成判定补充通道：平台可能不触发 ended 就显示"完成学习"（不 await，避免阻塞主循环）
          this.maybeSectionDone();
          // 弹题处理：尚睿通交给 Yanxiu 专用处理器（iView 卡片 + 多选全选启发式 + 正确答案入库）；
          // 其余平台走通用 Quiz（自营 Ant 弹窗 / 超星 tkTopic 由各自模块另行处理）
          if (PLATFORM === 'yanxiu') await Yanxiu.driveCard();
          else await this.Quiz.handle();
          if (!HumanCollab.engaged) {
            const anomaly = HumanCollab.detectUnknown();
            if (anomaly) { await HumanCollab.engage(anomaly); }
          }
          Panel && Panel.refresh && Panel.refresh();
          await sleep(CFG.loopIntervalMs);
        } catch (e) {
          log('error', 'L2 主循环异常: ' + e.message);
          await sleep(2000);
        }
      }
    },
  };

  /* ================================================================
   * 12. L1 · 课程推进器（顶层：章节目录 → 进入未完成章节 → 响应完成）
   * ================================================================ */
  const L1 = {
    active: false, _lastClick: 0,
    // 学习页（study.gzteacher.com）「章→节→活动」结构识别（2026-10-09 实测）
    // 活动按钮 = <button>【专家引领】xxx</button> 等；未完成活动后跟 <a>去学习></a> 入口
    // 返回 [{ el, name, type: 'video'|'manual', goLink }]（goLink 为对应「去学习>」链接，可为 null）
    detectActivities() {
      const out = [];
      const btns = qsa(CFG.selectors.activityBtn);
      const goLinks = qsa(CFG.selectors.activityGoLink).filter((a) => {
        const t = clampText(a.textContent, 12);
        return CFG.activityGoTexts.some((g) => t.includes(g));
      });
      for (const b of btns) {
        if (!is_visible(b)) continue;
        if (b.closest && b.closest('.ant-menu, [role="menuitem"], [class*="menu"][class*="nav"]')) continue;
        // 排除「课程作业」区块：「查看作业要求」「提交作业」是作业按钮（在 groupWork/myWork 内），
        // 不是学习活动（作业留给人工）。否则 manualActivityTexts 里的「作业」会误匹配这两个按钮 → 弹「作业要求」。
        // 注意：不能排除 .courseWork（问卷「【问卷调查】」也在 courseWork 大容器内，会被误伤）。
        if (b.closest && b.closest('.groupWork, .myWork, [class*="groupWork"], [class*="myWork"]')) continue;
        const t = clampText(b.textContent, 80);
        // 活动按钮特征：带【】标记，或含活动类型关键词（排除纯作业操作按钮）
        const isActivity = /【[^】]{2,20}】/.test(t) || CFG.videoActivityTexts.concat(CFG.manualActivityTexts, CFG.softActivityTexts || []).some((kw) => t.includes(kw));
        if (!isActivity) continue;
        if (t.length < 2 || t.length > 80) continue;
        // 纯作业操作按钮（查看作业要求/提交作业等）不是学习活动，跳过
        if (/查看作业要求|提交作业|查看作业|交作业/.test(t)) continue;
        // 判定类型：视频 vs 待人工
        const isVideo = CFG.videoActivityTexts.some((kw) => t.includes(kw));
        const isManual = CFG.manualActivityTexts.some((kw) => t.includes(kw));
        // 软活动：既非人工也非视频（如「拓展阅读」）→ 脚本会进去尝试，但不阻塞课程完成判定
        const isSoft = !isManual && !isVideo && (CFG.softActivityTexts || []).some((kw) => t.includes(kw));
        // 定位活动容器：study/home 页每个活动是 DIV.taskWrap1（按钮在 taskWrap1 > .df > span > button），
        // 右侧状态区 .sectionRight 内「已完成」(span 绿) 或「去学习>」(a 蓝)。旧逻辑只查 button.nextElementSibling
        // 找不到状态 → 50 个活动全被误判「未完成」→ 从第一个活动重新开始（v1.7.34 修复）。
        const wrap = b.closest && (b.closest('.taskWrap1') || b.closest('.sectionWrap') || b.closest('[class*="taskWrap"]'));
        let done = this.isDone(b);
        let goLink = null;
        if (wrap) {
          const right = qs('.sectionRight, [class*="sectionRight"]', wrap);
          const rightTxt = right ? clampText(right.textContent, 40) : '';
          if (rightTxt) {
            if (/已完成|完成学习/.test(rightTxt)) done = true;
            else if (CFG.activityGoTexts.some((g) => rightTxt.includes(g))) {
              goLink = qs('a', right) || null;
            }
          }
          // 兜底：容器内扫「已完成」/「去学习>」文本（sectionRight 未命中时）
          if (!done && !goLink) {
            const wrapTxt = clampText(wrap.textContent, 120);
            if (/已完成|完成学习/.test(wrapTxt)) done = true;
            else goLink = goLinks.find((a) => wrap.contains(a)) || null;
          }
        } else if (!done) {
          // 非 taskWrap1 结构兜底：旧逻辑（兄弟节点查「已完成」）
          let sib = b.nextElementSibling;
          for (let i = 0; i < 3 && sib; i++) {
            if (/已完成|完成学习/.test(sib.textContent || '')) { done = true; break; }
            sib = sib.nextElementSibling;
          }
        }
        out.push({ el: b, name: t, type: isManual ? 'manual' : (isSoft ? 'soft' : 'video'), done, goLink });
      }
      return out;
    },
    detectSectionItems() {
      // 通用启发式：可点击列表项（li / 含标题的行），带完成态特征优先排除
      const items = [];
      for (const sel of CFG.selectors.chapterItem) {
        const els = qsa(sel).filter((e) => {
          if (!is_visible(e)) return false;
          // 排除顶部/侧边导航菜单（"课程超市""学时管理"等含"课"字会误命中，且点击会跳转到错误页面）
          if (e.closest && e.closest('li.ant-menu-item, li.ant-menu-overflow-item, [role="menuitem"], .ant-menu, [class*="menu"][class*="nav"]')) return false;
          const t = clampText(e.textContent, 60);
          if (t.length < 2 || t.length > 80) return false;
          if (e.querySelector('video')) return false;
          // 收紧匹配：必须是明确的章节标记——「第X讲/节/章」「课时」「视频」，或「讲/节」作量词，
          // 不再用笼统的「课」字（会误匹配「课程超市」等导航文字）
          return /第.{1,4}(讲|节|章)|课时|视频|lesson|chapter/i.test(t) || /[0-9一二三四五六七八九十]+(讲|节)|(讲|节)[0-9]+/.test(t);
        });
        if (els.length >= 1) { items.push(...els); break; }
      }
      return items;
    },
    isDone(item) {
      const cls = (item.className || '') + ' ' + (item.parentElement ? item.parentElement.className : '');
      if (/done|complete|finish|passed|已学完|已完成/i.test(cls)) return true;
      return CFG.sectionDoneTexts.some((t) => clampText(item.textContent, 80).includes(t) && clampText(item.textContent, 80).indexOf(t) < 40);
    },
    // 自营课程详情页的「课程作业」区块（实测 2026-10-11）：
    //   DIV.courseWork（最外层）> .courseWorkTitle「课程作业」+ .sectionWrap「课程作业未提交」
    //                            + .groupWork/.myWork「我的作业:查看作业要求 提交作业 您尚未提交作业，请尽快提交！」
    // 返回「未提交」的作业名数组（已提交/已批改/批改通过 → 空数组）。作业属人工项，脚本不代做。
    detectCourseWork() {
      const out = [];
      for (const r of qsa('.courseWork')) {
        try {
          if (!is_visible(r)) continue;
          const p = r.parentElement;
          if (p && p.closest && p.closest('.courseWork')) continue;   // 只取最外层，避免嵌套重复计数
          const t = clampText(r.textContent, 400);
          if (!/作业/.test(t)) continue;
          const pending = /尚未提交|请尽快提交|未提交|去提交|待提交/.test(t) && !/已提交|已批改|批改通过/.test(t);
          if (!pending) continue;
          const titleEl = qs('.courseWorkTitle, [class*="courseWorkTitle"]', r);
          out.push(clampText(titleEl ? titleEl.textContent : '课程作业', 16) || '课程作业');
        } catch (e) { /* ignore */ }
      }
      return out;
    },

    // 本页（课程详情/活动页）实时剩余人工项：人工活动 + 未提交作业。
    // 返回 { acts:[名称], works:[名称] }；页面没有活动/作业区块时返回 null（交给全局汇总显示）。
    liveManual() {
      let acts = [];
      try { acts = this.detectActivities().filter((it) => it.type === 'manual' && !it.done).map((it) => clampText(it.name, 30)); } catch (e) { /* ignore */ }
      let works = [];
      try { works = this.detectCourseWork(); } catch (e) { /* ignore */ }
      const hasCtx = document.querySelectorAll('.taskWrap1, .groupWork, .myWork, .courseWork').length > 0;
      if (!hasCtx && !acts.length && !works.length) return null;
      return { acts, works };
    },
    liveManualText(live) {
      const L = [];
      if (live.acts.length) { L.push(`人工活动（需手动完成，共 ${live.acts.length} 项）：`); live.acts.forEach((a) => L.push('· ' + a)); }
      if (live.works.length) { L.push(`课程作业（需提交并等待批改，共 ${live.works.length} 项）：`); live.works.forEach((w) => L.push('· ' + w)); }
      return L.length ? '📋 本页剩余人工项\n' + L.join('\n') : '✅ 本页已无剩余人工项';
    },

    async enterNext() {
      if (isPaused()) { log('info', 'L1：暂停中，不进入章节'); return false; }
      if (NOW() - this._lastClick < 4000) return false;
      // 优先：学习页「章→节→活动」结构（study.gzteacher.com）
      const acts = this.detectActivities();
      if (acts.length) {
        // 完成判定（v1.7.69）：只认「阻塞项」= 视频（专家引领/课例观摩）+ 问卷（问卷调查）。
        // 人工活动（互动研讨/课例点评/发帖…）不参与判定、进「人工清单」；软活动（拓展阅读）尝试自动完成但不阻塞。
        const manualLeft = acts.filter((it) => it.type === 'manual' && !it.done).map((it) => clampText(it.name, 24));
        // ① 阻塞项：有未完成就进入（点「去学习>」→ L2 判型：视频播放 / 问卷作答）
        const mustDo = acts.filter((it) => it.type === 'video');
        const next = mustDo.find((it) => !it.done);
        if (next) {
          this._lastClick = NOW();
          Session.set({ phase: 'L1-enter', section: next.name });
          log('info', `L1：进入活动「${next.name}」（视频/问卷）`);
          try { (next.goLink || next.el).click(); } catch (e) { return false; }
          await sleep(2000);
          return true;
        }
        // ② 软活动（拓展阅读等）：尽力自动完成，但最多 softAttemptMax 次，绝不阻塞课程完成
        const maxTries = CFG.softAttemptMax || 2;
        const softNext = acts.find((it) => it.type === 'soft' && !it.done && this.softTries(it.name) < maxTries);
        if (softNext) {
          this.bumpSoftTry(softNext.name);
          this._lastClick = NOW();
          Session.set({ phase: 'L1-enter', section: softNext.name });
          log('info', `L1：尝试软活动「${softNext.name}」（第 ${this.softTries(softNext.name)}/${maxTries} 次，不阻塞课程完成）`);
          try { (softNext.goLink || softNext.el).click(); } catch (e) { return false; }
          await sleep(2000);
          return true;
        }
        // ③ 阻塞项全完成 → 对自动化而言课程已完成（人工项 next 不计，只登记清单）
        // 🔴 v1.16.7 详情页完成确认：只有「确实识别到可自动活动（视频/问卷）且全部完成」，
        //    或「识别到活动但确认无任何可自动活动（纯人工课）」才允许标记完成；
        //    若识别到的活动里既无可自动项也无未完成人工项（疑似漏匹配），绝不判完成。
        if (mustDo.length) {
          log('info', `L1：所有视频+问卷已完成 → 课程完成（剩人工项 ${manualLeft.length} 个${manualLeft.length ? '：' + manualLeft.join('、') : ''}）`);
          this.courseDone(manualLeft);
        } else if (manualLeft.length) {
          log('info', `L1：无可自动活动（纯人工课，剩人工项 ${manualLeft.length} 个：${manualLeft.join('、')}）→ 登记人工清单`);
          this.courseDone(manualLeft);
        } else {
          log('warn', 'L1：详情页未识别到可自动或人工活动（可能漏匹配/未渲染），暂不判完成');
        }
        return false;
      }
      // 兜底：旧版章节目录结构
      const items = this.detectSectionItems();
      if (!items.length) return false;
      const next = items.find((it) => !this.isDone(it));
      if (!next) { log('info', 'L1：章节目录无未完成项 → 课程完成'); this.courseDone(); return false; }
      this._lastClick = NOW();
      const name = clampText(next.textContent, 50);
      Session.set({ phase: 'L1-enter', section: name });
      log('info', 'L1：进入章节 ' + name);
      try { next.click(); } catch (e) { return false; }
      await sleep(2000);
      // 点击未跳转时尝试内部链接
      const a = next.matches('a') ? next : qs('a', next);
      if (a && a.href && !/#/g.test(a.href)) { try { location.href = a.href; } catch (err) { /* ignore */ } }
      return true;
    },
    onSectionDone(msg) {
      log('info', 'L1：收到章节完成消息（' + (msg.section || '') + '）');
      Session.set({ phase: 'L1-next' });
      setTimeout(() => { if (!isPaused()) this.enterNext(); }, 3000);
    },
    _soft: {},
    softTries(name) { return this._soft[name] || 0; },
    bumpSoftTry(name) { this._soft[name] = (this._soft[name] || 0) + 1; },
    courseDone(manualLeft) {
      const course = Session.data.course || clampText(document.title, 50);
      const left = Array.isArray(manualLeft) ? manualLeft.filter(Boolean) : [];
      const queue = Store.get(K.QUEUE, []);
      const hasWork = !!(queue[0] && queue[0].hasManual);   // 课程含作业/测验类考核（卡片文案判定）
      const works = this.detectCourseWork();                // 本页「课程作业」区块中未提交的作业
      // 统一完成模型：剩人工项 → auto-done（可自动部分已完成）；含作业考核且无人活动 → pending-manual；否则 done
      const status = left.length ? 'auto-done' : ((works.length || hasWork) ? 'pending-manual' : 'done');
      const patch = { status, by: 'self', progress: left.length ? null : 100, manualLeft: left, works, autoDoneAt: NOW() };
      // 🔴 auto-done 必须带 reverify 标记（与 markAutoDone 同逻辑）：否则「收尾复验」会无限重进本课。
      //    首次 auto-done → reverify=0；收尾复验那次再 auto-done（prev 已是 auto-done）→ reverify=1，之后不再复验。
      if (status === 'auto-done') {
        const prev = Store.get(K.COURSES, {})[course] || {};
        patch.reverify = (prev.status === 'auto-done') ? 1 : (prev.reverify || 0);
      }
      L0.markCourse(course, patch);
      this._soft = {};
      Session.set({ phase: 'course-done', course: '' });
      if (left.length) {
        Notifier.banner(`课程「${course}」视频/问卷已全部完成；剩 ${left.length} 个活动需人工（${left.slice(0, 3).join('、')}${left.length > 3 ? ' 等' : ''}），已跳过且不再重进。`, { level: 'warn', ttl: 20000, force: true });
        Notifier.desktop('课程可自动部分已完成', course + '（剩人工 ' + left.length + ' 项）');
      } else if (works.length || hasWork) {
        Notifier.banner(`⚠ 课程「${course}」视频已完成，但${works.length ? `有 ${works.length} 项作业未提交（${works.join('、')}）` : '含作业/测验类考核'}，需人工完成（脚本不代做，属合规边界）`, { level: 'warn', ttl: 0, force: true });
        Notifier.desktop('课程含人工考核', course);
      } else {
        Notifier.banner(`课程「${course}」已完成，返回课程列表继续下一门…`, { level: 'info', ttl: 6000 });
        Notifier.desktop('课程完成', course);
      }
      log('info', `L1：课程「${course}」→ ${status}${left.length ? '（剩人工 ' + left.length + ' 项）' : ''}`);
      // 课程目录页(/home)无「跳课程列表」入口，直接导航到学习中心进下一门课
      // （学习中心会重新 buildQueue + enterNextCourse 推进到下一门）
      L0.gotoStudyCenter();
    },
    start() { this.active = true; },
  };

  /* ================================================================
   * 12.5 平台模块（各平台学习逻辑独立，互不影响）
   *   超星(-27)：mooc2-ans 目录页(章→节带任务点) → mooc1 任务点页(三层 iframe 视频) → 「下一节」
   *   尚睿通(-21)：train2/workspace 项目页(「看课」按钮) → grain/course detail(顶层 video)
   *   ================================================================ */
  const Chaoxing = {
    _lastClick: 0,
    _activeVideo: null,   // 粘性：当前专注播放的视频（多视频任务点顺序播放用）
    // ---------- 超星 · 播放器层（原 L2 内嵌，v1.7.38 迁出，独立成模块） ----------
    // 超星多视频任务点：返回第一个「进度未达标」的 video（进度 < chaoxingDoneRatio）。
    // 用于顺序播放：视频1→90%→视频2→90%→…→全部达标后返回 null（任务点完成）。
    nextPendingVideo() {
      const all = L2.allVideos();
      // 先对读不到 duration 的视频触发元数据加载（preload=none 导致），避免下面进度判定全部失效
      for (const { video } of all) L2.ensureMetaLoaded(video);
      // 粘性：若已有「正在播放的视频」且尚未达标（< chaoxingDoneRatio），继续专注播它，
      // 不因进度在 90% 边界的微小波动而在视频间横跳——横跳会导致两个视频被同时触发播放，
      // 触发超星反爬验证码。只有当前视频达标后才切到下一个。
      const act = this._activeVideo;
      if (act && act.video && all.some(({ video }) => video === act.video)) {
        const d = act.video.duration;
        const done = isFinite(d) && d > 0 && (act.video.currentTime / d) >= CFG.chaoxingDoneRatio;
        if (!done) return act;
        this._activeVideo = null;  // 当前视频已达标，释放粘性，寻找下一个
      }
      let firstUnready = null;   // 记录第一个「元数据未加载（duration 读不到）」的视频，作兜底
      for (const { video, doc } of all) {
        // duration 未就绪（preload=none 导致 readyState=0、duration=null）时不能跳过——
        // 否则第一个视频永远"待播"却拿不到，主循环误判"无视频"不触发播放。
        if (!isFinite(video.duration) || video.duration <= 0) {
          if (!firstUnready) firstUnready = { video, doc };
          continue;
        }
        if (video.currentTime / video.duration < CFG.chaoxingDoneRatio) {
          this._activeVideo = { video, doc };  // 粘住当前要播的视频
          return { video, doc };
        }
      }
      // 有未就绪的视频（等触发播放加载元数据）→ 返回它，让主循环去点播放按钮
      if (firstUnready) { this._activeVideo = firstUnready; return firstUnready; }
      return null;  // 所有视频都已达标 → 任务点完成
    },
    // 超星多视频任务点：是否所有 video 都已完成（进度 ≥ chaoxingDoneRatio）。
    // 用于 maybeSectionDone 判定——必须所有视频都达标才算任务点完成（非只第一个）。
    chaoxingAllDone() {
      const all = L2.allVideos();
      if (!all.length) return false;
      // 先对读不到 duration 的视频触发元数据加载（preload=none），避免误判"有视频未就绪 → 未完成"
      let anyUnready = false;
      for (const { video } of all) {
        L2.ensureMetaLoaded(video);
        if (!isFinite(video.duration) || video.duration <= 0) anyUnready = true;
      }
      // 仍有视频元数据未就绪 → 无法判定完成（不能误判已完成而跳走，导致漏学时）
      if (anyUnready) return false;
      return all.every(({ video }) => video.currentTime / video.duration >= CFG.chaoxingDoneRatio);
    },
    // 获取超星 ananas 播放器的 video.js 实例（超星官方暂停/播放走 videojs("video").pause()/play()，
    // 而不是原生 video.pause()/play()——直接操作原生 video 会绕过超星的「全局单例互斥」，
    // 导致多个视频同时播放触发反爬）。返回 null 表示拿不到（非超星或播放器未初始化）。
    chaoxingPlayer(v) {
      try {
        if (v && v.ownerDocument && v.ownerDocument.defaultView && typeof v.ownerDocument.defaultView.videojs === 'function') {
          return v.ownerDocument.defaultView.videojs('video');
        }
      } catch (e) { /* ignore */ }
      return null;
    },
    // 暂停除 target 外的所有视频（超星多视频任务点：一次只播一个）。
    // 用 video.js 实例的 pause()（超星官方 pauseAllVideo 的底层方式），确保播放器真正停下，
    // 避免多视频同时播放触发反爬。原生 video.pause() 兜底。
    pauseOtherVideos(target) {
      for (const { video: ov } of L2.allVideos()) {
        if (ov === target) continue;
        // 原生 video 已经暂停/结束 → 什么都不用做。
        // （video.js 的 player.paused() 在「原生已暂停」时仍可能返回 false，
        //   旧写法会每秒重复调 pause()，虽不致命但属于无谓的高频操作，容易被平台风控盯上）
        if (ov.paused || ov.ended) continue;
        try {
          const p = this.chaoxingPlayer(ov);
          if (p && typeof p.pause === 'function') { p.pause(); continue; }
        } catch (e) { /* 落到原生 pause */ }
        try { ov.pause(); } catch (e) { /* ignore */ }
      }
    },
    // 检测超星「今日视频观看时长已达上限」类提示。
    // 达到上限后继续观看视频也无法完成任务点，脚本反复重播只会触发反爬验证码——
    // 此时应暂停脚本、转人工（或等待次日），而非死循环重播。
    detectVideoLimit() {
      const pats = ['观看时长已达上限', '已达上限', '观看时长上限', '今日学习时长', '无法完成任务点', '学习时长已达', '超时限制'];
      const els = qsa('div,span,p').filter((e) => is_visible(e));
      for (const e of els) {
        const t = clampText(e.textContent, 60);
        if (pats.some((p) => t.includes(p))) return t;
      }
      return null;
    },
    // 超星任务点页是否存在视频 iframe 容器（ans-insertvideo-online / ananas 视频模块）
    // 视频 iframe 在 knowledge/cards 内层（顶层 iframe#iframe → 内层 iframe.ans-insertvideo-online），需穿透同域 iframe 查找。
    // 关键：knowledge/cards 容器 iframe 若存在但穿透失败（document.domain 不一致导致的跨域），
    // 不能据此判「无视频」——否则会误判为非视频任务点去乱点「下一节」跳过视频（正是"跳动"根因之一）。
    // 此时保守返回 true（视为「可能有视频，等元数据/域对齐后再读」），避免误跳过。
    _chaoxingVideoIframePresent() {
      const match = (doc) => {
        for (const sel of CFG.selectors.chaoxingVideoIframe) {
          try { if (doc.querySelector(sel)) return true; } catch (e) { /* ignore */ }
        }
        return false;
      };
      if (match(document)) return true;
      // 穿透同域 iframe 一层（knowledge/cards 等）
      let sawCrossOriginContainer = false;
      const frames = document.querySelectorAll('iframe');
      for (const f of frames) {
        try {
          const inner = f.contentDocument;
          if (inner && match(inner)) return true;
        } catch (e) {
          // 跨域：无法查看内部。若这是 knowledge/cards 容器（src 含 knowledge/cards 或 id=iframe），
          // 保守认为其内部「可能有视频」，别误判非视频任务点。
          const src = (f.getAttribute && f.getAttribute('src')) || '';
          if (f.id === 'iframe' || /knowledge\/cards/i.test(src) || /mooc-ans/i.test(src)) sawCrossOriginContainer = true;
        }
      }
      // knowledge/cards 容器存在但穿透失败 → 保守视为「视频任务点（加载中）」，返回 true 避免误跳过
      return sawCrossOriginContainer;
    },
    // ---------- 超星 · 目录推进 / 投票问卷 ----------
    // 超星章节列表。两种页面结构统一处理：
    //   ① 目录页(mooc2-ans/mycourse/stu)：章节列表在 #frame_content-zj iframe 内，项 = div.chapter_item（onclick=toOld）
    //   ② 活动页(mooc1/mycourse/studentstudy)：右侧目录在顶层，项 = div.posCatalog_select（当前节带 posCatalog_active）
    // 节级项特征：节号 span.catalog_sbar / em.posCatalog_sbar（如「2.1」）；章级项无节号 → 跳过。
    // 完成态：图标 [class*=yiwanc] 或文本「已完成」；未完成任务点数：input.knowledgeJobCount/.jobUnfinishCount → span.catalog_points_yi。
    detectChaoxingChapters() {
      const out = [];
      const docs = [document];
      for (const sel of CFG.selectors.chaoxingCatalogIframe) {
        const f = qs(sel);
        if (f) { try { const d = f.contentDocument; if (d) docs.push(d); } catch (e) { /* 跨域 */ } }
      }
      const seen = new Set();
      for (const doc of docs) {
        let items;
        try { items = doc.querySelectorAll(CFG.selectors.chaoxingChapter.join(', ')); } catch (e) { continue; }
        for (const el of items) {
          if (seen.has(el)) continue;
          seen.add(el);
          // 节号（x.y）：章级项无节号 → 跳过
          const sbar = qs(CFG.selectors.chaoxingChapterSbar.join(', '), el);
          const sbarTxt = sbar ? clampText(sbar.textContent, 10) : '';
          if (!/^\d+\.\d+$/.test(sbarTxt)) continue;
          const full = clampText(el.textContent, 200);
          // 完成态：只认平台图标 icon_yiwanc（v1.16.7 起不再用「已完成」文本模糊匹配——
          // 节项 textContent 会聚合子任务点/嵌套提示里的「已完成」，导致未完成节被误判完成）。
          const done = !!el.querySelector('[class*="yiwanc"]');
          // 未完成任务点数：优先 input.value，其次 .catalog_points_yi；读不到记为 -1（未知），
          // 由 enterChaoxingNext 保守处理——绝不把「读不到」当「无任务点」而误判课程完成。
          let taskCount = -1;
          const jc = qs(CFG.selectors.chaoxingJobCount.join(', '), el);
          if (jc && jc.value != null && String(jc.value) !== '') taskCount = parseInt(jc.value, 10) || 0;
          if (taskCount < 0) {
            const pt = qs(CFG.selectors.chaoxingPointsYi.join(', '), el);
            if (pt) { const n = parseInt(clampText(pt.textContent, 6), 10); if (!isNaN(n)) taskCount = n; }
          }
          if (done) taskCount = 0;
          const taskUnknown = !done && taskCount < 0;
          const nameEl = el.querySelector('.catalog_name, .posCatalog_name');
          const name = clampText(nameEl ? nameEl.textContent : full, 60) || sbarTxt;
          out.push({ el, li: el, name, taskCount, taskUnknown, done, active: /posCatalog_active/.test(el.className || '') });
        }
      }
      return out;
    },
    async enterChaoxingNext() {
      if (isPaused()) return false;
      if (NOW() - this._lastClick < 4000) return false;
      const chaps = this.detectChaoxingChapters();
      if (!chaps.length) return false;
      const unfinished = chaps.filter((c) => !c.done);
      // 🔴 v1.16.7 详情页完成确认：存在未完成节、但其任务点数读不到（目录未就绪/漏匹配）→ 绝不判完成，
      // 宁可下轮重试，也不能把「读不到」当「无任务点」而误标课程完成。
      if (unfinished.some((c) => c.taskUnknown)) {
        log('info', '超星：存在未完成节但任务点数读不到（目录可能未就绪），暂不判完成');
        return false;
      }
      // 未完成节 = 未 done 且任务点 >0；taskCount==0（无任务点）的节无需学习，跳过
      const next = unfinished.find((c) => c.taskCount > 0);
      if (!next) {
        // 剩余节均已完成或无任务点 → 只有「目录确认识别到 ≥1 个已完成节」才可信判完成；
        // 否则（全无任务点且无任何已完成节）判定不充分，不标记完成。
        const hasCompleted = chaps.some((c) => c.done);
        if (hasCompleted) {
          // 🔴 v1.16.10：超星这里只能标 auto-done，**不能标 done**。
          //   「目录任务点全完成」≠「课程 done」——课程还可能有作业/讨论等**不在任务点目录里**的人工项，
          //   学习中心卡片会显示「未通过 / 必修活动 42/50」。若标 done，buildQueue 下一轮会因
          //   「页面明确未完成」清掉标记并重新入队 → 再进超星 → 再判完成 → 死循环。
          //   标 auto-done 后：buildQueue / reconcile 都不会再重进；等平台真显示「必修活动全完成」时自动升级 done。
          log('info', '超星：目录确认识别到已完成节且无待完成任务点 → 可自动项已全部完成（剩人工项由平台确认）');
          this.courseDone();
        } else {
          log('warn', '超星：目录既无已完成节也无待完成任务点 → 判定不充分，不标记完成');
        }
        return false;
      }
      this._lastClick = NOW();
      this._activeVideo = null;   // 切节：释放上游任务点的粘性视频，避免读到已卸载的旧 video
      log('info', `超星：进入未完成节「${next.name}」（${next.taskCount} 个待完成任务点）`);
      Session.set({ phase: 'L1-enter', section: next.name });
      try { next.el.click(); } catch (e) { return false; }
      await sleep(2500);
      return true;
    },
    // 面板「任务点」行文案（v1.7.70）
    //   超星没有「要求时长」概念 —— 完成条件是平台明示的「观看时长需 ≥ 总时长的 90%」
    //   （页面原文：「任务点前, 当前视频不可倍速、不可拖拉」「观看时长需 ≥ 总时长的 90%」）。
    //   故这里显示：目录页 → 任务点 X/Y；视频任务点页 → 达标线提示。
    progressText(videoActive) {
      const th = Math.round((CFG.chaoxingDoneRatio || 0.9) * 100);
      // 视频任务点页：显示「达标线 + 当前进度」（当前进度取正在播的视频）
      if (videoActive) {
        const v = L2.activeVideo();
        const cur = (v && isFinite(v.duration) && v.duration > 0) ? Math.round(v.currentTime / v.duration * 100) : 0;
        return '达标线 ' + th + '%（当前 ' + cur + '%）';
      }
      // 目录页：任务点完成度
      try {
        const chaps = this.detectChaoxingChapters();
        if (chaps && chaps.length) {
          let total = 0, done = 0;
          for (const c of chaps) { const n = c.taskCount || 0; if (n > 0) { total += n; if (c.done) done += n; } }
          if (total > 0) return '已完成 ' + done + '/' + total + '（' + Math.round(done / total * 100) + '%）';
        }
      } catch (e) { /* ignore */ }
      return '-';
    },
    // 超星课程完成 → 标记 auto-done + 跳学习中心学下一门
    //   🔴 v1.16.10：超星一律标 **auto-done**，绝不标 done。
    //     「目录任务点全完成」只代表可自动项完成，课程还可能有作业/讨论等不在任务点目录里的人工项
    //     （学习中心卡片显示「未通过 / 必修活动 42/50」）。标 done 会被 buildQueue 的「页面未完成」
    //     判定清除 → 重新入队 → 再进超星 → 死循环（用户实测：反复两次进超星无法推进）。
    //     auto-done 在 buildQueue / reconcile 都不会被重进；平台真显示「必修活动全完成」时自动升级 done。
    courseDone() {
      const name = Session.data.course || clampText(document.title, 50);
      L0.markAutoDone(name, { by: 'chaoxing', manualLeft: [] });
      Session.set({ phase: 'course-done', course: '' });
      log('info', '超星：可自动项已全部完成 → 标记 auto-done，跳转学习中心继续下一门');
      L0.gotoStudyCenter();
    },
    // 超星任务点页：点击「下一节」翻页（看完当前节后）
    chaoxingNextChapter() {
      for (const sel of CFG.selectors.chaoxingNextChapter) {
        const b = qs(sel);
        if (b && is_visible(b)) { try { b.click(); return true; } catch (e) { /* ignore */ } }
      }
      return false;
    },
    // 任务点完成后推进（v1.16.9）：优先点「下一节」；无「下一节」（当前是最后一个任务点）→ 点「返回课程」
    // 回课程详情页，由 L1.enterChaoxingNext 重新定位下一个未完成节/判定课程完成。
    backOrNext() {
      if (this.chaoxingNextChapter()) { log('info', '超星：已点击「下一节」'); return true; }
      const back = qs('a.subBack, a[href*="mycourse/stu"], a[href*="mooc2-ans/mycourse/stu"], .subBack');
      if (back) { try { back.click(); log('info', '超星：无「下一节」，点击「返回课程」回详情页'); return true; } catch (e) { /* ignore */ } }
      return false;
    },
    // 判断超星任务点页是否存在「下一节」按钮（用于区分非视频任务点 vs 视频加载中）
    chaoxingHasNextChapter() {
      for (const sel of CFG.selectors.chaoxingNextChapter) {
        const b = qs(sel);
        if (b && is_visible(b)) return true;
      }
      return false;
    },
    // ---------- 超星投票问卷（随机作答 + 提交 + 跳下一节） ----------
    // 投票流程状态：idle(未开始) → triggered(已点开投票) → filled(已作答) → submitted(已提交) → closed(已关闭)
    _voteState: 'idle',
    _voteLastAction: 0,
    // 穿透同域 iframe 找到投票入口 cover（knowledge/cards 内嵌 ananas/modules/zt/vote iframe）
    _findVoteCoverDoc() {
      try {
        for (const sel of CFG.selectors.chaoxingVoteCover) {
          const f = qs(sel);
          if (f) { try { const d = f.contentDocument; if (d && d.querySelector('#render')) return { doc: d, frame: f }; } catch (e) { /* 跨域跳过 */ } }
        }
        // 兜底：穿透 knowledge/cards iframe 查找
        const kf = qs('iframe#iframe');
        if (kf) { try { const kd = kf.contentDocument; if (kd) { const vf = kd.querySelector('iframe[src*="ananas/modules/zt/vote"]'); if (vf) { try { const vd = vf.contentDocument; if (vd && vd.querySelector('#render')) return { doc: vd, frame: vf }; } catch (e) { /* ignore */ } } } } catch (e) { /* ignore */ } }
        return null;
      } catch (e) { return null; }
    },
    // ---------- 超星 · 视频内弹题（tkTopic）----------
    // 逆向来源：ananas/videojs-ext.min.js + videojs-test-ans.css（2026-10-10）
    //   div.tkTopic（半透明遮罩）> div.tkTopic_con.tkScroll > div.tkItem
    //     > div.tkItem_title（题干）
    //     > ul.tkItem_ul > li > label > span.tkRadio|span.tkCheck > input[name=ans-videoquiz-opt][type=radio|checkbox]
    //   操作条 div.tkTopic_oper：span.spanHas（回答正确，绿）/ span.spanNot、span.spanNotBack（回答错误，红）
    //   按钮 a#videoquiz-submit（提交）/ a.ans-videoquiz-continue（继续）；解析 #tkParsing
    // 提交走 POST /question/quiz-validation?classid=...，响应只回对错、不回正确答案
    //   → 策略与自营一致：题库命中直接用；未命中先盲答（单选逐项轮换），答错即抓解析里的正确答案入题库。
    _quizAt: 0, _quizStem: '', _quizPicked: '', _quizTries: {},
    // 收集所有可见/可达的 document（顶层 + 同域 iframe，最多 6 层）
    quizDocs() {
      const out = [];
      const seen = new Set();
      const walk = (doc, depth) => {
        if (!doc || depth > 6 || seen.has(doc)) return;
        seen.add(doc); out.push(doc);
        let frames = [];
        try { frames = doc.querySelectorAll('iframe'); } catch (e) { return; }
        for (const f of frames) {
          try { const inner = f.contentDocument; if (inner) walk(inner, depth + 1); } catch (e) { /* 跨域跳过 */ }
        }
      };
      try { walk(document, 0); } catch (e) { /* ignore */ }
      return out;
    },
    // 弹题选项：[{ li, label, input, txt }]
    quizOptions(root) {
      for (const sel of CFG.selectors.chaoxingQuizOption) {
        let lis = [];
        try { lis = root.querySelectorAll(sel); } catch (e) { continue; }
        if (!lis.length) continue;
        const out = [];
        for (const li of lis) {
          const input = li.querySelector('input');
          if (!input) continue;                       // 选项行必带 input（radio/checkbox）
          const label = li.querySelector('label') || li;
          out.push({ li, label, input, txt: clampText(label.textContent, 120) });
        }
        if (out.length) return out;
      }
      return [];
    },
    // 探测视频内弹题（可见的 .tkTopic 且含选项）；返回 null 表示当前没有弹题
    detectVideoQuiz() {
      for (const doc of this.quizDocs()) {
        let root = null;
        for (const sel of CFG.selectors.chaoxingQuiz) {
          try { const el = doc.querySelector(sel); if (el && is_visible(el)) { root = el; break; } } catch (e) { /* ignore */ }
        }
        if (!root) continue;
        const opts = this.quizOptions(root);
        if (!opts.length) continue;                   // 只有壳没有选项 → 不是弹题态
        const pick = (sels, scope) => {
          for (const s of sels) { try { const el = (scope || doc).querySelector(s); if (el) return el; } catch (e) { /* ignore */ } }
          return null;
        };
        // 🔴 反馈/按钮必须取「可见」的那个（v1.7.46 修复卡死）：
        // CSS 里 `.tkTopic_oper .spanNot, .tkTopic_oper .spanNotBack{display:none}`，
        // 即 #spanNot / #spanNotBack 恒定不可见，真正显示的是内联 display:block 的 #spanNotBackPoint。
        // 旧代码 `pick()` 取「首个命中」→ 拿到不可见的 #spanNot → 判成「没有反馈」→ 不点「继续学习」→ 弹题卡死。
        const pickV = (sels, scope) => {
          const root2 = scope || doc;
          for (const s of sels) {
            let els = [];
            try { els = root2.querySelectorAll(s); } catch (e) { continue; }
            for (const el of els) if (is_visible(el)) return el;
          }
          return null;
        };
        const stemEl = pick(CFG.selectors.chaoxingQuizStem, root);
        return {
          doc, root, opts,
          stem: clampText(stemEl ? stemEl.textContent : root.textContent, 200),
          isMulti: opts.some((o) => (o.input.getAttribute('type') || '') === 'checkbox'),
          submit: pickV(CFG.selectors.chaoxingQuizSubmit, root) || pickV(CFG.selectors.chaoxingQuizSubmit, doc),
          cont: pickV(CFG.selectors.chaoxingQuizContinue, root) || pickV(CFG.selectors.chaoxingQuizContinue, doc),
          right: pickV(CFG.selectors.chaoxingQuizRight, doc),
          wrong: pickV(CFG.selectors.chaoxingQuizWrong, doc),
          parsing: pick(CFG.selectors.chaoxingQuizParsing, doc),
        };
      }
      return null;
    },
    // 是否处于弹题态（供 safePlay / pause 救回判定用，避免与弹题抢播放）
    quizVisible() {
      try { return !!this.detectVideoQuiz(); } catch (e) { return false; }
    },
    // 把「字母序列」答案写入题库（与自营题库同格式：key=规范化题干，value=字母如 "B,C"）
    _saveQuizAnswer(stem, letters) {
      if (!stem || !letters) return;
      try {
        const bank = Store.get(K.QUIZBANK, {}) || {};
        const key = clampText(stem, 200);
        if (bank[key] !== letters) {
          bank[key] = letters;
          Store.set(K.QUIZBANK, bank);
          log('info', '超星弹题：已把正确答案沉淀入本地题库：' + clampText(stem, 30) + ' → ' + letters);
          Backend.quizSubmit(key, letters);   // v1.12.0：回传后端题库（跨用户共享，下次免猜）
        }
      } catch (e) { /* ignore */ }
    },
    // 从解析/反馈文案里抓「正确答案：X」的字母序列
    _captureQuizAnswer(q) {
      try {
        for (const r of [q.parsing, q.root, q.doc]) {
          if (!r) continue;
          const txt = clampText(r.textContent, 800);
          const m = txt.match(/正确答案[为是：:]?\s*([A-Ha-h](?:\s*[,，、/]\s*[A-Ha-h])*)/);
          if (m) return m[1].toUpperCase().replace(/[\s，、/]+/g, ',');
        }
      } catch (e) { /* ignore */ }
      return '';
    },
    // 选答案：① 后端题库（v1.12.0，服务端为权威）→ ② 本地缓存 → ③ 盲答。
    // 盲答依据「已试过且答错的字母」持久化记录（K.QUIZTRY）逐个试下一项，同题下次换一个选项，
    // 全试完则从头再来（题干/选项完全一样时至少不会永远只试 A）。
    async _pickQuizOptions(q) {
      const stem = q.stem || '';
      const key = clampText(stem, 200);
      const at = (ix) => Object.assign({ index: ix }, q.opts[ix]);
      const idxsOf = (ans) => L2.Quiz.indexesFromAnswer(ans, q.opts.map((o) => o.input))
        .filter((ix) => ix >= 0 && ix < q.opts.length);
      try {
        const bank = Store.get(K.QUIZBANK, {}) || {};
        let known = '';
        // ① 先问后端
        if (key) {
          const r = await Backend.quizAnswer(key);
          if (r && r.found && r.answer) {
            known = r.answer;
            bank[key] = known; Store.set(K.QUIZBANK, bank);
          }
        }
        // ② 后端未命中 → 本地缓存
        if (!known) known = bank[key] || '';
        if (known) {
          const idxs = idxsOf(known);
          if (idxs.length) {
            if (known !== bank[key]) log('info', '超星弹题：题库命中 → ' + known);
            return idxs.map(at);
          }
        }
      } catch (e) { /* ignore */ }
      let used = '';
      try { const t = Store.get(K.QUIZTRY, {}) || {}; used = t[key] || ''; } catch (e) { /* ignore */ }
      let ix = 0;
      for (let i = 0; i < q.opts.length; i++) {
        if (used.indexOf(String.fromCharCode(65 + i)) < 0) { ix = i; break; }
        if (i === q.opts.length - 1) ix = 0;   // 全试完 → 重新从 A 开始
      }
      if (q.isMulti && ix !== 0) ix = 0;       // 多选暂只试单项（避免乱勾导致必然答错）
      return [at(ix)];
    },
    // 记下「这道题的这个选项答错过」，供下次换项
    _rememberWrong(stem, letters) {
      if (!stem || !letters) return;
      try {
        const t = Store.get(K.QUIZTRY, {}) || {};
        const key = clampText(stem, 200);
        const merged = (t[key] || '') + letters;
        const uniq = Array.from(new Set(merged.split(',').join('').split(''))).sort().join('');
        t[key] = uniq;
        Store.set(K.QUIZTRY, t);
      } catch (e) { /* ignore */ }
    },
    // 点击弹题「继续学习」恢复播放（答对/答错/兜底三处复用）。
    // ⚠ 只点 #videoquiz-continue / .ans-videoquiz-continue，绝不会点到同排的「知识点回看」(#knowledgeBack)。
    _clickQuizContinue(q) {
      const el = q.cont || (q.doc && q.doc.querySelector('#videoquiz-continue'));
      if (!el || !is_visible(el)) return false;
      try {
        el.click();
        log('info', '超星弹题：已点「' + clampText(el.textContent, 10) + '」继续学习');
      } catch (e) { return false; }
      return true;
    },
    // 驱动弹题：未答 → 选 + 提交；已答 → 记题库 + 点「继续学习」
    async driveVideoQuiz(q) {
      const now = NOW();
      if (now - (this._quizAt || 0) < 2000) return false;   // 去抖：避免高频点击
      this._quizAt = now;
      const vis = (el) => !!(el && is_visible(el));
      const stem = q.stem || '';
      if (stem && stem !== this._quizStem) { this._quizStem = stem; this._quizPicked = ''; }  // 换题 → 重置本次选择
      // ① 已有判题反馈（答对/答错）→ 沉淀答案 + 点「继续学习」恢复播放
      if (vis(q.right) || vis(q.wrong)) {
        const letters = this._quizPicked || '';
        if (vis(q.right)) {
          if (letters && stem) this._saveQuizAnswer(stem, letters);
          log('info', '超星弹题：回答正确' + (letters ? '（' + letters + '）' : ''));
        } else {
          if (letters) this._rememberWrong(stem, letters);          // 记下这个选项答错过，下次换项
          const ans = this._captureQuizAnswer(q);
          if (ans && stem) this._saveQuizAnswer(stem, ans);
          log('warn', '超星弹题：回答错误（本次选 ' + (letters || '-') + '）' + (ans ? '，已抓正确答案 ' + ans : '；平台解析区不返回正确答案，已记录「该选项答错」，下次同题换项再试'));
        }
        this._quizPicked = '';
        if (this._clickQuizContinue(q)) return true;
      }
      // ② 兜底（v1.7.46 新增）：已答过（提交按钮不可用）但「继续学习」可见 → 直接点它。
      //    这条保证「不管反馈文案/结构怎么变，只要平台允许继续，脚本就一定点得下去」，不会再卡死在弹题上。
      if (!vis(q.submit) && vis(q.cont) && this._clickQuizContinue(q)) return true;
      // ③ 提交按钮可用 → 作答 + 提交
      if (vis(q.submit)) {
        const picks = await this._pickQuizOptions(q);
        if (!picks.length) return false;
        for (const p of picks) {
          try { (p.label || p.li).click(); } catch (e) { try { p.input.click(); } catch (e2) { /* ignore */ } }
        }
        this._quizPicked = picks.map((p) => String.fromCharCode(65 + p.index)).join(',');
        log('info', '超星弹题：已选「' + this._quizPicked + '」并提交（' + clampText(stem, 30) + '）');
        await sleep(400);
        try { q.submit.click(); } catch (e) { /* ignore */ }
        Stats.bump('quizzes');
        await sleep(1800);
        return true;
      }
      return false;   // 提交中/等待平台响应
    },
    // 检测当前任务点是否为「投票问卷」：存在投票入口 cover（未点开状态）
    detectChaoxingVote() {
      return !!this._findVoteCoverDoc();
    },
    // 投票表单 iframe 的 document（已点开后 #voteIframe 加载投票表单）
    _voteFormDoc() {
      for (const sel of CFG.selectors.chaoxingVoteFrame) {
        const f = qs(sel);
        if (f) { try { const d = f.contentDocument; if (d && d.querySelector('#answer_form')) return d; } catch (e) { /* 跨域跳过 */ } }
      }
      return null;
    },
    // 主驱动：投票任务点的完整自动化。自驱动循环推进状态机（点开→作答→提交→关闭→下一节），
    // 因投票各步骤间 URL 不变（仅 iframe src 变），无法依赖 Router 的 URL 监听复探，故内部自带推进循环。
    async driveChaoxingVote() {
      if (isPaused()) return false;
      if (this._voteDriving) return false;   // 已在驱动中，防重入
      this._voteDriving = true;
      try {
        let rounds = 0;
        while (rounds < 20) {                 // 最多推进 20 轮（约 40 秒），防死循环
          rounds++;
          if (isPaused()) break;
          const now = NOW();
          if (now - this._voteLastAction < 1500) { await sleep(1000); continue; }

          // 1) 表单已提交 → 点「返回」关闭投票框 → 点「下一节」
          const formDoc = this._voteFormDoc();
          if (formDoc) {
            const bodyText = formDoc.body ? formDoc.body.innerText : '';
            const isSubmitted = CFG.selectors.chaoxingVoteDoneText.some((t) => bodyText.includes(t)) || /studentQuestionChapter/.test(formDoc.location.href);
            if (isSubmitted) {
              const back = formDoc.querySelector(CFG.selectors.chaoxingVoteBack.join(','));
              if (back) { try { back.click(); this._voteLastAction = now; log('info', '超星投票：已提交，点击「返回」关闭投票框'); await sleep(1500); this.backOrNext(); this.resetChaoxingVote(); return true; } catch (e) { /* ignore */ } }
              // 无返回按钮（可能已自动关闭）→ 直接推进（下一节 / 返回课程）
              this._voteLastAction = now; this.backOrNext(); this.resetChaoxingVote(); return true;
            }
            // 表单已加载未提交
            if (this._voteState !== 'filled') {
              this._fillVoteForm(formDoc);
              this._voteState = 'filled';
              this._voteLastAction = now;
              log('info', '超星投票：已随机作答全部题目');
              await sleep(600);
              continue;
            }
            // 已作答 → 提交
            const submit = formDoc.querySelector(CFG.selectors.chaoxingVoteSubmit.join(','));
            if (submit) { try { submit.click(); this._voteLastAction = now; this._voteState = 'submitted'; log('info', '超星投票：点击「提交」'); await sleep(1500); continue; } catch (e) { /* ignore */ } }
          } else {
            // 2) 表单未加载 → 检测入口 cover 并点击触发（仅首次；triggered 后只等待表单加载，避免重复点击 cover）
            if (this._voteState !== 'triggered') {
              const cover = this._findVoteCoverDoc();
              if (cover) {
                const render = cover.doc.querySelector('#render');
                if (render) { try { render.click(); this._voteLastAction = now; this._voteState = 'triggered'; log('info', '超星投票：检测到投票问卷，点击打开投票表单'); await sleep(1500); continue; } catch (e) { /* ignore */ } }
              } else {
                // 无 cover 也无表单 → 不是投票任务点（或已关闭），退出
                if (this._voteState === 'closed') { this._voteLastAction = now; this.backOrNext(); this.resetChaoxingVote(); return true; }
                this.resetChaoxingVote();
                return false;
              }
            }
            // triggered 状态：表单尚未加载，继续等待下一轮
          }
          await sleep(1000);
        }
        log('warn', '超星投票：推进轮次超限，本轮结束（可能需人工介入）');
        this.resetChaoxingVote();
        return false;
      } finally {
        this._voteDriving = false;
      }
    },
    // 随机作答投票表单（单选/多选/简答）
    _fillVoteForm(doc) {
      const items = doc.querySelectorAll('.question-item');
      let single = 0, multi = 0, text = 0;
      for (const it of items) {
        const qt = it.querySelector('.que-type');
        const type = qt ? qt.value : '';
        if (type === '0') {          // 单选
          const radios = it.querySelectorAll('input[type="radio"]');
          if (radios.length) { radios[Math.floor(Math.random() * radios.length)].click(); single++; }
        } else if (type === '1') {   // 多选（读 .answer_limit 的 "min,max"）
          const cbs = it.querySelectorAll('input[type="checkbox"]');
          if (cbs.length) {
            const limitEl = it.querySelector('.answer_limit');
            const limit = limitEl ? limitEl.textContent.trim() : '1,3';
            const parts = limit.split(','); let max = parseInt(parts[1] || '3', 10); const min = parseInt(parts[0] || '1', 10);
            let n = Math.min(cbs.length, max); if (n < min) n = min;
            const order = Array.from({ length: cbs.length }, (_, k) => k);
            for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); const t = order[k]; order[k] = order[j]; order[j] = t; }
            for (let k = 0; k < n; k++) cbs[order[k]].click();
            multi++;
          }
        } else if (type === '4') {   // 简答（填「无」，排除标题 textarea）
          const ta = it.querySelector('textarea');
          if (ta && /^answer/.test(ta.name || '')) { ta.value = '无'; ta.dispatchEvent(new Event('input', { bubbles: true })); text++; }
        }
      }
      log('info', `超星投票：作答完成（单选 ${single}，多选 ${multi}，简答 ${text}）`);
    },
    // 重置投票状态（任务点切换后）
    resetChaoxingVote() { this._voteState = 'idle'; this._voteLastAction = 0; },
  };

  /* ---- 尚睿通(-21) 模块 ---- */
  const Yanxiu = {
    _lastClick: 0, _afterAt: 0, _resAt: 0, _docSince: 0, _cardAt: 0, _surveyAt: 0,
    _watchTimer: null, _resName: '', _cardStem: '', _surveyTries: 0,
    _cardBusy: false, _quizTries: null, _docTurnAt: 0, _docStartDur: -1, _docWarnAt: 0,
    _resPath: '', _resSettleUntil: 0,
    // 关闭尚睿通「AI 助手」悬浮弹窗（可能遮挡「看课」按钮，导致点击落空）
    closeYanxiuAiAssistant() {
      let closed = false;
      for (const sel of CFG.selectors.yanxiuAiClose) {
        const btn = qs(sel);
        if (btn && is_visible(btn)) { try { btn.click(); closed = true; } catch (e) { /* ignore */ } }
      }
      if (closed) log('info', '尚睿通：已关闭 AI 助手悬浮层');
      return closed;
    },
    // 「去评价」「看课」这类按钮走 window.open(target=_blank)：脚本触发的合成点击不算用户手势，
    // 浏览器会拦掉弹窗。这里临时接管 window.open 把 URL 截下来，改成**本页跳转**（省得开一堆标签）。
    async openSameTab(el, label) {
      let url = '', w = null, orig = null;
      try {
        w = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;
        orig = w.open;
        w.open = function (u) { try { url = String(u || ''); } catch (e) { /* ignore */ } return { closed: true, focus() { /* noop */ }, close() { /* noop */ } }; };
      } catch (e) { w = null; }
      try { el.click(); } catch (e) { /* ignore */ }
      await sleep(200);
      if (w && orig) { try { w.open = orig; } catch (e) { /* ignore */ } }
      if (url) {
        log('info', '尚睿通：' + (label || '跳转') + ' → 本页跳转 ' + clampText(url, 70));
        try { location.href = url; return true; } catch (e) { /* ignore */ }
      }
      log('info', '尚睿通：' + (label || '跳转') + ' 已点击（未截到 URL，交由浏览器新标签打开）');
      return false;
    },
    backToMember() {
      const pid = (location.href.match(/projectId=(\d+)/) || [])[1];
      const url = pid ? 'https://gdipx.yanxiu.com/train2/workspace/' + pid + '/training/member' : '';
      if (!url) return false;
      log('info', '尚睿通：返回项目详情页');
      try { location.href = url; return true; } catch (e) { return false; }
    },

    /* ============ 一、项目详情页（train2/workspace/<pid>/training/member）============ */
    // 四大模块导航：li.training-phase（选中项 .phase-item-wrapper.is--selected）
    detectPhases() {
      const out = [];
      for (const el of qsa(CFG.selectors.yanxiuPhaseItem.join(','))) {
        const nEl = qs(CFG.selectors.yanxiuPhaseName.join(','), el);
        const name = clampText(nEl ? nEl.textContent : '', 20).replace(/\s+/g, '');
        if (!name) continue;
        const box = el.querySelector('.phase-item-wrapper') || el;
        out.push({ el, box, name, selected: /is--selected/.test(String(box.getAttribute('class') || '')) });
      }
      return out;
    },
    switchPhase(kw) {
      const p = this.detectPhases().find((x) => x.name.includes(kw));
      if (!p) { log('warn', '尚睿通：未找到模块「' + kw + '」'); return false; }
      if (p.selected) return true;
      try { p.box.click(); } catch (e) { return false; }
      log('info', '尚睿通：切换到「' + p.name + '」模块');
      return true;
    },
    // 课程学习条目：li.course-item（名 .item-info-title、进度 .learn-status span「已观看 44%」、按钮 .learn-btn button）
    detectCourseItems() {
      const out = [];
      for (const li of qsa(CFG.selectors.yanxiuCourseItem.join(','))) {
        const nameEl = qs(CFG.selectors.yanxiuCourseName.join(','), li);
        const name = clampText(nameEl ? nameEl.textContent : '', 50);
        if (!name) continue;
        const stEl = qs(CFG.selectors.yanxiuCourseStatus.join(','), li);
        const st = clampText(stEl ? stEl.textContent : '', 16);
        const m = st.match(/(\d+)\s*%/);
        const pct = m ? parseInt(m[1], 10) : -1;
        const btn = qs(CFG.selectors.yanxiuCourseGo.join(','), li);
        const done = pct >= 100 || /已学完|已完成/.test(st);
        out.push({ el: li, name, status: st, pct, done, btn });
      }
      return out;
    },
    async enterCourseNext() {
      if (isPaused()) return false;
      if (NOW() - this._lastClick < 4000) return false;
      this.closeYanxiuAiAssistant();
      this.switchPhase('课程学习');
      await sleep(900);
      const items = this.detectCourseItems();
      if (!items.length) { log('info', '尚睿通：未找到「课程学习」条目（可能模块未渲染）'); return false; }
      const next = items.find((x) => !x.done && x.btn && is_visible(x.btn));
      if (!next) {
        const name = Session.data.course || clampText(document.title, 50);
        // 平台自身进度（课程条目「已观看 100%」）全完成 → 以平台为准记 done
        const platformDone = items.length > 0 && items.every((x) => x.done);
        if (platformDone) {
          L0.markDone(name, { by: 'yanxiu' });
          log('info', '尚睿通：课程学习已全部完成（' + items.length + ' 节，平台确认 100%）→ 转入调查问卷');
          await this.afterCourses();
          return false;
        }
        // 🔴 v1.16.7 详情页完成确认：存在未完成课程项，但「去学习/看课」按钮未就绪（未渲染/漏匹配）
        // → 绝不判完成，下轮重试；否则会把「还没学完」误标为 auto-done。
        log('info', '尚睿通：存在未完成课程项但无法进入（按钮未就绪），暂不判完成（' + items.length + ' 节）');
        return false;
      }
      this._lastClick = NOW();
      Session.set({ phase: 'L1-enter', section: next.name });
      log('info', '尚睿通：进入课程「' + next.name + '」' + (next.status ? '（' + next.status + '）' : '（未观看）'));
      await this.openSameTab(next.btn, '进入课程「' + next.name + '」');
      return true;
    },
    // 课程学习完成 → 做「调查问卷（必做）」；撰写作业/参与活动留人工
    // 🔴 v1.13.3：问卷**已完成**（只读、按钮是「查看」）时绝不进入——进了只能在只读页干等，整课卡死。
    async afterCourses() {
      if (isPaused()) return false;
      if (NOW() - this._afterAt < 15000) return false;
      this._afterAt = NOW();
      log('info', '尚睿通：检查「调查问卷（必做）」');
      this.switchPhase('调查问卷');
      await sleep(1600);
      // 模块渲染有延迟：连续 3 轮取不到入口才下结论，避免误判「无需作答」而漏做问卷
      let st = this.surveyEntryState();
      for (let i = 0; i < 3 && st.state === 'none'; i++) { await sleep(1200); st = this.surveyEntryState(); }
      if (st.state === 'go' && st.btn) {
        Session.set({ phase: 'L1-enter', section: '调查问卷' });
        await this.openSameTab(st.btn, '打开调查问卷');
        return true;
      }
      log('info', '尚睿通：调查问卷' + (st.state === 'done'
        ? '已完成（按钮「' + (st.bTxt || '-') + '」= 只读）→ 跳过，不再进入'
        : '无「去评价」入口 → 视为已完成/无需作答'));
      this.finishCourse(st.state === 'done' ? '调查问卷已完成' : '');
      return false;
    },
    // 调查问卷入口状态：done（已完成/只读）/ go（可作答）/ none（未找到入口）
    // 判定依据全部来自规则包：完成态 class、完成/只读/可进入 文案。
    surveyEntryState() {
      const ent = qsa(CFG.selectors.yanxiuEvaEntity.join(',')).find(is_visible);
      if (!ent) return { state: 'none', btn: null, cls: '', stTxt: '', bTxt: '' };
      const stEl = qs(CFG.selectors.yanxiuEvaState.join(','), ent);
      const cls = stEl ? String(stEl.getAttribute('class') || '') : '';
      const stTxt = stEl ? clampText(stEl.textContent, 40) : '';
      const btn = qsa(CFG.selectors.yanxiuEvaAction.join(','), ent).find(is_visible);
      const bTxt = btn ? clampText(btn.textContent, 20) : '';
      const hit = (arr, t) => !!(arr || []).some((w) => w && t && t.indexOf(w) >= 0);
      const done = (CFG.yanxiuSurveyDoneClasses || []).some((c) => c && cls.indexOf(c) >= 0)
        || hit(CFG.yanxiuSurveyDoneWords, stTxt)
        || hit(CFG.yanxiuSurveyViewWords, bTxt);
      if (done) return { state: 'done', btn, cls, stTxt, bTxt };
      if (!btn) return { state: 'none', btn, cls, stTxt, bTxt };
      // 有「去评价」类文案 → 可作答；规则包没下发文案时按旧行为（有按钮就点）
      const go = !(CFG.yanxiuSurveyGoWords || []).length || hit(CFG.yanxiuSurveyGoWords, bTxt);
      return { state: go ? 'go' : 'none', btn, cls, stTxt, bTxt };
    },
    // 课程收尾（可自动项全完成）：标记 auto-done → 提示 → 回学习中心继续下一门
    // ⚠ 用 isGlobalPaused()：问卷页路由已 L2.pause()，用 isPaused() 会被自己挡下（v1.13.3 实测）
    finishCourse(reason) {
      if (isGlobalPaused()) return false;
      // 课程名：优先会话里的当前课程；跨标签/刷新丢了就用队列头（= L0 正在推进的那门），
      // 最后才退回页面标题——否则会把「教师研修网」这种站点名写成课程名（v1.13.3 实测踩到）。
      const q0 = (Store.get(K.QUEUE, [])[0] || {});
      const name = Session.data.course || q0.name || clampText(document.title, 50);
      const cur = Store.get(K.COURSES, {})[name];
      if (!(cur && cur.status === 'done')) {
        L0.markAutoDone(name, { by: 'yanxiu', manualLeft: ['撰写作业', '参与活动（发帖/研讨）'] });
      }
      Notifier.banner('尚睿通：课程「' + name + '」可自动项已全部完成'
        + (reason ? '（' + reason + '）' : '')
        + '。「撰写作业 / 参与活动」需人工，正在返回学习中心继续下一门…', { level: 'info', ttl: 20000, force: true });
      Session.set({ phase: 'yanxiu-done' });
      L0.gotoStudyCenter();
      return true;
    },

    /* ============ 二、学习页（grain/course/<id>/detail）============ */
    // 左侧目录资源：li.res-item（图标 icon-media=视频 / icon-doc=文档；.active=当前打开）
    detectResItems() {
      const out = [];
      for (const li of qsa(CFG.selectors.yanxiuResItem.join(','))) {
        const nEl = qs(CFG.selectors.yanxiuResName.join(','), li);
        const name = clampText(nEl ? (nEl.getAttribute('title') || nEl.textContent) : '', 60);
        if (!name) continue;
        const ic = qs(CFG.selectors.yanxiuResIcon.join(','), li);
        const cls = ic ? String(ic.getAttribute('class') || '') : '';
        out.push({
          el: li, name,
          type: /icon-doc/.test(cls) ? 'doc' : (/icon-media/.test(cls) ? 'media' : 'other'),
          active: /(^|\s)active(\s|$)/.test(String(li.getAttribute('class') || '')),
        });
      }
      return out;
    },
    // 当前打开的是不是「文档/拓展资源」（无 video，需要靠停留时长算看过）
    isDocRes() {
      try { const c = this.detectResItems().find((x) => x.active); return !!c && c.type === 'doc'; } catch (e) { return false; }
    },
    startWatch() {
      if (this._watchTimer) return;
      this._watchBeat = NOW();
      this._watchTimer = setInterval(() => { this._watchBeat = NOW(); try { this.tick(); } catch (e) { /* ignore */ } }, 2000);
      log('info', '尚睿通：学习页监视器已启动');
    },
    async tick() {
      if (isPaused()) return;
      const card = this.cardVisible();
      // 低频自检日志（每 ~30s）：区分「监视器没在跑」与「在跑但完成判定没过」，便于定位卡住原因
      this._tickN = (this._tickN || 0) + 1;
      if (this._tickN % 15 === 0) {
        const st = this.taskState();
        log('info', '尚睿通：监视器在跑（弹题' + (card ? '有' : '无') + '）'
          + (st ? '；平台进度 ' + st.percentage + '%（' + st.durationTime + 's/' + st.totalTime + 's，' + (st.player || '?') + '）' : '；读不到平台状态'));
      }
      if (card) { await this.driveCard(); return; }
      await this.advanceRes();
    },
    // 视频内弹题卡片（随堂小练习 / 回答问题完成验证 / 测验）
    cardVisible() { return !!this.detectCard(); },
    detectCard() {
      for (const w of qsa(CFG.selectors.yanxiuCard.join(','))) {
        if (!is_visible(w)) continue;
        if (/answerCard-hidden/.test(String(w.getAttribute('class') || ''))) continue;
        const stemEl = qs(CFG.selectors.yanxiuQuizStem.join(','), w);
        const stem = clampText(stemEl ? stemEl.textContent : '', 200);
        let opts = [];
        const group = qs(CFG.selectors.yanxiuQuizOptions.join(','), w);
        if (group) for (const sel of CFG.selectors.yanxiuEvaOpt) { try { const l = group.querySelectorAll(sel); if (l.length) { opts = Array.from(l); break; } } catch (e) { /* ignore */ } }
        const ansEl = qs(CFG.selectors.yanxiuQuizAnswer.join(','), w);
        const btn = qs(CFG.selectors.yanxiuQuizSubmit.join(','), w) || qs('button', w);
        const locked = opts.some((o) => { const i = o.querySelector('input'); return !!(i && i.disabled); });
        if (!opts.length && !ansEl && !locked && !stem) continue;
        return {
          w, stem, opts, btn, locked,
          answer: ansEl ? clampText(ansEl.textContent, 120).replace(/^\s*正确答案[:：]?\s*/, '').trim() : '',
          isMulti: opts.some((o) => /ivu-checkbox-wrapper/.test(String(o.getAttribute('class') || ''))),
        };
      }
      return null;
    },
    // 平台判定反馈：答对时 iView $Message 弹「恭喜，回答正确~」
    quizMsg() {
      try { return qsa('.ivu-message-notice-content, .ivu-message-notice').map((e) => clampText(e.textContent, 40)).join(' | '); } catch (e) { return ''; }
    },
    // 点选一个选项：iView 的 label 包裹 input，点 label 即切换并同步 v-model。
    // ⚠ 不要额外补发 change/input 事件（CheckboxGroup 会重复 push 导致脏数据）
    pickOpt(o) {
      try { o.click(); } catch (e) { /* ignore */ }
    },
    // 取答题卡内容组件的 Vue 实例：其 $data.answer 才是提交依据
    // （DOM 的 input.checked / -checked class 与实际选中会脱节，不能用来判定状态）
    quizVue(card) {
      try {
        let el = (card && card.querySelector('.form-answers')) || card;
        for (let d = 0; d < 6 && el; d++) {
          const keys = Object.keys(el).filter((k) => k.indexOf('__vue__') === 0);
          for (const k of keys) {
            const v = el[k];
            if (v && v.$data && Object.prototype.hasOwnProperty.call(v.$data, 'answer')) return v;
          }
          el = el.parentElement;
        }
      } catch (e) { /* ignore */ }
      return null;
    },
    // 组件当前选中项（下标数组；单选为单元素数组）
    selectedIdx(vn) {
      try {
        const a = vn && vn.answer;
        if (a === undefined || a === null || a === '') return [];
        if (Array.isArray(a)) return a.map((x) => parseInt(x, 10)).filter((x) => !isNaN(x));
        const n = parseInt(a, 10);
        return isNaN(n) ? [] : [n];
      } catch (e) { return []; }
    },
    // 把选中项精确调整为目标集合。
    // 两个坑：① 卡片组件会保留上次答案（不清空会「点成全不选」）；
    //        ② iView 的 CheckboxGroup 在同一 tick 内连点会互相覆盖（每个 click 读到的 currentValue 是旧值，
    //           只有最后一次生效 → 提交答案只剩 1 项）→ 每次点击后必须等 v-model 回写，再依据组件状态决定下一步。
    async applyPicks(card, wantIdx) {
      const want = Array.from(new Set(wantIdx.filter((i) => i >= 0)));
      const isMulti = !!card.querySelector('.ivu-checkbox-group');
      try {
        const v0 = this.quizVue(card);
        if (v0) v0.answer = isMulti ? [] : undefined;
      } catch (e) { /* ignore */ }
      for (const o of card.querySelectorAll('label input')) { try { o.checked = false; } catch (e) { /* ignore */ } }
      await sleep(250);
      for (let r = 0; r < 6; r++) {
        const labels = card.querySelectorAll('label');
        let fixed = false;
        for (let i = 0; i < labels.length; i++) {
          const vn = this.quizVue(card);
          if (!vn) {   // 拿不到组件句柄 → 按目标顺序点一遍（带间隔）
            for (const k of want) { const ls = card.querySelectorAll('label'); if (ls[k]) { this.pickOpt(ls[k]); await sleep(340); } }
            return null;
          }
          const cur = this.selectedIdx(vn);
          const w = want.indexOf(i) >= 0, h = cur.indexOf(i) >= 0;
          if (w === h) continue;
          const ls = card.querySelectorAll('label');
          if (ls[i]) { this.pickOpt(ls[i]); fixed = true; }
          await sleep(340);   // 等 v-model 回写，否则下一次点击会用旧值覆盖本次结果
        }
        if (!fixed) break;
      }
      const vEnd = this.quizVue(card);
      await sleep(150);
      return vEnd ? this.selectedIdx(vEnd) : null;
    },
    // 答案文本 → 选项文本数组。注意多选题平台把 questionAnser 渲染成**数组字面量**
    // （形如 `[ "选项一", "选项二" ]`），所以要先剥掉方括号/引号再切分，否则入库会带脏字符。
    ansTokens(v) {
      return String(v == null ? '' : v)
        .replace(/[[\]]/g, '')
        .split(/[,，;；、\n]/)
        .map((x) => x.replace(/^["'\u201c\u201d\u300c\u300d\s]+|["'\u201c\u201d\u300c\u300d\s]+$/g, '').trim())
        .filter(Boolean);
    },
    // 答案入库：与自营/超星共用 gzal:quizbank，值 = 正确选项文本（多选用中文分号连接）
    saveQuizBank(stem, texts) {
      try {
        const key = clampText(stem, 200);
        const toks = [];
        for (const t of (texts || [])) for (const x of this.ansTokens(t)) toks.push(x);
        const ans = Array.from(new Set(toks)).join('；');
        if (!key || !ans) return;
        const bank = Store.get(K.QUIZBANK, {}) || {};
        if (bank[key] !== ans) {
          bank[key] = ans; Store.set(K.QUIZBANK, bank);
          log('info', '尚睿通弹题：答案已入库：' + clampText(key, 24) + ' → ' + clampText(ans, 40));
          Backend.quizSubmit(key, ans);   // v1.12.0：回传后端题库
        }
      } catch (e) { /* ignore */ }
    },
    async driveCard() {
      if (isPaused()) return;         // 🔴 v1.11.1：未授权/暂停中不驱动弹题卡片
      if (this._cardBusy) return;
      if (NOW() - this._cardAt < 1500) return;
      this._cardAt = NOW();
      const c = this.detectCard();
      if (!c) return;
      if (c.stem && c.stem !== this._cardStem) this._cardStem = c.stem;
      const clickBtn = () => { if (c.btn && is_visible(c.btn)) { try { c.btn.click(); return true; } catch (e) { /* ignore */ } } return false; };
      // ① 已判错（选项被锁 / 已显示正确答案）→ 抓正确答案入库 → 点「继续看课」
      if (c.locked || c.answer) {
        if (c.answer && c.stem) this.saveQuizBank(c.stem, [c.answer]);
        const txt = clampText(c.btn ? c.btn.textContent : '', 12);
        clickBtn();
        log('info', '尚睿通弹题：答错' + (c.answer ? '，正确答案「' + clampText(c.answer, 40) + '」已入库' : '') + '，点「' + (txt || '继续') + '」继续');
        this._cardStem = '';
        await sleep(1500);
        return;
      }
      // ② 未作答 → 题库命中按文本选；无命中走启发式（多选正向题全选 / 单选·是非按已试次数轮换）
      if (!c.opts.length) { clickBtn(); await sleep(1200); return; }
      const bankKey = clampText(c.stem, 200);
      let picks = c.opts.slice(0, 1), how = '盲选';
      try {
        const bank = Store.get(K.QUIZBANK, {}) || {};
        let known = '';
        // 🔴 v1.12.0：先问后端（服务端为权威），再回落到本地缓存
        if (bankKey) {
          const r = await Backend.quizAnswer(bankKey);
          if (r && r.found && r.answer) {
            known = r.answer;
            bank[bankKey] = known; Store.set(K.QUIZBANK, bank);
            log('info', '尚睿通弹题：后端题库命中 → ' + clampText(known, 40));
          }
        }
        if (!known && bankKey) known = bank[bankKey] || '';
        if (known) {
          const wants = this.ansTokens(known);
          const hit = c.opts.filter((o) => {
            const t = clampText(o.textContent, 120);
            return wants.some((x) => x && (t.includes(x) || x.includes(t)));
          });
          if (hit.length) { picks = hit; how = '题库'; }
          else {
            // 答案可能是「字母序列」（自营/超星写入的格式）→ 按字母定位选项
            const idxs = L2.Quiz.indexesFromAnswer(known, c.opts);
            if (idxs.length) { picks = idxs.map((i) => c.opts[i]).filter(Boolean); how = '题库(字母)'; }
          }
        }
      } catch (e) { /* ignore */ }
      if (how === '盲选') {
        // 单选/是非：按「已试次数」轮换选项（配合题库积累，最终会命中）；多选正向题：全选命中率最高
        const tries = this._quizTries || (this._quizTries = {});
        const k = bankKey || ('_' + c.opts.map((o) => clampText(o.textContent, 20)).join('|'));
        const n = tries[k] || 0;
        const neg = /不属于|不包括|不正确|错误的是|不能|不是/.test(c.stem || '');
        if (c.isMulti && !neg) { picks = c.opts.slice(); how = '多选全选'; }
        else { picks = [c.opts[Math.min(n, c.opts.length - 1)]]; tries[k] = (n + 1) % c.opts.length; how = '轮试第' + (n + 1) + '项'; }
      }
      const wantIdx = picks.map((p) => c.opts.indexOf(p)).filter((i) => i >= 0);
      // 关键：卡片组件会保留上次的答案，直接点会「点成全不选」→ 先清空再按目标差量点选，并回读组件确认
      const finalIdx = await this.applyPicks(c.w, wantIdx);
      log('info', '尚睿通弹题：作答「' + clampText(c.stem, 26) + '」→ ' + picks.map((p) => clampText(p.textContent, 12)).join(' / ') + '（' + how + '；实际选中下标 ' + (finalIdx ? finalIdx.join(',') : '未知') + '）');
      Stats.bump('quizzes');
      clickBtn();
      // ③ 等判定：答对（消息/卡片消失）→ 所选项入库；答错 → 抓正确答案入库并点继续
      this._cardBusy = true;
      try {
        for (let k = 0; k < 9; k++) {
          await sleep(700);
          if (/回答正确|恭喜/.test(this.quizMsg())) { this.saveQuizBank(c.stem, picks.map((p) => p.textContent)); log('info', '尚睿通弹题：回答正确 ✓'); this._cardStem = ''; return; }
          const c2 = this.detectCard();
          if (!c2) { this.saveQuizBank(c.stem, picks.map((p) => p.textContent)); log('info', '尚睿通弹题：答题卡已关闭（判为答对）'); this._cardStem = ''; return; }
          if (c2.locked || c2.answer) {
            if (c2.answer && c2.stem) this.saveQuizBank(c2.stem, [c2.answer]);
            log('warn', '尚睿通弹题：回答错误' + (c2.answer ? '，已抓正确答案「' + clampText(c2.answer, 40) + '」' : ''));
            try { if (c2.btn && is_visible(c2.btn)) c2.btn.click(); } catch (e) { /* ignore */ }
            this._cardStem = '';
            return;
          }
        }
        log('warn', '尚睿通弹题：提交后 6 秒内未见判定结果');
      } finally { this._cardBusy = false; }
    },
    // 视频播完后的「完成遮罩」（平台标注「恭喜您，已完成本节内容！」）：
    // 页面切换资源时会出现十几秒的过渡媒体，其 ended 也会触发，不能单凭 ended 判完成 → 以遮罩为首要依据
    endedMaskShown() {
      for (const sel of CFG.selectors.yanxiuEndedMask) {
        const m = qs(sel);
        if (m && is_visible(m)) return true;
      }
      return false;
    },
    // 遮罩里的平台推进入口（p.next「点击观看下一节课程：xxx」）
    endedNextBtn() {
      for (const sel of CFG.selectors.yanxiuEndedNext) {
        const b = qs(sel);
        if (b && is_visible(b)) return b;
      }
      return null;
    },
    // 平台自己的任务状态（挂在 `.player-wrapper` 的 Vue 实例上，是「完成」的权威依据）：
    //   isTaskCompleted = totalTime && durationTime >= totalTime（阅读/观看计时由心跳累加）
    //   player.name：MSEplayer 视频 / doc-player 文档(Flash) / web-player 网页(iframe) / 图片
    //   percentage：durationTime/totalTime*100；progressRate：视频当前秒数
    // 从任意文档里找承载任务状态的 Vue 实例（Vue2 挂在 __vue__，Vue3 走 __vueParentComponent.proxy）
    _pickPlayerVM(doc) {
      let els = [];
      try { els = doc.querySelectorAll('.player-wrapper'); } catch (e) { return null; }
      for (const el of els) {
        const v = el.__vue__ || (el.__vueParentComponent && el.__vueParentComponent.proxy);
        if (!v) continue;
        if (typeof v.totalTime === 'number' || typeof v.durationTime === 'number'
          || typeof v.isTaskCompleted === 'boolean' || typeof v.percentage === 'number') return v;
      }
      return null;
    },
    taskState() {
      try {
        // ① 本文档；② 同源 iframe 兜底（阅读器常嵌套一层）
        let v = this._pickPlayerVM(document);
        if (!v) {
          for (const f of qsa('iframe')) {
            let d = null;
            try { d = f.contentDocument; } catch (e) { d = null; }
            if (!d) continue;
            v = this._pickPlayerVM(d);
            if (v) break;
          }
        }
        if (!v) return null;
        return {
          player: (v.player && v.player.name) || '',
          path: String((v.resource && v.resource.filePath) || ''),
          completed: !!v.isTaskCompleted,
          percentage: (typeof v.percentage === 'number') ? v.percentage : 0,
          durationTime: (typeof v.durationTime === 'number') ? v.durationTime : 0,
          totalTime: (typeof v.totalTime === 'number') ? v.totalTime : 0,
          progressRate: (typeof v.progressRate === 'number') ? v.progressRate : 0,
        };
      } catch (e) { return null; }
    },
    // 面板「阅读进度」文案：已读时长/要求总时长（+百分比），与视频的「观看时长/总时长」对齐。
    // 读不到平台计时时退回本地停留时长，避免进度栏空着。
    readText(videoActive) {
      const rs = this.taskState();
      if (rs && (rs.durationTime > 0 || rs.totalTime > 0 || rs.completed)) {
        const pct = rs.totalTime > 0 ? Math.min(100, Math.round(rs.durationTime / rs.totalTime * 100)) : Math.round(rs.percentage || 0);
        return fmt(rs.durationTime) + '/' + (rs.totalTime > 0 ? fmt(rs.totalTime) : '--:--')
          + '（' + pct + '%）' + (rs.completed ? ' ✓' : '');
      }
      // 读不到平台状态：用本地停留时长兜底（阅读期间 _ 由 advanceRes 维护）
      const since = this._docSince;
      if (!videoActive && since) return '已停留 ' + fmt(Math.round((NOW() - since) / 1000)) + '（无平台计时）';
      return '-';
    },
    // 模拟人工翻阅（PDF/文档/网页资源）：优先滚动同源内容；跨域 iframe 就掀掉透明遮罩并滚动外层容器。
    // 注：平台完成判定只看「阅读心跳时长」，翻页只是让人工痕迹更自然、并应对需要交互的阅读器。
    pageTurn() {
      let acted = false;
      try {
        // ① 同源 iframe 内滚动（PDF.js / 自研阅读器常是同源或已被降域）
        for (const f of qsa('iframe.iframe, .iframe-wrapper iframe, .doc-wrapper iframe')) {
          let d = null;
          try { d = f.contentDocument; } catch (e) { d = null; }
          if (!d) continue;
          const t = d.scrollingElement || d.documentElement;
          if (!t || t.scrollHeight <= t.clientHeight + 4) continue;
          const before = t.scrollTop;
          t.scrollTop = before + Math.max(240, Math.round(t.clientHeight * 0.9));
          if (t.scrollTop <= before + 4) t.scrollTop = 0;   // 到底 → 回到顶部继续累计时长
          log('info', '尚睿通：模拟翻页 → 文档滚动至 ' + Math.round(t.scrollTop) + ' / ' + t.scrollHeight);
          acted = true;
          break;
        }
        // ② 跨域 iframe（尚睿通文档多为 preview.yanxiu.com 预览器）：掀掉挡在文档上的透明遮罩
        //    （.iframeMask, opacity:0 z-index:999），否则人工也无法操作；跨域内容本身无法注入翻页
        const mask = qs('.iframeMask');
        if (mask && getComputedStyle(mask).display !== 'none') {
          mask.style.display = 'none';
          log('info', '尚睿通：已移除文档遮罩 .iframeMask（便于阅读/交互）');
          acted = true;
        }
        const xo = qs('iframe.iframe, .iframe-wrapper iframe');
        if (xo && !acted) {
          log('info', '尚睿通：文档为跨域预览器（preview.yanxiu.com），无法注入翻页；平台按阅读时长计完成，保持打开即可');
        }
        // ③ 兜底：滚动外层可滚动容器（图片/长文档），并在文档区发一次滚轮事件
        if (!acted) {
          const box = qs('.doc-wrapper, section.media, .app-content-wrap');
          if (box) {
            const before = box.scrollTop;
            box.scrollTop = before + Math.max(240, Math.round(box.clientHeight * 0.9));
            if (box.scrollTop <= before + 4) box.scrollTop = 0;
            log('info', '尚睿通：模拟翻页 → 外层容器滚动至 ' + Math.round(box.scrollTop));
            acted = true;
          }
          if (xo) {
            try {
              const r = xo.getBoundingClientRect();
              xo.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 600, clientX: Math.round(r.left + r.width / 2), clientY: Math.round(r.top + r.height / 2) }));
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }
      this._docTurnAt = NOW();
      return acted;
    },
    // 资源推进：视频/文档完成 → 下一个资源；全部完成 → 回项目页
    async advanceRes() {
      if (isPaused()) return;      // 🔴 v1.11.1：未授权/暂停中一律不推进资源（本函数会点击左侧目录）
      const res = this.detectResItems();
      if (!res.length) return;
      const cur = res.find((x) => x.active) || res[0];
      if (this._resName !== cur.name) {
        this._resName = cur.name; this._docSince = 0; this._docStartDur = -1; this._docTurnAt = 0;
        log('info', '尚睿通学习页：当前资源「' + cur.name + '」（' + (cur.type === 'doc' ? '文档/拓展资源' : '视频') + '）');
      }
      const ps = this.taskState();
      // 播放器是否已真正切到新资源（filePath 变化）→ 重置计时并留 6 秒稳定期。
      // 否则切换瞬间会读到「上一个资源的状态」（如已完成 100%）→ 误判新资源也完成而直接跳过。
      if (ps && ps.path && ps.path !== this._resPath) {
        this._resPath = ps.path;
        this._docSince = 0; this._docStartDur = -1; this._resSettleUntil = NOW() + 6000;
      }
      if (NOW() < (this._resSettleUntil || 0)) return;   // 刚切资源，等状态稳定后再判定
      let done = false, why = '';
      if (cur.type === 'doc' || cur.type === 'other') {
        if (!this._docSince) { this._docSince = NOW(); this._docStartDur = ps ? ps.durationTime : -1; }
        const el = NOW() - this._docSince;
        if (ps && ps.completed) { done = true; why = '平台判定已完成（' + ps.percentage + '%）'; }
        else if (ps && ps.totalTime > 0 && el >= (CFG.yanxiuDocStallMs || 45000)
          && this._docStartDur >= 0 && ps.durationTime <= this._docStartDur) {
          // 平台计时没增长（典型：文档要 Flash，本机无法播放 → 心跳不启动）→ 不能死等
          done = true; why = '平台计时未增长（' + ps.durationTime + 's/' + ps.totalTime + 's），跳过该资源';
          Notifier.banner('尚睿通：拓展资源「' + clampText(cur.name, 20) + '」平台计时未增长（可能需 Flash 阅读器），已跳过并继续后面的活动。', { level: 'warn', ttl: 20000, force: true });
        } else if (el >= (CFG.yanxiuDocMaxMs || 300000)) {
          done = true; why = '等待超时（' + Math.round(el / 1000) + 's）跳过';
        } else if (!ps && el >= (CFG.yanxiuDocDwellMs || 45000)) {
          done = true; why = '停留 ' + Math.round(el / 1000) + 's（读不到平台状态）';
        }
        // 阅读期间模拟人工翻页/滚动
        if (!done && NOW() - this._docTurnAt >= (CFG.yanxiuPageTurnMs || 7000)) this.pageTurn();
        // 进度诊断（每 15 秒一次，便于定位卡住原因）
        if (!done && NOW() - this._docWarnAt >= 15000) {
          this._docWarnAt = NOW();
          log('info', '尚睿通：阅读中… 已停留 ' + Math.round(el / 1000) + 's' + (ps ? '；平台进度 ' + ps.percentage + '%（' + ps.durationTime + 's/' + ps.totalTime + 's，' + (ps.player || '?') + '）' : '；读不到平台状态'));
        }
      } else if (this.endedMaskShown()) {
        done = true; why = '完成遮罩';
      } else if (ps && ps.completed) {
        done = true; why = '平台判定已完成（' + ps.percentage + '%）';
      } else {
        const v = L2.currentVideo();
        if (v && isFinite(v.duration) && v.duration > 0) {
          const ratio = v.currentTime / v.duration;
          // 视频真的播到末尾：≥98% 直接算完成；ended 但时长过短（过渡媒体）不算
          if (ratio >= (CFG.yanxiuDoneRatio || 0.98)) { done = true; why = '进度 ' + Math.round(ratio * 100) + '%'; }
          else if (v.ended && v.duration >= 60) { done = true; why = '播放结束'; }
        }
      }
      if (!done) return;
      if (NOW() - this._resAt < 6000) return;
      // ① 首选：完成遮罩里的平台推进入口（左侧目录项此时点了不生效，必须走这个入口）
      const nb = this.endedNextBtn();
      if (nb) {
        this._resAt = NOW(); this._docSince = 0; this._resName = '';
        log('info', '尚睿通：资源「' + cur.name + '」已完成（' + why + '）→ 点「' + clampText(nb.textContent, 26) + '」进入下一节');
        try { nb.click(); } catch (e) { /* ignore */ }
        return;
      }
      // ② 兜底：切到左侧目录里的下一个资源。
      // ⚠ 实测：点击处理器绑在 `.res-name`（p）上，点外层 `.content-wrapper` 无效（点了不切、静默失败）。
      this._resAt = NOW(); this._docSince = 0; this._docStartDur = -1; this._resName = '';
      const idx = res.indexOf(cur);
      const next = res[idx + 1];
      if (next) {
        log('info', '尚睿通：资源「' + cur.name + '」完成（' + why + '）→ 下一个「' + next.name + '」');
        const tgt = next.el.querySelector('.res-name') || next.el.querySelector('.content-wrapper') || next.el;
        try { tgt.click(); } catch (e) { /* ignore */ }
      } else {
        log('info', '尚睿通：本节全部资源完成 → 返回项目详情页');
        this.backToMember();
      }
    },

    /* ============ 三、问卷页（grain/guide/<id>/evaluate/detail）============ */
    // 每题 = .train-detail（题干 .select-title 含 [单选题]/[多选题]；选项 label.ivu-radio-wrapper|ivu-checkbox-wrapper）
    surveyQuestions() {
      const out = [];
      for (const d of qsa(CFG.selectors.yanxiuEvaQ.join(','))) {
        const tEl = qs(CFG.selectors.yanxiuEvaTitle.join(','), d);
        const stem = clampText(tEl ? tEl.textContent : '', 200).replace(/\s+/g, ' ').trim();
        let opts = [];
        for (const sel of CFG.selectors.yanxiuEvaOpt) { try { const l = d.querySelectorAll(sel); if (l.length) { opts = Array.from(l); break; } } catch (e) { /* ignore */ } }
        const picked = opts.some((o) => /-checked/.test(String(o.getAttribute('class') || '')) || (() => { const i = o.querySelector('input'); return !!(i && i.checked); })());
        out.push({ el: d, stem, opts, picked, isMulti: /\[多选题\]/.test(stem) || opts.some((o) => /ivu-checkbox-wrapper/.test(String(o.getAttribute('class') || ''))) });
      }
      return out;
    },
    // 「正面选项」= 命中正面词且不含负面词；否则退回第一项（问卷期望的是好评价）
    pickPositive(q) {
      const pos = q.opts.filter((o) => {
        const t = clampText(o.textContent, 60);
        const bad = CFG.surveyNegativeWords.some((w) => t.includes(w));
        return !bad && CFG.surveyPositiveWords.some((w) => t.includes(w));
      });
      if (q.isMulti) {
        const arr = pos.length ? pos : q.opts.slice(0, 1);
        // 多选排除「其他」
        return arr.filter((o) => !/其他/.test(clampText(o.textContent, 30)));
      }
      return [(pos[0] || q.opts[0])];
    },
    async driveSurvey() {
      // 注意：这里只认「全局会话暂停」（面板/菜单/会话守卫），不认 L2 的 _pauseFlag
      // —— 路由在进入问卷页时会主动 L2.pause()（问卷页不需要播放），若用 isPaused() 会把自己挡掉。
      if (!CFG.enabled) return false;
      if (Session.data && Session.data.paused) return false;
      if (AuthGate.ok !== true) return false;     // 🔴 v1.11.1：未授权一律不动手（问卷会改平台状态）
      if (SessionGuard.triggered) return false;
      if (NOW() - this._surveyAt < 2500) return false;
      this._surveyAt = NOW();
      const qs_ = this.surveyQuestions();
      if (!qs_.length) {
        // 页面没渲染出题目（已提交跳转 / 加载失败）→ 连续几次就退回项目页，别在这儿干等
        this._surveyTries = (this._surveyTries || 0) + 1;
        log('info', '尚睿通问卷：页面上未找到题目（第 ' + this._surveyTries + ' 次，可能已提交）');
        if (this._surveyTries >= 3) {
          this._surveyTries = 0;
          log('warn', '尚睿通问卷：连续 3 次识别不到题目 → 判定无需作答，返回项目页');
          this.backToMember();
        }
        return false;
      }
      // 🔴 v1.13.3 只读态识别：问卷已完成时平台只给「查看」，页面 10 题全部 disabled + checked，
      //   也没有「提交」按钮。旧逻辑会一直重试作答，永远不满足提交条件 → 整课卡死在这里。
      const submitBtn = qsa(CFG.selectors.yanxiuEvaSubmit.join(',')).find(is_visible);
      const allPicked0 = qs_.every((q) => q.picked);
      const allLocked = qs_.every((q) => q.opts.length
        ? q.opts.every((o) => /-disabled/.test(String(o.getAttribute('class') || ''))
          || ((o.querySelector('input') || {}).disabled === true))
        : true);
      if (allPicked0 && (allLocked || !submitBtn)) {
        log('info', '尚睿通问卷：问卷已完成（答案全为只读、无「提交」按钮）→ 不再作答，直接收尾进下一门');
        this._surveyTries = 0;
        this.finishCourse('调查问卷已完成（只读）');
        return false;
      }
      const bank = Store.get(K.SURVEY, {}) || {};
      let answered = 0, changed = false;
      for (const q of qs_) {
        if (q.picked) continue;
        const key = clampText(q.stem, 200);
        let picks = [];
        const known = key ? bank[key] : '';
        if (known) {
          const wants = String(known).split(/[;；,，、]/).map((s) => clampText(s, 40)).filter(Boolean);
          picks = q.opts.filter((o) => { const t = clampText(o.textContent, 120); return wants.some((x) => x && t.includes(x)); });
        }
        if (!picks.length) {
          picks = this.pickPositive(q);
          if (key) { bank[key] = picks.map((p) => clampText(p.textContent, 60)).join('；'); changed = true; }
        }
        for (const p of picks) { try { p.click(); answered++; } catch (e) { /* ignore */ } }
      }
      if (changed) { Store.set(K.SURVEY, bank); log('info', '尚睿通问卷：已记住本轮答案（下次直接复用）'); }
      if (answered) { log('info', '尚睿通问卷：本轮作答 ' + answered + ' 项'); await sleep(800); }
      const after = this.surveyQuestions();
      if (after.length && after.every((q) => q.picked)) {
        const btn = qsa(CFG.selectors.yanxiuEvaSubmit.join(',')).find(is_visible);
        if (btn) {
          log('info', '尚睿通问卷：全部作答完成 → 点「提交」');
          try { btn.click(); } catch (e) { /* ignore */ }
          Stats.bump('quizzes');
          await sleep(2000);
          const ok = qsa('.ivu-modal-footer button, .ivu-modal-confirm-footer button, .el-message-box button')
            .find((b) => is_visible(b) && /确定|确认|提交|是/.test(clampText(b.textContent, 6)));
          if (ok) { try { ok.click(); log('info', '尚睿通问卷：已点确认框「' + clampText(ok.textContent, 6) + '」'); } catch (e) { /* ignore */ } await sleep(1500); }
          this._surveyTries = 0;
          await sleep(1500);
          this.backToMember();
          return true;
        }
      }
      this._surveyTries = (this._surveyTries || 0) + 1;
      if (this._surveyTries <= 40) {
        setTimeout(() => { try { this.driveSurvey(); } catch (e) { /* ignore */ } }, 1500);
      } else {
        // 兜底防卡死：折腾 40 次仍提交不了 → 退回项目页/学习中心，宁可少刷也不能停在这
        this._surveyTries = 0;
        log('warn', '尚睿通问卷：多次尝试仍无法提交（页面可能异常）→ 退回，避免卡死');
        this.finishCourse('问卷无法提交，已跳过');
      }
      return false;
    },
  };

  /* ================================================================
   * 12.9 自营(-33) 平台状态读取（Vue2 播放页）
   *   实测（2026-10-10，读自营 player chunk 3a3a109e + 页面 Vue 实例）：
   *     · 当前活动组件上有：summaryTime（「阅读提要」**剩余**秒数，字符串）
   *       / thisActIsFinish（'Y'|'N' 平台完成标记）/ taskId / taskName / actTypeId / playershowFile
   *     · 「阅读提要」= 平台要求先阅读提要内容 N 秒才允许播放视频，页面提示
   *       「请您阅读此提要内容，N 秒后将自动进入视频学习！」，倒计时期间播放器被 pause，归零才 goopeningplayer()
   *   → 与尚睿通「阅读进度」同类；面板显示「已读/要求(提要时长)」。
   *   注：视频本身的要求就是「播完」（视频进度行已呈现 currentTime/duration），无需重复显示。
   * ================================================================ */
  const Self = {
    _sum: { taskId: '', peak: 0 },
    _vmCache: { key: '', at: 0, vm: null },
    // 深度优先找「当前活动」的 Vue 组件（同时具备 summaryTime 与 thisActIsFinish）
    // 结果按 URL 缓存 3s（切活动时 actId 变化 → URL 变 → 缓存自动失效），避免主循环每秒都遍历 Vue 树
    vm() {
      const key = location.href;
      if (this._vmCache.vm && this._vmCache.key === key && NOW() - this._vmCache.at < 3000) return this._vmCache.vm;
      const found = this._walkVm();
      this._vmCache = { key, at: NOW(), vm: found };
      return found;
    },
    _walkVm() {
      const roots = [qs('#app'), qs('.app-main'), qs('.prism-player'), document.body];
      const seen = { n: 0 };
      const walk = (vm, d) => {
        if (!vm || d > 14 || seen.n > 800) return null; seen.n++;
        try { if (typeof vm.summaryTime !== 'undefined' && typeof vm.thisActIsFinish !== 'undefined') return vm; } catch (e) { /* ignore */ }
        const ch = vm.$children || [];
        for (let i = 0; i < ch.length; i++) { const r = walk(ch[i], d + 1); if (r) return r; }
        return null;
      };
      for (const r of roots) { if (r && r.__vue__) { const f = walk(r.__vue__, 0); if (f) return f; } }
      return null;
    },
    state() {
      const c = this.vm(); if (!c) return null;
      const left = parseInt(c.summaryTime, 10) || 0;          // 剩余秒数
      const taskId = String(c.taskId || '');
      // 要求总时长 = 本次阅读提要的初始值；用峰值跟踪（切活动时重置）
      if (taskId !== this._sum.taskId) this._sum = { taskId, peak: left };
      if (left > this._sum.peak) this._sum.peak = left;
      return {
        left, total: this._sum.peak,
        finish: String(c.thisActIsFinish || '') === 'Y',
        taskName: String(c.taskName || ''), actTypeId: String(c.actTypeId || ''),
      };
    },
    // 面板「阅读提要」行文案：已读/要求(提要秒数)（百分比）✓；无提要时返回 '-'（交给「视频进度」行）
    readText() {
      const st = this.state();
      if (!st || st.total <= 0) return '-';
      const read = Math.max(0, st.total - st.left);
      const pct = Math.round(read / st.total * 100);
      return fmt(read) + '/' + fmt(st.total) + '（' + pct + '%）' + (st.left <= 0 ? ' ✓' : '');
    },
  };

  /* ================================================================
   * 13. L0 · 顶层调度器（课程列表页：队列构建 → 进入课程 → 串行调度）
   * ================================================================ */
  const L0 = {
    // ============ 统一课程完成模型（v1.7.69）============
    // status：
    //   done          —— 平台确认全部完成（如「必修活动 X/X」或进度 100%）
    //   auto-done     —— 脚本可自动的部分（视频/问卷/平台任务点）已全部完成，页面可能仍显示「未通过」
    //                    （因为含人工项，或合作平台不显示活动完成情况）→ 视为"对自动化而言已完成"，不再重复进入
    //   pending-manual—— 明确含作业/测验类考核需人工（脚本不代做）
    // 额外字段：by 平台来源 / acts 活动数快照{total,correct} / manualLeft 人工项清单 / reverify 末尾复验标记 / lastVerifiedAt
    markCourse(name, patch) {
      if (!name) return;
      const courses = Store.get(K.COURSES, {});
      const prev = courses[name] || {};
      courses[name] = Object.assign({}, prev, patch || {}, { lastVerifiedAt: NOW() });
      Store.set(K.COURSES, courses);
      // 后端学习上报（前后端模式；失败不阻断学习）。done/auto-done/pending-manual 都上报，供后台区分三类进度
      if (patch && (patch.status === 'done' || patch.status === 'auto-done' || patch.status === 'pending-manual')) {
        Backend._reportMark(name, patch);
      }
    },
    markDone(name, opts) {
      this.markCourse(name, Object.assign({ status: 'done', progress: 100, reverify: 1 }, opts || {}));
      log('info', `L0：课程「${name}」标记 done（平台确认完成）`);
    },
    // 脚本可自动部分完成（可能仍有人工项）。acts 为活动数快照，用于后续判断"是否出现新的可自动任务"。
    // 若上次已是 auto-done（说明这次是「末尾复验」跑完）→ 打上 reverify=1，之后不再重复复验。
    markAutoDone(name, opts) {
      const o = opts || {};
      const prev = Store.get(K.COURSES, {})[name] || {};
      const reverify = (prev.status === 'auto-done') ? 1 : (o.reverify != null ? o.reverify : (prev.reverify || 0));
      this.markCourse(name, {
        status: 'auto-done', by: o.by || prev.by || 'self',
        manualLeft: (o.manualLeft && o.manualLeft.length) ? o.manualLeft : (prev.manualLeft || []),
        acts: o.acts || prev.acts || null,
        reverify,
        autoDoneAt: NOW(),
      });
      log('info', `L0：课程「${name}」标记 auto-done（可自动项已全部完成${(o.manualLeft && o.manualLeft.length) ? '，剩人工：' + o.manualLeft.join('、') : ''}${reverify ? '，已复验' : ''}）`);
    },
    // 🔴 自营「课程学习页」判定（v1.7.73）
    //   study.gzteacher.com/study/home（章→节→活动 列表）与 /study/study（单个活动页）**不是课程列表页**：
    //   页面上的「去学习>」是**活动**入口（互动研讨/问卷/视频…），若被 findStudyButtons 当成课程卡，
    //   buildQueue 会建出「N 门课」的假队列 → L0.enterNextCourse 反复"进入课程"（其实是点开单个活动）
    //   → 活动页 L2 跳过 → 回到本页 → 再次入队 → 死循环（实测症状：一直重复进互动研讨、永远到不了问卷）。
    //   本页应交给 L1（活动列表）与 L2（活动页）处理。
    isSelfStudyPage() {
      return /^study\.gzteacher\.com$/i.test(HOST) && /^\/study\/(home|study)\b/.test(location.pathname);
    },
    findStudyButtons() {
      if (this.isSelfStudyPage()) return [];   // 自营课程学习页上的「去学习」是活动入口，不是课程入口
      return qsa('a,button,div[role="button"]').filter((e) => {
        if (!is_visible(e)) return false;
        const t = clampText(e.textContent, 20);
        return CFG.coursePageHints.some((h) => t.includes(h));
      });
    },
    // 课程进度%：优先读 Ant 圆形进度的专属文本 `ant-progress-text`（值干净，如 "91.66…%"）。
    // 🔴 不能直接对整卡文本用 `(\d{1,3})\s*%`：卡片里「已完成必修活动 11/ 12」会与小数的百分比
    //    粘连成 "11/ 1291.666…%"，被误读为 666% → 课程被误判「已完成」→ 不进队列 → 学习不启动（v1.9.4 修复）。
    detectProgress(card) {
      const pt = qs('[class*="ant-progress-text"]', card);
      const raw = pt && pt.textContent ? clampText(pt.textContent, 40) : '';
      let m = raw.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
      if (m) return Math.min(100, Math.round(parseFloat(m[1])));
      // 兜底：整卡文本；>100 视为粘连误读 → 返回未知（交由「必修活动 X/Y」判定）
      m = clampText(card.textContent, 300).match(/(\d{1,3}(?:\.\d+)?)\s*%/);
      if (!m) return null;
      const v = Math.round(parseFloat(m[1]));
      return (v >= 0 && v <= 100) ? v : null;
    },
    // 从课程卡文本解析总学时（如「10学时」「7 学时」「10.5学时」）
    parseHours(cardText) {
      const m = (cardText || '').match(/(\d+(?:\.\d+)?)\s*学时/);
      return m ? parseFloat(m[1]) : 0;
    },
    // 解析课程卡的「已完成必修活动 X / Y」（学习中心卡片中间进度区）。
    // 返回 { done: 完成数, total: 总数 }；无此信息返回 null。
    detectRequiredActivities(card) {
      const txt = clampText(card.textContent, 300);
      const m = txt.match(/已完成必修活动\s*(\d+)\s*\/\s*(\d+)/);
      if (!m) return null;
      return { done: parseInt(m[1], 10), total: parseInt(m[2], 10) };
    },
    // 从「去学习」按钮的 React fiber 链读取课程数据（studyUrl / lcmsSystemId / termCrsId / termCrsName / chooseStudyStatus）
    // 实测（2026-10-08）：这些字段直接挂在学习中心课程卡组件的 memoizedProps.data 上，无需调接口。
    readCourseData(btn) {
      try {
        const fk = Object.keys(btn).find((k) => k.indexOf('__reactFiber') === 0);
        if (!fk) return null;
        let cur = btn[fk], n = 0;
        const out = {};
        while (cur && n < 40) {
          const mp = cur.memoizedProps;
          if (mp) {
            // 完整课程 data 对象（含 studyUrl/termCrsName/lcmsSystemId 等），字段最全、最权威
            if (mp.data && typeof mp.data === 'object' && !Array.isArray(mp.data) && mp.data.studyUrl && !out.data) out.data = mp.data;
            // 标量字段：既可能在 mp 顶层，也可能嵌在 data 子对象里
            for (const k of Object.keys(mp)) {
              const v = mp[k];
              if (v && typeof v === 'object' && !Array.isArray(v)) {
                for (const kk of Object.keys(v)) {
                  const vv = v[kk];
                  if (typeof vv === 'string' && vv && /studyUrl|lcmsSystemId|termCrsId|termCrsCode|termCrsName|chooseStudyStatus|slctCrsId/.test(kk) && out[kk] == null) {
                    out[kk] = vv;
                  }
                }
              }
            }
          }
          cur = cur.return; n++;
        }
        return out.studyUrl ? out : null;
      } catch (e) { return null; }
    },
    // 用直接调用 fiber 上「无参 onClick」的方式进入课程（绕过 React 合成 click 的 isTrusted 限制）。
    // 实测（2026-10-08）：学习中心「去学习」按钮的 fiber 链上有一个无参箭头函数 `()=>N(y,a)`，
    // 它用闭包捕获了 studyUrl(y) 与课程 data(a)，直接调用即可触发跳转（内部做 quickLogin SSO POST + 新标签页）。
    // 返回 true 表示已发起跳转；false 表示未找到可调用的函数。
    invokeStudyHandler(target) {
      try {
        const fk = Object.keys(target).find((k) => k.indexOf('__reactFiber') === 0);
        if (!fk) return false;
        let cur = target[fk], n = 0;
        while (cur && n < 40) {
          const mp = cur.memoizedProps;
          if (mp && typeof mp.onClick === 'function' && mp.onClick.length === 0) {
            // 无参 onClick = 业务跳转函数（`()=>N(y,a)`），非 Ant 的事件包装（包装函数带 1 个 event 形参）
            log('info', 'L0：直接调用无参 onClick 触发跳转');
            mp.onClick();
            return true;
          }
          cur = cur.return; n++;
        }
        return false;
      } catch (e) { log('error', 'L0：调用无参 onClick 失败: ' + e.message); return false; }
    },
    courseCardOf(btn) {
      let el = btn;
      for (let i = 0; i < 8 && el; i++) {
        const p = el.parentElement; if (!p) break;
        if (clampText(p.textContent, 400).length > 40 && qsa('a,button', p).length <= 6) return p;
        el = p;
      }
      return btn.parentElement || btn;
    },
    // 检测"选课待缴费 / 未开通"状态：课程卡上出现缴费类文字且无"去学习"入口
    detectPendingPayment() {
      if (!CFG.pendingPaymentEnabled) return null;
      const texts = CFG.pendingPaymentTexts || [];
      if (!texts.length) return null;
      // 只在「学习中心」页做待缴费判定。课单页(/source/record)是选课记录表，
      // 其状态列展示「已开课/待缴费」等真实状态，且带「查看」入口（非「去学习」），
      // 若在此页扫描会误判（筛选 tab「待缴费/待开课」+ 表格状态列都可能命中）。
      if (/\/source\/record/.test(location.href)) return null;
      // 若页面上已存在可点击的学习入口，说明已开通，不属于待缴费态
      if (this.findStudyButtons().length) return null;
      const hits = [];
      for (const el of qsa('div,span,p,td,li,a,button')) {
        if (!is_visible(el)) continue;
        const t = clampText(el.textContent, 60);
        if (t.length < 2 || t.length > 60) continue;
        if (el.querySelector && el.querySelector('video')) continue; // 播放页元素排除
        // 排除筛选 tab / 导航标签（"待缴费/待开课/已开课"是课单页的筛选条件，非课程状态）
        // 课程超市筛选 tab 用 CSS Modules 生成 class（如 _item_w5jv3_183/_choosed_w5jv3_187），不含"tab/filter"字样，需单独排除
        if (el.closest && el.closest('.ant-tabs, [role="tablist"], [class*="tab"], [class*="Tab"], [class*="filter"], [class*="Filter"], [class*="_item_"], [class*="_choosed_"], [class*="_tab_"], [class*="_filter_"]')) continue;
        // 只认"叶子级"小文本节点，避免整页大容器误命中
        if (el.children && el.children.length > 4) continue;
        if (texts.some((kw) => t.includes(kw))) {
          hits.push({ keyword: texts.find((kw) => t.includes(kw)), text: t, selector: make_selector(el) });
          if (hits.length >= 8) break;
        }
      }
      return hits.length ? hits : null;
    },

    buildQueue() {
      const btns = this.findStudyButtons();
      if (!btns.length) {
        // 诊断：学习中心页「去学习」按钮未命中时的兜底重查（用更稳的选择器直接找 ant 主按钮）
        const raw = qsa('button.ant-btn.ant-btn-primary').filter((e) => is_visible(e) && /去学习|继续学习|进入学习|开始学习/.test(clampText(e.textContent, 20)));
        if (raw.length) {
          log('warn', `buildQueue：通用选择器未命中但找到 ${raw.length} 个「去学习」按钮，改用 ant 主按钮兜底`);
          this._fallbackBtns = raw;
        } else {
          return false;
        }
      }
      const srcBtns = (this._fallbackBtns && this._fallbackBtns.length) ? this._fallbackBtns : btns;
      this._fallbackBtns = null;
      const queue = [];
      const allCourses = [];             // v1.16.5：学习中心本期全部课程（含已完成/未开始/待人工）→ 台账全量上报
      const seen = new Set();
      const unadapted = [];              // 🚧 未适配平台课程（不入队，仅记录 + 提示人工）
      const unadaptedSeen = new Set();
      const known = Store.get(K.COURSES, {});
      srcBtns.forEach((b) => {
        // 课程数据优先从 fiber 读（termCrsName 最权威），DOM 标题兜底（修复"去学习"被误当课程名的 bug）
        const data = this.readCourseData(b);
        const lcmsId = data && data.lcmsSystemId;
        const card = this.courseCardOf(b);
        const cardText = clampText(card.textContent, 400);
        const nameEl = qs('h1,h2,h3,h4,[class*="title"],[class*="name"]', card) || card;
        const domName = clampText(nameEl.textContent, 60);
        const name = (data && data.termCrsName) ? data.termCrsName : domName;
        if (!name || name === '去学习' || seen.has(name)) return;
        seen.add(name);
        const prog = this.detectProgress(card);
        const st = known[name];
        // 卡片信号：进度 100% 或「已完成必修活动 X/X」= 平台确认全部完成
        const reqAct = this.detectRequiredActivities(card);
        const pageFullyDone = (prog != null && prog >= 100) || !!(reqAct && reqAct.total > 0 && reqAct.done >= reqAct.total);
        const pageIncomplete = /未通过|未开始|未完成|学习中/.test(cardText) || (prog != null && prog < 100);
        // 活动数快照（自营 fiber 有 actCount/correctActCount；合作平台为 null）
        const actsSnap = (data && data.actCount != null && data.correctActCount != null)
          ? { total: parseInt(data.actCount, 10), correct: parseInt(data.correctActCount, 10) } : null;
        const hours = this.parseHours(cardText);
        // v1.16.5：无论这门课是否已完成/是否入队，都先记入「本期全部课程」，供学习台账全量上报。
        // 状态优先级：本地已知 done/auto-done/pending-manual > 页面 100% = done > 有进度 = learning > not_started
        const recStatus0 = (st && st.status)
          ? (st.status === 'pending-manual' ? 'pending_manual' : st.status)
          : (pageFullyDone ? 'done' : ((prog != null && prog > 0) ? 'learning' : 'not_started'));
        // 🔴 试用额度安全：只有「本地脚本确认完成」（K.COURSES 里 done/auto-done）才算 auto_finished；
        //    页面显示 100% 但脚本没亲手学完的课，只记 done，不占试用额度。
        const recAuto0 = !!(st && (st.status === 'done' || st.status === 'auto-done'));
        // v1.16.6 台账溯源：已完成但没有「脚本学过」凭据（安装脚本前人工学完 / 换设备清过记录）
        //   → 记为人工学时，由后端判定 source='manual'。⚠ 仅展示，绝不参与试用额度（额度只认 auto_finished）。
        const recDone0 = (recStatus0 === 'done' || recStatus0 === 'auto-done');
        allCourses.push({
          term_crs_id: (data && data.termCrsId) || name,
          course_name: name,
          org_id: lcmsId || null,
          total_hours: hours,
          auto_done_hours: recAuto0 ? hours : 0,
          manual_done_hours: (recDone0 && !recAuto0) ? hours : 0,
          status: recStatus0,
          auto_finished: recAuto0,
        });
        if (st && st.status === 'auto-done') {
          // 🔴 auto-done：**不再**因页面「未通过/未满 100%」被清除（含人工项、合作平台不显示活动完成，
          //    页面本来就永远显示「未通过」——这正是旧逻辑死循环的根源）。
          if (pageFullyDone) { this.markDone(name, { by: st.by }); return; }   // 平台已确认 → 升级为 done
          log('info', `L0：课程「${name}」此前已 auto-done（剩人工${(st.manualLeft && st.manualLeft.length) ? '：' + st.manualLeft.join('、') : ''}）→ 跳过，不再重复进入`);
          return;
        }
        if (st && st.status === 'pending-manual') {
          if (pageFullyDone) { this.markDone(name, { by: st.by }); return; }
          return;   // 明确含作业/测验类考核 → 不入队、也不再因「未通过」清除标记
        }
        if (st && st.status === 'done') {
          if (pageFullyDone) return;
          if (pageIncomplete) {
            // 页面明确未完成 → 视为旧版误标记，清除后重新入队核验
            delete known[name];
            log('warn', `L0：课程「${name}」标记 done 但页面显示未完成，清除过时标记重新入队`);
          } else return;
        }
        if (pageFullyDone && !pageIncomplete) return;
        if (prog != null && prog >= 100 && !pageIncomplete) return;
        if (reqAct && reqAct.total > 0 && reqAct.done >= reqAct.total) {
          log('info', `L0：课程「${name}」必修活动已全部完成（${reqAct.done}/${reqAct.total}），跳过`);
          return;
        }
        // 第三方机构课程识别：优先用 fiber 的 lcmsSystemId（-33=广州开放大学自营，其余为超星/尚睿通等）
        // 2026-10-09 新策略：第三方课程不再一律跳过，而是入队并按平台（超星/尚睿通）分派自动学习
        const isThirdParty = (lcmsId && lcmsId !== '-33') || /合作机构课程|考核要求|操作手册/.test(cardText);
        // 🚧 未适配平台保护（v1.7.77）：脚本尚未支持该学习系统 → **不入队、不自动学习**，
        //    仅记录清单并提示人工，继续处理其它平台的课程，等待后续版本适配（避免误按自营逻辑跑）。
        const unOrg = lcmsId ? UNADAPTED_ORGS[lcmsId] : null;
        if (unOrg) {
          if (!unadaptedSeen.has(name)) { unadaptedSeen.add(name); unadapted.push({ name, org: unOrg, lcmsSystemId: lcmsId }); }
          log('warn', `L0：跳过未适配平台课程「${name}」（${unOrg}｜lcmsSystemId=${lcmsId}）→ 需人工学习，等待版本适配`);
          return;
        }
        // 平台 skip 开关：遍历 PLATFORMS 注册表，命中 lcmsSystemId 且 skipKey 开关开启的平台 → 跳过不入队
        for (const pk of Object.keys(PLATFORMS)) {
          const pm = PLATFORMS[pk];
          if (pm.skipKey && CFG[pm.skipKey] && lcmsId === pm.lcmsSystemId) {
            log('warn', `L0：跳过${pm.full}课程「${name}」（${pm.skipKey} 开关开启）`);
            return;
          }
        }
        queue.push({
          name,
          termCrsId: (data && data.termCrsId) || null,
          progress: prog == null ? -1 : prog,
          hasManual: /作业|测验|考试|讨论/.test(cardText),
          thirdParty: isThirdParty,
          lcmsSystemId: lcmsId || null,
          acts: actsSnap,
          hours,
        });
      });
      // 写回清理后的 courses（上面自愈逻辑删除了过时的 done 标记）
      Store.set(K.COURSES, known);
      // v1.16.5：学习台账全量 upsert（含已完成/未开始/待人工），供后台「学习情况」完整展示
      if (allCourses.length) Backend.syncRecords(allCourses);
      // 🚧 未适配平台课程清单：落盘供面板/收尾/菜单查看；仅在清单变化时提醒（避免每次探测都弹横幅）
      const prevUn = Store.get(K.UNADAPTED, []);
      const sameUn = prevUn.length === unadapted.length
        && prevUn.every((p, i) => p && unadapted[i] && p.name === unadapted[i].name);
      Store.set(K.UNADAPTED, unadapted);
      if (unadapted.length) {
        const orgs = Array.from(new Set(unadapted.map((c) => c.org)));
        log('warn', `L0：${unadapted.length} 门课程属未适配平台（${orgs.join('、')}）→ 已跳过、需人工学习`, unadapted.map((c) => c.name));
        if (!sameUn) {
          Notifier.desktop('发现未适配平台课程（已跳过）', unadapted.map((c) => c.name).join('、'));
          Notifier.banner(`🚧 发现 ${unadapted.length} 门课程属「脚本暂未适配的平台」（${orgs.join('、')}），已自动跳过，不影响其它平台课程的学习。这些课程需人工学习，等待脚本版本升级适配；清单见面板「未适配平台」行或菜单「查看未适配平台课程」。`, { level: 'warn', force: true, ttl: 20000 });
        }
      } else if (prevUn.length) {
        log('info', 'L0：未适配平台课程清单已清空');
      }
      if (queue.length) {
        // 末尾复验（reverify）排最后；其次未完成优先；同为未完成时"纯视频"优先（含考核的课排后面）
        queue.sort((a, b) => ((a.reverify ? 1 : 0) - (b.reverify ? 1 : 0))
          || (a.progress - b.progress) || ((a.hasManual ? 1 : 0) - (b.hasManual ? 1 : 0)));
        Store.set(K.QUEUE, queue);
        log('info', `L0：课程队列构建完成（${queue.length} 门待学）`, queue.map((q) => q.name));
        // 后端：同步本期应学课程清单（含学时）
        Backend.syncPlan(queue.map((q) => ({
          term_crs_id: q.termCrsId || q.name,
          course_name: q.name,
          org_id: q.lcmsSystemId || null,
          total_hours: q.hours || 0,
        })));
      }
      return queue.length > 0;
    },
    // 「末尾复验」候选：已 auto-done 但还没做过收尾复验的课程（用户要求：放到最后再重进一次核验）
    reverifyPending() {
      const courses = Store.get(K.COURSES, {});
      return Object.entries(courses)
        .filter(([, v]) => v && v.status === 'auto-done' && v.reverify !== 1)
        .map(([k, v]) => ({ name: k, manualLeft: v.manualLeft || [], by: v.by }));
    },

    // E9 收尾核对：队列耗尽后回课程列表核对真实进度，把未满 100% 的重新入队（幂等补刷）
    // 返回 { total, incomplete[], pendingPayment }；当前不在课程列表页时返回 null（无法核对）
    reconcile() {
      if (!CFG.reconcileEnabled) return null;
      if (this.detectPendingPayment()) return { total: 0, incomplete: [], pendingPayment: true };
      const btns = this.findStudyButtons();
      if (!btns.length) return null;
      const seen = new Set();
      const incomplete = [];
      const unadapted = [];
      const courses = Store.get(K.COURSES, {});
      btns.forEach((b) => {
        const card = this.courseCardOf(b);
        const data = this.readCourseData(b);
        const lcmsId = data && data.lcmsSystemId;
        const nameEl = qs('h1,h2,h3,h4,[class*="title"],[class*="name"]', card) || card;
        const name = (data && data.termCrsName) ? data.termCrsName : clampText(nameEl.textContent, 60);
        if (!name || seen.has(name)) return;
        seen.add(name);
        // 🚧 未适配平台课程：不纳入收尾核对，也不重新入队（脚本不支持该平台，需人工学习）
        const unOrg = lcmsId ? UNADAPTED_ORGS[lcmsId] : null;
        if (unOrg) {
          unadapted.push({ name, org: unOrg, lcmsSystemId: lcmsId });
          log('warn', `E9 收尾核对：跳过未适配平台课程「${name}」（${unOrg}）→ 需人工学习`);
          return;
        }
        const cardText = clampText(card.textContent, 400);
        const prog = this.detectProgress(card);
        const reqAct = this.detectRequiredActivities(card);
        const hasDoneText = CFG.sectionDoneTexts.some((t) => cardText.includes(t));
        const fullyDone = (prog != null && prog >= 100) || !!(reqAct && reqAct.total > 0 && reqAct.done >= reqAct.total);
        const prev = courses[name] || {};
        // 🔴 auto-done / pending-manual：页面显示「未通过」属正常（含人工项或合作平台不显示）→ 不算未完成、不重新入队
        if (prev.status === 'auto-done' || prev.status === 'pending-manual') {
          if (fullyDone) {
            courses[name] = Object.assign({}, prev, { status: 'done', progress: 100, lastVerifiedAt: NOW() });
          } else if (!hasDoneText) {
            courses[name] = Object.assign({}, prev, { lastVerifiedAt: NOW() });
          }
          return;
        }
        // 判定：进度明确 → 按进度；进度未知 → 有"完成"字样算完成，否则保守视为未完成（受轮次上限保护）
        const done = prog != null ? prog >= 100 : hasDoneText;
        if (done || fullyDone) {
          courses[name] = Object.assign({}, prev, {
            status: prev.status === 'pending-manual' ? 'pending-manual' : 'done',
            progress: prog == null ? (prev.progress == null ? 100 : prev.progress) : prog,
            lastVerifiedAt: NOW(),
          });
        } else {
          incomplete.push({
            name,
            progress: prog == null ? -1 : prog,
            hasManual: /作业|测验|考试|讨论/.test(cardText),
          });
        }
      });
      Store.set(K.COURSES, courses);
      if (unadapted.length) Store.set(K.UNADAPTED, unadapted);   // 🚧 未适配清单（非空才覆盖，避免误清空）
      log('info', `E9 收尾核对：共 ${seen.size} 门，未完成 ${incomplete.length} 门` + (unadapted.length ? `，跳过未适配平台 ${unadapted.length} 门` : ''));
      return { total: seen.size, incomplete, unadapted, pendingPayment: false };
    },

    async enterNextCourse() {
      if (isPaused()) { log('info', 'L0：暂停中，不进入下一门课程'); return; }
      const queue = Store.get(K.QUEUE, []);
      if (!queue.length) { this.allDone().catch((e) => log('error', 'allDone 异常: ' + e.message)); return; }
      const c = queue[0];
      const btns = this.findStudyButtons();
      // 优先用 termCrsId 精确匹配（fiber 数据，最可靠）；失败再退回课程名子串匹配课程卡文本
      let target = null;
      if (c.termCrsId) {
        target = btns.find((b) => {
          const d = this.readCourseData(b);
          return d && d.termCrsId === c.termCrsId;
        });
      }
      if (!target) {
        target = btns.find((b) => clampText(this.courseCardOf(b).textContent, 300).includes(c.name.slice(0, 12)));
      }
      if (!target) {
        log('warn', 'L0：找不到课程入口（' + c.name + '），跳过');
        if (c.reverify) this.markCourse(c.name, { reverify: 1 });   // 复验项找不到入口 → 视为已复验，防止空转
        queue.shift(); Store.set(K.QUEUE, queue);
        await sleep(1000); this.enterNextCourse(); return;
      }
      Session.set({ phase: 'L0-enter', course: c.name, section: '' });
      log('info', 'L0：进入课程 ' + c.name);
      // 从按钮 fiber 读课程数据：拿到 studyUrl（播放地址）与 lcmsSystemId（承训机构）
      const data = this.readCourseData(target);
      const lcmsId = data && data.lcmsSystemId;
      // 🚧 进课前安全闸：跳过被 skip 开关禁用的平台 / 未适配平台
      //    —— 防止陈旧队列里的残留项（如早期版本遗留、缺 lcmsSystemId 的项）被误学已关闭的平台。
      {
        const skipIds = Object.keys(PLATFORMS)
          .filter((pk) => PLATFORMS[pk].skipKey && CFG[PLATFORMS[pk].skipKey])
          .map((pk) => PLATFORMS[pk].lcmsSystemId);
        if (lcmsId && (skipIds.includes(lcmsId) || UNADAPTED_ORGS[lcmsId])) {
          log('warn', `L0：跳过已禁用/未适配平台课程「${c.name}」（lcmsSystemId=${lcmsId}）`);
          queue.shift(); Store.set(K.QUEUE, queue);
          await sleep(600); this.enterNextCourse(); return;
        }
      }
      // 所有机构（自营-33 / 超星-27 / 尚睿通-21）都统一调用 fiber 无参 onClick 跳转：
      // 该 onClick 内部已按机构分派（自营走 quickLogin form.submit POST；超星/尚睿通走 window.open SSO 新标签页），
      // 跳转后由新页面的 Router.probe 按 PLATFORM 分派到 L1/L2/Chaoxing/Yanxiu 自动学习。
      // （旧版曾在此把第三方机构标记"待人工跳过"，与 v1.6.0 第三方平台适配相矛盾，已移除）
      // 🔴 v1.16.11 派发冷却：超星/尚睿通走 window.open 新标签页，本页不会跳转；若不记录「已派发」，
      //   Router 复探后会重复 buildQueue + 重复派发同一门课 → 反复开新标签页（用户实测「两次进入超星死循环」）。
      //   队列存 GM 存储（跨标签页共享）：新标签页学完会 shift 队列，本页读到的队列头随之变化，冷却自然失效。
      const _last = this._dispatch;
      if (_last && _last.name === c.name && NOW() - _last.at < 600000) {
        log('info', `L0：课程「${c.name}」${Math.round((NOW() - _last.at) / 1000)}s 前已派发（新标签页学习中），本轮不重复进入`);
        return;
      }
      log('info', `L0：进入课程 ${c.name}（lcmsSystemId=${lcmsId || '未知'}）`);
      this._dispatch = { name: c.name, at: NOW() };
      const invoked = this.invokeStudyHandler(target);
      if (!invoked) {
        // 兜底：fiber 上没找到无参 onClick 时，退回 target.click()
        log('warn', 'L0：未找到无参 onClick，退回 target.click() 尝试');
        try { target.click(); } catch (e) { log('error', '点击课程入口失败: ' + e.message); }
      }
      // 模拟操作后等待页面重新请求并渲染：给平台跳转留出时间，不急于立即做下一步
      await sleep(3000);
      if (isPaused()) { log('info', 'L0：点击后已暂停，不再继续调度'); return; }
      // 仍在列表页的处理：第三方平台（超星/尚睿通）本就是 window.open 新标签页 → 属正常，等新页学完；
      // 自营（-33）应已 form.submit 跳走，若还停留才可能是真失败。
      if (/teacher\.gzteacher\.com|study\.gzteacher\.com/.test(location.hostname)) {
        if (lcmsId && lcmsId !== '-33') {
          const _p = Object.keys(PLATFORMS).map((k) => PLATFORMS[k]).find((p) => p.lcmsSystemId === lcmsId);
          log('info', `L0：「${c.name}」已由 window.open 派发到新标签页学习（${_p ? _p.label : lcmsId}），本页不再重复派发`);
        } else {
          log('warn', 'L0：调用后仍停留在列表页，等待路由层复探（可能弹窗被拦截或 handleToStudy 未生效）');
        }
      }
    },
    backToList() {
      const queue = Store.get(K.QUEUE, []);
      if (queue.length) queue.shift();
      Store.set(K.QUEUE, queue);
      log('info', 'L0：返回课程列表（剩余 ' + queue.length + ' 门）');
      // 尝试返回：课程列表标签/面包屑/历史；仅顶层执行
      setTimeout(() => {
        if (isPaused()) return;   // 暂停中不执行返回跳转
        const backBtn = qsa('a,button,span').find((e) => is_visible(e) && /返回|课程列表|我的课程/.test(clampText(e.textContent, 12)));
        if (backBtn) { try { backBtn.click(); setTimeout(() => this.afterBack(), 3000); return; } catch (e) { /* ignore */ } }
        try { history.back(); setTimeout(() => this.afterBack(), 3000); } catch (e) { /* ignore */ }
      }, 2000);
    },
    // 直接跳转到学习中心（课程列表页）。课程目录页(/home)无跳转入口，用 URL 直跳。
    // 学习中心页会被 Router 探测 → buildQueue → enterNextCourse 推进到下一门未完成课程。
    gotoStudyCenter() {
      const queue = Store.get(K.QUEUE, []);
      if (queue.length) queue.shift();   // 移除刚完成的课程
      Store.set(K.QUEUE, queue);
      log('info', 'L0：跳转学习中心（剩余 ' + queue.length + ' 门）');
      setTimeout(() => {
        // 用 isGlobalPaused()：第三平台问卷页会主动 L2.pause()，否则这里会跳过跳转（v1.13.3）
        if (isGlobalPaused()) return;
        const target = 'https://i.teacher.gzteacher.com/studyCenter/whole';
        if (location.href === target || location.href.startsWith(target)) { this.afterBack(); return; }
        try { location.href = target; } catch (e) { /* ignore */ }
        setTimeout(() => this.afterBack(), 4000);
      }, 2000);
    },
    afterBack() {
      if (!IS_TOP) return; // 仅顶层做队列调度
      if (isPaused()) { log('info', 'L0：暂停中，不继续调度'); return; }
      // 页面可能仍在加载，给一次重试窗口
      if (this.buildQueue()) { this.enterNextCourse(); return; }
      setTimeout(() => {
        if (isPaused()) return;
        if (this.buildQueue()) this.enterNextCourse();
        else { log('warn', 'L0：返回后未识别到课程列表，若为 SPA 请等待路由层复探'); this.allDone().catch((e) => log('error', 'allDone 异常: ' + e.message)); }
      }, 4000);
    },
    async allDone() {
      // ① 末尾复验：已 auto-done 但还没做过收尾复验的课程 → 放到最后再重进一次核验
      //   （用户要求：怀疑有新可自动任务时，排到最后再进一次，避免正常轮次里反复重进）
      const pending = this.reverifyPending();
      if (pending.length) {
        log('warn', `L0：末尾复验 ${pending.length} 门 auto-done 课程`, pending.map((c) => c.name));
        Notifier.banner(`🔎 收尾复验：${pending.length} 门已完成的课程将再核验一次（确认没有漏掉新的可自动任务）…`, { level: 'info', ttl: 8000 });
        Store.set(K.QUEUE, pending.map((c) => ({ name: c.name, progress: -1, hasManual: true, reverify: true })));
        this.enterNextCourse();
        return;
      }
      // ② E9 收尾核对：若当前在课程列表页，核对真实进度并把未完成的重新入队（幂等补刷）
      const r = this.reconcile();
      if (r && r.pendingPayment) {
        Session.set({ phase: 'pending-payment' });
        log('warn', 'E9 收尾核对：课程仍处待缴费/未开通状态，无法补刷');
        Notifier.banner('⚠ 收尾核对时发现课程仍处于「待缴费/未开通」状态，学习权限尚未开通，暂无法补刷。缴费开通后点菜单「继续自动化」。', { level: 'warn', force: true, ttl: 0 });
        return;
      }
      if (r && r.incomplete.length) {
        const round = (Session.data.reconcileRound || 0) + 1;
        const maxRound = CFG.reconcileMaxRounds || 2;
        if (round <= maxRound) {
          Session.set({ phase: 'reconcile', reconcileRound: round });
          log('warn', `E9 收尾核对：共 ${r.total} 门，其中 ${r.incomplete.length} 门未达 100%，重新入队补刷（第 ${round}/${maxRound} 轮）`,
            r.incomplete.map((c) => `${c.name}(${c.progress < 0 ? '进度未知' : c.progress + '%'})`));
          Notifier.desktop('收尾核对：发现未完成课程', r.incomplete.map((c) => c.name).join('、'));
          Notifier.banner(`🔁 收尾核对发现 ${r.incomplete.length} 门课程进度未满，已自动重新排队补刷（第 ${round}/${maxRound} 轮）`, { level: 'warn', force: true, ttl: 8000 });
          Store.set(K.QUEUE, r.incomplete.map((c) => ({ name: c.name, progress: c.progress, hasManual: c.hasManual })));
          this.enterNextCourse();
          return;
        }
        log('warn', `E9 补刷已达轮次上限（${maxRound} 轮），仍剩 ${r.incomplete.length} 门未完成：` + r.incomplete.map((c) => c.name).join('、'));
        Notifier.banner(`⚠ 收尾核对：${r.incomplete.length} 门课程仍未达 100%（已自动补刷 ${maxRound} 轮）：${r.incomplete.map((c) => c.name).join('、')}。请人工复核平台学习记录。`, { level: 'error', force: true, ttl: 0 });
      }
      // 核对通过 / 无法核对（不在列表页）→ 宣告完成，并汇总「剩余人工项」清单
      Session.set({ phase: 'all-done', reconcileRound: 0 });
      const rep = this.humanReport();
      Notifier.desktop('全部课程可自动部分完成', rep.brief);
      Notifier.banner(rep.text, { level: (rep.hasManual || rep.hasUnadapted) ? 'warn' : 'info', ttl: 0, force: true });
      log('info', 'L0：全部课程可自动部分完成' + ((rep.hasManual || rep.hasUnadapted) ? '（仍有需人工/未适配项）' : ''));
      log('info', rep.text);
    },
    // 汇总「剩余人工项」清单（供收尾提醒 + 面板/菜单查看）
    // 汇总「剩余人工项」清单。⚠ 统计单位是**项**（人工活动条数 / 作业条数），不是"门课"——
    // 旧版用 `auto.length`（课程数）当"门活动"显示，导致面板出现「3 门活动」却对不上页面（v1.7.74 修正）。
    humanReport() {
      const courses = Store.get(K.COURSES, {});
      const auto = [], work = [];
      const unadapted = Store.get(K.UNADAPTED, []);   // 🚧 未适配平台课程（不入队，需人工）
      let actItems = 0, workItems = 0;
      for (const [name, v] of Object.entries(courses)) {
        if (!v) continue;
        if (v.status === 'auto-done') {
          const left = v.manualLeft || [];
          actItems += left.length;
          auto.push({ name, left });
        } else if (v.status === 'pending-manual') {
          const ws = (v.works && v.works.length) ? v.works : ['课程作业'];
          workItems += ws.length;
          work.push({ name, works: ws });
        }
      }
      const lines = [];
      if (auto.length) {
        lines.push(`以下 ${auto.length} 门课程的视频/问卷已全部完成，剩余需人工处理的活动（共 ${actItems} 项）：`);
        auto.forEach((c) => lines.push(`· ${c.name}：${c.left.length ? c.left.join('、') : '（人工发帖/点评类）'}`));
      }
      if (work.length) {
        lines.push(`以下课程含作业/测验考核需人工完成（共 ${workItems} 项）：`);
        work.forEach((c) => lines.push(`· ${c.name}：${c.works.join('、')}`));
      }
      if (unadapted.length) {
        lines.push(`⚠ 以下 ${unadapted.length} 门课程属「脚本暂未适配的平台」，已跳过、需人工学习（等待版本升级适配）：`);
        unadapted.forEach((c) => lines.push(`· ${c.name}（${c.org}）`));
      }
      const hasManual = (actItems + workItems) > 0;
      const hasUnadapted = unadapted.length > 0;
      const text = (lines.length ? '📋 全部课程剩余人工项 / 未适配项\n' + lines.join('\n') : '✅ 全部课程已完成，无剩余人工项。')
        + '\n（学时登记最长 7 个工作日，请稍后在学习结果查询中核对）';
      const parts = [];
      if (actItems) parts.push(`${actItems} 项人工活动`);
      if (workItems) parts.push(`${workItems} 项作业`);
      if (hasUnadapted) parts.push(`${unadapted.length} 门未适配平台课程`);
      const brief = parts.length ? parts.join('、') + '待处理' : '无剩余人工项';
      return { auto, work, actItems, workItems, unadapted, hasManual, hasUnadapted, text, brief };
    },
    start() {
      if (isPaused()) { log('info', 'L0：暂停中，不启动调度'); return false; }
      if (!this.buildQueue()) {
        // 🔴 是课程列表页（仍有「去学习」入口）但队列为空 = 全部课程已完成/被跳过 →
        //    进入收尾复验 allDone()：会把 auto-done 课程各重进一次核验，
        //    防止旧的误标 auto-done（如进度解析 bug 造成的）漏学未完成视频。
        //    旧版此处直接返回 false → Router 判「页面特征未识别」→ allDone 永不触发 → 漏学（v1.9.7 修复）。
        if (this.findStudyButtons().length > 0) {
          const q = Store.get(K.QUEUE, []);
          if (q.length) {
            // 队列里还有未跑完的（如收尾复验项）→ 继续推进，不要被 allDone 覆盖掉
            log('info', 'L0：课程列表页无新待学课程，继续推进队列剩余 ' + q.length + ' 门');
            this.enterNextCourse();
            return true;
          }
          log('info', 'L0：课程列表页已无待学课程 → 进入收尾复验/汇总');
          this.allDone().catch((e) => log('error', 'allDone 异常: ' + e.message));
          return true;
        }
        // 无学习入口时，先判断是否为"选课待缴费/未开通"阶段
        const pending = this.detectPendingPayment();
        if (pending) {
          const sample = pending.map((p) => p.text).slice(0, 3).join('；');
          Session.set({ phase: 'pending-payment', paused: true, pausedReason: '选课待缴费：' + sample });
          L2.pause();
          log('warn', '检测到选课待缴费/未开通状态，暂停自动化', pending.map((p) => p.text));
          Notifier.desktop('选课待缴费（未开通学习权限）', sample);
          Notifier.banner('⚠ 当前课程处于「待缴费/未开通」状态，学习权限尚未开通。缴费期 9/21-9/27，由学校管理员统一缴费；缴费成功开通后，请点菜单「继续自动化」。', {
            level: 'warn', force: true, ttl: 0,
            actionText: '仍要探测', onAction: () => { resumeAutomation(); },
          });
          return false;
        }
        log('info', 'L0：当前页未检测到课程列表（等待路由层探测）'); return false;
      }
      // 之前因"待缴费/未开通"暂停，现在识别到学习入口 → 说明权限已开通，自动恢复
      if (Session.data.paused && /待缴费|未开通/.test(Session.data.pausedReason || '')) {
        // 🔴 v1.11.1：平台权限开通也要重新过授权门禁（脚本侧的学习卡授权是另一层，不能被这里带过）
        log('info', 'L0：检测到学习权限已开通，重新校验授权后恢复运行');
        resumeAutomation().then((ok) => {
          if (ok) Notifier.banner('✅ 检测到学习权限已开通，自动恢复自动学习', { level: 'info', ttl: 6000 });
        });
      }
      this.enterNextCourse();
      return true;
    },
  };

  /* ================================================================
   * 14. 页面路由（按 DOM 特征路由到 L0/L1/L2；含断点续学恢复）
   * ================================================================ */
  const Router = {
    probed: false, _reprobeTimer: null, _missCount: 0,
    // 判断当前 frame 是否为超星章节目录页（iframe 内 URL 常是 work.js 壳页，靠 DOM 特征识别）
    isChaoxingCatalogFrame() {
      try {
        // 目录页强特征：存在 div.chapter_item（章节项）或 iframe#frame_content-zj 被本 frame 承载
        if (document.querySelector('div.chapter_item, .catalog_section, [class*="chapterList"], [class*="chapter_list"]')) return true;
        // 目录 iframe 的 id 恰为 frame_content-zj（本 frame 自身 window.name 或父页引用）
        try { if (window.name === 'frame_content-zj' || window.frameElement && window.frameElement.id === 'frame_content-zj') return true; } catch (e) { /* ignore */ }
        return false;
      } catch (e) { return false; }
    },
    // E4：页面特征连续未识别 → 自动采集轻量 DOM 快照入 trace 队列（供 AutoDone 重新适配）
    captureSnapshot(reason) {
      try {
        const q = Store.get(K.TRACES, []);
        q.push({
          traceId: uid(), domain: HOST, kind: 'selector-miss', reason, url: location.href,
          title: clampText(document.title, 60), at: NOW(),
          iframes: qsa('iframe').map((f) => ({ src: clampText(f.src, 150), visible: is_visible(f) })),
          bodyText: clampText(document.body ? document.body.textContent : '', 400),
          skeleton: PageAnalyzer.skeleton(document.body, 0, 3),
        });
        while (q.length > 30) q.shift();
        Store.set(K.TRACES, q);
        return true;
      } catch (e) { return false; }
    },
    async probe() {
      this.probed = true;
      // 暂停闸门：用户点「暂停」后，任何路由复探都不得启动新的自动化
      if (isPaused()) { log('info', 'Router：暂停中，跳过探测'); return; }
      // E3 会话过期优先判定（登录页上一切自动化都应停手）
      const expired = IS_TOP ? SessionGuard.detect() : null;
      if (expired) { await SessionGuard.engage(expired); return; }
      // ⚠ 必须用 canAutoStart() 过滤：播放器/内容内嵌帧（超星 ananas 播放器帧、knowledge/cards 内容帧）
      // 内部也有 <video>，activeVideo() 会穿透找到 → 会在每个 iframe 里再起一份 L2，
      // 多份 L2 互相 pauseOtherVideos/safePlay → 视频反复播放/暂停。（详见 L2.canAutoStart 注释）
      const v = L2.canAutoStart() ? L2.activeVideo() : null;
      if (v) {
        this._missCount = 0;
        L2.start(); L1.start();
        return;
      }
      // 第三方平台分派（超星 / 尚睿通）：按域名+URL 特征路由到对应推进器
      // 超星章节列表在跨域 iframe「frame_content-zj」内，脚本会注入该 iframe（IS_TOP=false），
      // 因此超星目录页检测必须同时覆盖顶层与 iframe，不能只限 IS_TOP。
      if (PLATFORM === 'chaoxing') {
        // 超星反爬验证页（antispiderShowVerify.ac / processVerify.ac）：脚本反复点播放被判定为机器人，
        // 页面重定向到图形验证码页。此处必须立即暂停并强提醒人工输入验证码，不能继续任何自动化操作
        // （否则会持续触发反爬、卡死）。验证码属平台防作弊边界，脚本不代填。
        if (/antispiderShowVerify|processVerify/i.test(location.href)) {
          this._missCount = 0;
          L2.pause();
          Session.set({ paused: true, pausedReason: '超星反爬验证：请人工输入验证码后点「继续」' });
          Notifier.critical('超星反爬验证', '检测到超星图形验证码（操作异常）。请在页面输入验证码并提交，通过后点面板「继续」恢复学习。');
          Bus.send('need-help', { desc: '超星反爬验证码' });
          return;
        }
        // 目录页：顶层 URL 形如 /mycourse/stu 或 /mooc2-ans/mycourse/stu（章节列表可能在 #frame_content-zj iframe 内，
        // detectChaoxingChapters 会穿透查找）。精确匹配 /mycourse/stu（`(?:\?|$)` 避免误匹配 /mycourse/studentstudy）。
        // 仅顶层执行目录推进，避免顶层与目录帧重复点击同一章节。
        if (IS_TOP && /\/mycourse\/stu(?:\?|$)/.test(location.href)) {
          this._missCount = 0;
          L1.start();
          await sleep(1500);
          Chaoxing.enterChaoxingNext();
          return;
        }
        if (L2.canAutoStart() && /\/studentstudy/.test(location.href)) {
          this._missCount = 0;
          // 投票问卷任务点：优先走投票自动作答（随机勾选 + 提交 + 关闭 + 下一节）。
          // 否则 L2 会因「无视频」误走非视频跳过/死循环（投票无 video，也没法直接「下一节」）。
          if (Chaoxing.detectChaoxingVote()) {
            Chaoxing.driveChaoxingVote();
            return;
          }
          L2.start(); L1.start();   // 任务点页：L2 用 deepVideo 穿透 iframe 播放
          return;
        }
      }
      if (PLATFORM === 'yanxiu' && IS_TOP) {
        // 问卷页（grain/guide/<id>/evaluate/detail）：只做自动作答，不启 L2
        if (/\/grain\/guide\/.*\/evaluate/.test(location.href)) {
          this._missCount = 0;
          L2.pause();
          Yanxiu.driveSurvey();
          return;
        }
        // 项目详情页（train2/workspace/<pid>/training/member）：课程学习列表 + 四大模块
        if (/\/train2\/workspace/.test(location.href)) {
          this._missCount = 0;
          await sleep(1500);
          Yanxiu.enterCourseNext();
          return;
        }
        // 学习页（grain/course/<id>/detail）：L2 放视频 + 监视器推进资源/弹题
        if (/\/grain\/course\/.*\/detail/.test(location.href)) {
          this._missCount = 0;
          L2.start();
          Yanxiu.startWatch();
          return;
        }
      }
      if (IS_TOP) {
        // ★ v1.13.1：gz 主站阶段分流（登录页 / 已登录门户 / 待缴费）——必须先于 L0.start 判定，
        //   否则门户首页会被当成"课程列表页特征未识别"，反复采快照刷屏。
        if (Stage.onGz()) {
          const stg = Stage.detect();
          if (stg.id === 'gz-login') {
            this._missCount = 0;
            log('info', 'Router：当前为继教网登录页，等待用户手动登录');
            return;
          }
          if (stg.id === 'gz-portal') {
            this._missCount = 0;
            log('info', 'Router：已登录继教网（门户页），需要进入学习中心才能识别课程');
            if (CFG.autoGoStudyCenter !== false) Stage.goStudyCenter('门户页');
            else Notifier.banner('已登录继教网。请打开「学习中心」页面开始自动学习。', { level: 'info', force: true, ttl: 8000 });
            return;
          }
        }
        // 课单页（课程超市 /source/record）：选课记录表，非学习入口。
        // 这里只有「查看」按钮 + 状态筛选 tab（待缴费/待开课/已开课），无「去学习」。
        // 应静默跳过、不误判待缴费，也不采快照刷屏；真正自动学习在「学习中心 /studyCenter/whole」。
        if (/\/source\/record/.test(location.href)) {
          this._missCount = 0;
          log('info', 'Router：当前为课程超市课单页（选课记录），自动学习请前往「学习中心」页');
          return;
        }
        // 🔴 自营课程学习页（study.gzteacher.com/study/home|study）**必须排在 L0.start() 之前**判定：
        //    这些页面上的「去学习>」是**活动**入口，L0 若把它当课程卡会建出假队列并反复"进入课程"→死循环。
        //    /study/home → L1 推进活动；/study/study → L2 播放/跳过 + L1。
        if (L0.isSelfStudyPage()) {
          this._missCount = 0;
          L1.start();
          if (/^\/study\/study\b/.test(location.pathname)) {      // 单个活动页
            log('info', 'Router：自营活动页 → L2(+L1)');
            L2.start();
            return;
          }
          log('info', 'Router：自营课程活动列表页 → L1 推进活动');
          if (L1.detectActivities().length) { await sleep(1200); L1.enterNext(); }
          return;
        }
        const started = L0.start();
        if (started) { this._missCount = 0; return; }      // 课程列表页
        if (Session.data.phase === 'pending-payment') {    // 待缴费/未开通：不采快照、不刷屏
          this._missCount = 0;
          log('info', 'Router：当前处于待缴费/未开通阶段，自动化已暂停，等待缴费后恢复');
          return;
        }
        // 自营单个活动学习页（study.gzteacher.com/study/study?actId=xxx）：可能是无视频的阅读/讨论活动，
        // 此时 L2 不会因「有 video」自动启动，但非视频活动需 L2 的 isNonVideoActivity→skipNonVideoActivity 处理，
        // 或检测「没有下一活动了」触发课程完成。故学习页（无论有无视频）都启动 L2。
        if (/\/study\/study/.test(location.href)) {
          this._missCount = 0;
          L2.start(); L1.start();
          return;
        }
        // 学习页活动列表（study.gzteacher.com/study/home 的「章→节→活动」结构）
        if (L1.detectActivities().length) {
          this._missCount = 0;
          L1.start();
          await sleep(1500);
          L1.enterNext();
          return;
        }
        if (L1.detectSectionItems().length) {              // 旧版章节目录页
          this._missCount = 0;
          L1.start();
          await sleep(1500);
          L1.enterNext();
          return;
        }
        // E4：连续未识别 → 采一份 DOM 快照（附快照供 AutoDone 重新适配）
        this._missCount++;
        const needSnap = CFG.selectorMissSnapshot || 3;
        if (this._missCount === needSnap && this.captureSnapshot(`页面特征连续 ${this._missCount} 次未识别`)) {
          log('warn', 'E4：已自动采集 DOM 快照入 trace 队列（面板「导出trace」可交给 AutoDone 适配）');
          Notifier.banner('⚠ 本页结构与已知特征不匹配，已自动采集页面快照。可在面板点「导出trace」交给 AutoDone 适配。', { level: 'warn', force: true, ttl: 10000 });
        }
        // 30 秒内持续探测（SPA 路由/加载延迟）
        if (!this._reprobeTimer) {
          this._reprobeTimer = setTimeout(() => { this._reprobeTimer = null; this.reprobe(); }, 30000);
        }
        log('info', 'Router：页面特征未识别（' + clampText(location.href, 80) + `），30 秒后复探（第 ${this._missCount} 次）`);
      } else {
        // iframe 内无视频：可能是机构封装页，等待视频出现后启动 L2（播放器/内容帧除外，见 canAutoStart）
        const vv = L2.canAutoStart() ? await L2.waitVideo(60000) : null;
        if (vv) L2.start();
        else log('info', 'Router（iframe）：60 秒未见视频或本帧为播放器/内容帧，静默待命');
      }
    },
    reprobe() {
      log('info', 'Router：重新探测页面特征');
      if (!L2.running) this.probe();
    },
  };

  // 监听跨帧消息（顶层收 iframe 的完成/求助通知）
  if (IS_TOP) {
    Bus.listen((msg) => {
      if (msg.type === 'section-done') { if (!L2.running) L1.onSectionDone(msg); }
      else if (msg.type === 'need-help') { /* iframe 内已自行提醒，顶层仅记录 */ log('warn', 'iframe 请求人工：' + (msg.desc || '')); }
    });
    // SPA 路由变化时重新探测
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href === lastUrl) return;
      const wasPaused = isPaused();
      lastUrl = location.href;
      // 页面状态变化（SPA 路由切换）→ 面板回到右下角
      try { if (Panel.el) Panel.resetPos(true); } catch (e) { /* ignore */ }
      if (wasPaused) return;   // 暂停期间不响应路由变化，避免复探引发跳转
      log('info', 'Router：URL 变化 → ' + clampText(location.href, 90));
      setTimeout(() => Router.probe(), 2000);
    }, 2000);
    // E7 断网/恢复监听：状态已落盘，网络恢复后自动续学
    window.addEventListener('offline', () => {
      log('warn', 'E7：网络断开，暂停自动化等待恢复');
      L2.pause();
      Session.set({ paused: true, pausedReason: '网络断开' });
      Notifier.banner('⚠ 网络已断开，自动化暂停等待恢复（学习状态已保存，恢复后自动续学）…', { level: 'warn', force: true, ttl: 0 });
    });
    window.addEventListener('online', () => {
      log('info', 'E7：网络恢复，重新校验授权后续学');
      if (Session.data.pausedReason === '网络断开') Session.set({ paused: false, pausedReason: '' });
      // 🔴 v1.11.1：网络恢复也走统一恢复入口（授权心跳可能已把 AuthGate 置 false）
      resumeAutomation().then((ok) => {
        if (ok) Notifier.banner('网络已恢复，继续自动学习', { level: 'info', ttl: 4000 });
      });
    });
  }

  /* ================================================================
   * 15. 控制面板（仅顶层窗口显示）+ 菜单命令
   * ================================================================ */
  const Panel = {
    el: null, _timer: null,
    injectCSS() {
      const css = `
        #gzal-panel{position:fixed;right:14px;bottom:14px;z-index:2147483646;width:252px;background:#fff;border:1px solid #d3d1c7;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.12);font:12px/1.6 system-ui,"Microsoft YaHei",sans-serif;color:#2c2c2a}
        #gzal-panel *{box-sizing:border-box}
        #gzal-panel .hd{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #eee;background:#f1efe8;border-radius:12px 12px 0 0;cursor:grab;user-select:none;touch-action:none}
        #gzal-panel .hd:active{cursor:grabbing}
        #gzal-panel .grip{color:#b4b2a9;font-size:12px;letter-spacing:1px}
        #gzal-panel .hd b{font-size:12px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #gzal-panel .hd .home{font-size:11px;font-weight:600;color:#185FA5;text-decoration:none;padding:0 5px;border:1px solid #cfe0f2;border-radius:5px;background:#E6F1FB;white-space:nowrap}
        #gzal-panel .hd .home:hover{background:#d6e8fb}
        #gzal-panel .pill{display:none;font-size:12px;font-weight:600;flex:1;white-space:nowrap}
        #gzal-panel.min .hd{border-bottom:none;border-radius:12px}
        #gzal-panel.min .bd{display:none}
        #gzal-panel.min .ttl{display:none}
        #gzal-panel.min .pill{display:inline}
        #gzal-panel .bd{padding:8px 12px;display:none;max-height:calc(100vh - 96px);overflow-y:auto}
        #gzal-panel.open .bd{display:block}
        #gzal-panel .row{display:flex;justify-content:space-between;gap:8px;margin:3px 0}
        #gzal-panel .st{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
        #gzal-panel .bar-wrap{margin-top:5px}
        #gzal-panel .bar{height:4px;border-radius:2px;background:#eceae3;overflow:hidden}
        #gzal-panel .bar i{display:block;height:4px;width:0;border-radius:2px;background:#378ADD;transition:width .3s}
        #gzal-panel .bar.green i{background:#639922}
        #gzal-panel .btns{display:flex;gap:5px;margin-top:9px}
        #gzal-panel .btns button{flex:1;padding:4px 0}
        #gzal-panel button{padding:3px 9px;border:1px solid #b4b2a9;background:#fff;border-radius:6px;cursor:pointer;font-size:11px;color:#2c2c2a}
        #gzal-panel button:hover{background:#f1efe8}
        #gzal-panel button.on{border-color:#378ADD;color:#185FA5;background:#E6F1FB}
        #gzal-panel .logbox{margin-top:9px}
        #gzal-panel .log-hd{display:flex;align-items:center;gap:8px;font-weight:600;margin-bottom:4px}
        #gzal-panel .log-hd .lnk{font-weight:400;color:#185FA5;cursor:pointer}
        #gzal-panel #gzal-log-copy{margin-left:auto}
        #gzal-panel #gzal-log-body{margin:0;max-height:150px;overflow:auto;background:#f7f6f2;border:1px solid #eceae3;border-radius:6px;padding:6px;font:11px/1.5 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all;color:#2c2c2a}
        #gzal-panel .toast{display:none;margin:0 10px 10px;padding:5px 9px;border-radius:6px;background:#E6F1FB;color:#185FA5;font-size:11px;text-align:center}
      `;
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    },
    build() {
      if (!IS_TOP || document.getElementById('gzal-panel')) return;
      this.injectCSS();
      const p = document.createElement('div'); p.id = 'gzal-panel'; p.className = 'open';
      p.innerHTML = `
        <div class="hd" id="gzal-hd">
          <span class="grip">⠿</span>
          <b class="ttl">继教自动学习助手</b>
          <span class="pill" id="gzal-pill"></span>
          <a id="gzal-home" class="home" href="#" target="_blank" rel="noopener noreferrer" title="打开脚本主页（更新脚本 / 下载 / 学习卡）">主页</a>
          <span id="gzal-toggle" style="cursor:pointer;padding:0 2px">▾</span>
        </div>
        <div class="bd">
          <div class="row"><span>状态</span><b id="gzal-state"><span class="st" style="background:#639922"></span>运行中</b></div>
          <div class="row"><span>授权</span><b id="gzal-auth" style="font-weight:500">-</b></div>
          <div class="row" id="gzal-update-row" style="display:none;cursor:pointer" title="点击打开脚本主页更新脚本">
            <span>脚本更新</span><span id="gzal-update" style="color:#C0392B;font-weight:600">需更新 ↗</span>
          </div>
          <div class="row"><span>站点阶段</span><span id="gzal-stage">-</span></div>
          <div class="row"><span>阶段/课程</span><span id="gzal-phase">-</span></div>
          <div class="bar-wrap"><div class="row"><span>视频进度</span><span id="gzal-video">-</span></div><div class="bar"><i id="gzal-video-bar"></i></div></div>
          <div class="bar-wrap" id="gzal-read-row" style="display:none"><div class="row"><span id="gzal-read-label">阅读进度</span><span id="gzal-read">-</span></div><div class="bar green"><i id="gzal-read-bar"></i></div></div>
          <div class="row" id="gzal-manual-row" style="display:none;cursor:pointer" title="点击查看剩余人工项清单"><span>待人工</span><span id="gzal-manual" style="color:#BA7517">-</span></div>
          <div class="row" id="gzal-unadapted-row" style="display:none;cursor:pointer" title="点击查看未适配平台课程清单"><span>未适配平台</span><span id="gzal-unadapted" style="color:#C0392B">-</span></div>
          <div class="row"><span>今日 章节/答题</span><span id="gzal-stats">0/0</span></div>
          <div class="row"><span>队列剩余</span><span id="gzal-queue">-</span></div>
          <div class="row"><span>本页运行</span><span id="gzal-uptime">-</span></div>
          <div class="btns">
            <button id="gzal-b-pause">暂停</button>
            <button id="gzal-b-resume">继续</button>
            <button id="gzal-b-log">日志</button>
          </div>
          <div class="logbox" id="gzal-log" style="display:none">
            <div class="log-hd"><span>最近日志</span><span class="lnk" id="gzal-log-copy">复制</span><span class="lnk" id="gzal-log-close">×</span></div>
            <pre id="gzal-log-body"></pre>
          </div>
        </div>
        <div class="toast" id="gzal-toast"></div>`;
      document.body.appendChild(p);
      this.el = p;
      this.restorePos();
      qs('#gzal-toggle').onclick = (ev) => { ev.stopPropagation(); this.setMin(!p.classList.contains('min')); };
      this.initDrag();
      qs('#gzal-b-pause').onclick = () => { L2.pause(); Session.set({ paused: true, pausedReason: '手动暂停' }); this.refresh(); };
      qs('#gzal-b-resume').onclick = () => { resumeAutomation(); };
      qs('#gzal-b-log').onclick = () => this.toggleLog();
      const upRow = qs('#gzal-update-row');
      if (upRow) upRow.onclick = () => Backend.openHome();
      qs('#gzal-log-close').onclick = () => this.toggleLog(false);
      qs('#gzal-log-copy').onclick = () => this.copyLogs();
      this._timer = setInterval(() => this.refresh(), 2000);
      this.refresh();
    },
    // 折叠 / 展开（小药丸 ⇄ 完整面板），状态持久化
    setMin(min) {
      const p = this.el; if (!p) return;
      p.classList.toggle('min', !!min);
      p.classList.toggle('open', !min);
      this.refresh();
      this.ensureVisible();   // 展开后若超出视口，自动挪回可见范围内
      this.savePos();
    },
    // 保证面板完整显示在视口内：右侧/底部溢出则左移/上移，越界则贴边（用于展开面板、打开日志后）
    ensureVisible() {
      const p = this.el; if (!p) return;
      const r = p.getBoundingClientRect();
      const w = p.offsetWidth, h = p.offsetHeight;
      const vw = window.innerWidth, vh = window.innerHeight;
      let L = r.left, T = r.top;
      if (L + w > vw - 4) L = vw - w - 4;
      if (T + h > vh - 4) T = vh - h - 4;
      if (L < 4) L = 4;
      if (T < 4) T = 4;
      if (Math.round(L) !== Math.round(r.left) || Math.round(T) !== Math.round(r.top)) {
        p.style.right = 'auto'; p.style.bottom = 'auto';
        p.style.left = L + 'px'; p.style.top = T + 'px';
        this.savePos();
      }
    },
    // 拖动：标题栏为把手，Pointer Events 统一鼠标/触屏；拖动时约束在视口内，结束后持久化位置
    initDrag() {
      const p = this.el, hd = qs('#gzal-hd'); if (!p || !hd) return;
      let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, moved = false;
      const onMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
        moved = true;
        const L = Math.max(0, Math.min(ox + dx, window.innerWidth - p.offsetWidth - 2));
        const T = Math.max(0, Math.min(oy + dy, window.innerHeight - p.offsetHeight - 2));
        p.style.left = L + 'px'; p.style.top = T + 'px';
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false; hd.style.cursor = ''; document.body.style.userSelect = '';
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        if (moved) this.savePos();
      };
      hd.addEventListener('pointerdown', (e) => {
        if (e.target && (e.target.id === 'gzal-toggle' || e.target.id === 'gzal-home')) return;   // 折叠/主页链接不参与拖动
        const r = p.getBoundingClientRect();
        p.style.right = 'auto'; p.style.bottom = 'auto';
        p.style.left = r.left + 'px'; p.style.top = r.top + 'px';
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        dragging = true; moved = false; hd.style.cursor = 'grabbing'; document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        e.preventDefault();
      });
      // 窗口尺寸变化 = 页面状态变化 → 面板回到右下角（不保留拖动位置）
      window.addEventListener('resize', () => { this.resetPos(true); });
    },
    // 位置策略（v1.7.71）：面板**默认固定在窗口右下角**；拖动只是临时效果，**不做位置持久化**——
    // 页面刷新 / 窗口尺寸变化 / SPA 路由变化等任何页面状态变化，一律回到右下角。
    // 因此 savePos() 只保存「折叠状态」，不保存坐标。
    savePos() {
      const p = this.el; if (!p) return;
      try { Store.set('gzal:panel', { min: p.classList.contains('min') }); } catch (e) { /* ignore */ }
    },
    restorePos() {
      const p = this.el; if (!p) return;
      this.toDefaultPos();                        // 永远回到右下角（忽略历史坐标）
      let st = null; try { st = Store.get('gzal:panel', null); } catch (e) { st = null; }
      if (st && st.min) this.setMin(true);
    },
    // 清掉拖动产生的行内坐标，恢复 CSS 默认的 right/bottom 定位
    toDefaultPos() {
      const p = this.el; if (!p) return;
      p.style.left = ''; p.style.top = '';
      p.style.right = '14px'; p.style.bottom = '14px';
    },
    // 复位到默认右下角（silent=true 时不弹提示，供 resize/路由变化等自动场景调用）
    resetPos(silent) {
      const p = this.el; if (!p) return;
      this.toDefaultPos();
      try { Store.set('gzal:panel', { min: p.classList.contains('min') }); } catch (e) { /* ignore */ }
      if (!silent) this.toast('面板已复位到右下角');
    },
    // 日志窗口：点击「日志」切换开/关；打开时默认复制到剪贴板
    toggleLog(force) {
      const box = qs('#gzal-log'), btn = qs('#gzal-b-log');
      if (!box) return;
      const open = (force === undefined) ? (box.style.display === 'none') : !!force;
      box.style.display = open ? 'block' : 'none';
      if (btn) btn.classList.toggle('on', open);
      if (open) {
        this.refresh();
        this.copyLogs();        // 先弹提示（提示条会增加面板高度）
        this.ensureVisible();   // 日志+提示都显示完后，再校正位置，确保整块可见
      }
      this.savePos();
    },
    logText() {
      const all = Store.get(K.LOGS, []).concat(LOGS).slice(-60).reverse();
      return all.map((l) => new Date(l.t).toLocaleTimeString() + ' [' + l.level + '] ' + l.msg).join('\n');
    },
    copyLogs() {
      const text = this.logText();
      const fallback = () => {
        try {
          const ta = document.createElement('textarea'); ta.value = text;
          ta.style.cssText = 'position:fixed;left:-9999px;top:0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        } catch (e) { /* ignore */ }
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          const pr = navigator.clipboard.writeText(text);
          if (pr && pr.catch) pr.catch(fallback);
        } else fallback();
      } catch (e) { fallback(); }
      const link = qs('#gzal-log-copy');
      if (link) { link.textContent = '已复制'; setTimeout(() => { if (link) link.textContent = '复制'; }, 1500); }
      this.toast('已复制日志到剪贴板（' + text.split('\n').length + ' 行）');
    },
    // 面板内轻提示：显示在面板底部，约 2.6 秒后自动消失（不再走页面顶部横幅）
    toast(msg, ms) {
      const t = qs('#gzal-toast'); if (!t) return;
      t.textContent = msg;
      t.style.display = 'block';
      this.ensureVisible();   // 提示条会让面板变高，立即校正位置
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { const x = qs('#gzal-toast'); if (x) x.style.display = 'none'; }, ms || 2600);
    },
    refresh() {
      if (!this.el) return;
      const st = qs('#gzal-state'); if (!st) return;
      // 🔴 v1.11.1：授权未通过时状态统一显示「未授权」（此前只显示「运行中/已暂停」，
      //    看不出是被授权闸门挡住；实测未登录仍显示「运行中」并继续翻活动）。
      const authOk = AuthGate.ok === true;
      const authKnown = AuthGate.known === true;
      const ruleOk = RulePack.ok === true;
      // 构建号不符（脚本过期）：面板明确提示"需更新"，而不是笼统的"未授权"
      const buildBad = !authOk && AuthGate.code === 'build_mismatch';
      // v1.17.4：脚本被改动（完整性自检被拒）：面板明确提示"需重装"
      const tamperBad = !authOk && AuthGate.code === 'script_tampered';
      // v1.13.1：按门禁卡点显示更准确的状态（未登录继教网 / 待进学习中心 / 未登录脚本账户 / 无学习卡）
      const need = AuthGate.need || '';
      const paused = Session.data.paused || !authOk || !ruleOk;
      const stTxt = !authKnown ? '校验授权中'
        : (!authOk
          ? (buildBad ? '需更新脚本'
            : tamperBad ? '脚本被改动 · 需重装'
              : need === 'gz-login' ? '待登录继教网'
                : need === 'study-page' ? '待进学习中心'
                  : need === 'script-auth' ? '账号自动登录中'
                    : need === 'buy' ? '未授权（缺学习卡）'
                      : '未授权')
          : (!ruleOk ? '规则未就绪' : (paused ? '已暂停' : (CFG.enabled ? '运行中' : '已停用'))));
      const stColor = !authKnown ? '#888780'
        : (!authOk ? (buildBad ? '#C0392B' : (tamperBad ? '#C0392B' : (need === 'gz-login' ? '#BA7517' : '#C0392B'))) : (!ruleOk ? '#BA7517' : (paused ? '#BA7517' : (CFG.enabled ? '#639922' : '#888780'))));
      st.innerHTML = `<span class="st" style="background:${stColor}"></span>${stTxt}`;
      const auEl = qs('#gzal-auth');
      if (auEl) {
        // v1.14.0 试用中：显示剩余额度；额度用完显示「试用完毕」（区别于普通「缺学习卡」）
        const trialTxt = (authOk && Backend.trial)
          ? (Backend.trialLimit === -1 ? '试用中 · 不限制'
            : `试用中 · 自动学 ${Backend.trialUsed ?? 0}/${Backend.trialLimit} 门`)
          : null;
        auEl.textContent = !authKnown ? '校验中…'
          : (authOk ? (trialTxt || (ruleOk ? '已授权 · 规则v' + RulePack.version : '已授权 · 规则未下发'))
            : (buildBad ? '需更新脚本'
              : tamperBad ? '脚本被改动 · 需重装'
                : AuthGate.code === 'trial_exhausted' ? '试用完毕 · 去购买学习卡'
                  : clampText(AuthGate.reason || '未授权', 16)));
        auEl.style.color = !authKnown ? '#888780'
          : (authOk ? (trialTxt ? '#BA7517' : (ruleOk ? '#639922' : '#BA7517')) : '#C0392B');
      }
      // 「脚本更新」行：仅构建号不符时显示（红色，点击去主页更新）
      const upRow = qs('#gzal-update-row');
      if (upRow) upRow.style.display = buildBad ? 'flex' : 'none';
      // 主页链接（更新脚本 / 下载 / 学习卡都在主页）
      const homeEl = qs('#gzal-home');
      if (homeEl) homeEl.href = Backend.homeUrl();
      // 站点阶段（v1.13.1）：由 Stage 每 5 秒识别一次，这里只读缓存，避免面板刷新触发重扫描
      const stg = Stage.lastKnown();
      const sgEl = qs('#gzal-stage');
      if (sgEl) {
        const tc = (stg && stg.term) ? ' · ' + stg.term + '期' : '';
        sgEl.textContent = clampText((stg ? stg.label : '-') + tc, 24);
        sgEl.style.color = stg && stg.id === 'gz-login' ? '#C0392B'
          : (stg && stg.id === 'pending-payment' ? '#BA7517' : '');
      }
      qs('#gzal-phase').textContent = clampText((Session.data.phase || '-') + ' ' + (Session.data.course || ''), 26);
      const v = L2.activeVideo();
      qs('#gzal-video').textContent = v && v.duration ? `${fmt(v.currentTime)}/${fmt(v.duration)}` : '-';
      const vbar = qs('#gzal-video-bar');
      if (vbar) vbar.style.width = (v && v.duration ? Math.min(100, v.currentTime / v.duration * 100) : 0) + '%';
      // 阅读/观看计时行：尚睿通拓展资源按「阅读心跳时长」计完成，与视频一样显示「已读时长/要求时长」
      const readRow = qs('#gzal-read-row');
      if (readRow) {
        // 按平台分派进度行（v1.7.70）：尚睿通=阅读/观看心跳计时；超星=任务点/达标线；自营=阅读提要倒计时
        let readTxt = '-', readLabel = (v && v.duration) ? '平台计时' : '阅读进度';
        if (PLATFORM === 'yanxiu') readTxt = Yanxiu.readText(!!(v && v.duration));
        else if (PLATFORM === 'chaoxing') { readLabel = '任务点'; readTxt = Chaoxing.progressText(!!(v && v.duration)); }
        else { readLabel = '阅读提要'; readTxt = Self.readText(); }
        const lab = qs('#gzal-read-label');
        if (lab) lab.textContent = readLabel;
        readRow.style.display = (readTxt === '-') ? 'none' : 'block';
        qs('#gzal-read').textContent = readTxt;
        const rbar = qs('#gzal-read-bar');
        if (rbar) { const m = /（(\d+)%）/.exec(readTxt); rbar.style.width = (m ? Math.min(100, +m[1]) : 0) + '%'; }
      }
      // 待人工项（auto-done 课程的人工活动 + 含作业考核的课程）→ 面板可查，点击看清单
      // 待人工：优先显示**本页**（课程详情/活动页）实时剩余的人工活动 + 未提交作业；
      // 不在课程页时退回「全部课程」汇总。单位一律是「项」（旧版误用课程数当"门活动"→ 与页面不符）。
      const repAll = L0.humanReport();   // 全局汇总（人工项 + 未适配平台），供下方两行共用
      const mRow = qs('#gzal-manual-row');
      if (mRow) {
        let nA = 0, nW = 0, tip = '', title = '';
        const live = L1.liveManual();
        if (live) {
          nA = live.acts.length; nW = live.works.length;
          tip = L1.liveManualText(live); title = '本页剩余人工项（点击查看）';
        } else {
          nA = repAll.actItems; nW = repAll.workItems;
          tip = repAll.text; title = '全部课程剩余人工项（点击查看）';
        }
        mRow.style.display = (nA + nW) ? 'flex' : 'none';
        qs('#gzal-manual').textContent = nA + ' 项活动 + ' + nW + ' 项作业';
        mRow.title = title;
        mRow.onclick = () => alert(tip);
      }
      // 🚧 未适配平台课程（v1.7.77）：脚本暂不支持的机构课程 → 已跳过不入队，需人工学习
      const uRow = qs('#gzal-unadapted-row');
      if (uRow) {
        const un = repAll.unadapted || [];
        uRow.style.display = un.length ? 'flex' : 'none';
        qs('#gzal-unadapted').textContent = un.length ? (un.length + ' 门待适配') : '-';
        uRow.onclick = () => alert('🚧 未适配平台课程（脚本暂不支持，已跳过、需人工学习，等待版本升级适配）：\n'
          + un.map((c) => `· ${c.name}（${c.org}）`).join('\n'));
      }
      const s = Stats.data;
      qs('#gzal-stats').textContent = `${s.sectionsDone || 0}/${s.quizzes || 0}`;
      const q = Store.get(K.QUEUE, []);
      qs('#gzal-queue').textContent = q.length ? q.length + ' 门' : (Session.data.phase === 'all-done' ? '全部完成' : '-');
      const up = qs('#gzal-uptime');
      if (up) {
        const mins = Math.max(0, Math.floor((NOW() - Maintenance.bootAt) / 60000));
        up.textContent = `${(mins / 60) | 0}h${String(mins % 60).padStart(2, '0')}m` + (Session.data.reconcileRound ? ` · 补刷${Session.data.reconcileRound}轮` : '');
      }
      // 折叠态：小药丸（状态点 + 状态文字）
      const pill = qs('#gzal-pill');
      if (pill) {
        pill.innerHTML = `<span class="st" style="background:${stColor}"></span>继教助手 · ${stTxt}`;
      }
      // 日志窗口打开时实时刷新
      const lbox = qs('#gzal-log');
      if (lbox && lbox.style.display !== 'none') {
        const lbody = qs('#gzal-log-body');
        if (lbody) lbody.textContent = this.logText();
      }
    },
  };
  function fmt(sec) { sec = Math.max(0, sec | 0); return String((sec / 60) | 0).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); }

  /* ================================================================
   * 16. DOM 骨架提取（供 Router.captureSnapshot 采集「选择器未命中」现场）
   * ================================================================ */
  const PageAnalyzer = {
    skeleton(root, depth, maxDepth) {
      if (depth > maxDepth || !root || !root.children) return [];
      return Array.from(root.children).slice(0, 25).map((c) => ({
        tag: c.tagName.toLowerCase(),
        id: c.id || undefined,
        cls: clampText(typeof c.className === 'string' ? c.className : '', 60) || undefined,
        text: clampText(c.textContent, 40) || undefined,
        kids: c.children.length,
      })).filter((x) => x.cls || x.id || x.text);
    },
  };

  /* ================================================================
   * 17. 菜单命令（Tampermonkey 图标菜单）
   * ================================================================ */
  try {
    GM_registerMenuCommand('▶ 开始/重新探测当前页', () => { CFG.enabled = true; saveConfig(); if (isPaused()) resumeAutomation(); else Router.probe(); });
    GM_registerMenuCommand('⏸ 暂停自动化', () => { L2.pause(); Session.set({ paused: true, pausedReason: '菜单暂停' }); });
    GM_registerMenuCommand('▶▶ 继续自动化', () => { resumeAutomation(); });
    GM_registerMenuCommand('⏭ 进入下一节（课程目录页）', () => { L1.enterNext(); });
    GM_registerMenuCommand('🔁 重新构建课程队列（课程列表页）', () => { if (L0.buildQueue()) { Session.set({ reconcileRound: 0 }); Panel.refresh(); Notifier.banner('队列已重建', { level: 'info', ttl: 3000 }); } else { alert('当前页未识别到课程列表，请先进入"学习中心 → 全员培训"课程列表页'); } });
    GM_registerMenuCommand('🧲 重置面板位置（右下角）', () => Panel.resetPos());
    GM_registerMenuCommand('📋 查看剩余人工项', () => { const r = L0.humanReport(); alert(r.text); });
    // v1.16.0：后台继续学习开关（最小化/切标签是否继续学）
    GM_registerMenuCommand((CFG.backgroundLearn ? '🌙 后台继续学习：已开启（点击关闭）' : '🌙 后台继续学习：已关闭（点击开启）'), () => {
      CFG.backgroundLearn = !CFG.backgroundLearn;
      saveConfig();
      Notifier.banner(CFG.backgroundLearn
        ? '🌙 后台继续学习已开启：最小化/切换标签不会中断学习'
        : '后台继续学习已关闭：仅在页面前台学习', { level: 'info', force: true, ttl: 5000 });
      try { Panel.refresh(); } catch (e) { /* ignore */ }
    });
    GM_registerMenuCommand('🚧 查看未适配平台课程', () => {
      const un = Store.get(K.UNADAPTED, []);
      alert(un.length
        ? ('未适配平台课程（脚本暂不支持，已跳过、需人工学习，等待版本升级适配）：\n' + un.map((c) => `· ${c.name}（${c.org}）`).join('\n'))
        : '未发现未适配平台的课程。');
    });
    GM_registerMenuCommand('🧮 收尾核对（补刷未完成课程）', () => {
      const r = L0.reconcile();
      if (!r) { alert('请先进入"学习中心 → 全员培训 → 我的课单/课程列表"页，再执行收尾核对'); return; }
      if (r.pendingPayment) { alert('当前课程仍为「待缴费/未开通」状态，无法补刷'); return; }
      if (!r.incomplete.length) { alert(`核对完成：${r.total} 门课程均已达 100%，无需补刷`); return; }
      alert(`核对完成：${r.total} 门中 ${r.incomplete.length} 门未完成，已重新入队补刷`);
      Store.set(K.QUEUE, r.incomplete.map((c) => ({ name: c.name, progress: c.progress, hasManual: c.hasManual })));
      Session.set({ reconcileRound: 0 }); L0.enterNextCourse();
    });
    GM_registerMenuCommand('🗑 清除本站学习进度标记（重新学习）', () => { Store.set(K.COURSES, {}); Store.set(K.QUEUE, []); Session.set({ reconcileRound: 0 }); alert('已清除，将重新构建队列'); });
    GM_registerMenuCommand('🔑 授权面板', () => Backend.openPanel());
    GM_registerMenuCommand('📚 打开学习中心（识别账户/期数）', () => {
      const st = Stage.detect();
      if (!Stage.onGz()) { alert('请在广州继教网页面使用（学习中心 / 课程超市）'); return; }
      if (st.id === 'gz-login') { Stage.notifyLogin(true); return; }
      if (!Stage.goStudyCenter('菜单')) alert('无法自动跳转，请手动打开：https://i.teacher.gzteacher.com/studyCenter/whole');
    });
    GM_registerMenuCommand('🏠 打开脚本主页（更新/下载/学习卡）', () => Backend.openHome());
  } catch (e) { /* GM_registerMenuCommand 不可用时忽略 */ }

  /* ================================================================
   * 17.5 后端通信层（前后端分离 · 付费授权）
   *   默认走前后端模式：授权校验（license/check 心跳）+ 学习上报 + 答案/规则后置。
   *   🔒 v1.13.2 起后端地址写死在脚本常量 BACKEND_BASE（顶部），不落存储、无菜单入口。
   * ================================================================ */
  const Backend = {
    // 后端地址固定取脚本内置常量（普通用户不可改：改地址等于把账号密码/学习卡交给第三方服务器）
    get url() { return BACKEND_BASE.replace(/\/+$/, ''); },

    token: null, refreshToken: null, gz: null, term: null,
    // 🔴 v1.12.0：规则包会话密钥（license/check 签发，仅内存、不落盘、短 TTL）
    ruleKey: null, ruleKid: null, ruleExp: 0,
    // v1.14.0：试用状态（license/check 返回；trial=true 表示当前无学习卡、走试用额度）
    trial: false, trialUsed: null, trialLimit: null,

    init() {
      // 🔒 v1.13.2：清掉历史版本存过的自定义后端地址（旧版「设置后端地址」菜单写入），
      //    避免残留值让人误以为还能改；后端地址一律以脚本常量 BACKEND_BASE 为准。
      Store.del('gzal:bk:url');
      this.token = Store.get('gzal:bk:token', null);
      this.refreshToken = Store.get('gzal:bk:refresh', null);
      this.gz = Store.get('gzal:bk:gz', null);
      this.term = Store.get('gzal:bk:term', null);
    },

    // 设备标识（用于把规则密钥绑定到「这台设备」；复用后端 devices 表字段）
    deviceId() {
      let d = Store.get('gzal:device_id', null);
      if (!d) { d = 'dev-' + uid() + '-' + NOW().toString(36); Store.set('gzal:device_id', d); }
      return d;
    },

    // 脚本主页（安装教程 / 脚本下载 / 学习卡）：v1.17.0 起固定为公网主页 HOME_URL
    homeUrl() { return HOME_URL; },

    // 打开脚本主页（新标签页）。用 <a target=_blank> 模拟点击，避免被弹窗拦截。
    openHome() {
      const u = this.homeUrl();
      try {
        const a = document.createElement('a');
        a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.style.cssText = 'position:fixed;left:-9999px;top:0;';
        (document.body || document.documentElement).appendChild(a);
        a.click();
        setTimeout(() => { try { a.remove(); } catch (e) { /* ignore */ } }, 2000);
      } catch (e) {
        try { window.open(u, '_blank'); } catch (e2) { /* ignore */ }
      }
      // 兜底：浏览器拦了新标签/无用户手势时，把地址告诉用户（可复制手打）
      try { Panel.toast('脚本主页：' + u + '（未自动打开请手动访问）'); } catch (e) { /* ignore */ }
      log('info', '已打开脚本主页（更新脚本 / 下载 / 学习卡）：' + u);
    },

    // 构建号不被后端白名单接受 → 明确指引用户去主页更新脚本（不弹登录/学习卡面板）
    // 同一次会话只弹一次常驻横幅，避免 5 分钟心跳重复刷屏；桌面通知每次都发（用户可能不在当前标签）
    buildMismatchNotice(reason, latest) {
      const cur = (typeof SCRIPT_BUILD === 'string' ? SCRIPT_BUILD : '未知');
      // 后端 reason 里已含"去主页更新"时不再重复拼接，避免横幅啰嗦
      const extra = (reason && !/主页|更新/.test(reason)) ? '（' + clampText(reason, 60) + '）' : '';
      const msg = '脚本需要更新：当前版本 ' + cur + (latest ? '（最新 ' + latest + '）' : '')
        + ' 已被后端拒绝。请打开脚本主页更新脚本，然后刷新本页。' + extra;
      try { Notifier.desktop('脚本需要更新', msg); } catch (e) { /* ignore */ }
      try {
        if (this._bmShown) return;
        this._bmShown = true;
        Notifier.banner('⚠ ' + msg, {
          level: 'error', force: true, ttl: 0,
          actionText: '去主页更新脚本',
          onAction: () => this.openHome(),
        });
      } catch (e) { /* ignore */ }
      log('error', '构建号被后端拒绝（' + cur + '）：请到主页更新脚本 ' + this.homeUrl());
    },

    // v1.17.4：完整性自检未过 / 后端拒授（脚本被改动）→ 指引去主页重装（同会话只弹一次常驻横幅）
    tamperNotice(reason) {
      const extra = (reason && !/重新安装|主页|重装/.test(reason)) ? '（' + clampText(reason, 60) + '）' : '';
      const msg = '检测到脚本文件被修改，自动化已暂停。请打开脚本主页重新安装官方版本，然后刷新本页。' + extra;
      try { Notifier.desktop('脚本文件被修改', msg); } catch (e) { /* ignore */ }
      try {
        if (this._tpShown) return;
        this._tpShown = true;
        Notifier.banner('⚠ ' + msg, {
          level: 'error', force: true, ttl: 0,
          actionText: '去主页重装脚本',
          onAction: () => this.openHome(),
        });
      } catch (e) { /* ignore */ }
      log('error', '脚本完整性校验未通过：请到主页重新安装脚本 ' + this.homeUrl());
    },

    // 通用请求封装（GM_xmlhttpRequest 跨域）；返回 {ok, status, data} 或抛错
    // access token（30 分钟）过期时，自动用 refresh token 续期并重试一次
    async request(method, path, body, auth, _retried) {
      const headers = { 'Content-Type': 'application/json' };
      if (auth && this.token) headers.Authorization = 'Bearer ' + this.token;
      const res = await new Promise((resolve, reject) => {
        const payload = {
          method, url: this.url + path, headers, timeout: 10000,
          onload: (r) => resolve({ status: r.status, text: r.responseText }),
          onerror: () => reject(new Error('network error')),
          ontimeout: () => reject(new Error('timeout')),
        };
        if (body != null) payload.data = JSON.stringify(body);
        try { GM_xmlhttpRequest(payload); } catch (e) { reject(e); }
      });
      let data = null;
      try { data = JSON.parse(res.text); } catch (e) { data = res.text; }
      // 401 且本次带鉴权 → 尝试刷新令牌后重试一次；刷新也失败则清除登录态（回到登录界面）
      if (res.status === 401 && auth && !_retried) {
        const refreshed = await this._refresh();
        if (refreshed) return this.request(method, path, body, auth, true);
        this._clearAuth();
      }
      return { ok: res.status >= 200 && res.status < 300, status: res.status, data };
    },

    // 用 refresh token（7 天）换新的 access token
    async _refresh() {
      if (!this.refreshToken) return false;
      try {
        const r = await this.request('POST', '/api/auth/refresh',
          { refresh_token: this.refreshToken }, false, true);
        if (r.ok && r.data && r.data.access_token) {
          this.token = r.data.access_token;
          if (r.data.refresh_token) this.refreshToken = r.data.refresh_token;
          Store.set('gzal:bk:token', this.token);
          Store.set('gzal:bk:refresh', this.refreshToken);
          log('info', '访问令牌已自动续期');
          return true;
        }
      } catch (e) { /* ignore */ }
      return false;
    },

    // 清除登录态（令牌失效 → 回到登录界面）；同时置授权闸门为 false，运行中的自动化立刻停手
    _clearAuth() {
      this.token = null; this.refreshToken = null;
      Store.set('gzal:bk:token', null); Store.set('gzal:bk:refresh', null);
      try { AuthGate.ok = false; AuthGate.reason = '账号登录已失效，正在自动重登'; AuthGate.need = 'script-auth'; } catch (e) { /* ignore */ }
    },

    // 抓 gz 账户身份（localStorage.cur_user；teacherId=学号是计费唯一标识）
    // ⚠ 学习页 study.gzteacher.com 与 i.teacher 不同域，读不到 cur_user → 用此前抓取并缓存的身份兜底。
    // 🔴 v1.13.1：认证域（www / i.teacher）**不允许**用缓存盖过页面事实——
    //    实测踩坑：www 登录页上旧 gz 缓存让门禁以为"已登录继教网"，于是弹了脚本登录框（应在未登录时只提醒手动登录）。
    captureGz() {
      try {
        const cu = JSON.parse(localStorage.getItem('cur_user') || 'null');
        if (cu && cu.teacherId) {
          const gz = { teacher_id: cu.teacherId, user_name: cu.user_name || '', realname: cu.realname || '' };
          this.gz = gz; Store.set('gzal:bk:gz', gz);
          return gz;
        }
      } catch (e) { /* ignore */ }
      // 认证域：读不到 cur_user → 只有页面明确显示"已登录"（退出账号/个人中心）才用缓存身份，否则视为未登录
      if (Stage.authHost()) {
        let st = null;
        try { st = Stage.loginState(); } catch (e) { st = null; }
        if (!st || st.loggedIn !== true) return null;
        return this.gz || Store.get('gzal:bk:gz', null);
      }
      // 其它域（study.gzteacher.com 学习页 / 第三方平台）读不到 cur_user → 用缓存兜底
      return this.gz || Store.get('gzal:bk:gz', null);
    },

    // gz 账户是否处于"未登录"状态（v1.13.1 起统一由 Stage.loginState 判定：强信号优先，缓存不盖事实）
    gzLoggedOut() {
      try {
        const st = Stage.loginState();
        return st.known === true && st.loggedIn === false;
      } catch (e) { return false; }
    },

    // 期数元素（学习中心 _green_ 优先，课程超市 _templete_ 兜底）
    _termEl() { return document.querySelector('span[class*="_green_"], span[class*="_templete_"]'); },

    // 抓期数：命中即缓存；其它页面用缓存兜底（避免"非学习中心页面无法识别期数"）
    captureTerm() {
      const el = this._termEl();
      let term = null;
      if (el) {
        const m = (el.textContent || '').match(/(\d{4})期/);
        if (m) term = m[1];
      }
      if (term) { this.term = term; Store.set('gzal:bk:term', term); }
      else { term = this.term || Store.get('gzal:bk:term', null); }
      return term;
    },

    // 等期数渲染出来（学习中心是 SPA，期数在接口数据返回后才出现）
    _waitTerm(timeout) {
      return new Promise((resolve) => {
        const t0 = Date.now();
        const tick = () => {
          if (this._termEl() || Date.now() - t0 >= timeout) resolve();
          else setTimeout(tick, 400);
        };
        tick();
      });
    },

    // 全流程门禁（任意页面运行脚本前都会调用）：
    //   ① 是否已登录 gz（继续教育网）账户？ 未登录 → **只提醒手动登录，不弹脚本面板**
    //   ② 是否在学习中心/课程超市（能识别身份与期数）？ 不在 → 引导进入（不弹面板）
    //   ③ 脚本账户：v1.17.0 免手动登录，用 gz 学号 + 固定默认密码自动注册/登录
    //   ④ 是否已持有该 gz 账户本期学习卡（学习权限）？ 无 → 提示购买 + 弹学习卡绑定框
    //   ⑤ 全部通过 → authorized=true，脚本开始自动学习
    async licenseCheck() {
      // ① gz 账户登录检查（Stage 判定：强信号优先，缓存不盖页面事实）
      let login = null;
      try { login = Stage.loginState(); } catch (e) { login = null; }
      const gzLoginPage = !!(login && login.known && login.loggedIn === false);
      if (gzLoginPage) {
        // v1.16.3：实测站点「登录后直接刷新」会丢页面登录态，但服务端会话仍有效
        //（地址栏直输 /studyCenter/whole 或同标签 location.href 均可正常进入）。
        // 因此：非真正登录表单/登录 URL 且当前在门户/个人中心时，先自动探测一次学习中心；
        // 若被弹回登录页，_suspect() 会拦住后续并提示重新登录（每分钟最多探测一次）。
        const realLogin = login.why === 'login-form' || login.why === 'login-url';
        const canProbe = !realLogin && Stage.onGz() && Stage.authHost()
          && !(Stage._suspect && Stage._suspect())
          && (!Stage._probeAt || NOW() - Stage._probeAt > 60000);
        if (canProbe) {
          Stage._probeAt = NOW();
          Stage._probeStudy = true;
          return { authorized: false, needStudyPage: true, showPanel: false, silent: true,
                   reason: '页面未显示登录态，正在尝试进入学习中心确认会话（等价地址栏直输）' };
        }
        return { authorized: false, needGzLogin: true, showPanel: false, silent: true,
                 reason: '未登录「广州继教网」账户：请先在页面手动登录（账号 / APP / 微信登录均可）' };
      }
      // ①·5 v1.16.2：会话失效检测——刚尝试进学习中心却被弹回 www 登录页（无 cur_user）。
      //   此时即使页面仍渲染「退出账号/个人中心」，也不能再自动跳转（会死循环），直接提示重新登录。
      if (Stage._suspect && Stage._suspect()) {
        Stage._bounced = true;
        return { authorized: false, needGzLogin: true, showPanel: false, silent: true,
                 reason: '登录已过期：进入学习中心被要求重新登录。请重新登录「广州继教网」（本页或 i.teacher.gzteacher.com/login），然后点「我已登录，重新检测」' };
      }
      // ② 刚登录完还停在「登录回跳页」（www + ?redirect=/studyCenter/...）：
      //    按需求先进学习中心/课程超市，再那里识别账户 + 期数（缓存可能过期），最后才校验脚本账户/学习卡。
      if (login && login.loggedIn && Stage.isLoginReturn && Stage.isLoginReturn()) {
        return { authorized: false, needStudyPage: true, showPanel: false, silent: true,
                 reason: '已登录继教网，正在进入学习中心识别账户与期数' };
      }
      const gz = this.captureGz();
      if (!gz) {
        // 已登录但读不到身份（门户首页无 cur_user）→ 进学习中心识别，不要误报"未登录"
        return { authorized: false, needStudyPage: true, showPanel: false, silent: true,
                 reason: login && login.loggedIn ? '已登录继教网，请进入「学习中心」识别账户与期数'
                   : '未识别到继教网账户：请先登录（账号 / APP / 微信均可）后进入学习中心' };
      }
      this.gz = gz; Store.set('gzal:bk:gz', gz);
      // ② 期数（权限按「脚本账户 + gz账户 + 期数」校验，需先识别当前期数）
      const term = this.captureTerm();
      if (!term) {
        return { authorized: false, needStudyPage: true, showPanel: false, silent: true,
                 reason: '无法识别当前期数：请进入「学习中心」或「课程超市」页面' };
      }
      // ③ 脚本账户登录检查（v1.17.0 免手动登录：gz 学号 + 固定默认密码，自动注册/登录）
      if (!this.token) {
        const auto = await this.ensureAccount(gz);
        if (!auto.ok) {
          return { authorized: false, showPanel: false, silent: true,
                   reason: '账号自动登录失败：' + (auto.reason || '未知原因') + '（请刷新页面重试）' };
        }
      }
      // ④ 学习权限校验
      try {
        const r = await this.request('POST', '/api/license/check',
          { teacher_id: gz.teacher_id, term, fingerprint: this.deviceId(), build_id: SCRIPT_BUILD,
            self_hash: (typeof Integrity !== 'undefined' && Integrity.lastHash) || '',
            user_name: gz.user_name || '', realname: gz.realname || '' }, true);
        if (r.status === 401) {
          // 令牌失效：清态后自动重登一次（加锁防递归），成功则重走校验
          this._clearAuth();
          if (!this._authRetrying) {
            this._authRetrying = true;
            try {
              const auto = await this.ensureAccount(gz);
              if (auto.ok) return await this.licenseCheck();
            } finally { this._authRetrying = false; }
          }
          return { authorized: false, showPanel: false, silent: true,
                   reason: '账号登录已失效，自动重登失败（请刷新页面重试）' };
        }
        const d = r.data || {};
        // 🔴 后端对"未授权"返回的是 HTTP 200 + {authorized:false, reason}，
        //    必须按 body 里的 authorized 判断，不能只看 HTTP 状态码（否则会被误当已授权）。
        if (r.ok && d.authorized === true) {
          // 保存规则包会话密钥（仅内存；过期后由心跳/nextBundle 重新换取）
          if (d.rule_key && d.rule_kid) {
            this.ruleKey = d.rule_key;
            this.ruleKid = d.rule_kid;
            this.ruleExp = NOW() + (d.rule_ttl || 300) * 1000;
          }
          // v1.14.0 试用信息（面板显示「试用中 · 已自动学 N/X 门」）
          this.trial = !!d.trial;
          this.trialUsed = d.trial_used;
          this.trialLimit = d.trial_limit;
          return Object.assign({ authorized: true }, d);
        }
        // 🔴 构建号不匹配（后端白名单拒绝）：不是账号/学习卡问题 → 单独提示「去主页更新脚本」，
        //    不能落到下面的 needBuy 分支（否则会误导用户去绑定学习卡）。
        if (d.code === 'build_mismatch') {
          return { authorized: false, buildMismatch: true, code: 'build_mismatch',
                   latestBuild: d.latest_build || '', showPanel: false,
                   reason: d.reason || '脚本版本已过期，请打开脚本主页更新后刷新页面' };
        }
        // 🔴 v1.17.4：完整性自检被后端拒（脚本被改动）→ 单独提示「去主页重装」，不弹学习卡面板
        if (d.code === 'script_tampered') {
          return { authorized: false, scriptTampered: true, code: 'script_tampered',
                   showPanel: false,
                   reason: d.reason || '脚本文件已被修改，请打开脚本主页重新安装官方版本后刷新页面' };
        }
        // v1.14.0 试用额度用完：提示去主页购买学习卡（与普通 needBuy 同弹购买+绑定框，但文案区分"试用完毕"）
        if (d.code === 'trial_exhausted') {
          this.trial = true; this.trialUsed = d.trial_used; this.trialLimit = d.trial_limit;
          return { authorized: false, needBuy: true, showPanel: true, buy: true, term,
                   trialExhausted: true, code: 'trial_exhausted',
                   reason: d.reason || `试用额度已用完，请到脚本主页购买并绑定学习卡后继续学习` };
        }
        // 无学习权限：提示去主页购买 + 弹学习卡绑定框（showPanel=true，面板带购买入口）
        return { authorized: false, needBuy: true, showPanel: true, buy: true, term,
                 reason: d.reason || `当前脚本账号未持有该 gz 账户 ${term} 期学习卡，请购买并绑定后使用` };
      } catch (e) {
        return { authorized: false, showPanel: true, reason: '后端不可达（离线不降级）：' + e.message };
      }
    },

    // 启动门禁：学习中心 / 课程超市先等期数渲染出来，再走上面的四步检查（其它页面用缓存期数）。
    async gate() {
      const needTerm = /\/studyCenter\//.test(location.pathname) || /\/source/.test(location.pathname);
      if (needTerm) await this._waitTerm(6000);
      const r = await this.licenseCheck();
      // 🔴 v1.11.1：授权结论落到全局闸门 AuthGate（唯一真相）。isPaused() / L2.isStopped() 直接读它，
      //    保证「未授权 = 任何自动化路径都停手」，而不是只靠 boot 里那一次 L2.pause()。
      AuthGate.ok = !!(r && r.authorized === true);
      AuthGate.known = true;
      AuthGate.reason = AuthGate.ok ? '' : ((r && r.reason) || '未授权');
      AuthGate.code = AuthGate.ok ? '' : ((r && r.code) || '');
      // v1.13.1：区分「卡在哪一步」，面板/启动分流据此决定弹不弹脚本面板
      AuthGate.need = AuthGate.ok ? ''
        : (r && r.needGzLogin) ? 'gz-login'
          : (r && r.needStudyPage) ? 'study-page'
            : (r && (r.needAuth || r.status === 401)) ? 'script-auth'
              : (r && r.needBuy) ? 'buy'
                : (AuthGate.code === 'build_mismatch') ? 'build'
                  : (AuthGate.code === 'script_tampered') ? 'tamper'
                    : 'unknown';
      if (AuthGate.ok) this._bmShown = false;   // 授权恢复 → 允许下次再提示"需更新"
      if (!AuthGate.ok) { this.ruleKey = null; this.ruleKid = null; this.ruleExp = 0; }
      log(AuthGate.ok ? 'info' : 'warn', AuthGate.ok ? '授权校验通过' : '授权校验未通过：' + AuthGate.reason);
      return r;
    },

    // 学习上报（课程完成时）
    async reportCourse(rec) {
      try { return await this.request('POST', '/api/study/report', rec, true); }
      catch (e) { return null; }
    },

    // 同步本期应学课程清单（学习中心构建队列后调用）
    async syncPlan(courses) {
      const gz = this.gz || this.captureGz();
      const term = this.captureTerm();
      if (!gz || !term || !courses.length) return null;
      try {
        return await this.request('POST', '/api/study/plan/sync',
          { teacher_id: gz.teacher_id, term, courses }, true);
      } catch (e) { return null; }
    },

    // 学习台账批量 upsert（v1.16.5）：学习中心构建队列时，把本期**全部课程**
    // （含已完成 / 未开始 / 待人工）一次性写入 study_records；后续完成上报按同一
    // key（gz账户 + 期数 + 课程）修改。后端状态只升不降、auto_finished 只升不降。
    async syncRecords(courses) {
      const gz = this.gz || this.captureGz();
      const term = this.captureTerm();
      if (!gz || !term || !courses || !courses.length) return null;
      try {
        return await this.request('POST', '/api/study/records/sync',
          { teacher_id: gz.teacher_id, term, courses }, true);
      } catch (e) { return null; }
    },

    // 由 markCourse 触发：组装记录并上报（失败不阻断学习）
    async _reportMark(name, patch) {
      try {
        const gz = this.gz || this.captureGz();
        const term = this.captureTerm();
        if (!gz || !term) return;
        const queue = Store.get(K.QUEUE, []);
        const q = queue.find((c) => c.name === name);
        const hours = (q && q.hours) || patch.hours || 0;
        const st = patch.status;
        // done=平台确认完成；auto-done=可自动项完成(剩人工)；pending-manual=含作业待人工
        const status = st === 'done' ? 'done'
          : st === 'auto-done' ? 'auto-done'
          : st === 'pending-manual' ? 'pending_manual'
          : 'learning';
        // 🔴 v1.14.0 试用计数：done / auto-done 都是「脚本自动学完」→ auto_finished=true 计入试用额度；
        //   pending_manual / learning 不算（脚本没真正学完）。
        const autoFinished = (status === 'done' || status === 'auto-done');
        await this.reportCourse({
          teacher_id: gz.teacher_id, term,
          term_crs_id: (q && q.termCrsId) || name,
          course_name: name,
          org_id: (q && q.lcmsSystemId) || null,
          total_hours: hours,
          auto_done_hours: autoFinished ? hours : 0,
          manual_done_hours: 0,
          status,
          auto_finished: autoFinished,
        });
        // 🔴 v1.14.0：试用中且本次自动学完刚好用满额度 → 主动复核一次，
        //   立即触发「试用完毕 → 去购买学习卡」提示并暂停（否则要等下一次 5 分钟心跳）。
        if (autoFinished && this.trial && typeof this.trialLimit === 'number' && this.trialLimit >= 0
            && typeof this.trialUsed === 'number' && (this.trialUsed + 1) >= this.trialLimit) {
          setTimeout(() => { try { if (AuthGate.ok) this.gate(); } catch (e) { /* ignore */ } }, 2500);
        }
      } catch (e) { /* ignore */ }
    },

    // 答案查询 / 入库
    async quizAnswer(q) { try { const r = await this.request('POST', '/api/quiz/answer', { question_text: q }, true); return r.ok ? r.data : { found: false }; } catch (e) { return { found: false }; } },
    async quizSubmit(q, a) { try { return await this.request('POST', '/api/quiz/submit', { question_text: q, answer: a }, true); } catch (e) { return null; } },

    // 规则包拉取（v1.12.0）：服务端 AES-256-GCM 加密，用 license/check 签发的会话密钥解密。
    // 明文接口 /api/rule/selectors 已收回给管理员，脚本只走这里。
    async ruleBundle(orgId) {
      if (!this.ruleKid) return { ok: false, status: 409, data: { detail: 'no rule key' } };
      try {
        return await this.request('POST', '/api/rule/bundle',
          { org_id: orgId || 'default', kid: this.ruleKid }, true);
      } catch (e) { return { ok: false, status: 0, data: { detail: e.message } }; }
    },

    // 账号注册 / 登录 / 绑定 gz / 绑定学习卡 / 查 gz 列表
    async register(username, password, question, answer) {
      try { return await this.request('POST', '/api/auth/register', { username, password, security_question: question, security_answer: answer }, false); }
      catch (e) { return { ok: false, data: { detail: e.message } }; }
    },
    async login(username, password) {
      try {
        const r = await this.request('POST', '/api/auth/login', { username, password }, false);
        if (r.ok && r.data && r.data.access_token) {
          this.token = r.data.access_token; this.refreshToken = r.data.refresh_token;
          Store.set('gzal:bk:token', r.data.access_token);
          Store.set('gzal:bk:refresh', r.data.refresh_token);
          return { ok: true };
        }
        return r;
      } catch (e) { return { ok: false, data: { detail: e.message } }; }
    },
    // v1.17.0：免手动登录——脚本账户以「gz 学号」为账号、固定默认密码（ACCOUNT_PASS）；
    //   已存在直接登录，不存在则自动注册后再登录。全程无需用户操作；失败只返回原因，不弹登录框。
    async ensureAccount(gz) {
      if (this.token) return { ok: true, cached: true };
      if (!gz || !gz.teacher_id) return { ok: false, reason: '未识别到 gz 账户' };
      // 失败冷却：同一页面 30s 内不重复尝试，避免门禁/心跳反复打后端
      if (this._autoFailAt && NOW() - this._autoFailAt < 30000) {
        return { ok: false, reason: this._autoFail || '自动登录失败' };
      }
      const user = String(gz.teacher_id).trim();
      // 1) 先登录（多数情况账号已存在）
      let r = await this.login(user, ACCOUNT_PASS);
      if (r && r.ok) return { ok: true };
      // 2) 登录失败 → 自动注册（已存在返回 409，忽略）；随后再登录一次
      try { await this.register(user, ACCOUNT_PASS, ACCOUNT_SEC_Q, ACCOUNT_SEC_A); } catch (e) { /* ignore */ }
      r = await this.login(user, ACCOUNT_PASS);
      if (r && r.ok) return { ok: true };
      const reason = (r && r.data && r.data.detail) || '自动登录失败';
      this._autoFailAt = NOW(); this._autoFail = reason;
      return { ok: false, reason };
    },
    async bindGz() {
      const gz = this.captureGz();
      if (!gz) return { ok: false, data: { detail: '未识别到 gz 账户' } };
      try { return await this.request('POST', '/api/gz/bind', gz, true); }
      catch (e) { return { ok: false, data: { detail: e.message } }; }
    },
    async listGz() {
      try { return await this.request('GET', '/api/gz/list', null, true); }
      catch (e) { return { ok: false, data: [] }; }
    },
    async redeem(code) {
      // 绑定时以"当前脚本页面所在 gz 账户"为准自动绑定（无需先手动绑定），
      // 若该 gz 账户已绑其他脚本账号，后端会改绑到当前账号。
      // 期数由脚本抓取后传给后端（学习卡不预设期数；期数是动态值，每年 2 期）。
      const gz = this.captureGz();
      if (!gz) return { ok: false, data: { detail: '未识别到 gz 账户，请在继教网（i.teacher.gzteacher.com）页面使用' } };
      const term = this.captureTerm();
      if (!term) return { ok: false, data: { detail: '未识别到当前期数，请进入「学习中心」或「课程超市」页面后重试' } };
      try {
        return await this.request('POST', '/api/card/redeem',
          { code, term, teacher_id: gz.teacher_id, user_name: gz.user_name, realname: gz.realname }, true);
      } catch (e) { return { ok: false, data: { detail: e.message } }; }
    },

    // 菜单入口「授权面板」：已授权 → 简单提示；未授权 → 弹面板（学习卡绑定）
    async openPanel() {
      this.init();
      const r = await this.licenseCheck();
      if (r && r.authorized) {
        Notifier.banner('✅ 已授权，可以开始自动学习了', { level: 'info', ttl: 6000, force: true });
        return;
      }
      // 构建号不符：不是账号问题 → 不弹登录面板，只提示去主页更新
      if (r && (r.buildMismatch || r.code === 'build_mismatch')) {
        try { Backend.buildMismatchNotice(r.reason || '脚本版本已过期', r.latestBuild); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return;
      }
      // 🔴 v1.17.4：脚本被改动（完整性自检被拒）→ 不弹授权面板，只提示去主页重装
      if (r && (r.scriptTampered || r.code === 'script_tampered')) {
        try { Backend.tamperNotice(r.reason || '脚本文件被修改'); } catch (e) { /* ignore */ }
        try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        return;
      }
      // 🔴 v1.13.1：未登录继教网 → 不弹脚本登录/学习卡框，只提醒先手动登录平台
      if (r && r.needGzLogin) {
        Stage.notifyLogin(true);
        return;
      }
      // 已登录但不在学习中心/课程超市 → 引导进入（那里才识别得到账户与期数）
      if (r && r.needStudyPage) {
        const gone = (CFG.autoGoStudyCenter !== false) && Stage.onGz() && Stage.goStudyCenter('需要识别账户/期数');
        if (!gone) Notifier.banner('⚠ ' + ((r && r.reason) || '请打开学习中心') + '。', { level: 'warn', force: true, ttl: 8000 });
        return;
      }
      this.showAuthPanel((r && r.reason) || '未授权', r);
    },

    // 授权/账号面板（未授权时弹出，提供登录/注册/绑定入口）
    // opts: 门禁结果（needBuy 时展示「去主页购买学习卡」入口 + 期数提示）
    showAuthPanel(reason, opts) {
      if (!IS_TOP) return;
      const id = 'gzal-auth-panel';
      const old = document.getElementById(id);
      // 已开着同一原因的面板（心跳/多路径重复调用）→ 不重建，避免把用户正在输入的账号密码冲掉
      if (old && old.getAttribute('data-reason') === String(reason || '')) return;
      if (old) old.remove();
      const buy = !!(opts && (opts.needBuy || opts.buy));
      const term = (opts && opts.term) || null;
      const el = document.createElement('div');
      el.id = id;
      el.setAttribute('data-reason', String(reason || ''));
      el.innerHTML = '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:#fff;border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.2);padding:20px;width:340px;font:13px/1.6 sans-serif;color:#333;">'
        + '<div style="font-size:15px;font-weight:600;margin-bottom:6px;">广州继教网自动学习助手</div>'
        + '<div style="color:#d4380d;margin-bottom:12px;">⚠ ' + (reason || '未授权') + '</div>'
        + (buy
          ? '<div style="background:#FFF7E6;border:1px solid #FFD591;border-radius:6px;padding:8px;margin-bottom:10px;font-size:12px;color:#874d00;">'
            + '本' + (term ? '「' + term + '期」' : '') + '学习权限需购买学习卡。<a href="#" id="gzal-auth-buy" style="color:#096dd9;font-weight:600;">去主页购买 / 查看学习卡 ↗</a>'
            + '</div>'
          : '')
        + '<div id="gzal-auth-body"></div>'
        + '<div style="margin-top:8px;text-align:right;"><button id="gzal-auth-close" style="padding:4px 12px;cursor:pointer;">关闭</button></div>'
        + '</div>';
      document.body.appendChild(el);
      document.getElementById('gzal-auth-close').onclick = () => el.remove();
      const buyEl = document.getElementById('gzal-auth-buy');
      if (buyEl) buyEl.onclick = (ev) => { ev.preventDefault(); this.openHome(); };
      this._renderAuthBody();
    },

    // 渲染账号区（v1.17.0 免手动登录：仅保留「期数 + 学习卡绑定」，不显示任何个人身份信息）
    _renderAuthBody() {
      const body = document.getElementById('gzal-auth-body');
      if (!body) return;
      if (!this.token) {
        // 账号自动注册/登录，不提供手动登录入口
        body.innerHTML = '<div style="color:#d4380d;">正在自动登录账号…若长时间无响应，请刷新本页重试</div>';
        return;
      }
      const term = this.captureTerm();
      body.innerHTML = '<div style="margin-bottom:8px;">期数：<b>' + (term ? term + ' 期' : '<span style="color:#d4380d;">未识别</span>') + '</b></div>'
        + '<div style="margin-bottom:8px;">学习卡：<input id="gzal-auth-code" style="width:180px;padding:4px;border:1px solid #ccc;border-radius:4px;" placeholder="输入学习卡"></div>'
        + '<div><button id="gzal-auth-redeem" style="padding:5px 14px;cursor:pointer;margin-right:6px;">绑定学习卡</button>'
        + '<button id="gzal-auth-recheck" style="padding:5px 14px;cursor:pointer;margin-right:6px;">重新校验</button>'
        + '<span id="gzal-auth-msg" style="color:#d4380d;font-size:12px;margin-left:6px;"></span></div>'
        + '<div style="margin-top:6px;font-size:12px;color:#999;">没有学习卡？<a href="#" id="gzal-auth-buy2" style="color:#096dd9;">去主页购买 ↗</a>　绑定后自动授权当前账户</div>';
      document.getElementById('gzal-auth-redeem').onclick = () => this._doRedeem();
      document.getElementById('gzal-auth-recheck').onclick = () => location.reload();
      const b2 = document.getElementById('gzal-auth-buy2');
      if (b2) b2.onclick = (ev) => { ev.preventDefault(); this.openHome(); };
    },

    _msg(s) { const m = document.getElementById('gzal-auth-msg'); if (m) m.textContent = s; },

    async _doRedeem() {
      const el = document.getElementById('gzal-auth-code');
      const code = el ? el.value.trim().toUpperCase() : '';
      if (!code) { this._msg('请输入学习卡'); return; }
      if (!this.captureGz()) { this._msg('未识别到 gz 账户，请在继教网页面使用'); return; }
      if (!this.captureTerm()) { this._msg('未识别到当前期数，请进入「学习中心」或「课程超市」再绑定'); return; }
      this._msg('绑定中…');
      const r = await this.redeem(code);
      if (r.ok) { this._msg('绑定成功，正在重新校验…'); setTimeout(() => location.reload(), 800); return; }
      if (r.status === 401 || !this.token) {
        // 令牌续期失败 → 清除登录态；下次门禁会自动重新注册/登录
        this._clearAuth(); this._renderAuthBody();
        this._msg('登录已过期，正在自动重登，请稍后重试');
        return;
      }
      this._msg((r.data && r.data.detail) || '绑定失败');
    },
  };

  /* ================================================================
   * 17.6 规则包（v1.12.0）· 核心规则由后端加密下发，本地不再内置兜底
   *   - 选择器 / 活动分类关键词 / 完成阈值全部来自 /api/rule/bundle（AES-256-GCM + HMAC）
   *   - 密钥由 license/check 按会话签发，仅存内存；解不出 = 没有规则 = isPaused() 恒真
   *   - 因此「改脚本把授权变量写死」不再有效：没有密钥就拿不到规则，脚本什么也做不了
   * ================================================================ */
  const RULE_REQUIRED = ['selectors', 'videoActivityTexts', 'manualActivityTexts',
    'softActivityTexts', 'activityGoTexts'];
  const RULE_REQUIRED_SEL = ['video', 'playBtn', 'quizPopup', 'quizOption', 'quizSubmit',
    'activityBtn', 'chapterItem'];

  const RulePack = {
    ok: false, version: 0, orgId: null, reason: '', _loading: null,

    _bytes(s) { return Uint8Array.from(atob(String(s || '')), (c) => c.charCodeAt(0)); },

    async _decode(pack) {
      const subtle = (window.crypto && window.crypto.subtle) || null;
      if (!subtle) throw new Error('当前页面不支持 WebCrypto（需 https 页面）');
      if (!Backend.ruleKey) throw new Error('缺少规则密钥，请重新授权');
      const raw = this._bytes(Backend.ruleKey);
      const enc = new TextEncoder();
      // ① 验签（HMAC-SHA256，防中间人替换密文）
      const hm = await subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
      const signed = enc.encode(`${pack.aad}|${pack.iv}|${pack.ct}`);
      const good = await subtle.verify('HMAC', hm, this._bytes(pack.sig), signed);
      if (!good) throw new Error('规则包签名校验失败');
      // ② 解密（AES-256-GCM，AAD = org|version）
      const key = await subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
      const plain = await subtle.decrypt(
        { name: 'AES-GCM', iv: this._bytes(pack.iv), additionalData: enc.encode(pack.aad) },
        key, this._bytes(pack.ct));
      return JSON.parse(new TextDecoder().decode(plain));
    },

    // 合并规则：下发值覆盖本地空壳 → 再把用户面板改过的可调项盖回来
    apply(rule, orgId) {
      for (const k of RULE_REQUIRED) {
        if (!rule[k] || (Array.isArray(rule[k]) && !rule[k].length)) throw new Error('规则包缺少 ' + k);
      }
      const sel = rule.selectors || {};
      for (const k of RULE_REQUIRED_SEL) {
        if (!Array.isArray(sel[k]) || !sel[k].length) throw new Error('规则包缺少选择器 ' + k);
      }
      const userCfg = {};
      CFG_TUNABLE.forEach((k) => { if (k in CFG) userCfg[k] = CFG[k]; });
      CFG = deepMerge(CFG, rule);
      CFG_TUNABLE.forEach((k) => { if (k in userCfg) CFG[k] = userCfg[k]; });
      this.ok = true; this.reason = ''; this.orgId = orgId || null; this.version = rule.__v || this.version;
    },

    // 拉取 + 解密 + 应用。force=false 时已加载过就直接返回。
    async load(force) {
      if (this.ok && !force) return true;
      if (this._loading) return this._loading;
      this._loading = (async () => {
        try {
          const orgId = (PLATFORM_INFO && PLATFORM_INFO.lcmsSystemId) || 'default';
          let r = await Backend.ruleBundle(orgId);
          if (r.status === 409) {          // 会话密钥过期 → 重新过门禁换新密钥，再试一次
            log('warn', '规则密钥已过期，重新授权换取');
            await Backend.gate();
            if (!AuthGate.ok) throw new Error(AuthGate.reason || '授权未通过');
            r = await Backend.ruleBundle(orgId);
          }
          if (!r.ok || !r.data || !r.data.ct) {
            throw new Error((r.data && (r.data.detail || r.data.reason)) || ('HTTP ' + r.status));
          }
          const rule = await this._decode(r.data);
          this.apply(rule, r.data.org_id);
          this.version = r.data.version;
          log('info', `规则包已加载（机构=${r.data.org_id}，v${r.data.version}，选择器 ${Object.keys(CFG.selectors).length} 组）`);
          return true;
        } catch (e) {
          this.ok = false;
          this.reason = e && e.message ? e.message : String(e);
          log('error', '规则包加载失败（无本地兜底，自动化保持停止）：' + this.reason);
          return false;
        } finally { this._loading = null; }
      })();
      return this._loading;
    },

    // 心跳：密钥快过期 → 重新 gate + 重新拉规则（授权失效时 gate 会置 AuthGate.ok=false）
    async keepFresh() {
      const left = Backend.ruleExp - NOW();
      if (AuthGate.ok && Backend.ruleKey && left > 60000) return true;
      const r = await Backend.gate();
      if (!AuthGate.ok) { this.ok = false; this.reason = AuthGate.reason || '未授权'; return false; }
      return this.load(true);
    },
  };

  /* ================================================================
   * 18. 启动
   * ================================================================ */
  function boot() {
    log('info', `助手加载：${HOST}${IS_TOP ? '（顶层）' : '（iframe）'} ${GM_info && GM_info.script ? 'v' + GM_info.script.version : ''}`);
    // v1.17.4：完整性自检（异步、毫秒级；失败即落第三道门禁 + 提示重装，不可自恢复）
    Integrity.verify().catch((e) => log('error', '[完整性] 自检调用异常：' + e.message));
    if (IS_TOP) Panel.build();
    // v1.13.1：gz 主站（www / i.teacher / study…）挂「登录成功自动接续」+
    //   阶段轮询：用户手动登录后（页面可能只多出「进入个人中心」链接、不自动跳转）→ 重新过门禁并引导进学习中心
    if (IS_TOP && Stage.onGz()) Stage.watchLogin();
    Maintenance.init();                       // E10 定时刷新 + E8 后台节流提醒
    if (IS_TOP) CaptchaWatch.start();         // E5 反爬验证码守卫：检测到图形验证码 → 自动暂停 + 强提醒人工处理，通过后自动恢复
    // 尚睿通学习页：直接在开机时挂监视器。Router.probe 可能因 SPA 早期探测/已启动 L2 而错过本页
    // （实测会出现「L2 已启动但监视器从未启动」→ 资源永不推进，表现为脚本卡住不动）。
    if (PLATFORM === 'yanxiu' && IS_TOP && /\/grain\/course\/.*\/detail/.test(location.href)) Yanxiu.startWatch();
    // 版本升级自愈：清理旧版 bug 残留的错误队列/会话状态。
    // 旧版（v1.3.x）曾在播放页误把章节/活动名（含「去学习>」字样）当作课程名写入 queue/session，
    // 这些错误数据持久化后会干扰新版的 buildQueue 与课程调度。检测到即清空重建。
    try {
      const q = Store.get(K.QUEUE, []);
      const badQueue = q.some((c) => /去学习>|【专家引领】|【互动研讨】|【拓展阅读】/.test(c.name || ''));
      const badCourse = /去学习>/.test(Session.data.course || '');
      if (badQueue || badCourse) {
        log('warn', '检测到旧版残留的错误队列/会话（含「去学习>」等章节名），已自动清空重建');
        Store.set(K.QUEUE, []);
        Session.set({ phase: 'idle', course: '', section: '', paused: false, pausedReason: '', reconcileRound: 0 });
      }
    } catch (e) { /* ignore */ }
    // 一次性迁移（v1.9.10）：早期版本「进度解析 bug」会把未完成课程误标 done/auto-done（漏学）。
    // 升级后清一次本地学习标记，强制全部课程按修复后的逻辑重新评估（只执行一次，持久 flag 防重复）。
    try {
      if (!Store.get('gzal:migrated:progressfix', false)) {
        Store.set(K.COURSES, {});
        Store.set(K.QUEUE, []);
        Store.set('gzal:migrated:progressfix', true);
        log('warn', '一次性迁移（进度解析修复）：已清除本地学习标记，将重新评估全部课程');
      }
    } catch (e) { /* ignore */ }
    // 一次性迁移（v1.10.0）：取消「超星/尚睿通」默认跳过 —— 早期适配期临时置 true 已存进本地配置，
    // 需清掉存储覆盖以套用新默认 false（恢复这两家平台的自动学习）；用户之后仍可在面板自行开关。
    try {
      if (!Store.get('gzal:migrated:skipoff', false)) {
        CFG.skipChaoxing = false;
        CFG.skipYanxiu = false;
        saveConfig();
        Store.set('gzal:migrated:skipoff', true);
        log('warn', '一次性迁移：已取消「超星/尚睿通」默认跳过，恢复自动学习这两家平台');
      }
    } catch (e) { /* ignore */ }
    // skip 开关开启时：清掉 queue 里残留的对应平台课程，避免旧队列里已排队的第三方课卡住调度
    try {
      const q = Store.get(K.QUEUE, []);
      const skipIds = Object.keys(PLATFORMS).filter((pk) => PLATFORMS[pk].skipKey && CFG[PLATFORMS[pk].skipKey]).map((pk) => PLATFORMS[pk].lcmsSystemId);
      // 🚧 未适配平台（v1.7.77）一并清掉：旧队列里若残留这些课，会卡住调度
      const blockedIds = skipIds.concat(Object.keys(UNADAPTED_ORGS));
      const filtered = blockedIds.length ? q.filter((c) => !blockedIds.includes(c.lcmsSystemId)) : q;
      if (filtered.length !== q.length) { Store.set(K.QUEUE, filtered); log('warn', `已从队列移除 ${q.length - filtered.length} 门不可自动学习的课程（skip 开关 / 未适配平台）`); }
    } catch (e) { /* ignore */ }
    if (!CFG.enabled) { log('warn', '总开关关闭，待命中（菜单可开启）'); return; }
    // E7：离线启动先待命，网络恢复时由 online 监听唤醒续学
    if (IS_TOP && !navigator.onLine) { log('warn', 'E7：当前离线，等待网络恢复'); L2.pause(); Session.set({ paused: true, pausedReason: '网络断开' }); }
    if (Session.data.paused && Session.data.pausedReason && Session.data.pausedReason !== '网络断开') {
      // 自愈：若当前已在「学习中心」且能识别到「去学习」入口，说明学习权限已开通，
      // 之前的「选课待缴费/未开通」暂停是误判（课程超市筛选 tab 误触发）或已过时，自动恢复。
      if (/\/studyCenter\//.test(location.href) && L0.findStudyButtons().length) {
        log('warn', '检测到学习中心已可学习，自动清除旧的暂停状态（' + Session.data.pausedReason + '）恢复自动化');
        SessionGuard.reset(); L2.resume();
        Session.set({ paused: false, pausedReason: '', reconcileRound: 0 });
      } else if (/反爬|验证码/.test(Session.data.pausedReason) && !CaptchaWatch.detect()) {
        // 反爬验证码类暂停：刷新/返回后若验证码已消失（人工已通过），自动恢复，无需人工再点「继续」
        log('warn', '检测到验证码已通过（' + Session.data.pausedReason + '），自动恢复自动学习');
        SessionGuard.reset(); L2.resume();
        Session.set({ paused: false, pausedReason: '', reconcileRound: 0 });
      } else if (/需人工处理|未知弹窗|随堂提问|答题|未授权|未登录|登录已过期|会话过期|无法识别 gz|无法识别期数|学习卡|卡密|规则包|后端不可达|离线|脚本需更新|构建号/.test(Session.data.pausedReason)) {
        // 人机协作/答题弹窗类、以及「授权/身份识别」类暂停：页面刷新后旧状态已重置，
        // 且 boot 会重新做一次授权校验 → 直接清除暂停态，交由授权门禁决定是否继续（避免卡在旧暂停）。
        log('warn', '检测到旧的人机协作暂停态已随刷新重置，自动恢复：' + Session.data.pausedReason);
        SessionGuard.reset(); L2.resume();
        Session.set({ paused: false, pausedReason: '', reconcileRound: 0 });
      } else {
        Notifier.banner(`上次因「${Session.data.pausedReason}」暂停中。处理完毕请点菜单"继续自动化"。`, { level: 'warn', ttl: 10000, force: true, actionText: '立即继续', onAction: () => { SessionGuard.reset(); L2.resume(); Session.set({ paused: false, pausedReason: '' }); } });
        L2.pause();
      }
    }
    setTimeout(() => {
      Backend.init();
      Backend.gate().then(async (r) => {
        if (r && r.authorized) {
          log('info', '后端授权通过');
          // 🔴 v1.12.0：核心规则（选择器/关键词/阈值）必须由后端加密下发；
          //    拉不到 = 没有任何本地兜底 = 自动化不启动（这是「删掉本地兜底」的落点）。
          const ruleOk = await RulePack.load();
          if (!ruleOk) {
            const why = RulePack.reason || '未知原因';
            L2.pause();
            Session.set({ paused: true, pausedReason: '规则包不可用：' + why });
            Notifier.banner('核心规则未下发（' + why + '），自动化已停止；请检查后端服务', { level: 'error', ttl: 12000, force: true });
            return;
          }
          // 🔴 v1.12.0：授权 + 规则都就绪 → 清掉「环境型」旧暂停。
          //    这类暂停的原因（后端没开 / 规则没下发 / 令牌过期）此刻已经不存在，
          //    不清就会卡在「已暂停」等用户手点继续（实测踩过）。
          if (Session.data.paused && /后端不可达|规则包|未授权|未登录|会话过期|登录已过期|离线|脚本需更新|构建号/.test(Session.data.pausedReason || '')) {
            log('info', '环境已恢复（授权 + 规则就绪），清除旧暂停：' + Session.data.pausedReason);
            SessionGuard.reset();
            try { L2._pauseFlag = false; } catch (e) { /* ignore */ }
            Session.set({ paused: false, pausedReason: '' });
          }
          Router.probe();
        } else {
          const reason = (r && r.reason) || '未授权';
          log('warn', '后端授权失败：' + reason);
          L2.pause();
          // 🔴 构建号不符（脚本过期）：只提示"去主页更新脚本"，不弹登录/学习卡面板
          if (r && (r.buildMismatch || r.code === 'build_mismatch')) {
            Session.set({ paused: true, pausedReason: '脚本需更新（构建号不符）' });
            Backend.buildMismatchNotice(reason, r.latestBuild);
            try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
            return;
          }
          Session.set({ paused: true, pausedReason: reason });
          // 🔴 v1.13.1：门禁未过要按「卡在哪一步」分流，不能一律弹脚本登录/学习卡框：
          //   ① 未登录继教网 → 只提醒手动登录（用户还没登录平台，弹脚本框毫无意义、还挡住登录框）
          //   ② 已登录但不在学习中心/课程超市 → 引导进入（那里才能识别 gz 账户与期数）
          //   ③ 脚本账户（自动注册/登录）+ 无学习卡 → 才弹面板（学习卡绑定）
          if (r && r.needGzLogin) {
            try { Stage.notifyLogin(true); } catch (e) { /* ignore */ }
          } else if (r && r.needStudyPage) {
            const gone = (CFG.autoGoStudyCenter !== false) && Stage.onGz() && Stage.goStudyCenter('需要识别账户/期数');
            if (!gone) {
              Notifier.banner('⚠ ' + reason + '。请打开「学习中心」或「课程超市」页面。', { level: 'warn', force: true, ttl: 8000 });
            }
          } else if (r && r.showPanel) {
            Backend.showAuthPanel(reason, r);
          }
          try { Panel && Panel.refresh && Panel.refresh(); } catch (e) { /* ignore */ }
        }
      }).catch((e) => {
        log('error', '后端不可达：' + e.message);
        L2.pause();
        Session.set({ paused: true, pausedReason: '后端不可达（离线不降级）' });
      });
    }, 1200);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
