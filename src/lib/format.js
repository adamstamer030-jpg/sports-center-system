import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import 'dayjs/locale/ar.js';

dayjs.extend(relativeTime);
dayjs.locale('ar');

// أرقام لاتينية دايمًا (توقيع التمبلت) حتى في سياق عربي بالكامل
export function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatCurrency(n, currency = 'EGP') {
  return `${formatNumber(n)} ${currency === 'EGP' ? 'ج.م' : currency}`;
}

export function formatDate(date) {
  if (!date) return '—';
  return dayjs(date).format('D MMMM YYYY');
}

export function formatDateTime(date) {
  if (!date) return '—';
  return dayjs(date).format('D MMMM YYYY — h:mm A');
}

export function fromNow(date) {
  if (!date) return '—';
  return dayjs(date).fromNow();
}
