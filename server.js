const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const chatbotData = require("./chatbot-data");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

const { festivals, foods, entertainments, provinces } = chatbotData;
const provinceAliases = {
  "hue": ["Huế", "Thừa Thiên Huế"],
  "thua thien hue": ["Huế", "Thừa Thiên Huế"],
  "da nang": ["Đà Nẵng"],
  "ha noi": ["Hà Nội"],
  "tp hcm": ["TP.HCM", "Cần Giờ"],
  "sai gon": ["TP.HCM"],
  "phu quoc": ["Kiên Giang", "Phú Quốc"]
};

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim();
}

function detectProvince(userMessage) {
  const normalizedMessage = normalizeText(userMessage);
  const aliasKey = Object.keys(provinceAliases).find((key) => normalizedMessage.includes(key));
  if (aliasKey) {
    return provinceAliases[aliasKey][0];
  }
  return provinces.find((province) => normalizedMessage.includes(normalizeText(province))) || null;
}

function provinceMatches(itemProvince, requestedProvince) {
  if (!requestedProvince) return true;
  const item = normalizeText(itemProvince);
  const requested = normalizeText(requestedProvince);
  if (item === requested || item.includes(requested) || requested.includes(item)) return true;
  const aliases = provinceAliases[requested] || provinceAliases[item] || [];
  return aliases.some((alias) => {
    const normalizedAlias = normalizeText(alias);
    return item === normalizedAlias || item.includes(normalizedAlias) || normalizedAlias.includes(item);
  });
}

function detectMonth(userMessage) {
  const normalizedMessage = normalizeText(userMessage);
  if (normalizedMessage.includes("thang nay")) return new Date().getMonth() + 1;
  const match = normalizedMessage.match(/thang\s*(\d{1,2})/);
  if (!match) return null;
  const month = Number(match[1]);
  return month >= 1 && month <= 12 ? month : null;
}

function getFestivalMonthRange(month, year) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999)
  };
}

function getFestivalsByMonth(month, year, province) {
  if (!month || !year) return [];
  const range = getFestivalMonthRange(month, year);
  return festivals.filter((festival) => {
    if (!festival.start || !festival.end) return false;
    const start = new Date(festival.start);
    const end = new Date(festival.end);
    const inMonth = !(start > range.end || end < range.start);
    const inProvince = provinceMatches(festival.province, province);
    return inMonth && inProvince;
  });
}

function topByProvince(list, province, limit) {
  return list.filter((item) => provinceMatches(item.province, province)).slice(0, limit);
}

function getSeasonHint(month) {
  if (month >= 1 && month <= 3) {
    return "Mùa xuân là cao điểm lễ hội miền Bắc, nên đi sớm và ưu tiên giữ lịch trình gọn để tránh đông.";
  }
  if (month >= 4 && month <= 6) {
    return "Đầu hè phù hợp kết hợp lễ hội với ăn uống và vui chơi ngoài trời, nên đặt trước các dịch vụ đông khách.";
  }
  if (month >= 7 && month <= 9) {
    return "Đây là giai đoạn dễ có mưa ở nhiều nơi, nên ưu tiên phương án linh hoạt và điểm vui chơi trong nhà.";
  }
  return "Cuối năm hợp với lịch trình chiều tối, trải nghiệm ẩm thực và các hoạt động văn hóa địa phương.";
}

function buildRelevantContext(userMessage, context) {
  const now = new Date();
  const month = detectMonth(userMessage) || Number(context?.month) || now.getMonth() + 1;
  const year = Number(context?.year) || now.getFullYear();
  const province = detectProvince(userMessage) || null;

  return {
    month,
    year,
    province,
    seasonHint: getSeasonHint(month),
    festivals: getFestivalsByMonth(month, year, province).slice(0, 6),
    foods: topByProvince(foods, province, 5),
    entertainments: topByProvince(entertainments, province, 5)
  };
}

function buildSystemPrompt(locale, groundedContext) {
  const groundingText = JSON.stringify(groundedContext || {}, null, 2);
  return [
    "You are LeHoiMate AI, a travel assistant for Vietnam festivals.",
    "Primary language: " + (locale || "vi-VN") + ".",
    "Focus only on festivals, food, entertainment, itinerary suggestions.",
    "Reply in concise Vietnamese unless the user asks another language.",
    "Use only the grounded data below when mentioning specific festivals, provinces, foods, or entertainment suggestions.",
    groundingText,
    "Output MUST be strict JSON object with this schema:",
    '{"reply":"string","actions":[{"label":"string","action":"openMap|nearMe|openCalendar|openModule|focusFestival|focusFood|focusEntertainment","payload":{}}]}',
    "If unsure, return helpful, safe suggestions and empty actions array.",
  ].join("\n");
}

function localFallback(userMessage, context) {
  const msg = normalizeText(userMessage);
  const relevant = buildRelevantContext(userMessage, context);
  const province = relevant.province;
  const month = relevant.month;
  const year = relevant.year;

  if (msg.includes("an gi") || msg.includes("am thuc") || msg.includes("quan an") || msg.includes("mon ngon")) {
    const suggestions = relevant.foods;
    if (!suggestions.length) {
      return {
        reply: "Mình chưa có dữ liệu ăn uống phù hợp cho khu vực này. Bạn thử một tỉnh/thành khác nhé.",
        actions: [{ label: "Mở ẩm thực", action: "openModule", payload: { moduleId: "food" } }]
      };
    }
    return {
      reply: [
        `Gợi ý ăn uống${province ? ` ở ${province}` : ""}:`,
        ...suggestions.map((item, index) => `${index + 1}. ${item.name} - ${item.desc}`)
      ].join("\n"),
      actions: suggestions.slice(0, 3).map((item) => ({
        label: `Xem ${item.name}`,
        action: "focusFood",
        payload: { name: item.name }
      }))
    };
  }

  if (msg.includes("choi gi") || msg.includes("vui choi") || msg.includes("giai tri")) {
    const suggestions = relevant.entertainments;
    if (!suggestions.length) {
      return {
        reply: "Mình chưa có dữ liệu vui chơi phù hợp cho khu vực này. Bạn thử địa điểm khác nhé.",
        actions: [{ label: "Mở khu vui chơi", action: "openModule", payload: { moduleId: "entertainment" } }]
      };
    }
    return {
      reply: [
        `Gợi ý vui chơi${province ? ` ở ${province}` : ""}:`,
        ...suggestions.map((item, index) => `${index + 1}. ${item.name} - ${item.desc}`)
      ].join("\n"),
      actions: suggestions.slice(0, 3).map((item) => ({
        label: `Đến ${item.name}`,
        action: "focusEntertainment",
        payload: { name: item.name }
      }))
    };
  }

  if (msg.includes("lich trinh") || msg.includes("1 ngay") || msg.includes("plan")) {
    const festival = relevant.festivals[0] || null;
    const food = relevant.foods[0] || null;
    const entertainment = relevant.entertainments[0] || null;
    return {
      reply: [
        `Lịch trình gợi ý 1 ngày${province ? ` tại ${province}` : ""}:`,
        `08:00 - 10:30: ${festival ? festival.name : "Tham quan lễ hội nổi bật trong khu vực"}`,
        `11:30 - 13:00: ${food ? food.name : "Ăn trưa với món đặc sản địa phương"}`,
        `14:30 - 17:00: ${entertainment ? entertainment.name : "Vui chơi hoặc tham quan trải nghiệm"}`,
        `Gợi ý mùa vụ: ${relevant.seasonHint}`
      ].join("\n"),
      actions: [
        { label: "Mở bản đồ", action: "openMap", payload: {} },
        { label: "Mở lịch lễ hội", action: "openCalendar", payload: {} },
      ],
    };
  }

  if (msg.includes("le hoi") || msg.includes("su kien") || msg.includes("thang nay") || msg.includes("lich le hoi")) {
    const list = relevant.festivals;
    if (!list.length) {
      return {
        reply: `Hiện chưa có lễ hội có ngày cụ thể trong dữ liệu cho tháng ${month}/${year}${province ? ` tại ${province}` : ""}.`,
        actions: [{ label: "Mở lịch lễ hội", action: "openCalendar", payload: {} }]
      };
    }
    return {
      reply: [
        `Lễ hội tháng ${month}/${year}${province ? ` tại ${province}` : ""}:`,
        ...list.map((item, index) => `${index + 1}. ${item.name} (${item.start} -> ${item.end})`),
        `Mẹo mùa vụ: ${relevant.seasonHint}`
      ].join("\n"),
      actions: list.slice(0, 3).map((item) => ({
        label: `Xem ${item.name}`,
        action: "focusFestival",
        payload: { id: item.id }
      }))
    };
  }

  return {
    reply:
      "Mình có thể giúp bạn theo 4 nhóm: lễ hội, ăn uống, vui chơi, lịch trình 1 ngày. Bạn muốn bắt đầu từ nhóm nào?",
    actions: [
      { label: "Lễ hội tháng này", action: "openCalendar", payload: {} },
      { label: "Lễ hội gần tôi", action: "nearMe", payload: {} },
    ],
  };
}

async function callOpenAIChat(userMessage, locale, context) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  if (!apiKey) return null;
  const groundedContext = buildRelevantContext(userMessage, context);

  const payload = {
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(locale, groundedContext) },
      {
        role: "user",
        content: JSON.stringify({ message: userMessage, context, groundedContext }),
      },
    ],
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error("OpenAI error: " + errText);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");

  return JSON.parse(content);
}

async function callAzureOpenAI(userMessage, locale, context) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
  if (!endpoint || !apiKey || !deployment) return null;
  const groundedContext = buildRelevantContext(userMessage, context);

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const payload = {
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(locale, groundedContext) },
      {
        role: "user",
        content: JSON.stringify({ message: userMessage, context, groundedContext }),
      },
    ],
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error("Azure OpenAI error: " + errText);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Azure OpenAI returned empty content");

  return JSON.parse(content);
}

function sanitizeReplyObject(obj) {
  const safe = obj && typeof obj === "object" ? obj : {};
  const reply = typeof safe.reply === "string" ? safe.reply : "Mình chưa có phản hồi phù hợp.";
  const actions = Array.isArray(safe.actions)
    ? safe.actions
        .filter((a) => a && typeof a.label === "string" && typeof a.action === "string")
        .slice(0, 4)
    : [];
  return { reply, actions };
}

app.post("/api/chatbot", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const locale = String(req.body?.locale || "vi-VN");
  const context = req.body?.context || {};

  if (!message) {
    res.status(400).json({ reply: "Thiếu nội dung câu hỏi.", actions: [] });
    return;
  }

  try {
    let result = null;

    // Priority 1: OpenAI API, Priority 2: Azure OpenAI, else local fallback.
    result = await callOpenAIChat(message, locale, context).catch(() => null);
    if (!result) {
      result = await callAzureOpenAI(message, locale, context).catch(() => null);
    }
    if (!result) {
      result = localFallback(message, context);
    }

    res.json(sanitizeReplyObject(result));
  } catch (error) {
    res.status(200).json(
      sanitizeReplyObject({
        reply:
          "Mình đang dùng chế độ offline tạm thời. Bạn vẫn có thể hỏi về lễ hội, ăn uống, vui chơi hoặc lịch trình 1 ngày.",
        actions: [
          { label: "Mở lịch lễ hội", action: "openCalendar", payload: {} },
          { label: "Lễ hội gần tôi", action: "nearMe", payload: {} },
        ],
      })
    );
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "festival-chatbot", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Festival chatbot server listening at http://localhost:${PORT}`);
});
