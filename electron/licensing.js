import crypto from 'node:crypto';

/**
 * نظام ترخيص أوفلاين بالكامل — ECDSA (P-256)، توقيع غير متماثل (Asymmetric).
 *
 * الفرق الجوهري عن نظام HMAC القديم: المفتاح الخاص (Private Key) غير موجود
 * في هذا الملف أو في أي مكان داخل التطبيق المُوزَّع على العميل — موجود فقط
 * عندك في تطبيق الفيندور. التطبيق المُوزَّع يحتوي على المفتاح العام (Public Key)
 * بس، وهو غير قابل لاستخدامه في توليد مفاتيح جديدة، فقط في التحقق منها.
 * يعني حتى لو فُكّ هذا التطبيق بالكامل (asar extract)، لا يمكن تصنيع مفتاح
 * صالح بدون المفتاح الخاص.
 *
 * صيغة المفتاح: base64url(JSON payload) + "." + base64url(raw r||s signature)
 * الحمولة (payload): { hwid, exp, iat, ed, v } — exp/iat بالثواني (Unix time)،
 * exp = 0 يعني ترخيص دائم. هذه الصيغة مطابقة تمامًا لما يولّده تطبيق الفيندور
 * (نفس الكود المستخدم في نظام العيادات، فقط بمفتاح خاص مختلف ومنفصل تمامًا).
 *
 * ⚠️ لازم يكون عندك مفتاح خاص (private key) خاص بهذا المنتج فقط، مختلف عن
 * أي منتج آخر تبيعه (عيادة، صيدلية..) — كل منتج له زوج مفاتيح مستقل.
 */
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEpbYOf2t5Jft/ZQxRaQaykUvQzKsV
UCgXfTepo5DwE8Wq6BETJnQEbH15ZaSBJNPxngFqeUiOdOn9jHRIFwE3ZA==
-----END PUBLIC KEY-----`;

function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

// تحويل عدد صحيح (32 بايت) لصيغة ASN.1 INTEGER المطلوبة جوه توقيع DER
function encodeAsn1Int(buf) {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0) i++;
  buf = buf.subarray(i);
  if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0x00]), buf]);
  return Buffer.concat([Buffer.from([0x02, buf.length]), buf]);
}

// تحويل توقيع r||s الخام (64 بايت، نفس صيغة تطبيق الفيندور) لصيغة DER اللي
// Node.js محتاجها في crypto.verify
function rawSignatureToDer(sigRaw) {
  if (sigRaw.length !== 64) return null;
  const rDer = encodeAsn1Int(sigRaw.subarray(0, 32));
  const sDer = encodeAsn1Int(sigRaw.subarray(32, 64));
  return Buffer.concat([Buffer.from([0x30, rDer.length + sDer.length]), rDer, sDer]);
}

/**
 * @param {string} key مفتاح الترخيص الكامل
 * @param {{hwid:string}} ctx بيانات الجهاز الحالي للمطابقة
 * @returns {{valid:boolean, reason?:string, payload?:object}}
 */
export function verifyLicenseKey(key, ctx) {
  if (!key || typeof key !== 'string' || !key.includes('.')) {
    return { valid: false, reason: 'invalid_format' };
  }

  const dotIdx = key.lastIndexOf('.');
  const payloadB64 = key.slice(0, dotIdx);
  const sigB64 = key.slice(dotIdx + 1);

  let payloadBytes, payload;
  try {
    payloadBytes = base64urlDecode(payloadB64);
    payload = JSON.parse(payloadBytes.toString('utf8'));
  } catch {
    return { valid: false, reason: 'invalid_format' };
  }

  let sigDer;
  try {
    sigDer = rawSignatureToDer(base64urlDecode(sigB64));
  } catch {
    sigDer = null;
  }
  if (!sigDer) return { valid: false, reason: 'invalid_format' };

  const verify = crypto.createVerify('SHA256');
  verify.update(payloadBytes);
  let sigValid = false;
  try {
    sigValid = verify.verify(PUBLIC_KEY_PEM, sigDer);
  } catch {
    sigValid = false;
  }
  if (!sigValid) {
    return { valid: false, reason: 'invalid_signature' };
  }

  if (
    payload.hwid &&
    ctx?.hwid &&
    String(payload.hwid).toLowerCase() !== String(ctx.hwid).toLowerCase()
  ) {
    return { valid: false, reason: 'machine_mismatch', payload };
  }

  if (payload.exp && payload.exp > 0 && Math.floor(Date.now() / 1000) > payload.exp) {
    return { valid: false, reason: 'expired', payload };
  }

  return { valid: true, payload };
}
