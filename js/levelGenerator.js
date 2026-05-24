/* ============================================================
 * 程序化关卡生成器 — 《修复·循环监狱》
 *
 * 使用种子随机数生成无限关卡。平台布局为"左右双之字形"：
 *   左边一条之字形链，右边一条之字形链，
 *   各自独立上升，在最高处汇聚到中央终点区。
 * 垂直间距约 76px，玩家恰好一次跳一个平台，无法跳级。
 *
 * 【依赖】window.game（挂载点）
 * 【提供】window.game.levelGenerator.generate(levelIndex) → LevelData
 * ============================================================ */

(function() {
  'use strict';

  // ============================================================
  // 种子随机数 (mulberry32)
  // ============================================================
  function createRNG(seed) {
    var s = seed | 0;
    return function() {
      s = s + 0x6D2B79F5 | 0;
      var t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ============================================================
  // 主题词库
  // ============================================================
  var MODULES = [
    '防火墙规则', '内存碎片整理', '进程调度器', '文件系统索引',
    '网络协议栈', '加密算法库', '日志采集器', '缓存淘汰策略',
    '数据库查询优化', '权限验证网关', '消息队列缓冲', '负载均衡调度',
    '数据压缩流水线', '线程池管理', '异常捕获器', '沙箱隔离层',
    '序列化适配器', '路由转发表', 'DNS解析缓存', '流量整形器',
    '磁盘I/O调度', '信号量管理', '管道通信', '共享内存映射',
    '中断向量表', '系统调用接口', '页表管理器', '时钟同步服务'
  ];

  var BACKGROUNDS = [
    '#0a0a1a', '#0f0a1a', '#0a0f1a', '#0a1a0f', '#1a0a0a',
    '#0a1a1a', '#1a0a1a', '#0a0a12', '#0f0f1a', '#1a0f0a',
    '#0a0a18', '#120a1a', '#0a120a', '#1a120a', '#0a0a14'
  ];

  var FINISH_LABELS = [
    '修复完成', '重启开关', '核心重置', '系统恢复', '稳定锚点',
    '数据净化', '缓存刷新', '同步节点'
  ];

  // ============================================================
  // 物理常量
  //
  // 玩家：JUMP_VELOCITY=-380, GRAVITY=800 → max height ≈ 90.25 px
  //       max horizontal @ peak ≈ 85.5 px
  // AI：  JUMP_VELOCITY=-300, GRAVITY=800 → max height ≈ 56.25 px
  //
  // PLATFORM_GAP_Y = 82：玩家恰好能跳上一个平台，无法跳两级（2×82=164 > 90）
  // ============================================================

  /** 玩家参数：相邻平台垂直间距（px）。76×2=152 > 90(player max)，不能跳级 */
  var PLATFORM_GAP_Y = 76;
  /** 玩家参数：同一分支相邻平台水平偏移 */
  var PLATFORM_GAP_X = 60;
  /** 每步分叉向外扩散量（左右各扩 ~50px，3-4 步即可覆盖全屏宽度） */
  var BRANCH_SPREAD = 50;
  /** 底部主干平台数量 */
  var TRUNK_COUNT = 3;
  /** 平台最小 Y（不能太靠近画布顶部，给终点区留空间） */
  var MIN_PLATFORM_Y = 100;
  /** 角色站立时脚底 Y（站在 y=560 的地面上，32px 高角色） */
  var CHAR_FEET_ON_GROUND = 536;
  /** AI 可跳跃高度（用于辅助平台生成） */
  var AI_JUMP_UP = 50;
  /** AI 可跳跃水平距离 */
  var AI_JUMP_DIST = 80;

  // ============================================================
  // AABB 重叠检测工具
  // ============================================================

  /** 检测矩形是否与列表中任意矩形 AABB 重叠 */
  function overlapsAny(nx, ny, nw, nh, list) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (nx < e.x + e.w && nx + nw > e.x &&
          ny < e.y + e.h && ny + nh > e.y) {
        return true;
      }
    }
    return false;
  }

  /** 微调位置以避开重叠，返回 {x,y} 或 null */
  function nudgeAway(nx, ny, nw, nh, existing) {
    var offsets = [
      [0, -4], [0, 4], [-6, 0], [6, 0],
      [0, -8], [0, 8], [-10, 0], [10, 0],
      [0, -14], [0, 14], [-16, 0], [16, 0],
      [0, -20], [0, 20], [-22, 0], [22, 0]
    ];
    for (var o = 0; o < offsets.length; o++) {
      var tx = nx + offsets[o][0];
      var ty = ny + offsets[o][1];
      if (ty < 15 || tx < 3 || tx + nw > 797) continue;
      if (!overlapsAny(tx, ty, nw, nh, existing)) {
        return { x: tx, y: ty };
      }
    }
    return null;
  }

  function clampX(x, w) {
    w = w || 0;
    return Math.max(5, Math.min(790 - w, Math.round(x)));
  }

  // ============================================================
  // 关卡生成主函数
  // ============================================================

  function generateLevel(levelIndex) {
    var rng = createRNG(levelIndex * 7919 + 104729);
    var difficulty = 1 - Math.exp(-levelIndex * 0.06);
    var isBoss = (levelIndex > 0 && levelIndex % 10 === 0);

    // ---- 模块名 ----
    var moduleIdx = levelIndex % MODULES.length;
    var version = levelIndex < MODULES.length ? '' : ' v' + (Math.floor(levelIndex / MODULES.length) + 1);
    var moduleName = '模块：' + MODULES[moduleIdx] + version;

    // ---- 背景 ----
    var bg = BACKGROUNDS[levelIndex % BACKGROUNDS.length];

    // ---- 时限 ----
    var timeLimit = Math.round(Math.max(25, 180 - difficulty * 80));
    if (isBoss) timeLimit = Math.round(timeLimit * 0.7);

    // ---- 平台数量（由倒Y形结构自然决定，不做硬性填充） ----
    var targetCount = Math.floor(10 + difficulty * 12);
    if (isBoss) targetCount += 6;
    // 实际生成数不超过可容纳的最大值
    var platformCount = Math.min(targetCount, 24);

    // ---- 地面段 ----
    var gapStart = Math.round(180 + rng() * 80);       // 180-260
    var gapEnd = Math.round(gapStart + 60 + rng() * 100); // gapStart+60 ~ gapStart+160
    if (gapEnd > 400) gapEnd = 400;                     // 钳制，确保左右地面够长
    var gapWidth = gapEnd - gapStart;

    var groundPlatforms = [
      { x: 0, y: 560, w: gapStart, h: 40 },
      { x: gapEnd, y: 560, w: 800 - gapEnd, h: 40 }
    ];

    // ---- 之字形平台路径 ----
    var pathPlatforms = generateZigzag(rng, platformCount, gapStart, gapEnd, isBoss);

    // ---- 终点区（宽大，左右顶部平台都能跳到） ----
    // 找 Y 最小的平台（最高点）
    var highestPf = pathPlatforms.reduce(function(a, b) { return a.y < b.y ? a : b; });
    var finishLabel = FINISH_LABELS[levelIndex % FINISH_LABELS.length];
    var finishZone = {
      x: clampX(300, 0),
      y: Math.round(Math.max(25, highestPf.y - 72)),
      w: 150,
      h: 58,
      label: finishLabel
    };

    // ---- AI 路径验证与辅助平台 ----
    pathPlatforms = ensureAIPath(pathPlatforms, finishZone, gapEnd);

    // ---- 合并所有平台 ----
    var allPlatforms = groundPlatforms.concat(pathPlatforms);

    // ---- 致命障碍（仅地面） ----
    var deadly = generateDeadly(rng, gapStart, gapEnd, difficulty, isBoss);

    // ---- 固体障碍（左右分支之间的空隙） ----
    var solid = generateSolid(rng, pathPlatforms, deadly, difficulty, isBoss);

    // ---- 按钮（放在主干中间平台） ----
    var button = generateButton(pathPlatforms);

    // ---- 过滤与按钮重叠的障碍 ----
    deadly = filterOverlapping(deadly, button);
    solid = filterOverlapping(solid, button);

    // ---- 红线 ----
    var finishBottom = finishZone.y + finishZone.h;
    var minRedY = finishBottom + 10;
    var maxRedY = Math.min(button.y - 15, 380);
    if (maxRedY <= minRedY) maxRedY = minRedY + 35;
    var redLineY = Math.round(minRedY + rng() * (maxRedY - minRedY));

    // ---- 子弹高度 ----
    var bulletHeights = pickBulletHeights(rng, pathPlatforms, difficulty, isBoss);

    // ---- 出生点安全区：清除附近致命障碍 ----
    var playerSpawn = { x: 30, y: 500 };
    var aiSpawn = { x: 720, y: 500 };
    deadly = filterNearSpawn(deadly, playerSpawn);
    deadly = filterNearSpawn(deadly, aiSpawn);

    return {
      moduleName: moduleName,
      background: bg,
      timeLimit: timeLimit,
      playerSpawn: playerSpawn,
      aiSpawn: aiSpawn,
      platforms: allPlatforms,
      solidObstacles: solid,
      deadlyObstacles: deadly,
      finishZone: finishZone,
      bulletHeights: bulletHeights,
      redLineY: redLineY,
      button: button
    };
  }

  // ============================================================
  // 之字形平台路径生成（左一块、右一块交替上升）
  //
  // 结构：
  //   平台按「左、右、左、右」交替排列，形成之字形上升路线。
  //   左边小人从左地面起跳，右边小人从右地面起跳，
  //   两个角色共享同一条之字形链，逐步向上到达终点。
  //
  //        [==== finish zone (x:300-450) ====]
  //                 ↗ (jump up-left)
  //        [P: right, x≈380]
  //               ↗ (jump up-left)
  //      [P: left, x≈310]
  //             ↗ (jump up-right)
  //        [P: right, x≈380]
  //               ↗
  //      [P: left, x≈310]
  //         ↗                   ↖
  //   [left ground]        [right ground]
  //
  // 水平间距 ~70px（约 2 个角色宽度），垂直间距 ~76px。
  // ============================================================

  // ============================================================
  // 左右双之字形平台路径生成
  //
  // 结构：
  //   左边一个之字形链，右边一个之字形链，各自独立上升，
  //   在最高处汇聚到中央终点区。
  //
  //        [====== finish zone (x:300-450) ======]
  //         ↗                              ↖
  //    L4 (x≈260)                     R4 (x≈480)
  //         ↗                              ↖
  //    L3 (x≈190)                     R3 (x≈550)
  //         ↗                              ↖
  //    L2 (x≈250)                     R2 (x≈490)
  //         ↗                              ↖
  //    L1 (x≈180)                     R1 (x≈560)
  //         ↗                              ↖
  //    L0 (x≈150)                     R0 (x≈590)
  //         ↑                              ↑
  //   [left ground]                 [right ground]
  //
  // 每条之字形内部水平间距 ~70px（约 2 个角色宽度）。
  // 顶部平台向中心靠拢，确保终点区可达。
  // ============================================================

  /** 左之字：左侧位置 */
  var LEFT_ZIG_LEFT = 170;
  /** 左之字：右侧位置 */
  var LEFT_ZIG_RIGHT = 250;
  /** 右之字：左侧位置 */
  var RIGHT_ZIG_LEFT = 490;
  /** 右之字：右侧位置 */
  var RIGHT_ZIG_RIGHT = 570;

  function generateZigzag(rng, count, gapStart, gapEnd, isBoss) {
    var platforms = [];
    var groundY = 536;

    var firstY = roundRange(groundY - 30 - rng() * 14, groundY - 44, groundY - 25);
    var maxVerticalSteps = Math.floor((firstY - MIN_PLATFORM_Y) / PLATFORM_GAP_Y);
    if (maxVerticalSteps < 3) maxVerticalSteps = 3;

    // 每层 2 个平台（左之字 + 右之字）
    var totalSteps = Math.min(maxVerticalSteps, Math.max(3, Math.ceil(count / 2)));
    if (totalSteps < 3) totalSteps = 3;

    for (var step = 0; step < totalSteps; step++) {
      var sy = firstY - step * PLATFORM_GAP_Y - rng() * 5;
      sy = Math.max(MIN_PLATFORM_Y, sy);
      var stepY = Math.round(sy);

      // ---- 左之字平台 ----
      // step 0: 贴近左侧地面；step 1+: 左右交替
      // 最后 2 步向中心靠拢（+30px rightward）
      var lBaseX;
      if (step === 0) {
        lBaseX = clampX(gapStart - 30 + rng() * 25, 0);
      } else {
        var zigLeft = (step % 2 === 1) ? LEFT_ZIG_RIGHT : LEFT_ZIG_LEFT;
        // 顶部收敛
        var stepsFromTop = totalSteps - 1 - step;
        var convergeL = (stepsFromTop < 2) ? (2 - stepsFromTop) * 25 : 0;
        lBaseX = clampX(zigLeft + convergeL + rng() * 15);
      }
      var lw = roundRange(48 + rng() * 22, 40, 70);
      var lpx = clampX(lBaseX - lw / 2);
      if (overlapsAny(lpx, stepY, lw, 14, platforms)) {
        var ln = nudgeAway(lpx, stepY, lw, 14, platforms);
        if (ln) { lpx = ln.x; stepY = ln.y; }
      }
      platforms.push({ x: lpx, y: stepY, w: lw, h: 14, _zigzag: 'L' + step });

      // ---- 右之字平台 ----
      var rBaseX;
      if (step === 0) {
        rBaseX = clampX(gapEnd + 5 + rng() * 30, 0);
      } else {
        var zigRight = (step % 2 === 1) ? RIGHT_ZIG_LEFT : RIGHT_ZIG_RIGHT;
        var stepsFromTopR = totalSteps - 1 - step;
        var convergeR = (stepsFromTopR < 2) ? -(2 - stepsFromTopR) * 25 : 0;
        rBaseX = clampX(zigRight + convergeR + rng() * 15);
      }
      var rw = roundRange(48 + rng() * 22, 40, 70);
      var rpx = clampX(rBaseX - rw / 2);
      var ry = Math.round(sy + rng() * 4 - 2);
      if (overlapsAny(rpx, ry, rw, 14, platforms)) {
        var rn = nudgeAway(rpx, ry, rw, 14, platforms);
        if (rn) { rpx = rn.x; ry = rn.y; }
      }
      platforms.push({ x: rpx, y: ry, w: rw, h: 14, _zigzag: 'R' + step });
    }

    return platforms;
  }

  // ============================================================
  // 致命障碍生成（仅地面，不放在平台上）
  // ============================================================

  function generateDeadly(rng, gapStart, gapEnd, difficulty, isBoss) {
    var deadly = [];

    // 地面缺口始终致命
    deadly.push({
      x: gapStart,
      y: 550,
      w: gapEnd - gapStart,
      h: 10
    });

    // 高难度：在右侧地面边缘增加尖刺
    if (difficulty > 0.35) {
      var spikeW = Math.round(20 + rng() * 40);
      deadly.push({
        x: Math.round(730 + rng() * 40),
        y: 550,
        w: spikeW,
        h: 10
      });
    }

    // 极高难度：左侧地面边缘也加尖刺
    if (difficulty > 0.6) {
      deadly.push({
        x: Math.round(rng() * 30),
        y: 550,
        w: Math.round(15 + rng() * 25),
        h: 10
      });
    }

    return deadly;
  }

  // ============================================================
  // 固体障碍生成（放在之字形外侧，不遮挡跳跃路径）
  // ============================================================

  function generateSolid(rng, platforms, deadly, difficulty, isBoss) {
    var solid = [];
    var count = Math.floor(2 + difficulty * 6);
    if (isBoss) count += 3;
    if (platforms.length < 4) return solid;

    var attempts = 0;
    var maxAttempts = count * 10;

    while (solid.length < count && attempts < maxAttempts) {
      attempts++;

      // 选两个相邻层级（不同高度）的平台对
      var sorted = platforms.slice().sort(function(a, b) { return a.y - b.y; });
      var idx = Math.floor(rng() * Math.max(1, sorted.length - 2));

      var pLower = sorted[idx];
      var pUpper = sorted[Math.min(idx + 1 + Math.floor(rng() * 2), sorted.length - 1)];

      // 石块放在两个平台高度之间
      var midY = (pLower.y + pUpper.y) / 2 + (rng() - 0.5) * 20;
      midY = Math.max(MIN_PLATFORM_Y + 10, Math.min(540, midY));

      // 石块放在之字形外侧（左侧或右侧），避免挡住跳跃路径
      var onLeft = rng() < 0.5;
      var midX;
      if (onLeft) {
        // 左侧外侧：x 30-260
        midX = 40 + rng() * 220;
      } else {
        // 右侧外侧：x 480-760
        midX = 480 + rng() * 280;
      }
      midX = clampX(midX);

      var sw = roundRange(18 + rng() * 28, 15, 45);
      var sh = roundRange(14 + rng() * 22, 12, 35);
      var sx = clampX(midX - sw / 2);
      var sy = Math.round(midY);

      // 不与任何平台重叠
      if (overlapsAny(sx, sy, sw, sh, platforms)) continue;
      // 不与任何地刺重叠
      if (overlapsAny(sx, sy, sw, sh, deadly)) continue;
      // 不与其他石块重叠
      if (overlapsAny(sx, sy, sw, sh, solid)) continue;
      // 不遮挡终点区
      if (sy < 150) continue;

      solid.push({ x: sx, y: sy, w: sw, h: sh });
    }

    return solid;
  }

  // ============================================================
  // 按钮：放在主干中间平台（左右角色从各自地面都能到达）
  // ============================================================

  function generateButton(platforms) {
    // 放在第一个右侧平台（platforms[1]），AI 从右地面起跳可达
    var btnIdx = Math.min(1, platforms.length - 1);
    var btnPf = platforms[btnIdx];
    return {
      x: clampX(btnPf.x + btnPf.w / 2 - 15),
      y: Math.round(btnPf.y - 7),
      w: 30,
      h: 7
    };
  }

  // ============================================================
  // 过滤与给定矩形重叠的障碍
  // ============================================================

  function filterOverlapping(obstacles, rect) {
    return obstacles.filter(function(obs) {
      return !(
        obs.x < rect.x + rect.w &&
        obs.x + obs.w > rect.x &&
        obs.y < rect.y + rect.h &&
        obs.y + obs.h > rect.y
      );
    });
  }

  // ============================================================
  // 过滤出生点附近的致命障碍
  // ============================================================

  function filterNearSpawn(deadly, spawn) {
    var safeW = 60, safeH = 100;
    return deadly.filter(function(trap) {
      return !(
        trap.x < spawn.x + safeW &&
        trap.x + trap.w > spawn.x - 25 &&
        trap.y < spawn.y + safeH &&
        trap.y + trap.h > spawn.y - 40
      );
    });
  }

  // ============================================================
  // AI 路径验证与辅助平台
  //
  // AI 使用较小的跳跃参数（50px 垂直, 80px 水平）。
  // BFS 从右地面出发，检测是否能到达终点。
  // 若不能，在断连处插入小型辅助平台（_aiHelper: true）。
  // ============================================================

  function ensureAIPath(platforms, finishZone, gapEnd) {
    var MAX_ITERS = 15;
    var AI_FEET = 536;

    function canJump(fromTopY, toTopY, dx) {
      if (Math.abs(dx) > AI_JUMP_DIST) return false;
      var dy = fromTopY - toTopY;
      return dy <= AI_JUMP_UP && dy >= -100;
    }

    var fCx = finishZone.x + finishZone.w / 2;
    var fCy = finishZone.y + finishZone.h / 2;

    for (var iter = 0; iter < MAX_ITERS; iter++) {
      var nodes = platforms.map(function(p, i) {
        return { cx: p.x + p.w / 2, topY: p.y, w: p.w, x: p.x, idx: i };
      });

      var reachable = new Set();
      var queue = [];

      // BFS 起点：AI 从右地面能跳到的平台
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        var aiStandX = Math.max(gapEnd + 10, Math.min(780, n.cx));
        var dxFromGround = n.cx - aiStandX;
        if (Math.abs(dxFromGround) > AI_JUMP_DIST) continue;
        var dyFromGround = AI_FEET - n.topY;
        if (dyFromGround <= AI_JUMP_UP && dyFromGround >= -30) {
          reachable.add(i);
          queue.push(n);
        }
      }

      // AI 无法从地面到达任何平台 → 在右地面旁边插入低平台
      if (reachable.size === 0 && platforms.length > 0) {
        var firstP = platforms[0];
        var helperX = clampX(gapEnd + 30);
        var helperY = AI_FEET - 22;
        if (!overlapsAny(helperX, helperY, 50, 14, platforms)) {
          platforms.push({ x: helperX, y: helperY, w: 50, h: 14, _aiHelper: true });
        }
        continue;
      }

      // BFS
      while (queue.length > 0) {
        var cur = queue.shift();
        for (var i = 0; i < nodes.length; i++) {
          if (!reachable.has(i) && canJump(cur.topY, nodes[i].topY, nodes[i].cx - cur.cx)) {
            reachable.add(i);
            queue.push(nodes[i]);
          }
        }
      }

      // 检查终点可达性
      var finishReachable = false;
      var reachableArr = [];
      for (var i = 0; i < nodes.length; i++) {
        if (reachable.has(i)) {
          reachableArr.push(nodes[i]);
          if (canJump(nodes[i].topY, fCy, fCx - nodes[i].cx)) {
            finishReachable = true;
          }
        }
      }

      if (finishReachable) break;

      // 找最近的可达/不可达对
      var bestDist = Infinity;
      var bestUnreach = null;
      var bestReach = null;

      for (var i = 0; i < nodes.length; i++) {
        if (reachable.has(i)) continue;
        for (var j = 0; j < reachableArr.length; j++) {
          var d = Math.abs(nodes[i].cx - reachableArr[j].cx) + Math.abs(nodes[i].topY - reachableArr[j].topY);
          if (d < bestDist) { bestDist = d; bestUnreach = nodes[i]; bestReach = reachableArr[j]; }
        }
      }

      // 终点作为目标
      if (reachableArr.length > 0) {
        for (var k = 0; k < reachableArr.length; k++) {
          var fd = Math.abs(fCx - reachableArr[k].cx) + Math.abs(fCy - reachableArr[k].topY);
          if (fd < bestDist) { bestDist = fd; bestUnreach = { cx: fCx, topY: fCy, idx: -1 }; bestReach = reachableArr[k]; }
        }
      }

      if (!bestUnreach || !bestReach) break;

      // 如果 bestDist 很小（< 5），说明几乎已连接，退出
      if (bestDist < 5) break;

      var midX = Math.round((bestUnreach.cx + bestReach.cx) / 2);
      var midY = Math.round((bestUnreach.topY + bestReach.topY) / 2);
      midX = Math.max(30, Math.min(750, midX));
      midY = Math.max(50, Math.min(530, midY));

      // 尝试插入辅助平台，位置加微小随机偏移避免重复
      var tryOffsets = [
        [0, 0], [-8, 0], [8, 0], [0, -6], [0, 6],
        [-14, 0], [14, 0], [0, -12], [0, 12]
      ];
      var inserted = false;
      for (var o = 0; o < tryOffsets.length; o++) {
        var hx = clampX(midX + tryOffsets[o][0] - 22);
        var hy = Math.round(midY + tryOffsets[o][1]);
        hy = Math.max(50, Math.min(530, hy));
        if (!overlapsAny(hx, hy, 45, 14, platforms)) {
          platforms.push({ x: hx, y: hy, w: 45, h: 14, _aiHelper: true });
          inserted = true;
          break;
        }
      }

      // 如果所有偏移都重叠，退出避免死循环
      if (!inserted) break;
    }

    return platforms;
  }

  // ============================================================
  // 子弹高度选取
  // ============================================================

  function pickBulletHeights(rng, platforms, difficulty, isBoss) {
    // 从平台 Y 中选出垂直间距 ≥ 60px 的子集
    var sorted = platforms.slice().sort(function(a, b) { return a.y - b.y; });
    var picked = [];

    for (var i = 0; i < sorted.length; i++) {
      var py = sorted[i].y;
      if (picked.length === 0 || Math.abs(py - picked[picked.length - 1]) >= 60) {
        picked.push(py);
      }
      if (picked.length >= 5) break;
    }

    // 子弹在站立角色上身高度：platform.y - 28
    var heights = [];
    for (var i = 0; i < picked.length; i++) {
      heights.push(picked[i] - 28);
    }

    while (heights.length < 2) {
      heights.push(250 + heights.length * 80);
    }

    var rowCount = Math.min(heights.length, 2 + Math.floor(difficulty * 3));
    if (isBoss) rowCount = Math.min(heights.length, rowCount + 1);
    return heights.slice(0, rowCount);
  }

  // ============================================================
  // 小工具
  // ============================================================

  function roundRange(val, min, max) {
    return Math.round(Math.max(min, Math.min(max, val)));
  }

  // ============================================================
  // 导出
  // ============================================================

  window.game.levelGenerator = {
    generate: generateLevel,
    MODULES: MODULES,
    BACKGROUNDS: BACKGROUNDS
  };

})();
