import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import { useAuth } from '../store/auth.js';

const ERROR_LABEL = {
  invalid_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuth((s) => s.login);
  const status = useAuth((s) => s.status);
  const error = useAuth((s) => s.error);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    const res = await login(username.trim(), password);
    if (res.ok) {
      navigate(location.state?.from || '/', { replace: true });
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white shadow-card">
            <ShieldCheck size={24} />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-ink-mute">أدخل بيانات حسابك للمتابعة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-line bg-surface p-6 shadow-card">
          <Input
            label="اسم المستخدم"
            name="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
          />
          <Input
            label="كلمة المرور"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={error ? ERROR_LABEL[error] || 'حدث خطأ، حاول مرة أخرى' : null}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={status === 'loading' || !username || !password}
            icon={<LogIn size={16} />}
          >
            {status === 'loading' ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-mute">
          بيانات المدير الافتراضية: admin / admin123
        </p>
      </div>
    </div>
  );
}
