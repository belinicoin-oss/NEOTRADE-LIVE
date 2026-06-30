'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, CheckCircle2, AlertTriangle, Wallet, ShieldCheck, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Default withdrawal channel — used as a fallback when admin has not yet
// configured any payment methods so users can still transact.
const DEFAULT_METHOD = {
  id: 'default-binance',
  name: 'Binance Pay',
  identifier: '',
  recipient: '',
  instructions: 'Funds will be sent to the Binance ID you provide. Verify the recipient name on your Binance account before submitting.',
  type: 'both',
  enabled: true,
};

export default function WithdrawalModal({ open, onClose, user, onUserUpdate, onSuccess }) {
  const [binanceId, setBinanceId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [minAmount, setMinAmount] = useState(10);
  const [methods, setMethods] = useState([DEFAULT_METHOD]);
  const [selectedId, setSelectedId] = useState(DEFAULT_METHOD.id);
  const [source, setSource] = useState('trading'); // 'trading' | 'network'

  // Pull global min withdrawal from public settings
  useEffect(() => {
    if (!open) return;
    api.publicSettings().then(r => {
      const m = Number(r?.settings?.minWithdrawal);
      if (m > 0) setMinAmount(m);
    }).catch(() => {});
    api.paymentMethods('withdrawal').then(r => {
      const list = Array.isArray(r?.methods) ? r.methods.filter(x => x?.enabled !== false) : [];
      if (list.length > 0) {
        setMethods(list);
        setSelectedId(list[0].id);
      } else {
        setMethods([DEFAULT_METHOD]);
        setSelectedId(DEFAULT_METHOD.id);
      }
    }).catch(() => {
      setMethods([DEFAULT_METHOD]);
      setSelectedId(DEFAULT_METHOD.id);
    });
    // Refresh user balances (incl. network) the moment the modal opens so
    // the source switcher reflects fresh numbers.
    api.me?.().then(r => { if (r?.user) onUserUpdate?.(r.user); }).catch(() => {});
  }, [open]);

  const selected = methods.find(m => m.id === selectedId) || methods[0] || DEFAULT_METHOD;
  const liveBal = Number(user?.liveBalance || 0);
  const networkBal = Number(user?.networkBalance || 0);
  const sourceBal = source === 'network' ? networkBal : liveBal;
  const sourceLabel = source === 'network' ? 'Network Wallet' : 'Trading Wallet';

  const reset = () => { setBinanceId(''); setRecipient(''); setAmount(''); setDone(false); setSource('trading'); };
  const handleClose = () => { onClose(); reset(); };

  const submit = async () => {
    const amt = Number(amount);
    if (!binanceId.trim() || binanceId.trim().length < 4) { toast.error('Account ID is required'); return; }
    if (!recipient.trim()) { toast.error('Recipient name is required'); return; }
    if (!(amt >= minAmount)) { toast.error(`Minimum withdrawal is $${minAmount}`); return; }
    if (amt > sourceBal) { toast.error(`Insufficient ${sourceLabel.toLowerCase()} balance (max $${sourceBal.toFixed(2)})`); return; }
    setSubmitting(true);
    try {
      const r = await api.createWithdrawal({
        amount: amt,
        source,
        method: (selected?.name || 'binance').toLowerCase(),
        methodData: {
          method_id: selected?.id,
          method_name: selected?.name,
          user_account_id: binanceId.trim(),
          recipient: recipient.trim(),
          source,
        },
      });
      toast.success('Withdrawal request submitted — pending admin approval');
      if (r.user) onUserUpdate?.(r.user);
      setDone(true);
      onSuccess?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg w-[96vw] sm:w-full bg-[#0a0d12] border-white/10 p-0 overflow-hidden max-h-[94vh] flex flex-col">
        <DialogTitle className="sr-only">Withdraw</DialogTitle>

        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E53935]/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#E53935]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Withdraw · {selected?.name || 'Manual'}</h2>
              <div className="text-[10px] text-white/50">Manual payout · approved by admin</div>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-md hover:bg-white/5 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/20 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-[#00b97a]" />
            </div>
            <div className="text-lg font-bold mb-1">Request Submitted</div>
            <div className="text-sm text-white/60 mb-4">The admin will review and process your withdrawal shortly. Funds were placed on hold from your Live balance.</div>
            <Button onClick={handleClose} className="bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold">Done</Button>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Method picker (only shown when admin configured >1) */}
            {methods.length > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1.5 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Choose payout method
                </div>
                <div className="grid grid-cols-2 gap-2" data-testid="withdraw-method-picker">
                  {methods.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      data-testid={`withdraw-method-${m.id}`}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border text-left transition ${
                        selectedId === m.id
                          ? 'border-[#22D3EE] bg-[#22D3EE]/10 text-white'
                          : 'border-white/10 bg-[#11161e] text-white/60 hover:text-white'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected?.instructions && (
              <div className="flex items-start gap-2 text-[11px] text-white/60 bg-[#0c1015] border border-white/5 rounded-md px-3 py-2 whitespace-pre-wrap">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00b97a] shrink-0 mt-0.5" />
                <span>{selected.instructions}</span>
              </div>
            )}

            {/* Wallet source selector */}
            <div className="grid grid-cols-2 gap-2" data-testid="withdraw-source-selector">
              <button
                type="button"
                onClick={() => setSource('trading')}
                data-testid="withdraw-source-trading"
                className={`text-left rounded-xl border p-3 transition ${source === 'trading' ? 'border-[#22D3EE] bg-gradient-to-br from-[#22D3EE]/15 to-transparent' : 'border-white/10 bg-[#11161e] hover:border-white/30'}`}
              >
                <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Trading Wallet</div>
                <div className="text-lg font-extrabold mt-0.5">${liveBal.toFixed(2)}</div>
                <div className="text-[10px] text-white/40">Trading P/L + deposits</div>
              </button>
              <button
                type="button"
                onClick={() => setSource('network')}
                data-testid="withdraw-source-network"
                className={`text-left rounded-xl border p-3 transition ${source === 'network' ? 'border-[#8B5CF6] bg-gradient-to-br from-[#8B5CF6]/15 to-transparent' : 'border-white/10 bg-[#11161e] hover:border-white/30'}`}
              >
                <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Network Wallet</div>
                <div className="text-lg font-extrabold mt-0.5">${networkBal.toFixed(2)}</div>
                <div className="text-[10px] text-white/40">Commissions + monthly salary</div>
              </button>
            </div>

            {/* Account ID */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#f0b90b] text-black text-xs font-bold flex items-center justify-center">1</div>
                <div className="text-sm font-bold">Your {selected?.name || 'account'} ID</div>
              </div>
              <Input
                value={binanceId}
                onChange={(e) => setBinanceId(e.target.value)}
                placeholder="e.g. 123456789"
                className="bg-[#11161e] border-white/10 h-10 text-sm font-mono"
              />
              <div className="text-[10px] text-white/40 mt-1">Funds will be sent to this account.</div>
            </div>

            {/* Recipient name */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#22D3EE] text-white text-xs font-bold flex items-center justify-center">2</div>
                <div className="text-sm font-bold">Recipient name</div>
              </div>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Full name registered on the account"
                className="bg-[#11161e] border-white/10 h-10 text-sm"
              />
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#22D3EE] text-white text-xs font-bold flex items-center justify-center">3</div>
                <div className="text-sm font-bold">Amount to withdraw (USD)</div>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                <Input
                  type="number"
                  min={minAmount}
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Minimum $${minAmount}`}
                  className="bg-[#11161e] border-white/10 pl-7 h-11 text-base font-bold"
                />
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button onClick={() => setAmount(String(minAmount))} className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white/70">Min</button>
                <button onClick={() => setAmount(String(Math.floor(sourceBal * 0.25)))} className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white/70">25%</button>
                <button onClick={() => setAmount(String(Math.floor(sourceBal * 0.5)))} className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white/70">50%</button>
                <button onClick={() => setAmount(String(Math.floor(sourceBal * 0.75)))} className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white/70">75%</button>
                <button onClick={() => setAmount(String(Math.floor(sourceBal)))} className="px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-[#00b97a] font-bold">Max</button>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#11161e] border border-white/5 rounded-lg p-3">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f0b90b] shrink-0 mt-0.5" />
              <span>The amount is held from your Live balance immediately. If the admin rejects the request, funds are refunded.</span>
            </div>

            <Button
              onClick={submit}
              disabled={submitting || sourceBal <= 0}
              className="w-full h-11 bg-[#E53935] hover:bg-[#F44336] font-bold text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {submitting ? 'Submitting…' : `Withdraw from ${sourceLabel}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
