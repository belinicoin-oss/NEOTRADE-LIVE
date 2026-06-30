'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Loader2, CheckCircle2, Copy, Upload, Wallet, ShieldCheck, AlertCircle, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// Default deposit channel — used as a fallback when admin has not yet
// configured any payment methods so users can still transact.
const DEFAULT_METHOD = {
  id: 'default-binance',
  name: 'Binance Pay',
  identifier: '1116347904',
  recipient: 'NEOTRADE',
  instructions: 'Use Binance Pay or any Binance internal transfer. Verify the recipient name before sending.',
  type: 'both',
  enabled: true,
};
const MAX_SCREENSHOT_BYTES = 1024 * 1024; // 1 MB

export default function DepositModal({ open, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [screenshot, setScreenshot] = useState(null); // {dataUrl, name, size}
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [minAmount, setMinAmount] = useState(10);
  const [methods, setMethods] = useState([DEFAULT_METHOD]);
  const [selectedId, setSelectedId] = useState(DEFAULT_METHOD.id);

  useEffect(() => {
    if (!open) return;
    api.publicSettings().then(r => {
      const m = Number(r?.settings?.minDeposit);
      if (m > 0) setMinAmount(m);
    }).catch(() => {});
    api.paymentMethods('deposit').then(r => {
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
  }, [open]);

  const selected = methods.find(m => m.id === selectedId) || methods[0] || DEFAULT_METHOD;

  const reset = () => {
    setAmount(''); setTxHash(''); setScreenshot(null); setDone(false);
  };

  const handleClose = () => { onClose(); reset(); };

  const copy = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error('Could not copy'); }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (f.size > MAX_SCREENSHOT_BYTES) {
      toast.error(`Image too large. Max ${(MAX_SCREENSHOT_BYTES / 1024 / 1024).toFixed(1)} MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setScreenshot({ dataUrl: reader.result, name: f.name, size: f.size });
    reader.onerror = () => toast.error('Could not read file');
    reader.readAsDataURL(f);
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!(amt >= minAmount)) { toast.error(`Minimum amount is $${minAmount}`); return; }
    if (!txHash.trim() || txHash.trim().length < 6) { toast.error('Transaction hash is required'); return; }
    if (!screenshot) { toast.error('Please attach a screenshot of your transaction'); return; }
    setSubmitting(true);
    try {
      await api.createDeposit({
        amount: amt,
        method: (selected?.name || 'binance').toLowerCase(),
        methodData: {
          method_id: selected?.id,
          method_name: selected?.name,
          identifier: selected?.identifier,
          recipient: selected?.recipient,
          tx_hash: txHash.trim(),
          screenshot: screenshot.dataUrl,
        },
      });
      toast.success('Deposit request submitted — pending admin approval');
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
        <DialogTitle className="sr-only">Deposit</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f0b90b]/15 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#f0b90b]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Deposit · {selected?.name || 'Manual'}</h2>
              <div className="text-[10px] text-white/50">Manual transfer · approved by admin</div>
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
            <div className="text-sm text-white/60 mb-4">Your deposit is pending admin approval. Funds will be credited to your Live balance once verified.</div>
            <Button onClick={handleClose} className="bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold">Done</Button>
          </div>
        ) : (
          <div className="overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Method picker (only shown when admin configured >1) */}
            {methods.length > 1 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-1.5 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" /> Choose payment method
                </div>
                <div className="grid grid-cols-2 gap-2" data-testid="deposit-method-picker">
                  {methods.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedId(m.id)}
                      data-testid={`deposit-method-${m.id}`}
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

            {/* Step 1: payment instructions */}
            <div className="bg-gradient-to-br from-[#f0b90b]/10 to-transparent border border-[#f0b90b]/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#f0b90b] text-black text-xs font-bold flex items-center justify-center">1</div>
                <div className="text-sm font-bold">Send your payment via {selected?.name}</div>
              </div>
              <div className="space-y-2">
                {selected?.identifier && <CopyRow label="Identifier" value={selected.identifier} onCopy={copy} mono />}
                {selected?.recipient && <CopyRow label="Recipient name" value={selected.recipient} onCopy={copy} />}
              </div>
              {selected?.instructions && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-white/60 bg-[#0c1015] border border-white/5 rounded-md px-3 py-2 whitespace-pre-wrap">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00b97a] shrink-0 mt-0.5" />
                  <span>{selected.instructions}</span>
                </div>
              )}
            </div>

            {/* Step 2: amount */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#22D3EE] text-white text-xs font-bold flex items-center justify-center">2</div>
                <div className="text-sm font-bold">Amount sent (USD)</div>
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
              <div className="flex gap-1.5 mt-2">
                {[10, 50, 100, 500, 1000].map(v => (
                  <button key={v} onClick={() => setAmount(String(v))} className="flex-1 px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-white/70">${v}</button>
                ))}
              </div>
            </div>

            {/* Step 3: transaction hash */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#22D3EE] text-white text-xs font-bold flex items-center justify-center">3</div>
                <div className="text-sm font-bold">Transaction hash / ID</div>
              </div>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Paste your transaction ID or hash"
                className="bg-[#11161e] border-white/10 h-10 text-xs font-mono"
              />
              <div className="text-[10px] text-white/40 mt-1">Find this in your payment app under Transactions.</div>
            </div>

            {/* Step 4: screenshot */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#22D3EE] text-white text-xs font-bold flex items-center justify-center">4</div>
                <div className="text-sm font-bold">Screenshot of transaction</div>
              </div>
              <label className="block cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                {screenshot ? (
                  <div className="relative bg-[#11161e] border border-[#8B5CF6]/40 rounded-lg p-2 flex items-center gap-3">
                    <img src={screenshot.dataUrl} alt="Transaction" className="w-16 h-16 rounded object-cover bg-black/30" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{screenshot.name}</div>
                      <div className="text-[10px] text-white/50">{(screenshot.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button type="button" onClick={(e) => { e.preventDefault(); setScreenshot(null); }} className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#11161e] border-2 border-dashed border-white/10 hover:border-[#22D3EE]/50 rounded-lg p-6 text-center transition">
                    <Upload className="w-6 h-6 mx-auto text-white/40 mb-2" />
                    <div className="text-xs font-bold text-white/70">Tap to upload screenshot</div>
                    <div className="text-[10px] text-white/40 mt-0.5">PNG, JPG · max 1 MB</div>
                  </div>
                )}
              </label>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 text-[11px] text-white/50 bg-[#11161e] border border-white/5 rounded-lg p-3">
              <AlertCircle className="w-3.5 h-3.5 text-[#f0b90b] shrink-0 mt-0.5" />
              <span>Funds are credited only after the admin verifies your transaction. False or duplicate submissions may lead to account suspension.</span>
            </div>

            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full h-11 bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold text-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {submitting ? 'Submitting…' : 'Submit for approval'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyRow({ label, value, onCopy, mono }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-[#0c1015] border border-white/5 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-white/40">{label}</div>
        <div className={`text-sm font-bold truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
      </div>
      <button onClick={() => onCopy(value, label)} className="w-8 h-8 rounded-md bg-white/5 hover:bg-[#22D3EE]/20 hover:text-[#22D3EE] text-white/60 flex items-center justify-center shrink-0" title="Copy">
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
