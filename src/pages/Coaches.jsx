import { useEffect, useState } from 'react';
import { Plus, Power, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Modal from '../components/ui/Modal.jsx';
import { invoke } from '../lib/ipc.js';

const emptyForm = { name: '', phone: '', sportId: '', notes: '' };

export default function CoachesPage() {
  const [coaches, setCoaches] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    const [c, s] = await Promise.all([invoke('coaches:list'), invoke('sports:list')]);
    setCoaches(c);
    setSports(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('الاسم مطلوب');
      return;
    }
    const res = await invoke('coaches:create', { ...form, sportId: form.sportId ? Number(form.sportId) : null });
    if (!res.ok) {
      setError('حدث خطأ، تأكد من البيانات');
      return;
    }
    setModalOpen(false);
    setForm(emptyForm);
    load();
  }

  async function toggleActive(coach) {
    await invoke('coaches:update', { id: coach.id, active: !coach.active });
    load();
  }

  async function handleRemove(coach) {
    if (!confirm(`مسح المدرب "${coach.name}"؟`)) return;
    await invoke('coaches:remove', { id: coach.id });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">المدربون</h1>
          <p className="mt-1 text-sm text-ink-mute">فريق التدريب في المركز</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          مدرب جديد
        </Button>
      </div>

      <Card>
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-line text-ink-mute">
              <th className="pb-3 font-medium">الاسم</th>
              <th className="pb-3 font-medium">رقم التليفون</th>
              <th className="pb-3 font-medium">التخصص</th>
              <th className="pb-3 font-medium">الحالة</th>
              <th className="pb-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="py-6 text-center text-ink-mute">جاري التحميل...</td></tr>
            )}
            {!loading && coaches.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-ink-mute">لا يوجد مدربون مضافون</td></tr>
            )}
            {coaches.map((c) => (
              <tr key={c.id} className="border-b border-line/60 last:border-0">
                <td className="py-3">{c.name}</td>
                <td className="tnum py-3">{c.phone || '—'}</td>
                <td className="py-3">{c.sportName || '—'}</td>
                <td className="py-3">
                  <Badge variant={c.active ? 'success' : 'danger'}>{c.active ? 'نشط' : 'متوقف'}</Badge>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      title={c.active ? 'تعطيل' : 'تفعيل'}
                      onClick={() => toggleActive(c)}
                      className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand"
                    >
                      <Power size={16} />
                    </button>
                    <button
                      title="مسح"
                      onClick={() => handleRemove(c)}
                      className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-danger-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مدرب جديد">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error} />
          <Input label="رقم التليفون" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="التخصص الأساسي" value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value })}>
            <option value="">بدون تخصص محدد</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </Modal>
    </div>
  );
}
