/* ============================================================
 * 突发事件系统 — 成员 B 负责实现
 *
 * 【剧情依赖】window.game.events（活跃事件数组）、window.game.addEventLog（日志输出）
 * 【提供】覆写 window.game.triggerEvent
 * ============================================================ */

/**
 * 突发事件系统。覆写 window.game.triggerEvent 方法，接管事件触发逻辑。
 * 活跃事件存储在 window.game.events 数组中，main.js 每帧调用事件更新并清理过期事件。
 *
 * @typedef {Object} GameEvent
 * @property {string} id - 事件唯一标识
 * @property {string} name - 事件名（如 "防火墙过载"、"内存泄漏"、"数据风暴"）
 * @property {number} duration - 持续时长 (ms)
 * @property {number} startTime - 触发时间戳 (performance.now)
 * @property {function} onStart - 触发时的回调，如产生临时障碍/减速效果
 * @property {function} onEnd - 结束时的回调，恢复游戏状态
 * @property {function} [onUpdate] - 可选的每帧更新回调
 */

/**
 * 触发突发事件。由 main.js 在特定时机调用。
 * 当前为占位实现，仅输出日志。成员 B 将覆写此函数。
 *
 * @param {Object} eventObj - 事件配置对象
 * @param {string} eventObj.name - 事件名称
 * @param {number} [eventObj.duration] - 持续时长 (ms)，默认 5000
 * @param {function} [eventObj.onStart] - 触发时回调
 * @param {function} [eventObj.onEnd] - 结束时回调
 */
window.game.triggerEvent = function(eventObj) {
  // 占位实现：仅输出日志
  window.game.addEventLog(`[事件] ${eventObj.name} 触发`);

  // TODO: 成员 B 接管实现 ——
  // 1. 将事件对象推入 window.game.events 数组
  // 2. 调用 eventObj.onStart()
  // 3. 设置定时器 (eventObj.duration)，到期后调用 onEnd 并从数组中移除
};
