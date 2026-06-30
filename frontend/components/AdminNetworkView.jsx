'use client';

// Admin → Network Compensation view (Levels CRUD + Settings + Members + Audit).
// Self-contained module so /app/admin/page.js stays manageable.

import { useEffect, useState } from 'react';
import {
  Trophy, Plus, Pencil, Trash2, X, Loader2, RefreshCw, Calendar, DollarSign,
  Users, Percent, Award, Crown, Shield, ArrowUp, ArrowDown, PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function NetworkAdminView({ settings, saveSettings }) {
  const [tab, setTab] = useState('levels');
  return (
    <div className="space-y-4 max-w-[1300px]" data-testid="admin-network-view">
      <div className="flex items-center gap-2 flex-wrap">
        <TabBtn active={tab === 'levels'}    onClick={() => setTab('levels')}    testid="admin-network-tab-levels">    <Trophy   className="w-3.5 h-3.5 mr-1 inline" /> Levels   </TabBtn>
        <TabBtn active={tab === 'settings'}  onClick={() => setTab('settings')}  testid="admin-network-tab-settings">  <Shield   className="w-3.5 h-3.5 mr-1 inline" /> Settings </TabBtn>
        <TabBtn active={tab === 'members'}   onClick={() => setTab('members')}   testid="admin-network-tab-members">   <Users    className="w-3.5 h-3.5 mr-1 inline" /> Members  </TabBtn>
        <TabBtn active={tab === 'audit'}     onClick={() => setTab('audit')}     testid="admin-network-tab-audit">     <Award    className="w-3.5 h-3.5 mr-1 inline" /> Audit Log</TabBtn>
      </div>
      {tab === 'levels'   && <LevelsTab />}
      {tab === 'settings' && <SettingsTab settings={settings} saveSettings={saveSettings} />}
      {tab === 'members'  && <MembersTab />}
      {tab === 'audit'    && <AuditTab />}
    </div>
  );
}

function TabBtn({ active, onClick, children, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide ${
        active ? 'bg-[#22D3EE] text-white' : 'bg-[#11161e] border border-white/10 text-white/60 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/* ============== LEVELS TAB ============== */
function LevelsTab() {
  const [levels, setLevels] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const r = await api.adminNetworkLevels(); setLevels(r.levels || []); } catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const create = () => setEditing({
    levelNumber: (levels.length ? Math.max(...levels.map(l => l.levelNumber || 0)) + 1 : 1),
    name: '', requiredPaidReferrals: 0, requiredTeamBusiness: 0,
    levelCommission: 0, monthlySalary: 0, active: true,
  });

  const save = async (draft) => {
    setBusy(true);
    try {
      if (draft.id) await api.adminUpdateNetworkLevel(draft.id, draft);
      else await api.adminCreateNetworkLevel(draft);
      toast.success(draft.id ? 'Level updated' : 'Level created');
      setEditing(null); await load();
    } catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this level? Already-awarded users keep their commission, but no new awards will fire for this level.')) return;
    try { await api.adminDeleteNetworkLevel(id); toast.success('Level deleted'); await load(); }
    catch (e) { toast.error(e.message); }
  };

  const toggleActive = async (lv) => {
    try { await api.adminUpdateNetworkLevel(lv.id, { active: !lv.active }); await load(); }
    catch (e) { toast.error(e.message); }
  };

  const move = async (idx, dir) => {
    const next = [...levels];
    const j = idx + dir; if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setLevels(next);
    try { await api.adminReorderNetworkLevels(next.map(l => l.id)); }
    catch (e) { toast.error(e.message); load(); }
  };

  const recalc = async () => {
    try { const r = await api.adminNetworkRecalc(); toast.success(`Re-evaluated ${r.scanned} users`); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#11161e] border border-white/5 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f0b90b]/15 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-[#f0b90b]" />
          </div>
          <div>
            <div className="text-base font-bold">Network Levels</div>
            <div className="text-xs text-white/50">Configure unlimited achievement levels. Each level pays a one-time commission and unlocks a monthly salary.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-white/10 text-xs" onClick={recalc} data-testid="admin-network-recalc-btn">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-evaluate all
          </Button>
          <Button onClick={create} className="bg-[#22D3EE] hover:bg-[#0891B2] font-bold" data-testid="admin-network-add-level-btn">
            <Plus className="w-4 h-4 mr-1" /> Add Level
          </Button>
        </div>
      </div>

      {levels.length === 0 ? (
        <div className="bg-[#11161e] border border-white/5 rounded-xl p-10 text-center" data-testid="admin-network-no-levels">
          <Trophy className="w-10 h-10 mx-auto text-white/30 mb-2" />
          <div className="text-sm font-bold">No levels defined yet</div>
          <div className="text-xs text-white/50 mt-1">Add your first level to start rewarding referrers.</div>
        </div>
      ) : (
        <div className="bg-[#11161e] border border-white/5 rounded-xl p-0 overflow-x-auto" data-testid="admin-network-levels-table">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0d12] text-white/50 text-xs uppercase">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Lvl #</th>
                <th className="text-left p-3">Name</th>
                <th className="text-right p-3">Paid Refs</th>
                <th className="text-right p-3">Team Business</th>
                <th className="text-right p-3">Commission</th>
                <th className="text-right p-3">Monthly Salary</th>
                <th className="text-right p-3">Active</th>
                <th className="text-right p-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((lv, idx) => (
                <tr key={lv.id} className="border-t border-white/5" data-testid={`admin-network-level-row-${lv.id}`}>
                  <td className="p-3">
                    <div className="flex gap-0.5">
                      <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-6 h-6 rounded hover:bg-white/5 disabled:opacity-30"><ArrowUp className="w-3 h-3 mx-auto" /></button>
                      <button onClick={() => move(idx, +1)} disabled={idx === levels.length - 1} className="w-6 h-6 rounded hover:bg-white/5 disabled:opacity-30"><ArrowDown className="w-3 h-3 mx-auto" /></button>
                    </div>
                  </td>
                  <td className="p-3 font-mono">L{lv.levelNumber}</td>
                  <td className="p-3 font-bold">{lv.name}</td>
                  <td className="p-3 text-right font-mono">{lv.requiredPaidReferrals}</td>
                  <td className="p-3 text-right font-mono">${Number(lv.requiredTeamBusiness || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-[#f0b90b]">${Number(lv.levelCommission || 0).toFixed(2)}</td>
                  <td className="p-3 text-right font-mono text-[#8B5CF6]">${Number(lv.monthlySalary || 0).toFixed(2)}</td>
                  <td className="p-3 text-right"><Switch checked={!!lv.active} onCheckedChange={() => toggleActive(lv)} data-testid={`admin-network-level-toggle-${lv.id}`} /></td>
                  <td className="p-3 text-right pr-4">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={() => setEditing(lv)} data-testid={`admin-network-level-edit-${lv.id}`}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-[#E53935] hover:bg-[#F44336]" onClick={() => remove(lv.id)} data-testid={`admin-network-level-delete-${lv.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <LevelEditor draft={editing} onSave={save} onCancel={() => setEditing(null)} busy={busy} />
      )}
    </div>
  );
}

function LevelEditor({ draft, onSave, onCancel, busy }) {
  const [d, setD] = useState({ ...draft });
  const isNew = !d.id;
  const submit = (e) => {
    e.preventDefault();
    if (!d.name || !d.name.trim()) { toast.error('Level name required'); return; }
    onSave({
      ...d,
      levelNumber: parseInt(d.levelNumber) || 1,
      requiredPaidReferrals: parseInt(d.requiredPaidReferrals) || 0,
      requiredTeamBusiness: Number(d.requiredTeamBusiness) || 0,
      levelCommission: Number(d.levelCommission) || 0,
      monthlySalary: Number(d.monthlySalary) || 0,
    });
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onCancel} data-testid="admin-network-level-editor">
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0a0d12] border border-white/10 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f0b90b]/15 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#f0b90b]" />
            </div>
            <div>
              <div className="text-base font-bold">{isNew ? 'Add Level' : `Edit Level ${d.levelNumber}`}</div>
              <div className="text-[10px] text-white/50">{isNew ? 'A new achievement tier' : d.name}</div>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <Row2>
            <Field label="Level #"><Input type="number" min={1} value={d.levelNumber} onChange={(e) => setD(s => ({ ...s, levelNumber: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-input-level-number" /></Field>
            <Field label="Name"><Input value={d.name} maxLength={80} onChange={(e) => setD(s => ({ ...s, name: e.target.value }))} placeholder="Bronze, Silver, Gold..." className="bg-[#11161e] border-white/10" data-testid="admin-network-input-name" /></Field>
          </Row2>
          <Row2>
            <Field label="Required Paid Referrals" hint="Direct referrals only."><Input type="number" min={0} value={d.requiredPaidReferrals} onChange={(e) => setD(s => ({ ...s, requiredPaidReferrals: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-input-required-paid-referrals" /></Field>
            <Field label="Required Team Business (USD)" hint="Entire downline (unlimited depth)."><Input type="number" min={0} step="0.01" value={d.requiredTeamBusiness} onChange={(e) => setD(s => ({ ...s, requiredTeamBusiness: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-input-required-team-business" /></Field>
          </Row2>
          <Row2>
            <Field label="Level Commission (USD)" hint="Paid once on qualification."><Input type="number" min={0} step="0.01" value={d.levelCommission} onChange={(e) => setD(s => ({ ...s, levelCommission: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-input-level-commission" /></Field>
            <Field label="Monthly Salary (USD)" hint="Paid every salary day while qualified."><Input type="number" min={0} step="0.01" value={d.monthlySalary} onChange={(e) => setD(s => ({ ...s, monthlySalary: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-input-monthly-salary" /></Field>
          </Row2>
          <div className="flex items-center justify-between bg-[#0c1015] border border-white/5 rounded-md px-3 py-2.5">
            <div>
              <div className="text-sm font-bold">Active</div>
              <div className="text-[10px] text-white/40">Inactive levels are hidden from users and skipped during evaluation.</div>
            </div>
            <Switch checked={!!d.active} onCheckedChange={(v) => setD(s => ({ ...s, active: v }))} data-testid="admin-network-input-active" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/5">
          <Button type="button" variant="outline" className="border-white/10" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={busy} className="bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold" data-testid="admin-network-level-save-btn">
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            {isNew ? 'Create Level' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ============== SETTINGS TAB ============== */
function SettingsTab({ settings, saveSettings }) {
  const n = settings?.network || {};
  const [d, setD] = useState({
    salaryDay: n.salaryDay ?? 5,
    minPaidDepositThreshold: n.minPaidDepositThreshold ?? 50,
    directCommissionEnabled: n.directCommissionEnabled !== false,
    directCommissionPercent: n.directCommissionPercent ?? 5,
    directCommissionMinDeposit: n.directCommissionMinDeposit ?? 0,
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const m = settings?.network || {};
    setD({
      salaryDay: m.salaryDay ?? 5,
      minPaidDepositThreshold: m.minPaidDepositThreshold ?? 50,
      directCommissionEnabled: m.directCommissionEnabled !== false,
      directCommissionPercent: m.directCommissionPercent ?? 5,
      directCommissionMinDeposit: m.directCommissionMinDeposit ?? 0,
    });
  }, [settings?.network]);

  const save = async () => {
    setBusy(true);
    try {
      await saveSettings({ network: {
        salaryDay: parseInt(d.salaryDay) || 5,
        minPaidDepositThreshold: Number(d.minPaidDepositThreshold) || 0,
        directCommissionEnabled: !!d.directCommissionEnabled,
        directCommissionPercent: Number(d.directCommissionPercent) || 0,
        directCommissionMinDeposit: Number(d.directCommissionMinDeposit) || 0,
      }});
    } finally { setBusy(false); }
  };

  const runSalary = async () => {
    if (!confirm('Force-run the monthly salary check now? Salaries that have already been paid this month will be skipped (idempotent).')) return;
    try {
      const r = await api.adminNetworkSalaryRun(true);
      toast.success(`Salary run: ${r.result?.paid || 0} paid, ${r.result?.skippedExisting || 0} already paid`);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#11161e] border border-white/5 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/15 flex items-center justify-center"><Calendar className="w-5 h-5 text-[#8B5CF6]" /></div>
          <div>
            <div className="text-base font-bold">Compensation Engine Settings</div>
            <div className="text-xs text-white/50">Global rules used by the network engine. Take effect immediately for the next deposit/evaluation.</div>
          </div>
        </div>

        <Row2>
          <Field label="Monthly Salary Day (1–28)" hint="Day of month salaries are credited.">
            <Input type="number" min={1} max={28} value={d.salaryDay} onChange={(e) => setD(s => ({ ...s, salaryDay: e.target.value }))} className="bg-[#0c1015] border-white/10" data-testid="admin-network-setting-salary-day" />
          </Field>
          <Field label="Min Paid Deposit Threshold (USD)" hint="A referral counts as Paid once their cumulative approved deposits ≥ this.">
            <Input type="number" min={0} step="0.01" value={d.minPaidDepositThreshold} onChange={(e) => setD(s => ({ ...s, minPaidDepositThreshold: e.target.value }))} className="bg-[#0c1015] border-white/10" data-testid="admin-network-setting-min-paid" />
          </Field>
        </Row2>

        <div className="bg-[#0c1015] border border-white/5 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#22d3ee]" />
              <div className="text-sm font-bold">Direct Commission</div>
            </div>
            <Switch checked={!!d.directCommissionEnabled} onCheckedChange={(v) => setD(s => ({ ...s, directCommissionEnabled: v }))} data-testid="admin-network-setting-direct-enabled" />
          </div>
          <Row2>
            <Field label="Commission %" hint="Earned on every approved deposit by a direct referral.">
              <Input type="number" min={0} max={100} step="0.1" value={d.directCommissionPercent} onChange={(e) => setD(s => ({ ...s, directCommissionPercent: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-setting-direct-percent" />
            </Field>
            <Field label="Minimum deposit (USD)" hint="Deposits below this amount don't earn commission.">
              <Input type="number" min={0} step="0.01" value={d.directCommissionMinDeposit} onChange={(e) => setD(s => ({ ...s, directCommissionMinDeposit: e.target.value }))} className="bg-[#11161e] border-white/10" data-testid="admin-network-setting-direct-min" />
            </Field>
          </Row2>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" className="border-white/10" onClick={runSalary} data-testid="admin-network-salary-run-btn">
            <PlayCircle className="w-4 h-4 mr-1" /> Run salary now
          </Button>
          <Button onClick={save} disabled={busy} className="bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold" data-testid="admin-network-settings-save-btn">
            {busy && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============== MEMBERS TAB ============== */
function MembersTab() {
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [code, setCode] = useState('');

  const load = async (query = q) => {
    try { const r = await api.adminNetworkMembers(query); setMembers(r.members || []); }
    catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, []);

  const saveSponsor = async () => {
    if (!editing) return;
    try {
      await api.adminSetSponsor(editing.id, { sponsorCode: code.trim() || null, sponsorId: code.trim() ? undefined : null });
      toast.success('Sponsor updated');
      setEditing(null); setCode('');
      await load();
    } catch (e) { toast.error(e.message); }
  };

  const recalcOne = async (id) => {
    try { await api.adminNetworkRecalc(id); toast.success('Re-evaluated'); await load(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#11161e] border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name, or referral code…" className="bg-transparent border-0 h-8" data-testid="admin-network-members-search" />
        <Button size="sm" onClick={() => load(q)} className="bg-[#22D3EE] hover:bg-[#0891B2]">Search</Button>
      </div>
      <div className="bg-[#11161e] border border-white/5 rounded-xl p-0 overflow-x-auto" data-testid="admin-network-members-table">
        <table className="w-full text-sm">
          <thead className="bg-[#0a0d12] text-white/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Ref code</th>
              <th className="text-left p-3">Sponsor</th>
              <th className="text-right p-3">Paid refs</th>
              <th className="text-right p-3">Team biz</th>
              <th className="text-right p-3">Level</th>
              <th className="text-right p-3">Salary</th>
              <th className="text-right p-3">Network bal</th>
              <th className="text-right p-3 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t border-white/5">
                <td className="p-3">
                  <div className="font-bold">{m.name || '—'}</div>
                  <div className="text-[10px] text-white/40 truncate max-w-[200px]">{m.email}</div>
                </td>
                <td className="p-3 font-mono text-xs">{m.referralCode || '—'}</td>
                <td className="p-3 text-xs text-white/70 truncate max-w-[120px]">{m.referredBy ? m.referredBy.slice(0, 8) : '—'}</td>
                <td className="p-3 text-right font-mono">{m.paidReferralsCount || 0}</td>
                <td className="p-3 text-right font-mono">${Number(m.teamBusiness || 0).toFixed(2)}</td>
                <td className="p-3 text-right">{m.currentLevel ? <Badge className="bg-[#f0b90b]/15 text-[#f0b90b]">L{m.currentLevel}</Badge> : <span className="text-white/30 text-xs">—</span>}</td>
                <td className="p-3 text-right font-mono text-[#8B5CF6]">${Number(m.currentSalary || 0).toFixed(2)}</td>
                <td className="p-3 text-right font-mono text-[#00b97a]">${Number(m.networkBalance || 0).toFixed(2)}</td>
                <td className="p-3 text-right pr-4">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={() => recalcOne(m.id)}><RefreshCw className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-white/10" onClick={() => { setEditing(m); setCode(''); }} data-testid={`admin-network-edit-sponsor-${m.id}`}><Pencil className="w-3 h-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-white/40 text-xs">No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={() => setEditing(null)}>
          <div className="bg-[#0a0d12] border border-white/10 rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <div className="text-base font-bold">Set sponsor for {editing.name}</div>
              <div className="text-xs text-white/50 mt-1">Enter the new sponsor's referral code, or leave blank to clear.</div>
            </div>
            <div className="p-5 space-y-3">
              <Field label="Sponsor referral code">
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC1234" className="bg-[#11161e] border-white/10 font-mono" data-testid="admin-network-edit-sponsor-input" />
              </Field>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-white/5">
              <Button variant="outline" className="border-white/10" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveSponsor} className="bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold" data-testid="admin-network-save-sponsor-btn">Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============== AUDIT TAB ============== */
function AuditTab() {
  const [txns, setTxns] = useState([]);
  const [type, setType] = useState('');

  const load = async () => {
    try { const r = await api.adminNetworkTransactions(type ? { type } : {}); setTxns(r.transactions || []); }
    catch (e) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, [type]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap" data-testid="admin-network-audit-filters">
        {[
          { v: '',                   l: 'All' },
          { v: 'direct_commission',  l: 'Direct' },
          { v: 'level_commission',   l: 'Level' },
          { v: 'monthly_salary',     l: 'Salary' },
          { v: 'withdrawal',         l: 'Withdrawal' },
        ].map(o => (
          <button key={o.v} onClick={() => setType(o.v)} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase ${type === o.v ? 'bg-[#22D3EE] text-white' : 'bg-[#11161e] border border-white/10 text-white/60 hover:text-white'}`}>{o.l}</button>
        ))}
      </div>
      <div className="bg-[#11161e] border border-white/5 rounded-xl p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0a0d12] text-white/50 text-xs uppercase">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Level</th>
              <th className="text-right p-3 pr-4">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map(t => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="p-3 text-xs text-white/70">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-3 font-mono text-xs">{t.userId?.slice(0, 8) || '—'}</td>
                <td className="p-3 text-xs uppercase">{t.type?.replace(/_/g, ' ')}</td>
                <td className="p-3 text-xs text-white/80 truncate max-w-[280px]" title={t.description}>{t.description || '—'}</td>
                <td className="p-3 text-right text-xs">{t.level || '—'}</td>
                <td className={`p-3 text-right pr-4 font-mono font-bold ${t.amount >= 0 ? 'text-[#00b97a]' : 'text-[#E53935]'}`}>{t.amount >= 0 ? '+' : ''}${Number(t.amount).toFixed(2)}</td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-white/40 text-xs">No transactions.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* shared bits */
function Row2({ children }) { return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>; }
function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1">{label}</div>
      {children}
      {hint && <div className="text-[10px] text-white/40 mt-1">{hint}</div>}
    </div>
  );
}
