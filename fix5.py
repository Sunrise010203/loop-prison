a = open("E:/loop-prison/js/aiPlayer.js", "r", encoding="utf-8").read()

# Find _calcAdaptiveParams and replace its entire body
idx1 = a.find("_calcAdaptiveParams(obstacle)")
idx2 = a.find("_doAdaptiveJump()")
if idx1 >= 0 and idx2 >= 0:
    # Find the end of this function
    body_start = a.find("{", idx1)
    body_end = a.find("},", idx2)
    # Find the function body end more precisely
    depth = 0
    func_end = body_start
    for i in range(body_start, len(a)):
        if a[i] == "{": depth += 1
        elif a[i] == "}":
            depth -= 1
            if depth == 0:
                func_end = i + 1
                break
    print(f"Function body: {body_start} to {func_end}")
    print(f"Old text: {a[idx1:func_end][:100]}...")
else:
    print("NOT FOUND")
    exit()

new_func = """  _calcAdaptiveParams(obstacle) {
    if (!obstacle) return { jumpVel: -500, stepDist: 300, direction: 1, speed: 140 };

    // 读取当前音量（0~1）
    var vol = 0.5;
    if (window.game.voiceControl && typeof window.game.voiceControl.getVolume === "function") {
      vol = Math.max(0.1, Math.min(1, window.game.voiceControl.getVolume()));
    }
    // 音量映射：0.1(耳语)=>0.5  0.5(正常)=>1.0  1.0(大喊)=>1.8
    var volFactor = 0.3 + vol * 1.5;

    const G = window.game.GRAVITY || 800;
    const h = obstacle.requiredHeight;
    const d = obstacle.requiredDistance;

    // 跳跃速度 = 基础值 * 音量倍率（大声=跳更高）
    const requiredVel = -Math.sqrt(2 * G * h) * 1.3 * volFactor;
    const jumpVel = Math.max(-1200, Math.min(-300, Math.round(requiredVel)));

    // 步进距离 = 障碍宽度 * 1.5 * 音量倍率
    const stepDist = Math.min(600, Math.max(d * 1.5 * volFactor, 150));

    // 水平速度 = 障碍宽度 * 0.8 * 音量倍率
    const speed = Math.min(350, Math.max(120, Math.round(d * 0.8 * volFactor)));

    console.log("[AI] 自适应: vol=" + vol.toFixed(2) + "x" + volFactor.toFixed(2) + " 初速=" + jumpVel + " 步进=" + stepDist + " 速度=" + speed + " dir=" + (obstacle.direction > 0 ? "R" : "L"));
    return { jumpVel: jumpVel, stepDist: stepDist, direction: obstacle.direction, speed: speed };
  },"""

a = a[:idx1] + new_func + a[func_end:]
open("E:/loop-prison/js/aiPlayer.js", "w", encoding="utf-8").write(a)
print("_calcAdaptiveParams replaced successfully")