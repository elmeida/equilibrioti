import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { login, type AuthUser } from '../services/api';

export function LoginScreen({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('admin@equilibrioti.com.br');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <img src="/logo_login_equilibrio.png" alt="Equilíbrio TI" />
          <h1>Equilíbrio BI</h1>
        </div>

        <form onSubmit={submit} className="login-form">
          <label>
            E-mail
            <span className="login-input">
              <Mail size={18} />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </span>
          </label>
          <label>
            Senha
            <span className="login-input">
              <Lock size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && <div className="login-error">{error}</div>}
          <button className="login-submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
