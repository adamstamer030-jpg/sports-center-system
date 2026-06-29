import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Dumbbell } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Modal from '../components/ui/Modal.jsx';
import { invoke } from '../lib/ipc.js';

const emptyForm = { name: '', type: 'individual', color: '#0F6B5C' };

export default function SportsPage() {
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setSports(await invoke('sports:list'));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(sport) {
    setEditing(sport);
    setForm({ name: sport.name, type: sport.type, color: sport.color });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const res = editing
      ? await invoke('sports:update', { id: editing.id, ...form })
      : await invoke('sports:create', form);
    if (!res.ok) {
      setError(res.reason === 'name_taken' ? 'اسم الرياضة ده موجود قبل كده' : 'حدث خطأ، تأكد من البيانات');
      return;
    }
    setModalOpen(false);
    load();
  }

  async function toggleActive(sport) {
    await invoke('sports:update', { id: sport.id, active: !sport.active });
    load();
  }

  async function handleRemove(sport) {
    if (!confirm(`مسح "${sport.name}"؟ (لازم تتأكد إنه ملوش اشتراكات مرتبطة)`)) return;
    const res = await invoke('sports:remove', { id: sport.id });
    if (!res.ok) {
      alert(res.reason === 'in_use' ? 'لا يمكن المسح — في اشتراكات مرتبطة بهذه الرياضة' : 'حدث خطأ');
      return;
    }
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">الرياضات والأنشطة</h1>
          <p className="mt-1 text-sm text-ink-mute">الأنشطة اللي المركز بيقدمها — جيم، سباحة، كاراتيه، أو أي رياضة تانية</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          رياضة جديدة
        </Button>
      </div>

      {loading && <p className="text-sm text-ink-mute">جاري التحميل...</p>}

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sports.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                    style={{ background: s.color }}
                  >
                    <Dumbbell size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-ink-mute">{s.type === 'group' ? 'رياضة جماعية' : 'رياضة فردية'}</p>
                  </div>
                </div>
                <Badge variant={s.active ? 'success' : 'danger'}>{s.active ? 'نشطة' : 'متوقفة'}</Badge>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => openEdit(s)}>
                  تعديل
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleActive(s)}>
                  {s.active ? 'تعطيل' : 'تفعيل'}
                </Button>
                <button
                  onClick={() => handleRemove(s)}
                  className="flex h-9 w-9 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-danger-500"
                  title="مسح"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
          {sports.length === 0 && <p className="text-sm text-ink-mute">لا توجد رياضات مضافة بعد</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'تعديل رياضة' : 'إضافة رياضة جديدة'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="اسم الرياضة"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="مثال: كاراتيه"
            error={error}
          />
          <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="individual">رياضة فردية</option>
            <option value="group">رياضة جماعية</option>
          </Select>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-soft">لون مميّز للرياضة</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-11 w-full rounded border border-line bg-surface px-2"
            />
          </div>
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </Modal>
    </div>
  );
}
