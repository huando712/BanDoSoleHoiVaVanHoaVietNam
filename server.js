const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const chatbotData = require("./chatbot-data");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const USERS_FILE = path.join(__dirname, ".auth", "users.json");
const AVATAR_DIR = path.join(__dirname, ".auth", "avatars");
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const tokenSessions = new Map();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));
app.use("/avatars", express.static(AVATAR_DIR));

function ensureUserStore() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "[]", "utf8");
  }
  if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
  }
}

function readUsers() {
  try {
    ensureUserStore();
    const text = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeUsers(users) {
  ensureUserStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const derived = crypto.scryptSync(String(password), salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(stored, derived);
}

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function buildDefaultProfile(user) {
  return {
    displayName: user?.name || "",
    phone: "",
    birthDate: "",
    gender: "",
    city: "",
    bio: "",
    avatarUrl: "",
    language: "vi",
    favoriteRegions: [],
    receiveEmailUpdates: true,
    receiveSmsUpdates: false,
    favoriteFestivalIds: [],
    updatedAt: new Date().toISOString(),
  };
}

function withUserProfile(user) {
  const profile = user?.profile || buildDefaultProfile(user);
  return {
    ...user,
    profile: {
      ...buildDefaultProfile(user),
      ...profile,
      favoriteRegions: Array.isArray(profile.favoriteRegions) ? profile.favoriteRegions : [],
      favoriteFestivalIds: Array.isArray(profile.favoriteFestivalIds) ? profile.favoriteFestivalIds : [],
    },
    activities: Array.isArray(user?.activities) ? user.activities : [],
  };
}

function sanitizeActivityInput(body) {
  const input = body && typeof body === "object" ? body : {};
  return {
    action: String(input.action || "").trim().slice(0, 40),
    type: String(input.type || "").trim().slice(0, 40),
    itemId: Number.isFinite(Number(input.itemId)) ? Number(input.itemId) : null,
    itemName: String(input.itemName || "").trim().slice(0, 200),
    keyword: String(input.keyword || "").trim().slice(0, 200),
    location: String(input.location || "").trim().slice(0, 200),
    meta: input.meta && typeof input.meta === "object" ? input.meta : {},
  };
}

function appendActivity(user, activity) {
  const list = Array.isArray(user.activities) ? user.activities : [];
  list.unshift(activity);
  user.activities = list.slice(0, 200);
}

function sanitizeProfilePatch(input) {
  const body = input && typeof input === "object" ? input : {};
  const cleaned = {};
  const str = (value, max = 300) => String(value || "").trim().slice(0, max);

  if (body.displayName !== undefined) cleaned.displayName = str(body.displayName, 80);
  if (body.phone !== undefined) cleaned.phone = str(body.phone, 30);
  if (body.birthDate !== undefined) cleaned.birthDate = str(body.birthDate, 20);
  if (body.gender !== undefined) cleaned.gender = str(body.gender, 20);
  if (body.city !== undefined) cleaned.city = str(body.city, 80);
  if (body.bio !== undefined) cleaned.bio = str(body.bio, 600);
  if (body.avatarUrl !== undefined) cleaned.avatarUrl = str(body.avatarUrl, 400);
  if (body.language !== undefined) cleaned.language = str(body.language, 12);

  if (body.receiveEmailUpdates !== undefined) {
    cleaned.receiveEmailUpdates = !!body.receiveEmailUpdates;
  }
  if (body.receiveSmsUpdates !== undefined) {
    cleaned.receiveSmsUpdates = !!body.receiveSmsUpdates;
  }

  if (Array.isArray(body.favoriteRegions)) {
    const allowed = new Set(["bac", "trung", "nam"]);
    cleaned.favoriteRegions = body.favoriteRegions
      .map((item) => String(item || "").trim().toLowerCase())
      .filter((item) => allowed.has(item));
  }

  if (Array.isArray(body.favoriteFestivalIds)) {
    cleaned.favoriteFestivalIds = body.favoriteFestivalIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
      .slice(0, 200);
  }

  return cleaned;
}

function issueToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  tokenSessions.set(token, { userId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

function getSessionFromToken(token) {
  const session = tokenSessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    tokenSessions.delete(token);
    return null;
  }
  return session;
}

function authMiddleware(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Bạn chưa đăng nhập." });
    return;
  }
  const token = authHeader.slice(7).trim();
  const session = getSessionFromToken(token);
  if (!session) {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
    return;
  }

  const users = readUsers();
  const user = users.find((item) => item.id === session.userId);
  if (!user) {
    tokenSessions.delete(token);
    res.status(401).json({ message: "Tài khoản không tồn tại." });
    return;
  }

  req.authUser = user;
  req.authToken = token;
  next();
}

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!name || !email || !password) {
    res.status(400).json({ message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ message: "Mật khẩu cần ít nhất 6 ký tự." });
    return;
  }

  const users = readUsers();
  const exists = users.some((item) => normalizeEmail(item.email) === email);
  if (exists) {
    res.status(409).json({ message: "Email đã được đăng ký." });
    return;
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);

  const token = issueToken(user.id);
  res.status(201).json({ token, user: toSafeUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!email || !password) {
    res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
    return;
  }

  const users = readUsers();
  const user = users.find((item) => normalizeEmail(item.email) === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    return;
  }

  const token = issueToken(user.id);
  res.json({ token, user: toSafeUser(user) });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: toSafeUser(req.authUser) });
});

app.post("/api/auth/logout", authMiddleware, (req, res) => {
  tokenSessions.delete(req.authToken);
  res.json({ ok: true });
});

app.get("/api/profile", authMiddleware, (req, res) => {
  const users = readUsers();
  const index = users.findIndex((item) => item.id === req.authUser.id);
  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy hồ sơ người dùng." });
    return;
  }

  const merged = withUserProfile(users[index]);
  if (!users[index].profile || !Array.isArray(users[index].activities)) {
    users[index] = merged;
    writeUsers(users);
  }

  res.json({
    user: toSafeUser(merged),
    profile: merged.profile,
    stats: {
      favoriteFestivalCount: merged.profile.favoriteFestivalIds.length,
      activityCount: Array.isArray(merged.activities) ? merged.activities.length : 0,
    },
    recentActivities: (merged.activities || []).slice(0, 20),
  });
});

app.put("/api/profile", authMiddleware, (req, res) => {
  const users = readUsers();
  const index = users.findIndex((item) => item.id === req.authUser.id);
  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy hồ sơ người dùng." });
    return;
  }

  const merged = withUserProfile(users[index]);
  const patch = sanitizeProfilePatch(req.body);
  merged.profile = {
    ...merged.profile,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (patch.displayName) {
    merged.name = patch.displayName;
  }

  users[index] = merged;
  writeUsers(users);

  res.json({
    message: "Cập nhật hồ sơ thành công.",
    user: toSafeUser(merged),
    profile: merged.profile,
  });
});

app.put("/api/profile/password", authMiddleware, (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới." });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ message: "Mật khẩu mới cần ít nhất 6 ký tự." });
    return;
  }

  const users = readUsers();
  const index = users.findIndex((item) => item.id === req.authUser.id);
  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy tài khoản." });
    return;
  }
  if (!verifyPassword(currentPassword, users[index].passwordHash)) {
    res.status(401).json({ message: "Mật khẩu hiện tại không đúng." });
    return;
  }

  users[index].passwordHash = hashPassword(newPassword);
  users[index].profile = {
    ...withUserProfile(users[index]).profile,
    updatedAt: new Date().toISOString(),
  };
  writeUsers(users);

  res.json({ message: "Đổi mật khẩu thành công." });
});

app.get("/api/profile/festival-options", authMiddleware, (req, res) => {
  const options = festivals.map((festival) => ({
    id: festival.id,
    name: festival.name,
    province: festival.province,
    start: festival.start || "",
    end: festival.end || "",
  }));
  res.json({ items: options });
});

app.post("/api/profile/avatar", authMiddleware, (req, res) => {
  const dataUrl = String(req.body?.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) {
    res.status(400).json({ message: "Dữ liệu ảnh không hợp lệ." });
    return;
  }

  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/i);
  if (!match) {
    res.status(400).json({ message: "Chỉ hỗ trợ ảnh PNG, JPG, JPEG hoặc WEBP." });
    return;
  }

  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
  const base64 = match[2];
  let buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch (error) {
    res.status(400).json({ message: "Không đọc được dữ liệu ảnh." });
    return;
  }

  if (!buffer || !buffer.length) {
    res.status(400).json({ message: "Ảnh rỗng hoặc lỗi dữ liệu." });
    return;
  }
  if (buffer.length > 1.5 * 1024 * 1024) {
    res.status(400).json({ message: "Ảnh quá lớn. Vui lòng dùng ảnh nhỏ hơn 1.5MB." });
    return;
  }

  ensureUserStore();
  const fileName = `${req.authUser.id}-${Date.now()}.${ext}`;
  const filePath = path.join(AVATAR_DIR, fileName);
  fs.writeFileSync(filePath, buffer);

  const users = readUsers();
  const index = users.findIndex((item) => item.id === req.authUser.id);
  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy tài khoản." });
    return;
  }

  const merged = withUserProfile(users[index]);
  merged.profile.avatarUrl = `/avatars/${fileName}`;
  merged.profile.updatedAt = new Date().toISOString();
  users[index] = merged;
  writeUsers(users);

  res.json({
    message: "Cập nhật ảnh đại diện thành công.",
    avatarUrl: merged.profile.avatarUrl,
    profile: merged.profile,
  });
});

app.post("/api/activity/log", authMiddleware, (req, res) => {
  const payload = sanitizeActivityInput(req.body);
  if (!payload.action) {
    res.status(400).json({ message: "Thiếu hành động hoạt động." });
    return;
  }

  const users = readUsers();
  const index = users.findIndex((item) => item.id === req.authUser.id);
  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy tài khoản." });
    return;
  }

  const merged = withUserProfile(users[index]);
  const activity = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: new Date().toISOString(),
  };
  appendActivity(merged, activity);
  users[index] = merged;
  writeUsers(users);

  res.status(201).json({ ok: true, activity });
});

app.get("/api/activity", authMiddleware, (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query?.limit) || 50));
  const users = readUsers();
  const user = users.find((item) => item.id === req.authUser.id);
  if (!user) {
    res.status(404).json({ message: "Không tìm thấy tài khoản." });
    return;
  }
  const merged = withUserProfile(user);
  res.json({ items: (merged.activities || []).slice(0, limit) });
});

app.delete("/api/activity", authMiddleware, (req, res) => {
  const users = readUsers();
  const index = users.findIndex((item) => item.id === req.authUser.id);
  if (index === -1) {
    res.status(404).json({ message: "Không tìm thấy tài khoản." });
    return;
  }

  const merged = withUserProfile(users[index]);
  merged.activities = [];
  users[index] = merged;
  writeUsers(users);

  res.json({ message: "Đã xóa lịch sử hoạt động." });
});

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
