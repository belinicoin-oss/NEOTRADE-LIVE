// ============================================================================
// NeoTrade — Network Compensation Engine
// ----------------------------------------------------------------------------
// Modular MLM-style compensation layer that sits beside the existing trading
// engine. Nothing in this file mutates trading state, candles, or live feed.
//
// Responsibilities:
//   • Referral graph (sponsor / downline) with cycle protection
//   • "Paid referral" + "Team business" evaluation (admin-configurable rules)
//   • Direct commission credit on each approved deposit
//   • Continuous level evaluation → instant level commission credit
//   • Monthly salary scheduler (admin-configurable salary day, highest-level
//     only, idempotent per user/month)
//   • Network balance ledger via `network_transactions` collection
//
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';

// ──────────────────── settings helpers ────────────────────
async function getNetworkSettings() {
  const db = await getDb();
  const s = await db.collection('settings').findOne({ id: 'global' }) || {};
  const n = s.network || {};
  return {
    salaryDay: clampInt(n.salaryDay, 1, 28, 5),
    minPaidDepositThreshold: numOr(n.minPaidDepositThreshold, 50),
    directCommissionEnabled: n.directCommissionEnabled !== false,
    directCommissionPercent: numOr(n.directCommissionPercent, 5),
    directCommissionMinDeposit: numOr(n.directCommissionMinDeposit, 0),
  };
}

function clampInt(v, lo, hi, def) {
  const n = parseInt(v); if (!Number.isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
}
function numOr(v, def) {
  const n = Number(v); return Number.isFinite(n) ? n : def;
}

// ──────────────────── referral code helpers ────────────────────
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export function generateReferralCode(seed) {
  // 7-char human-friendly code, optionally seeded by part of user id
  let s = '';
  const base = (seed || uuidv4()).replace(/-/g, '').toUpperCase();
  for (let i = 0; i < 7; i++) {
    const idx = parseInt(base[i % base.length] || '0', 36) % ALPHABET.length;
    s += ALPHABET[idx];
  }
  // Mix in randomness so two users with similar ids don't collide
  s = s.slice(0, 4) + Math.random().toString(36).slice(2, 5).toUpperCase().replace(/[01OI]/g, 'X');
  return s.slice(0, 7);
}

export async function ensureReferralCode(userId) {
  const db = await getDb();
  const u = await db.collection('users').findOne({ id: userId });
  if (!u) return null;
  if (u.referralCode) return u.referralCode;
  for (let tries = 0; tries < 5; tries++) {
    const code = generateReferralCode(userId);
    try {
      await db.collection('users').updateOne(
        { id: userId, referralCode: { $exists: false } },
        { $set: { referralCode: code } }
      );
      const fresh = await db.collection('users').findOne({ id: userId });
      if (fresh?.referralCode) return fresh.referralCode;
    } catch {}
  }
  return null;
}

// Used at signup time. Returns sponsor user id, or null if code invalid.
export async function resolveSponsorByCode(code) {
  if (!code) return null;
  const c = String(code).trim().toUpperCase();
  if (!c) return null;
  const db = await getDb();
  const s = await db.collection('users').findOne({ referralCode: c });
  return s?.id || null;
}

// ──────────────────── network balance ledger ────────────────────
// Every credit/debit to networkBalance MUST go through this so the
// transaction log stays in sync and the audit trail is complete.
async function recordTxn({ userId, type, amount, level = null, levelName = null, description = '', reference = null, refDepositId = null, refSalaryMonth = null, status = 'completed' }) {
  const db = await getDb();
  const txn = {
    id: uuidv4(),
    userId,
    type, // 'direct_commission' | 'level_commission' | 'monthly_salary' | 'withdrawal' | 'manual'
    amount: Number(amount) || 0,
    level,
    levelName,
    description,
    reference,
    refDepositId,
    refSalaryMonth,
    status,
    createdAt: new Date(),
  };
  await db.collection('network_transactions').insertOne(txn);
  return txn;
}

async function creditNetwork(userId, amount, txnFields) {
  if (!(amount > 0)) return null;
  const db = await getDb();
  await db.collection('users').updateOne({ id: userId }, { $inc: { networkBalance: Number(amount) } });
  return recordTxn({ userId, amount, ...txnFields });
}

// ──────────────────── referral graph / metrics ────────────────────
async function getDirectsForUser(userId) {
  const db = await getDb();
  return db.collection('users').find({ referredBy: userId }).toArray();
}

// Sum of all APPROVED deposits by a single user.
async function getUserApprovedDeposits(userId) {
  const db = await getDb();
  const r = await db.collection('deposit_requests').aggregate([
    { $match: { userId, status: 'approved' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();
  return r[0]?.total || 0;
}

// Walks the entire downline (unlimited depth, cycle-safe) and returns
// { directs, paidReferrals, teamBusiness }.
async function computeNetworkMetrics(userId, settings) {
  const db = await getDb();
  const directs = await getDirectsForUser(userId);

  // Count direct PAID referrals
  let paidReferrals = 0;
  for (const d of directs) {
    const totalDep = await getUserApprovedDeposits(d.id);
    if (totalDep >= settings.minPaidDepositThreshold) paidReferrals++;
  }

  // BFS over entire downline → sum of approved deposits
  const seen = new Set([userId]);
  let teamBusiness = 0;
  let frontier = directs.map(d => d.id).filter(id => !seen.has(id));
  frontier.forEach(id => seen.add(id));
  while (frontier.length) {
    // Sum deposits for this frontier batch in one aggregate query
    const r = await db.collection('deposit_requests').aggregate([
      { $match: { userId: { $in: frontier }, status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).toArray();
    teamBusiness += r[0]?.total || 0;
    // Find next layer
    const next = await db.collection('users')
      .find({ referredBy: { $in: frontier } }, { projection: { id: 1 } })
      .toArray();
    frontier = [];
    for (const u of next) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      frontier.push(u.id);
    }
    // Hard safety cap so a malformed cycle can never lock the loop
    if (seen.size > 100000) break;
  }

  return { paidReferrals, teamBusiness, directCount: directs.length };
}

// ──────────────────── levels ────────────────────
async function getActiveLevels() {
  const db = await getDb();
  return db.collection('network_levels')
    .find({ active: true })
    .sort({ levelNumber: 1, order: 1 })
    .toArray();
}

// Returns the highest level the user QUALIFIES for right now.
function pickHighestQualifyingLevel(levels, metrics) {
  let best = null;
  for (const lv of levels) {
    if (metrics.paidReferrals >= (lv.requiredPaidReferrals || 0) &&
        metrics.teamBusiness   >= (lv.requiredTeamBusiness   || 0)) {
      if (!best || (lv.levelNumber || 0) > (best.levelNumber || 0)) best = lv;
    }
  }
  return best;
}

// Re-evaluate level for a single user. Awards any newly-reached level
// commissions (Level 1 → current; idempotent via `levelAwards` collection).
export async function evaluateUserLevel(userId) {
  const db = await getDb();
  const settings = await getNetworkSettings();
  const metrics = await computeNetworkMetrics(userId, settings);

  // Cache the metrics on the user doc so the dashboard reads are O(1).
  await db.collection('users').updateOne(
    { id: userId },
    { $set: {
        paidReferralsCount: metrics.paidReferrals,
        teamBusiness: metrics.teamBusiness,
        networkUpdatedAt: new Date(),
      }
    }
  );

  const levels = await getActiveLevels();
  const top = pickHighestQualifyingLevel(levels, metrics);
  if (!top) {
    await db.collection('users').updateOne({ id: userId }, { $set: { currentLevel: 0, currentLevelId: null, currentLevelName: null } });
    return { metrics, currentLevel: 0, awarded: [] };
  }

  // Award commissions for every level up to & including `top` that has
  // not yet been awarded (idempotent via `level_awards` doc per user+level).
  const awarded = [];
  for (const lv of levels) {
    if ((lv.levelNumber || 0) > (top.levelNumber || 0)) continue;
    const key = { userId, levelId: lv.id };
    const existing = await db.collection('level_awards').findOne(key);
    if (existing) continue;

    // First time hitting this level → credit the level commission + mark
    await db.collection('level_awards').insertOne({
      id: uuidv4(),
      userId,
      levelId: lv.id,
      levelNumber: lv.levelNumber,
      levelName: lv.name,
      commissionPaid: Number(lv.levelCommission) || 0,
      awardedAt: new Date(),
    });
    if ((Number(lv.levelCommission) || 0) > 0) {
      await creditNetwork(userId, Number(lv.levelCommission), {
        type: 'level_commission',
        level: lv.levelNumber,
        levelName: lv.name,
        description: `Level ${lv.levelNumber} qualification reward — ${lv.name}`,
        reference: `LVL-${lv.levelNumber}-${userId.slice(0, 8)}`,
      });
    }
    awarded.push({ levelNumber: lv.levelNumber, name: lv.name, commission: Number(lv.levelCommission) || 0 });
  }

  await db.collection('users').updateOne(
    { id: userId },
    { $set: {
        currentLevel: top.levelNumber,
        currentLevelId: top.id,
        currentLevelName: top.name,
        currentSalary: Number(top.monthlySalary) || 0,
      }
    }
  );

  return { metrics, currentLevel: top.levelNumber, currentLevelId: top.id, awarded };
}

// Walk up the sponsor chain and re-evaluate each ancestor. Used after a
// deposit is approved so business + paid-referral counts propagate upward.
export async function evaluateUpline(fromUserId) {
  const db = await getDb();
  let cur = await db.collection('users').findOne({ id: fromUserId });
  const seen = new Set();
  let depth = 0;
  while (cur?.referredBy && !seen.has(cur.referredBy) && depth < 50) {
    seen.add(cur.referredBy);
    await evaluateUserLevel(cur.referredBy);
    cur = await db.collection('users').findOne({ id: cur.referredBy });
    depth++;
  }
}

// ──────────────────── direct commission ────────────────────
// Called inside the deposit-approve handler. Idempotent via deposit id.
export async function creditDirectCommissionOnDeposit(deposit) {
  if (!deposit?.userId || !(deposit.amount > 0)) return;
  const db = await getDb();
  const settings = await getNetworkSettings();
  if (!settings.directCommissionEnabled) return;
  if (deposit.amount < settings.directCommissionMinDeposit) return;

  const user = await db.collection('users').findOne({ id: deposit.userId });
  const sponsorId = user?.referredBy;
  if (!sponsorId) return;

  // Idempotency: one direct-commission txn per deposit, ever.
  const already = await db.collection('network_transactions').findOne({
    type: 'direct_commission',
    refDepositId: deposit.id,
  });
  if (already) return;

  const pct = Math.max(0, Math.min(100, settings.directCommissionPercent));
  const amount = +(deposit.amount * (pct / 100)).toFixed(2);
  if (!(amount > 0)) return;

  await creditNetwork(sponsorId, amount, {
    type: 'direct_commission',
    description: `Direct commission ${pct}% on $${deposit.amount.toFixed(2)} deposit by referral`,
    reference: `DC-${deposit.id.slice(0, 8).toUpperCase()}`,
    refDepositId: deposit.id,
  });
}

// ──────────────────── monthly salary scheduler ────────────────────
// Returns YYYY-MM key for the given Date (UTC).
function monthKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// Idempotently pays out monthly salary to all qualified users for the
// current month. Highest-level-only rule.
export async function runMonthlySalaryCheck(force = false) {
  const db = await getDb();
  const settings = await getNetworkSettings();
  const now = new Date();
  const today = now.getUTCDate();
  if (!force && today !== settings.salaryDay) return { skipped: true, reason: 'not salary day' };

  const monthStr = monthKey(now);

  // Get all users who have a currentLevel > 0 (cached). Re-validate
  // qualification fresh before paying.
  const candidates = await db.collection('users')
    .find({ currentLevel: { $gt: 0 } })
    .toArray();

  const levels = await getActiveLevels();
  let paid = 0;
  let skipped = 0;
  for (const u of candidates) {
    // Idempotency lock per (user, month)
    const lockId = `salary-${u.id}-${monthStr}`;
    const existing = await db.collection('salary_payouts').findOne({ id: lockId });
    if (existing) { skipped++; continue; }

    // Re-validate qualification right now (highest qualifying active level)
    const metrics = await computeNetworkMetrics(u.id, settings);
    const top = pickHighestQualifyingLevel(levels, metrics);
    if (!top || !(top.monthlySalary > 0)) { skipped++; continue; }

    // Pre-insert the lock to prevent double-pay on concurrent invocations
    try {
      await db.collection('salary_payouts').insertOne({
        id: lockId,
        userId: u.id,
        month: monthStr,
        levelId: top.id,
        levelNumber: top.levelNumber,
        levelName: top.name,
        amount: Number(top.monthlySalary) || 0,
        paidAt: new Date(),
      });
    } catch {
      skipped++;
      continue;
    }

    await creditNetwork(u.id, Number(top.monthlySalary), {
      type: 'monthly_salary',
      level: top.levelNumber,
      levelName: top.name,
      description: `Monthly salary — Level ${top.levelNumber} (${monthStr})`,
      reference: `SAL-${top.levelNumber}-${monthStr}-${u.id.slice(0, 8).toUpperCase()}`,
      refSalaryMonth: monthStr,
    });
    paid++;
  }
  return { skipped: false, paid, skippedExisting: skipped, month: monthStr };
}

// Boot the recurring scheduler — runs once per hour and pays out only when
// today's UTC day matches `salaryDay`. Idempotent per (user, month).
let _salaryTimer = null;
export function startSalaryScheduler() {
  if (global.__salarySchedulerStarted) return;
  global.__salarySchedulerStarted = true;
  // Run once at boot (covers cases where the server was offline at the
  // salary moment but is up later that day).
  runMonthlySalaryCheck().catch(() => {});
  _salaryTimer = setInterval(() => {
    runMonthlySalaryCheck().catch(() => {});
  }, 60 * 60 * 1000); // hourly
}

// ──────────────────── public read helpers ────────────────────
export async function getUserNetworkSummary(userId) {
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: userId });
  if (!user) return null;
  const settings = await getNetworkSettings();
  const levels = await getActiveLevels();
  // Always recompute live metrics (cheap; the cache is just a fallback for
  // multi-user listings).
  const metrics = await computeNetworkMetrics(userId, settings);

  const top = pickHighestQualifyingLevel(levels, metrics);
  const nextLevel = levels.find(lv => (lv.levelNumber || 0) > (top?.levelNumber || 0));

  // Totals
  const totals = await db.collection('network_transactions').aggregate([
    { $match: { userId, type: { $in: ['direct_commission', 'level_commission', 'monthly_salary'] } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } }
  ]).toArray();
  const sum = (t) => totals.find(x => x._id === t)?.total || 0;

  // Direct referrals + total team count for stat cards
  const directRefs = await db.collection('users').countDocuments({ referredBy: userId });

  return {
    referralCode: user.referralCode || null,
    networkBalance: Number(user.networkBalance || 0),
    metrics,
    directReferrals: directRefs,
    currentLevel: top ? { levelNumber: top.levelNumber, name: top.name, id: top.id, monthlySalary: Number(top.monthlySalary) || 0 } : null,
    nextLevel: nextLevel ? {
      levelNumber: nextLevel.levelNumber,
      name: nextLevel.name,
      requiredPaidReferrals: nextLevel.requiredPaidReferrals,
      requiredTeamBusiness: nextLevel.requiredTeamBusiness,
      levelCommission: nextLevel.levelCommission,
      monthlySalary: nextLevel.monthlySalary,
      remainingPaidReferrals: Math.max(0, (nextLevel.requiredPaidReferrals || 0) - metrics.paidReferrals),
      remainingTeamBusiness: Math.max(0, (nextLevel.requiredTeamBusiness || 0) - metrics.teamBusiness),
    } : null,
    totals: {
      directCommission: sum('direct_commission'),
      levelCommission: sum('level_commission'),
      monthlySalary: sum('monthly_salary'),
      totalEarned: sum('direct_commission') + sum('level_commission') + sum('monthly_salary'),
    },
    salaryDay: settings.salaryDay,
    minPaidDepositThreshold: settings.minPaidDepositThreshold,
    directCommissionPercent: settings.directCommissionPercent,
    directCommissionEnabled: settings.directCommissionEnabled,
    levels: levels.map(lv => ({
      id: lv.id,
      levelNumber: lv.levelNumber,
      name: lv.name,
      requiredPaidReferrals: lv.requiredPaidReferrals,
      requiredTeamBusiness: lv.requiredTeamBusiness,
      levelCommission: lv.levelCommission,
      monthlySalary: lv.monthlySalary,
      achieved: !!top && (lv.levelNumber || 0) <= (top.levelNumber || 0),
      isCurrent: !!top && lv.levelNumber === top.levelNumber,
    })),
  };
}
