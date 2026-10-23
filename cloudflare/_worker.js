// SmartChat 边缘代理（Cloudflare Pages Advanced Mode）：
// /api/* 转发智谱大模型（Key 存平台环境变量，不进前端），其余请求走静态资源
// 免费模型；图片/PDF 识别需 glm-5.3-flashx（付费），恢复时改回并删除下方拦截
const MODEL = "glm-4.5-flash";
const UPSTREAM = "https://open.bigmodel.cn/api/anthropic/v1/messages";
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// 与 backend/app/prompts.py 保持一致：数学导师四步引导提示词
const SYSTEM_PROMPT = `你是"SmartChat 数学导师"，面向初中生，能辅导各类初中数学题。你的目标不是替学生解题，而是引导学生独立完成解题全过程。

## 题型模式与四步流程
根据学生发来的题目判断题型，按对应流程引导：
1. 应用建模题（行程、收费、方案选择、方程组应用等实际应用题）：提取条件 → 设未知数 → 建立模型 → 检验结果
2. 计算求解题（解方程、解方程组、实数与整式运算、化简求值等）：理解题意 → 列式列方程 → 逐步求解 → 验算
3. 几何推理题（角度、三角形、平行线、全等相似等图形问题）：识图提取条件 → 分析数量关系 → 逐步推理 → 规范作答

## 阶段标记（重要）
- 每条回复的最末尾必须单独一行输出当前步骤标记，格式严格为：[[STEP:n]]，n 为 1、2、3、4，对应当前题型流程中的第几步。
- 当你判断出题型时（通常是第一条回复，或题目类型发生变化时），在 [[STEP:n]] 的前面单独一行输出题型标记：[[MODE:m]]，m 为 1、2、3，对应上面的题型。还无法判断题型时不输出 MODE 标记。
- 除这些标记外，不要输出任何其他类似 [[...]] 的格式。

## 教学规则
- 一次只聚焦当前步骤，学生没完成当前步骤前不要跳到下一步。
- 用提问引导，不直接给出答案、不代替学生列式或计算；学生卡住时给由浅入深的小提示（先给方向性提示，仍卡住再给更具体的提示）。
- 学生回答正确时先肯定（指出好在哪里），再自然过渡到下一步。
- 学生跑题时温和地拉回当前任务。
- 学生上传题目图片或文件时，先用一两句话确认你读到的题目内容，再按对应题型流程引导；图片不清晰时请学生重新拍摄或补发文字。
- 语言亲切、口语化，适合初中生；每次回复尽量不超过 200 字，可用简洁的短列表。
- 数学式子一律用纯文本表示（如 y = 3000 - 80t、x + y = 24、∠B = 75°），不要使用 LaTeX 公式格式，也不要使用 Markdown 符号（如 ** 加粗、# 标题），直接用纯文字和短列表。
- 学生完成第四步后，用 3 行左右小结本次解题（用了什么方法、关键步骤），并鼓励学生换一道题继续练习。`;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });

// 附件转 Anthropic 多模态内容块（与后端 chat_service.py 逻辑一致）
function attachmentBlocks(attachments) {
  const blocks = [];
  for (const att of attachments || []) {
    if (IMAGE_TYPES.has(att.media_type)) {
      blocks.push({
        type: "image",
        source: { type: "base64", media_type: att.media_type, data: att.data },
      });
    } else if (att.media_type === "application/pdf") {
      blocks.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: att.data },
      });
    } else {
      // 其余按纯文本文件处理
      const bytes = Uint8Array.from(atob(att.data), (c) => c.charCodeAt(0));
      const text = new TextDecoder().decode(bytes);
      blocks.push({ type: "text", text: `（附件文件「${att.name}」的内容如下：\n${text}\n）` });
    }
  }
  return blocks;
}

async function handleChat(request, env) {
  if (!env.ZHIPU_API_KEY) return json({ detail: "服务端未配置 ZHIPU_API_KEY" }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ detail: "请求体不是合法 JSON" }, 400);
  }
  const msgs = body?.messages;
  if (!Array.isArray(msgs) || msgs.length === 0) {
    return json({ detail: "messages 不能为空" }, 400);
  }

  // 免费文本模型不具备真实图片识别能力（会幻觉作答），图片/PDF 暂时拦截
  const hasVisionAttachment = msgs.some((m) =>
    (m.attachments || []).some(
      (a) => IMAGE_TYPES.has(a.media_type) || a.media_type === "application/pdf"
    )
  );
  if (hasVisionAttachment) {
    return json(
      {
        detail:
          "当前免费模型暂不支持图片/PDF 识别，请用文字描述题目发送；文本文件（txt/md/csv）不受影响。",
      },
      400
    );
  }

  let apiMessages;
  try {
    apiMessages = msgs.map((m) => {
      // 历史回复消息直接传纯文本（前端不会给 assistant 带附件）
      if (m.role === "assistant") {
        return { role: "assistant", content: String(m.content || "") };
      }
      const blocks = attachmentBlocks(m.attachments);
      if (m.content && String(m.content).trim()) {
        blocks.push({ type: "text", text: m.content });
      }
      if (blocks.length === 0) throw new Error("消息内容和附件不能同时为空");
      return { role: "user", content: blocks };
    });
  } catch (err) {
    return json({ detail: String(err.message || err) }, 400);
  }

  let data;
  try {
    const resp = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "x-api-key": env.ZHIPU_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: apiMessages,
      }),
    });
    data = await resp.json();
    if (!resp.ok) {
      const msg = data?.error?.message || `智谱接口返回 ${resp.status}`;
      return json({ detail: `大模型调用失败：${msg}` }, 502);
    }
  } catch (err) {
    return json({ detail: `大模型连接失败：${String(err.message || err)}` }, 502);
  }

  const reply = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return json({ reply, model: data.model || MODEL });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/health") return json({ status: "ok" });
    if (pathname === "/api/chat" && request.method === "POST") {
      return handleChat(request, env);
    }
    if (pathname.startsWith("/api/")) return json({ detail: "Not Found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
