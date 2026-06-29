import { useState } from 'react';
import { ShieldAlert, Copy, Check, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { invoke } from '../lib/ipc.js';

const REASON_LABEL = {
  not_activated: 'هذا التطبيق غير مفعّل بعد. أدخل مفتاح الترخيص اللي استلمته.',
  invalid_format: 'صيغة المفتاح غير صحيحة. تأكد إنك نسخته كامل بدون مسافات زيادة.',
  invalid_signature: 'هذا المفتاح غير صالح لهذا التطبيق.',
  wrong_product: 'هذا المفتاح خاص بمنتج آخر.',
  expired: 'انتهت صلاحية الترخيص. تواصل مع المورّد لتجديده.',
  machine_mismatch: 'هذا المفتاح مفعّل على جهاز آخر بالفعل.',
};

export default function Activation({ status, onActivated }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(status?.hwid || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await invoke('license:activate', { key: key.trim() });
    setLoading(false);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    onActivated(res.status);
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-card">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-500">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink">تفعيل الترخيص</h1>
            <p className="text-sm text-ink-mute">{REASON_LABEL[status?.reason] || REASON_LABEL.not_activated}</p>
          </div>
        </div>

        <div className="mb-5 rounded border border-line bg-paper p-3">
          <p className="mb-1.5 text-xs text-ink-mute">كود هذا الجهاز (أرسله للمورّد لو طلبه):</p>
          <div className="flex items-center justify-between gap-2">
            <code className="tnum min-w-0 flex-1 break-all text-sm leading-relaxed text-ink">{status?.hwid}</code>
            <button
              onClick={handleCopy}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-mute hover:bg-surface hover:text-brand"
              title="نسخ"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="مفتاح الترخيص"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="الصق المفتاح هنا"
            error={error ? REASON_LABEL[error] || 'تعذّر تفعيل هذا المفتاح' : null}
          />
          <Button type="submit" className="w-full" disabled={!key.trim() || loading} icon={<KeyRound size={16} />}>
            {loading ? 'جاري التفعيل...' : 'تفعيل'}
          </Button>
        </form>
      </div>
    </div>
  );
}
