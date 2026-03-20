/**
 * db.js — Database abstraction layer
 * Tự động dùng MongoDB nếu có MONGODB_URI, fallback về file JSON khi local dev.
 */

const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

// ─── Đường dẫn file fallback ───────────────────────────────────────────────
const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? "/tmp" : path.join(__dirname, ".auth");
const USERS_FILE = path.join(DATA_DIR, "users.json");

// ─── MongoDB connection pool ───────────────────────────────────────────────
let _mongoClient = null;
let _mongoDb = null;

async function mongoConnect() {
  if (_mongoDb) return _mongoDb;
  if (!process.env.MONGODB_URI) return null;
  try {
    _mongoClient = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await _mongoClient.connect();
    const dbName = process.env.MONGODB_DB || "festival_map";
    _mongoDb = _mongoClient.db(dbName);
    const col = _mongoDb.collection("users");
    await col.createIndex({ email: 1 }, { unique: true });
    await col.createIndex({ id: 1 }, { unique: true });
    console.log("[DB] Kết nối MongoDB thành công:", dbName);
    return _mongoDb;
  } catch (err) {
    console.warn("[DB] Không kết nối được MongoDB, dùng file storage:", err.message);
    _mongoDb = null;
    _mongoClient = null;
    return null;
  }
}

// ─── File adapter ──────────────────────────────────────────────────────────
function ensureFileStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]", "utf8");
  } catch (_) {}
}

function fileReadAll() {
  try {
    ensureFileStore();
    const text = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function fileWriteAll(users) {
  ensureFileStore();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

// ─── Public async API ──────────────────────────────────────────────────────

/** Tìm user theo email (trả về object hoặc null) */
async function findUserByEmail(email) {
  const db = await mongoConnect();
  if (db) {
    const user = await db.collection("users").findOne({ email });
    return user || null;
  }
  const users = fileReadAll();
  return users.find((u) => u.email === email) || null;
}

/** Tìm user theo id (trả về object hoặc null) */
async function findUserById(id) {
  const db = await mongoConnect();
  if (db) {
    const user = await db.collection("users").findOne({ id });
    return user || null;
  }
  const users = fileReadAll();
  return users.find((u) => u.id === id) || null;
}

/** Tạo user mới */
async function createUser(user) {
  const db = await mongoConnect();
  if (db) {
    // Bỏ _id tự sinh MongoDB, dùng id UUID của mình
    const { _id, ...safe } = user;
    await db.collection("users").insertOne({ ...safe });
    return safe;
  }
  const users = fileReadAll();
  users.push(user);
  fileWriteAll(users);
  return user;
}

/** Cập nhật user theo id (upsert) */
async function updateUser(id, updatedUser) {
  const db = await mongoConnect();
  if (db) {
    const { _id, ...safe } = updatedUser;
    await db.collection("users").updateOne(
      { id },
      { $set: safe },
      { upsert: false }
    );
    return safe;
  }
  const users = fileReadAll();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return null;
  users[index] = updatedUser;
  fileWriteAll(users);
  return updatedUser;
}

module.exports = { findUserByEmail, findUserById, createUser, updateUser, mongoConnect };
