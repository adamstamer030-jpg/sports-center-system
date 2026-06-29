import { useEffect, useState } from 'react';
import { Plus, Power, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Modal from '../components/ui/Modal.jsx';
import { invoke } from '../lib/ipc.js';
import { formatCurrency, formatNumber } from '../lib/format.js';

const emptyForm = { sportId: '', name: '', durationType: 'days', durationValue: 30, price: 0 };

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    const [p, s] = await Promise.all([invoke('plans:list'), invoke('sports:list')]);
    setPlans(p);
    setSports(s);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.sportId || !form.name.trim() || !form.durationValue || form.price === '') {
      setError('استكمل كل الحقول المطلوبة');
      return;
    }
    const res = await invoke('plans:create', { ...form, sportId: Number(form.sportId) });
    if (!res.ok) {
      setError('حدث خطأ، تأكد من البيانات');
      return;
    }
    setModalOpen(false);
    setForm(emptyForm);
    load();
  }

  async function toggleActive(plan) {
    await invoke('plans:update', { id: plan.id, active: !plan.active });
    load();
  }

  async function handleRemove(plan) {
    if (!confirm(`مسح خطة "${plan.name}"؟`)) return;
    const res = await invoke('plans:remove', { id: plan.id });
    if (!res.ok) {
      alert(res.reason === 'in_use' ? 'لا يمكن المسح — في اشتراكات مرتبطة بهذه الخطة' : 'حدث خطأ');
      return;
    }
    load();
  }

  const grouped = sports.map((s) => ({ sport: s, plans: plans.filter((p) => p.sportId === s.id) }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">خطط الاشتراك</h1>
          <p className="mt-1 text-sm text-ink-mute">حدّد أسعار ومدد الاشتراكات لكل رياضة (بالأيام أو بعدد الحصص)</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          خطة جديدة
        </Button>
      </div>

      {loading && <p className="text-sm text-ink-mute">جاري التحميل...</p>}

      {!loading && grouped.map(({ sport, plans: sportPlans }) => (
        <Card key={sport.id}>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: sport.color }} />
            <h2 className="font-display text-base font-semibold text-ink">{sport.name}</h2>
          </div>
          {sportPlans.length === 0 && <p className="text-sm text-ink-mute">لا توجد خطط لهذه الرياضة بعد</p>}
          {sportPlans.length > 0 && (
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-line text-ink-mute">
                  <th className="pb-2 font-medium">اسم الخطة</th>
                  <th className="pb-2 font-medium">المدة</th>
                  <th className="pb-2 font-medium">السعر</th>
                  <th className="pb-2 font-medium">الحالة</th>
                  <th className="pb-2 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sportPlans.map((p) => (
                  <tr key={p.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5">{p.name}</td>
                    <td className="tnum py-2.5">
                      {p.durationType === 'sessions' ? `${formatNumber(p.durationValue)} حصة` : `${formatNumber(p.durationValue)} يوم`}
                    </td>
                    <td className="tnum py-2.5">{formatCurrency(p.price)}</td>
                    <td className="py-2.5">
                      <Badge variant={p.active ? 'success' : 'danger'}>{p.active ? 'نشطة' : 'متوقفة'}</Badge>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-2">
                        <button
                          title={p.active ? 'تعطيل' : 'تفعيل'}
                          onClick={() => toggleActive(p)}
                          className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand"
                        >
                          <Power size={16} />
                        </button>
                        <button
                          title="مسح"
                          onClick={() => handleRemove(p)}
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
          )}
        </Card>
      ))}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="إضافة خطة اشتراك جديدة">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="الرياضة" value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value })} error={error}>
            <option value="">اختر الرياضة</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Input label="اسم الخطة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: اشتراك شهري" />
          <Select label="نوع المدة" value={form.durationType} onChange={(e) => setForm({ ...form, durationType: e.target.value })}>
            <option value="days">بالأيام (مثل اشتراك شهري/سنوي)</option>
            <option value="sessions">بعدد الحصص (مثل باقة ١٢ حصة)</option>
          </Select>
          <Input
            label={form.durationType === 'sessions' ? 'عدد الحصص' : 'عدد الأيام'}
            type="number"
            min="1"
            value={form.durationValue}
            onChange={(e) => setForm({ ...form, durationValue: e.target.value })}
          />
          <Input label="السعر (ج.م)" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </Modal>
    </div>
  );
}
