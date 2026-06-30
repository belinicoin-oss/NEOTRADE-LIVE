'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Network, Trophy, Users, DollarSign, TrendingUp, Calendar, Copy, ArrowLeft,
  Wallet, Award, CheckCircle2, Clock, Loader2, Share2, Crown, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import TradingLiteLogo from '@/components/TradingLiteLogo';
import { api, getStoredUser } from '@/lib/api';
import { toast } from 'sonner';

const TXN_LABELS = {
  direct_commission: { label: 'Direct Commission', color: '#22d3ee', Icon: TrendingUp },
  level_commission:  { label: 'Level Commission',  color: '#f0b90b', Icon: Trophy },
  monthly_salary:    { label: 'Monthly Salary',    color: '#8B5CF6', Icon: Calendar },
  withdrawal:        { label: 'Withdrawal',        color: '#E53935', Icon: Wallet },
  manual:            { label: 'Manual Adjustment', color: '#9ca3af', Icon: BarChart3 },
};

export default function NetworkPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('overview'); // overview | levels | team | transactions

  useEffect(() => {
    const u = getStoredUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);
  }, [router]);

  const refresh = async () => {
    try {
      const [s, t, tm] = await Promise.all([
        api.networkMe(),
        api.networkTransactions(),
        api.networkTeam(),
      ]);
      setSummary(s.summary || null);
      setTransactions(t.transactions || []);
      setTeam(tm.team || []);
    } catch (e) { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [user]);

  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error('Could not copy'); }
  };

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-[#0c1015] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#22D3EE]" />
      </div>
    );
  }

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/signup?ref=${summary.referralCode || ''}`
    : '';

  const progressPct = (have, need) => {
    if (!need) return 100;
    return Math.min(100, Math.round((have / need) * 100));
  };

  return (
    <div className="min-h-screen bg-[#0c1015] text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0a0d12]/90 backdrop-blur border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/trade')} className="text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <TradingLiteLogo compact />
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-[#22D3EE]" />
              <h1 className="text-base sm:text-lg font-bold">Network Compensation</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#11161e] border border-white/10 rounded-full px-3 py-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#00b97a]" />
            <span className="text-[10px] uppercase text-white/40">Network</span>
            <span className="font-bold text-sm" data-testid="network-balance">${(summary.networkBalance || 0).toFixed(2)}</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-1 flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {[
            { v: 'overview', l: 'Overview' },
            { v: 'levels', l: 'Levels' },
            { v: 'team', l: `My Team (${team.length})` },
            { v: 'transactions', l: 'Transactions' },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setView(t.v)}
              data-testid={`network-tab-${t.v}`}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide whitespace-nowrap transition ${
                view === t.v ? 'bg-[#22D3EE] text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {view === 'overview' && (
          <Overview summary={summary} referralLink={referralLink} copy={copy} progressPct={progressPct} />
        )}
        {view === 'levels' && (
          <LevelsView summary={summary} progressPct={progressPct} />
        )}
        {view === 'team' && (
          <TeamView team={team} referralLink={referralLink} copy={copy} summary={summary} />
        )}
        {view === 'transactions' && (
          <TransactionsView transactions={transactions} />
        )}
      </main>
    </div>
  );
}

function Overview({ summary, referralLink, copy, progressPct }) {
  const t = summary.totals;
  const cur = summary.currentLevel;
  const nxt = summary.nextLevel;
  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Crown} label="Current Level" value={cur ? `${cur.levelNumber} · ${cur.name}` : '—'} accent="text-[#f0b90b]" testid="kpi-current-level" />
        <Kpi icon={Calendar} label="Monthly Salary" value={cur ? `$${(cur.monthlySalary || 0).toFixed(2)}` : '$0.00'} accent="text-[#8B5CF6]" testid="kpi-monthly-salary" />
        <Kpi icon={Wallet} label="Available Balance" value={`$${(summary.networkBalance || 0).toFixed(2)}`} accent="text-[#00b97a]" testid="kpi-network-balance" />
        <Kpi icon={TrendingUp} label="Total Earned" value={`$${(t.totalEarned || 0).toFixed(2)}`} accent="text-[#22d3ee]" testid="kpi-total-earned" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Kpi icon={DollarSign} label="Direct Commission" value={`$${(t.directCommission || 0).toFixed(2)}`} accent="text-[#22d3ee]" small testid="kpi-direct-commission" />
        <Kpi icon={Trophy} label="Level Commission" value={`$${(t.levelCommission || 0).toFixed(2)}`} accent="text-[#f0b90b]" small testid="kpi-level-commission" />
        <Kpi icon={Award} label="Monthly Salary Earned" value={`$${(t.monthlySalary || 0).toFixed(2)}`} accent="text-[#8B5CF6]" small testid="kpi-salary-earned" />
      </div>

      {/* Referral link card */}
      <div className="bg-gradient-to-br from-[#22D3EE]/15 to-[#8B5CF6]/10 border border-[#22D3EE]/30 rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#22D3EE]/20 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-[#22D3EE]" />
          </div>
          <div>
            <div className="text-base font-bold">Your Referral Link</div>
            <div className="text-xs text-white/60">Share this link — every paid referral counts toward your level.</div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="bg-[#0a0d12] border border-white/10 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-white/40">Code</div>
              <div className="text-base font-mono font-bold text-white truncate" data-testid="referral-code">{summary.referralCode || '—'}</div>
            </div>
            <button onClick={() => copy(summary.referralCode || '', 'Code')} className="px-2 py-1.5 rounded-md hover:bg-white/5 text-white/60 hover:text-[#22D3EE]" data-testid="copy-referral-code">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-[#0a0d12] border border-white/10 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-wider text-white/40">Full link</div>
              <div className="text-xs font-mono text-white/80 truncate" data-testid="referral-link">{referralLink}</div>
            </div>
            <button onClick={() => copy(referralLink, 'Link')} className="px-2 py-1.5 rounded-md hover:bg-white/5 text-white/60 hover:text-[#22D3EE]" data-testid="copy-referral-link">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Current + next level progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#11161e] border border-white/5 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-[#f0b90b]" />
            <div className="text-sm font-bold uppercase tracking-wide">Current Level</div>
          </div>
          {cur ? (
            <div>
              <div className="text-2xl font-extrabold">{`Level ${cur.levelNumber}`} <span className="text-white/60 text-lg font-normal">· {cur.name}</span></div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Mini label="Paid Referrals" value={`${summary.metrics.paidReferrals}`} />
                <Mini label="Team Business" value={`$${(summary.metrics.teamBusiness || 0).toFixed(2)}`} />
                <Mini label="Direct Refs" value={`${summary.directReferrals}`} />
                <Mini label="Status" value={<Badge className="bg-[#8B5CF6]/20 text-[#00b97a]">QUALIFIED</Badge>} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/50">You haven't qualified for any level yet. Refer paid users below to unlock your first level reward.</div>
          )}
        </div>

        <div className="bg-[#11161e] border border-white/5 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-[#22d3ee]" />
            <div className="text-sm font-bold uppercase tracking-wide">Next Level</div>
          </div>
          {nxt ? (
            <div>
              <div className="text-xl font-extrabold">Level {nxt.levelNumber} · {nxt.name}</div>
              <div className="mt-3 space-y-3">
                <Progress
                  label="Paid Referrals"
                  have={summary.metrics.paidReferrals}
                  need={nxt.requiredPaidReferrals}
                  color="#22d3ee"
                />
                <Progress
                  label="Team Business"
                  have={summary.metrics.teamBusiness}
                  need={nxt.requiredTeamBusiness}
                  color="#8B5CF6"
                  prefix="$"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Mini label="Level Commission" value={`$${(nxt.levelCommission || 0).toFixed(2)}`} accent="text-[#f0b90b]" />
                <Mini label="Monthly Salary" value={`$${(nxt.monthlySalary || 0).toFixed(2)}`} accent="text-[#8B5CF6]" />
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/50">Congratulations — you've reached the highest configured level.</div>
          )}
        </div>
      </div>

      {/* Salary day info */}
      <div className="bg-[#11161e] border border-white/5 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <div className="text-sm font-bold">Monthly salary credited on the {ordinal(summary.salaryDay)} of every month</div>
            <div className="text-xs text-white/50">You must still qualify for your current level on the salary date to receive payment.</div>
          </div>
        </div>
        <div className="text-xs text-white/60">
          Min paid deposit: <span className="font-bold text-white">${summary.minPaidDepositThreshold}</span>
          {summary.directCommissionEnabled && <> · Direct commission: <span className="font-bold text-white">{summary.directCommissionPercent}%</span></>}
        </div>
      </div>
    </div>
  );
}

function LevelsView({ summary, progressPct }) {
  const levels = summary.levels || [];
  if (!levels.length) {
    return (
      <div className="bg-[#11161e] border border-white/5 rounded-xl p-12 text-center text-white/50">
        No network levels have been configured by the admin yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {levels.map(lv => {
        const refPct  = progressPct(summary.metrics.paidReferrals, lv.requiredPaidReferrals);
        const bizPct  = progressPct(summary.metrics.teamBusiness,  lv.requiredTeamBusiness);
        return (
          <div
            key={lv.id}
            data-testid={`network-level-card-${lv.levelNumber}`}
            className={`rounded-xl border p-4 sm:p-5 ${
              lv.isCurrent
                ? 'border-[#f0b90b]/60 bg-gradient-to-br from-[#f0b90b]/10 to-transparent'
                : lv.achieved
                  ? 'border-[#8B5CF6]/40 bg-[#11161e]'
                  : 'border-white/10 bg-[#11161e]'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-lg font-extrabold">LEVEL {lv.levelNumber}</div>
                  <div className="text-base text-white/60">· {lv.name}</div>
                  {lv.isCurrent && <Badge className="bg-[#f0b90b] text-black">CURRENT</Badge>}
                  {lv.achieved && !lv.isCurrent && <Badge className="bg-[#8B5CF6]/20 text-[#00b97a]">ACHIEVED</Badge>}
                  {!lv.achieved && <Badge className="bg-white/10 text-white/50">LOCKED</Badge>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wide text-white/40">Rewards</div>
                <div className="text-sm font-bold text-[#f0b90b]">${(lv.levelCommission || 0).toFixed(2)} commission</div>
                <div className="text-sm font-bold text-[#8B5CF6]">${(lv.monthlySalary || 0).toFixed(2)} / month</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Progress label="Paid Referrals" have={summary.metrics.paidReferrals} need={lv.requiredPaidReferrals} color="#22d3ee" />
              <Progress label="Team Business" have={summary.metrics.teamBusiness} need={lv.requiredTeamBusiness} color="#8B5CF6" prefix="$" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamView({ team, referralLink, copy, summary }) {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-br from-[#22D3EE]/15 to-transparent border border-[#22D3EE]/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold">Invite more referrals to grow your network</div>
          <div className="text-xs text-white/60">A referral becomes "paid" once their total approved deposits ≥ ${summary.minPaidDepositThreshold}.</div>
        </div>
        <Button onClick={() => copy(referralLink, 'Link')} className="bg-[#22D3EE] hover:bg-[#0891B2] font-bold" data-testid="team-copy-link-btn">
          <Copy className="w-4 h-4 mr-2" /> Copy referral link
        </Button>
      </div>

      {team.length === 0 ? (
        <div className="bg-[#11161e] border border-white/5 rounded-xl p-12 text-center text-white/50">
          You haven't referred anyone yet. Share your link to start building your team.
        </div>
      ) : (
        <div className="bg-[#11161e] border border-white/5 rounded-xl p-0 overflow-x-auto">
          <table className="w-full text-sm" data-testid="network-team-table">
            <thead className="bg-[#0a0d12] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-right p-3">Total Deposits</th>
                <th className="text-right p-3">Their Level</th>
                <th className="text-right p-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {team.map(t => (
                <tr key={t.id} className="border-t border-white/5">
                  <td className="p-3">
                    <div className="font-bold">{t.name || '—'}</div>
                    <div className="text-[10px] text-white/40 truncate max-w-[200px]">{t.email}</div>
                  </td>
                  <td className="p-3 text-xs text-white/60">{new Date(t.joinedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right font-mono">${(t.totalDeposits || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">
                    {t.currentLevel > 0 ? <Badge className="bg-[#f0b90b]/15 text-[#f0b90b]">L{t.currentLevel}</Badge> : <span className="text-white/30 text-xs">—</span>}
                  </td>
                  <td className="p-3 text-right pr-4">
                    {t.isPaid
                      ? <Badge className="bg-[#8B5CF6]/20 text-[#00b97a]"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Paid</Badge>
                      : <Badge className="bg-white/10 text-white/50"><Clock className="w-3 h-3 mr-1 inline" /> Unpaid</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TransactionsView({ transactions }) {
  if (!transactions.length) {
    return <div className="bg-[#11161e] border border-white/5 rounded-xl p-12 text-center text-white/50">No network transactions yet.</div>;
  }
  return (
    <div className="bg-[#11161e] border border-white/5 rounded-xl p-0 overflow-x-auto">
      <table className="w-full text-sm" data-testid="network-transactions-table">
        <thead className="bg-[#0a0d12] text-white/50 text-xs uppercase">
          <tr>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Description</th>
            <th className="text-left p-3">Level</th>
            <th className="text-right p-3">Amount</th>
            <th className="text-right p-3 pr-4">Reference</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => {
            const cfg = TXN_LABELS[tx.type] || { label: tx.type, color: '#9ca3af', Icon: BarChart3 };
            const I = cfg.Icon;
            const isCredit = tx.amount > 0;
            return (
              <tr key={tx.id} className="border-t border-white/5">
                <td className="p-3 text-xs text-white/70">{new Date(tx.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: cfg.color }}>
                    <I className="w-3.5 h-3.5" /> {cfg.label}
                  </span>
                </td>
                <td className="p-3 text-xs text-white/80 max-w-[260px] truncate" title={tx.description}>{tx.description || '—'}</td>
                <td className="p-3 text-xs">{tx.level ? `L${tx.level}${tx.levelName ? ` · ${tx.levelName}` : ''}` : '—'}</td>
                <td className={`p-3 text-right font-mono font-bold ${isCredit ? 'text-[#00b97a]' : 'text-[#E53935]'}`}>
                  {isCredit ? '+' : ''}${tx.amount.toFixed(2)}
                </td>
                <td className="p-3 text-right pr-4 font-mono text-[10px] text-white/40">{tx.reference || '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, accent = 'text-white', small, testid }) {
  return (
    <div className="bg-[#11161e] border border-white/5 rounded-xl p-3 sm:p-4" data-testid={testid}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${accent}`} />
        <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      </div>
      <div className={`${small ? 'text-lg' : 'text-xl sm:text-2xl'} font-extrabold ${accent}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-[#0c1015] border border-white/5 rounded-md px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
      <div className={`text-sm font-bold mt-0.5 ${accent}`}>{value}</div>
    </div>
  );
}

function Progress({ label, have, need, color = '#22d3ee', prefix = '' }) {
  const pct = need ? Math.min(100, Math.round((have / need) * 100)) : 100;
  const done = pct >= 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="font-mono font-bold" style={{ color: done ? '#00b97a' : color }}>
          {prefix}{Number(have || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          <span className="text-white/40 font-normal"> / {prefix}{Number(need || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: done ? '#00b97a' : color }} />
      </div>
    </div>
  );
}

function ordinal(n) {
  const v = Number(n) || 5;
  const s = ['th', 'st', 'nd', 'rd'];
  const x = v % 100;
  return v + (s[(x - 20) % 10] || s[x] || s[0]);
}
