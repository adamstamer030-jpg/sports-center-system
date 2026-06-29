import { useEffect, useState } from 'react';
import { ShieldCheck, KeyRound, Download, Upload } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import { invoke } from '../lib/ipc.js';
import { useAuth } from '../store/auth.js';
import { formatDate } from '../lib/format.js';

export default function Settings() {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [license, setLicense] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState(null);
  const [backupMsg, setBackupMsg] = useState(null);

  useEffect(() => {
    invoke('license:status').then(setLicense);
  }, []);

  async function handleChangePassword(e) {
    e.preventDefault();
    setMsg(null);
    const res = await invoke('auth:changePassword', { userId: user.id, oldPassword, newPassword });
    if (!res.ok) {
      setMsg({
        type: 'error',
        text: { wrong_old_password: 'كلمة المرور الحالية غير صحيحة', weak_password: '٦ أحرف على الأقل' }[
          res.reason
        ] || 'حدث خطأ',
      });
      return;
    }
    setUser({ mustChangePassword: false });
    setOldPassword('');
    setNewPassword('');
    setMsg({ type: 'success', text: 'تم تغيير كلمة المرور بنجاح' });
  }

  async function handleExport() {
    setBackupMsg(null);
    const res = await window.api.backup.export();
    if (res.ok) setBackupMsg({ type: 'success', text: 'تم حفظ النسخة الاحتياطية بنجاح ✓' });
    else if (res.reason) setBackupMsg({ type: 'error', text: res.reason });
  }

  async function handleImport() {
    if (!confirm('سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية وإعادة تشغيل البرنامج. هل أنت متأكد؟')) return;
    setBackupMsg(null);
    const res = await window.api.backup.import();
    if (!res.ok && res.reason) setBackupMsg({ type: 'error', text: res.reason });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">الإعدادات والترخيص</h1>
      </div>

      <Card accent>
        <div className="mb-4 flex items-center gap-2 text-ink">
          <ShieldCheck size={18} className="text-brand" />
          <h2 className="font-display text-base font-semibold">حالة الترخيص</h2>
        </div>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-ink-mute">الحالة</dt>
          <dd><Badge variant={license?.activated ? 'success' : 'danger'}>{license?.activated ? 'مفعّل' : 'غير مفعّل'}</Badge></dd>

          <dt className="text-ink-mute">تاريخ الانتهاء</dt>
          <dd className="text-ink">{license?.expiresAt ? formatDate(license.expiresAt) : 'دائم'}</dd>

          <dt className="text-ink-mute">كود هذا الجهاز</dt>
          <dd className="tnum min-w-0 break-all text-ink">{license?.hwid}</dd>
        </dl>
      </Card>

      {/* ── Backup & Restore ── */}
      <Card>
        <div className="mb-4 flex items-center gap-2 text-ink">
          <Download size={18} className="text-brand" />
          <h2 className="font-display text-base font-semibold">النسخ الاحتياطي والاستعادة</h2>
        </div>
        <p className="mb-4 text-sm text-ink-mute">
          احفظ نسخة احتياطية من جميع بيانات النظام أو استعد بيانات من نسخة سابقة.
        </p>
        {backupMsg && (
          <p className={`mb-4 rounded px-3 py-2 text-sm ${backupMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {backupMsg.text}
          </p>
        )}
        <div className="flex gap-3">
          <Button onClick={handleExport} variant="secondary">
            <Download size={15} className="ml-1.5" />
            تصدير نسخة احتياطية
          </Button>
          <Button onClick={handleImport} variant="ghost">
            <Upload size={15} className="ml-1.5" />
            استعادة نسخة احتياطية
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2 text-ink">
          <KeyRound size={18} className="text-brand" />
          <h2 className="font-display text-base font-semibold">تغيير كلمة المرور</h2>
        </div>
        {user?.mustChangePassword && (
          <p className="mb-4 rounded bg-amber-100 px-3 py-2 text-sm text-amber-500">
            لازم تغيّر كلمة المرور الافتراضية قبل ما تكمل استخدام النظام.
          </p>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="كلمة المرور الحالية"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="٦ أحرف على الأقل"
            error={msg?.type === 'error' ? msg.text : null}
          />
          {msg?.type === 'success' && <p className="text-sm text-brand-700">{msg.text}</p>}
          <Button type="submit" disabled={!oldPassword || newPassword.length < 6}>
            حفظ كلمة المرور
          </Button>
        </form>
      </Card>
    </div>
  );
}
