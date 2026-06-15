import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { setAccessToken } from '../api/client';
import { AxiosError } from 'axios';
import type { User } from '../types';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 2FA step
  const [preToken, setPreToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{
        success: boolean;
        requiresTwoFa?: boolean;
        preToken?: string;
        data?: { accessToken: string; user: User };
      }>('/auth/login', { email, password });

      if (data.requiresTwoFa && data.preToken) {
        setPreToken(data.preToken);
      } else {
        await login(email, password);
        navigate('/', { replace: true });
      }
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Échec de la connexion.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify2fa(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post<{ data: { accessToken: string; user: User } }>(
        '/auth/2fa/verify',
        { preToken, code: totpCode },
      );
      setAccessToken(data.data.accessToken);
      // Force auth context refresh by navigating — AuthContext will refresh on mount
      window.location.href = '/';
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Code invalide.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sendistri-dark px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-sendistri-green text-2xl text-white">
            ★
          </div>
          <h1 className="text-2xl font-extrabold tracking-widest text-sendistri-dark">SENDISTRI</h1>
          <p className="text-sm text-gray-500">
            {preToken ? 'Vérification double authentification' : 'Espace de gestion'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-sendistri-red">{error}</div>
        )}

        {!preToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-sendistri-green"
                placeholder="vous@sendistri.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-sendistri-green"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-sendistri-green py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2fa} className="space-y-4">
            <p className="text-sm text-gray-600">
              Entrez le code à 6 chiffres généré par votre application d'authentification.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Code 2FA</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-2xl tracking-widest outline-none focus:border-sendistri-green"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={totpCode.length !== 6 || submitting}
              className="w-full rounded-lg bg-sendistri-green py-2.5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? 'Vérification…' : 'Valider'}
            </button>
            <button
              type="button"
              onClick={() => { setPreToken(null); setTotpCode(''); setError(''); }}
              className="w-full text-sm text-gray-500 hover:underline"
            >
              Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
