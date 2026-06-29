import { useEffect, useState } from 'react';
import { Plus, KeyRound, Power } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Modal from '../components/ui/Modal.jsx';
import { invoke } from '../lib/ipc.js';
import { useAuth } from '../store/auth.js';
import { formatDate } from '../lib/format.js';

const ROLES = [
  { value: 'admin', label: 'مدير' },
  { value: 'staff', label: 'موظف' },
];

const emptyForm = { name: '', username: '', password: '', role: 'staff' };

export default function UsersPage() {
  const actorRole = useAuth((s) => s.user?.role);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetValue, setResetValue] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);

  async function load() {
    setLoading(true);
    const rows = await invoke('users:list');
    setUsers(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError(null);
    const res = await invoke('users:create', { actorRole, ...form });
    if (!res.ok) {
      setFormError(
        { username_taken: 'اسم المستخدم ده مستخدم قبل كده', invalid_input: 'تأكد من البيانات المدخلة' }[
          res.reason
        ] || 'حدث خطأ'
      );
      return;
    }
    setModalOpen(false);
    setForm(emptyForm);
    load();
  }

  async function toggleActive(user) {
    await invoke('users:update', { actorRole, id: user.id, active: !user.active });
    load();
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    await invoke('users:resetPassword', { actorRole, id: resetTarget.id, newPassword: resetValue });
    setResetTarget(null);
    setResetValue('');
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">المستخدمون</h1>
          <p className="mt-1 text-sm text-ink-mute">إدارة حسابات الدخول والصلاحيات</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          مستخدم جديد
        </Button>
      </div>

      <Card>
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-line text-ink-mute">
              <th className="pb-3 font-medium">الاسم</th>
              <th className="pb-3 font-medium">اسم المستخدم</th>
              <th className="pb-3 font-medium">الصلاحية</th>
              <th className="pb-3 font-medium">الحالة</th>
              <th className="pb-3 font-medium">تاريخ الإضافة</th>
              <th className="pb-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-mute">جاري التحميل...</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-ink-mute">لا يوجد مستخدمون</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line/60 last:border-0">
                <td className="py-3">{u.name}</td>
                <td className="tnum py-3">{u.username}</td>
                <td className="py-3">
                  <Badge variant={u.role === 'admin' ? 'brand' : 'neutral'}>
                    {ROLES.find((r) => r.value === u.role)?.label || u.role}
                  </Badge>
                </td>
                <td className="py-3">
                  <Badge variant={u.active ? 'success' : 'danger'}>{u.active ? 'نشط' : 'متوقف'}</Badge>
                </td>
                <td className="tnum py-3 text-ink-mute">{formatDate(u.createdAt)}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      title="إعادة تعيين كلمة المرور"
                      onClick={() => setResetTarget(u)}
                      className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      title={u.active ? 'تعطيل' : 'تفعيل'}
                      onClick={() => toggleActive(u)}
                      className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-danger-500"
                    >
                      <Power size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مستخدم جديد">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="اسم المستخدم"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <Input
            label="كلمة المرور"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="٦ أحرف على الأقل"
            error={formError}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-soft">الصلاحية</label>
            <select
              className="h-11 rounded border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`إعادة تعيين كلمة مرور: ${resetTarget?.name || ''}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={resetValue}
            onChange={(e) => setResetValue(e.target.value)}
            hint="٦ أحرف على الأقل"
          />
          <Button type="submit" className="w-full" disabled={resetValue.length < 6}>تأكيد</Button>
        </form>
      </Modal>
    </div>
  );
}
