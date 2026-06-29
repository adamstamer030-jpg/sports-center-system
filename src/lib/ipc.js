// نقطة وحيدة للتواصل مع العملية الرئيسية — أي موديول جديد بيستخدم نفس الدالة
export function invoke(channel, payload) {
  if (!window.api?.invoke) {
    return Promise.reject(new Error('window.api غير متاح — تأكد إنك شغّال جوه Electron'));
  }
  return window.api.invoke(channel, payload);
}
