import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

export function getTokenFromRequest(req) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function getUserFromRequest(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: payload.id });
  return user;
}

export async function ensureSeedUsers() {
  const db = await getDb();
  const users = db.collection('users');
  const settings = db.collection('settings');

  // ──── Clean up orphan rows (e.g. legacy NeoTrade FastAPI seeds with no
  //     passwordHash). Without this, the migration below would skip because
  //     it sees a "user" with the new email already present.
  await users.deleteMany({
    email: { $in: ['admin@neotrade.live', 'masteruser@neotrade.live'] },
    $or: [
      { passwordHash: { $exists: false } },
      { passwordHash: null },
      { passwordHash: '' },
    ],
  });

  // ──── Migration: rename legacy *@trading.com seeds to *@neotrade.live ────
  // Preserves wallet balances, trade history, and user id. Idempotent.
  const legacyAdmin = await users.findOne({ email: 'admin@trading.com' });
  if (legacyAdmin) {
    await users.updateOne(
      { _id: legacyAdmin._id },
      { $set: { email: 'admin@neotrade.live', name: 'Administrator' } }
    );
  }
  const legacyMaster = await users.findOne({ email: 'masteruser@trading.com' });
  if (legacyMaster) {
    await users.updateOne(
      { _id: legacyMaster._id },
      { $set: { email: 'masteruser@neotrade.live', name: 'Master User' } }
    );
  }
  // Also remove the FastAPI-era 'masteruser@gmail.com' orphan if it has no passwordHash
  await users.deleteOne({ email: 'masteruser@gmail.com', passwordHash: { $exists: false } });

  // ──── Seed admin@neotrade.live ────
  const existingAdmin = await users.findOne({ email: 'admin@neotrade.live' });
  if (!existingAdmin) {
    await users.insertOne({
      id: uuidv4(),
      email: 'admin@neotrade.live',
      passwordHash: await bcrypt.hash('password', 8),
      name: 'Administrator',
      role: 'admin',
      demoBalance: 10000,
      liveBalance: 0,
      activeAccount: 'demo',
      createdAt: new Date()
    });
  }

  // ──── Seed masteruser@neotrade.live ────
  const existingMaster = await users.findOne({ email: 'masteruser@neotrade.live' });
  if (!existingMaster) {
    await users.insertOne({
      id: uuidv4(),
      email: 'masteruser@neotrade.live',
      passwordHash: await bcrypt.hash('password', 8),
      name: 'Master User',
      role: 'user',
      demoBalance: 10000,
      liveBalance: 0,
      activeAccount: 'demo',
      createdAt: new Date()
    });
  }

  const s = await settings.findOne({ id: 'global' });
  if (!s) {
    await settings.insertOne({
      id: 'global',
      winRatio: 0.2, // global probability that a winning trade is allowed; house edge 80%
      payoutRate: 1.8,
      updatedAt: new Date()
    });
  }
}

export async function hashPassword(p) { return bcrypt.hash(p, 8); }
export async function comparePassword(p, h) { return bcrypt.compare(p, h); }
