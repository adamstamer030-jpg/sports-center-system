import { useEffect, useMemo, useState } from 'react';
import { Plus, Wallet, CheckCircle2, RefreshCw, Snowflake, Play, XCircle, Search } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Modal from '../components/ui/Modal.jsx';
import { invoke } from '../lib/ipc.js';
import { formatDate, formatCurrency, formatNumber } from '../lib/format.js';

const STATUS_LABEL = { active: 'نشط', expired: 'منتهي', frozen: 'مجمّد', cancelled: 'ملغي' };
const STATUS_VARIANT = { active: 'success', expired: 'danger', frozen: 'warning', cancelled: 'neutral' };

const emptyCreateForm = {
  isNewMember: false,
  memberId: '',
  newMemberName: '',
  newMemberPhone: '',
  sportId: '',
  planId: '',
  coachId: '',
  durationType: 'days',
  durationValue: 30,
  startDate: new Date().toISOString().slice(0, 10),
  price: 0,
  amountPaid: 0,
  notes: '',
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [members, setMembers] = useState([]);
  const [sports, setSports] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [createError, setCreateError] = useState(null);

  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', notes: '' });

  const [renewTarget, setRenewTarget] = useState(null);
  const [renewForm, setRenewForm] = useState({ startDate: '', durationValue: '', price: '', amountPaid: '' });

  async function loadAll() {
    setLoading(true);
    const [subs, mem, sp, co] = await Promise.all([
      invoke('subscriptions:list', { search, sportId: sportFilter || undefined, status: statusFilter || undefined }),
      invoke('members:list', {}),
      invoke('sports:list'),
      invoke('coaches:list'),
    ]);
    setSubscriptions(subs);
    setMembers(mem);
    setSports(sp);
    setCoaches(co);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      invoke('subscriptions:list', { search, sportId: sportFilter || undefined, status: statusFilter || undefined }).then(
        setSubscriptions
      );
    }, 250);
    return () => clearTimeout(t);
  }, [search, sportFilter, statusFilter]);

  // تحميل خطط الرياضة المختارة في فورم الإنشاء
  useEffect(() => {
    if (!createForm.sportId) {
      setPlans([]);
      return;
    }
    invoke('plans:list', { sportId: Number(createForm.sportId) }).then(setPlans);
  }, [createForm.sportId]);

  function openCreate() {
    setCreateForm(emptyCreateForm);
    setCreateError(null);
    setCreateOpen(true);
  }

  function onPlanSelect(planId) {
    const plan = plans.find((p) => p.id === Number(planId));
    if (plan) {
      setCreateForm((f) => ({
        ...f,
        planId,
        durationType: plan.durationType,
        durationValue: plan.durationValue,
        price: plan.price,
      }));
    } else {
      setCreateForm((f) => ({ ...f, planId }));
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError(null);

    let memberId = createForm.memberId ? Number(createForm.memberId) : null;

    if (createForm.isNewMember) {
      if (!createForm.newMemberName.trim() || !createForm.newMemberPhone.trim()) {
        setCreateError('اسم وتليفون العضو الجديد مطلوبان');
        return;
      }
      const memberRes = await invoke('members:create', {
        name: createForm.newMemberName,
        phone: createForm.newMemberPhone,
        joinDate: new Date().toISOString().slice(0, 10),
      });
      if (!memberRes.ok) {
        setCreateError('تعذّر إضافة العضو الجديد');
        return;
      }
      memberId = memberRes.member.id;
    }

    if (!memberId || !createForm.sportId || !createForm.durationValue) {
      setCreateError('استكمل العضو والرياضة والمدة');
      return;
    }

    const res = await invoke('subscriptions:create', {
      memberId,
      sportId: Number(createForm.sportId),
      planId: createForm.planId ? Number(createForm.planId) : null,
      coachId: createForm.coachId ? Number(createForm.coachId) : null,
      durationType: createForm.durationType,
      durationValue: Number(createForm.durationValue),
      startDate: createForm.startDate,
      price: Number(createForm.price),
      amountPaid: Number(createForm.amountPaid) || 0,
      notes: createForm.notes,
    });

    if (!res.ok) {
      setCreateError('حدث خطأ أثناء إنشاء الاشتراك');
      return;
    }

    setCreateOpen(false);
    loadAll();
  }

  async function handleAddPayment(e) {
    e.preventDefault();
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) return;
    await invoke('subscriptions:addPayment', {
      id: paymentTarget.id,
      amount: Number(paymentForm.amount),
      method: paymentForm.method,
      notes: paymentForm.notes,
    });
    setPaymentTarget(null);
    setPaymentForm({ amount: '', method: 'cash', notes: '' });
    loadAll();
  }

  function openRenew(sub) {
    setRenewTarget(sub);
    setRenewForm({
      startDate: new Date().toISOString().slice(0, 10),
      durationValue: sub.durationType === 'sessions' ? sub.sessionsTotal : '',
      price: sub.price,
      amountPaid: '',
    });
  }

  async function handleRenew(e) {
    e.preventDefault();
    await invoke('subscriptions:renew', {
      id: renewTarget.id,
      startDate: renewForm.startDate,
      durationValue: renewForm.durationValue ? Number(renewForm.durationValue) : undefined,
      price: renewForm.price !== '' ? Number(renewForm.price) : undefined,
      amountPaid: Number(renewForm.amountPaid) || 0,
    });
    setRenewTarget(null);
    loadAll();
  }

  async function recordAttendance(sub) {
    const res = await invoke('subscriptions:recordAttendance', { id: sub.id });
    if (!res.ok && res.reason === 'no_sessions_left') {
      alert('لا توجد حصص متبقية في هذا الاشتراك');
    }
    loadAll();
  }

  async function setStatus(sub, status) {
    await invoke('subscriptions:updateStatus', { id: sub.id, status });
    loadAll();
  }

  const filteredCoaches = useMemo(
    () => (createForm.sportId ? coaches.filter((c) => !c.sportId || c.sportId === Number(createForm.sportId)) : coaches),
    [coaches, createForm.sportId]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">الاشتراكات</h1>
          <p className="mt-1 text-sm text-ink-mute">إدارة اشتراكات الأعضاء، الدفعات، الحضور، والتجديد</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          اشتراك جديد
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded border border-line bg-paper px-3.5 h-11">
            <Search size={16} className="text-ink-mute" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم العضو أو رقم التليفون..."
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-mute"
            />
          </div>
          <Select className="w-44" value={sportFilter} onChange={(e) => setSportFilter(e.target.value)}>
            <option value="">كل الرياضات</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="expired">منتهي</option>
            <option value="frozen">مجمّد</option>
            <option value="cancelled">ملغي</option>
          </Select>
        </div>

        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-line text-ink-mute">
              <th className="pb-3 font-medium">العضو</th>
              <th className="pb-3 font-medium">الرياضة / الخطة</th>
              <th className="pb-3 font-medium">المدة المتبقية</th>
              <th className="pb-3 font-medium">المالية</th>
              <th className="pb-3 font-medium">الحالة</th>
              <th className="pb-3 font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-6 text-center text-ink-mute">جاري التحميل...</td></tr>}
            {!loading && subscriptions.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-ink-mute">لا توجد اشتراكات مطابقة</td></tr>
            )}
            {subscriptions.map((s) => (
              <tr key={s.id} className="border-b border-line/60 last:border-0 align-top">
                <td className="py-3">
                  <p className="font-medium text-ink">{s.memberName}</p>
                  <p className="tnum text-xs text-ink-mute">{s.memberPhone}</p>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.sportColor }} />
                    {s.sportName}
                  </div>
                  {s.planName && <p className="text-xs text-ink-mute">{s.planName}</p>}
                  {s.coachName && <p className="text-xs text-ink-mute">مدرب: {s.coachName}</p>}
                </td>
                <td className="tnum py-3">
                  {s.durationType === 'sessions' ? (
                    <span>{formatNumber(s.sessionsLeft)} / {formatNumber(s.sessionsTotal)} حصة متبقية</span>
                  ) : (
                    <span>{s.daysLeft !== null ? `${formatNumber(s.daysLeft)} يوم` : '—'} (حتى {formatDate(s.endDate)})</span>
                  )}
                </td>
                <td className="tnum py-3">
                  <p>{formatCurrency(s.amountPaid)} / {formatCurrency(s.price)}</p>
                  {s.remaining > 0 && <p className="text-xs text-danger-500">متبقي {formatCurrency(s.remaining)}</p>}
                </td>
                <td className="py-3">
                  <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {s.remaining > 0 && (
                      <button title="تسجيل دفعة" onClick={() => setPaymentTarget(s)} className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand">
                        <Wallet size={15} />
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button title="تسجيل حضور حصة" onClick={() => recordAttendance(s)} className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand">
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    {(s.status === 'expired' || s.status === 'cancelled') && (
                      <button title="تجديد الاشتراك" onClick={() => openRenew(s)} className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand">
                        <RefreshCw size={15} />
                      </button>
                    )}
                    {s.status === 'active' && (
                      <button title="تجميد" onClick={() => setStatus(s, 'frozen')} className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-amber-500">
                        <Snowflake size={15} />
                      </button>
                    )}
                    {s.status === 'frozen' && (
                      <button title="إلغاء التجميد" onClick={() => setStatus(s, 'active')} className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-brand">
                        <Play size={15} />
                      </button>
                    )}
                    {s.status !== 'cancelled' && (
                      <button title="إلغاء الاشتراك" onClick={() => confirm('تأكيد إلغاء الاشتراك؟') && setStatus(s, 'cancelled')} className="flex h-8 w-8 items-center justify-center rounded text-ink-mute hover:bg-paper hover:text-danger-500">
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* فورم إنشاء اشتراك جديد */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="اشتراك جديد">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-soft">العضو</span>
            <button
              type="button"
              className="text-xs font-medium text-brand"
              onClick={() => setCreateForm((f) => ({ ...f, isNewMember: !f.isNewMember, memberId: '' }))}
            >
              {createForm.isNewMember ? 'اختيار عضو موجود' : '+ عضو جديد'}
            </button>
          </div>

          {!createForm.isNewMember ? (
            <Select value={createForm.memberId} onChange={(e) => setCreateForm({ ...createForm, memberId: e.target.value })}>
              <option value="">اختر العضو</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.phone}</option>
              ))}
            </Select>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="اسم العضو الجديد"
                value={createForm.newMemberName}
                onChange={(e) => setCreateForm({ ...createForm, newMemberName: e.target.value })}
              />
              <Input
                label="رقم التليفون"
                value={createForm.newMemberPhone}
                onChange={(e) => setCreateForm({ ...createForm, newMemberPhone: e.target.value })}
              />
            </div>
          )}

          {createError && <p className="text-xs text-danger-500">{createError}</p>}

          <Select label="الرياضة" value={createForm.sportId} onChange={(e) => setCreateForm({ ...createForm, sportId: e.target.value, planId: '' })}>
            <option value="">اختر الرياضة</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>

          {plans.length > 0 && (
            <Select label="الخطة (اختياري — أو اضبط السعر والمدة يدويًا)" value={createForm.planId} onChange={(e) => onPlanSelect(e.target.value)}>
              <option value="">خطة مخصصة</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
              ))}
            </Select>
          )}

          <Select label="المدرب (اختياري)" value={createForm.coachId} onChange={(e) => setCreateForm({ ...createForm, coachId: e.target.value })}>
            <option value="">بدون مدرب محدد</option>
            {filteredCoaches.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Select label="نوع المدة" value={createForm.durationType} onChange={(e) => setCreateForm({ ...createForm, durationType: e.target.value })}>
              <option value="days">بالأيام</option>
              <option value="sessions">بعدد الحصص</option>
            </Select>
            <Input
              label={createForm.durationType === 'sessions' ? 'عدد الحصص' : 'عدد الأيام'}
              type="number"
              min="1"
              value={createForm.durationValue}
              onChange={(e) => setCreateForm({ ...createForm, durationValue: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="تاريخ البداية" type="date" value={createForm.startDate} onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })} />
            <Input label="السعر الإجمالي (ج.م)" type="number" min="0" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} />
          </div>

          <Input label="المدفوع الآن (ج.م)" type="number" min="0" value={createForm.amountPaid} onChange={(e) => setCreateForm({ ...createForm, amountPaid: e.target.value })} hint="ممكن تسجّل دفعة جزئية وتكمل الباقي بعدين" />

          <Button type="submit" className="w-full">إنشاء الاشتراك</Button>
        </form>
      </Modal>

      {/* فورم تسجيل دفعة */}
      <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title={`تسجيل دفعة — ${paymentTarget?.memberName || ''}`}>
        {paymentTarget && (
          <form onSubmit={handleAddPayment} className="space-y-4">
            <p className="text-sm text-ink-mute">المتبقي حاليًا: <span className="tnum font-medium text-danger-500">{formatCurrency(paymentTarget.remaining)}</span></p>
            <Input label="المبلغ المدفوع" type="number" min="0" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
            <Select label="طريقة الدفع" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
              <option value="cash">كاش</option>
              <option value="card">بطاقة</option>
              <option value="transfer">تحويل</option>
            </Select>
            <Input label="ملاحظات (اختياري)" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
            <Button type="submit" className="w-full">تأكيد الدفعة</Button>
          </form>
        )}
      </Modal>

      {/* فورم التجديد */}
      <Modal open={!!renewTarget} onClose={() => setRenewTarget(null)} title={`تجديد اشتراك — ${renewTarget?.memberName || ''}`}>
        {renewTarget && (
          <form onSubmit={handleRenew} className="space-y-4">
            <Input label="تاريخ البداية" type="date" value={renewForm.startDate} onChange={(e) => setRenewForm({ ...renewForm, startDate: e.target.value })} />
            <Input
              label={renewTarget.durationType === 'sessions' ? 'عدد الحصص' : 'عدد الأيام'}
              type="number"
              min="1"
              value={renewForm.durationValue}
              onChange={(e) => setRenewForm({ ...renewForm, durationValue: e.target.value })}
            />
            <Input label="السعر الإجمالي" type="number" min="0" value={renewForm.price} onChange={(e) => setRenewForm({ ...renewForm, price: e.target.value })} />
            <Input label="المدفوع الآن" type="number" min="0" value={renewForm.amountPaid} onChange={(e) => setRenewForm({ ...renewForm, amountPaid: e.target.value })} />
            <Button type="submit" className="w-full">تأكيد التجديد</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
