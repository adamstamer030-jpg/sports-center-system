import { useEffect, useState } from 'react';
import { Plus, Search, Power, Eye } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Textarea from '../components/ui/Textarea.jsx';
import Modal from '../components/ui/Modal.jsx';
import { invoke } from '../lib/ipc.js';
import { formatDate, formatCurrency } from '../lib/format.js';

const emptyForm = {
  name: '',
  phone: '',
  phone2: '',
  gender: 'male',
  birthDate: '',
  address: '',
  guardianName: '',
  guardianPhone: '',
  notes: '',
};

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null); // { member, subscriptions }

  async function load(q = search) {
    setLoading(true);
    setMembers(await invoke('members:list', { search: q }));
    setLoading(false);
  }

  useEffect(() => {
    load('');
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(member) {
    setEditing(member);
    setForm({
      name: member.name,
      phone: member.phone,
      phone2: member.phone2 || '',
      gender: member.gender,
      birthDate: member.birthDate || '',
      address: member.address || '',
      guardianName: member.guardianName || '',
      guardianPhone: member.guardianPhone || '',
      notes: member.notes || '',
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.phone.trim()) {
      setError('الاسم ورقم التليفون مطلوبان');
      return;
    }
    const res = editing
      ? await invoke('members:update', { id: editing.id, ...form })
      : await invoke('members:create', { ...form, joinDate: new Date().toISOString().slice(0, 10) });
    if (!res.ok) {
      setError('حدث خطأ، تأكد من البيانات');
      return;
    }
    setModalOpen(false);
    load();
  }

  async function toggleActive(member) {
    await invoke('members:update', { id: member.id, active: !member.active });
    load();
  }

  async function openDetail(member) {
    const res = await invoke('members:get', { id: member.id });
    if (res.ok) setDetail(res);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">الأعضاء / المتدربون</h1>
          <p className="mt-1 text-sm text-ink-mute">بيانات كل متدرب في المركز ومتابعة اشتراكاته</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          عضو جديد
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-2 rounded border border-line bg-paper px-3.5 h-11">
          <Search size={16} className="text-ink-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم التليفون..."
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute"
          />
        </div>

        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-line text-ink-mute">
              <th className="pb-3 font-medium">الاسم</th>
              <th className="pb-3 font-medium">التليفون</th>
              <th className="pb-3 font-medium">تاريخ الانضمام</th>
              <th className="pb-3 font-medium">اشتراكات نشطة</th>
              <th className="pb-3 font-medium">الحالة</th>
              <th className="pb-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-6 text-center text-ink-mute">جاري التحميل...</td></tr>}
            {!loading && members.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-ink-mute">لا يوجد أعضاء</td></tr>
            )}
            {members.map((m) => (
              <tr key={m.id} className="border-b border-line/60 last:border-0">
                <td className="py-3">{m.name}</td>
                <td className="tnum py-3">{m.phone}</td>
                <td className="tnum py-3 text-ink-mute">{formatDate(m.joinDate)}</td>
                <td className="tnum py-3">
                  <Badge variant={m.activeSubscriptions > 0 ? 'brand' : 'neutral'}>{m.activeSubscriptions}</Badge>
                </td>
                <td className="py-3">
                  <Badge variant={m.active ? 'success' : 'danger'}>{m.active ? 'نشط' : 'متوقف'}</Badge>
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button
                      title="عرض البيانات والاشتراكات"
                      onClick={() => openDetail(m)}
                      className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      title={m.active ? 'تعطيل' : 'تفعيل'}
                      onClick={() => toggleActive(m)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={error} />
          <Input label="رقم التليفون" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="رقم تليفون إضافي (اختياري)" value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
          <Select label="النوع" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </Select>
          <Input label="تاريخ الميلاد (اختياري)" type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          <Input label="العنوان (اختياري)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="اسم ولي الأمر (لو العضو قاصر)" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
          <Input label="تليفون ولي الأمر" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
          <Textarea label="ملاحظات" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" className="w-full">حفظ</Button>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.member?.name || ''}>
        {detail && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-mute">التليفون</dt>
              <dd className="tnum text-ink">{detail.member.phone}</dd>
              <dt className="text-ink-mute">تاريخ الانضمام</dt>
              <dd className="tnum text-ink">{formatDate(detail.member.joinDate)}</dd>
              {detail.member.guardianName && (
                <>
                  <dt className="text-ink-mute">ولي الأمر</dt>
                  <dd className="text-ink">{detail.member.guardianName} — {detail.member.guardianPhone}</dd>
                </>
              )}
            </dl>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">سجل الاشتراكات</h3>
              {detail.subscriptions.length === 0 && <p className="text-sm text-ink-mute">لا يوجد اشتراكات لهذا العضو بعد</p>}
              <div className="space-y-2">
                {detail.subscriptions.map((s) => (
                  <div key={s.id} className="rounded border border-line p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{s.sport_name}{s.plan_name ? ` — ${s.plan_name}` : ''}</span>
                      <Badge variant={s.status === 'active' ? 'success' : s.status === 'frozen' ? 'warning' : 'danger'}>
                        {{ active: 'نشط', frozen: 'مجمّد', cancelled: 'ملغي' }[s.status] || s.status}
                      </Badge>
                    </div>
                    <p className="tnum mt-1 text-ink-mute">
                      {formatDate(s.start_date)} {s.end_date ? `→ ${formatDate(s.end_date)}` : ''} · {formatCurrency(s.price)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
