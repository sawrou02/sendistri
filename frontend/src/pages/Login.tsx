import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { setAccessToken } from '../api/client';
import { AxiosError } from 'axios';
import type { User } from '../types';
import { BrandStarLg } from '../components/Brand';
import { IconInfo } from '../components/icons';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      window.location.href = '/';
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>;
      setError(ax.response?.data?.message ?? 'Code invalide.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'stretch', background: 'var(--bg)' }}>
      {/* ── Left brand panel ── */}
      <div
        className="hidden md:flex"
        style={{
          flex: 1.1,
          position: 'relative',
          background: 'linear-gradient(155deg,#0B2A1B 0%,#0E3A24 55%,#0A6B3D 130%)',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', right: -120, top: -80, width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(226,160,0,0.16), transparent 62%)' }} />
        <div style={{ position: 'absolute', left: -90, bottom: -120, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(210,58,44,0.14), transparent 62%)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <BrandStarLg />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '.04em', color: '#fff' }}>SENDISTRI</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '.18em', color: '#7FB394', textTransform: 'uppercase' }}>Gestion Commerciale Télécom</span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ width: 64, height: 5, borderRadius: 3, display: 'flex', overflow: 'hidden', marginBottom: 26 }}>
            <div style={{ flex: 1, background: '#0E8A4F' }} />
            <div style={{ flex: 1, background: '#E2A000' }} />
            <div style={{ flex: 1, background: '#D23A2C' }} />
          </div>
          <h1 style={{ fontSize: 40, lineHeight: 1.12, fontWeight: 800, color: '#fff', margin: '0 0 18px', maxWidth: '15ch', letterSpacing: '-0.01em' }}>
            Tout votre réseau de distribution, en un seul endroit.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: '#A9CDB6', margin: 0, maxWidth: '42ch' }}>
            Ventes, réabonnements, stock décodeurs, encaissements et commissions partenaires — pilotés en temps réel, du siège jusqu'au terrain.
          </p>
          <div style={{ display: 'flex', gap: 32, marginTop: 40 }}>
            {[['1 248', 'Points de vente'], ['42 880', 'Abonnés actifs'], ['14', 'Modules']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 600, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: 13, color: '#7FB394', fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', fontSize: 12.5, color: '#5E8169', fontWeight: 600 }}>© 2026 SENDISTRI · Dakar, Sénégal</div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile brand */}
          <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#0E8A4F,#0A6B3D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width={22} height={22} viewBox="0 0 100 100"><polygon points="50,8 61,38 93,40 68,60 76,92 50,73 24,92 32,60 7,40 39,38" fill="#fff" /></svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '.04em', color: 'var(--text)' }}>SENDISTRI</span>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px', color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {preToken ? 'Vérification 2FA' : 'Connexion'}
          </h2>
          <p style={{ fontSize: 14.5, color: 'var(--text-2)', margin: '0 0 30px' }}>
            {preToken ? 'Entrez le code de votre application d\'authentification.' : 'Accédez à votre espace de gestion.'}
          </p>

          {error && (
            <div style={{ marginBottom: 18, borderRadius: 10, background: 'var(--red-l)', color: 'var(--red-d)', padding: '11px 14px', fontSize: 13.5, fontWeight: 600 }}>
              {error}
            </div>
          )}

          {!preToken ? (
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@sendistri.sn" style={{ ...inputStyle, marginBottom: 18 }} />
              <label style={labelStyle}>Mot de passe</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={{ ...inputStyle, marginBottom: 10 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
                <a style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Mot de passe oublié ?</a>
              </div>
              <button type="submit" disabled={submitting} style={primaryBtnStyle}>
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify2fa}>
              <label style={labelStyle}>Code à 6 chiffres</label>
              <input type="text" inputMode="numeric" maxLength={6} required autoFocus
                value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                style={{ ...inputStyle, marginBottom: 22, textAlign: 'center', fontSize: 24, letterSpacing: '0.4em', fontFamily: 'var(--mono)' }} />
              <button type="submit" disabled={totpCode.length !== 6 || submitting} style={primaryBtnStyle}>
                {submitting ? 'Vérification…' : 'Valider'}
              </button>
              <button type="button" onClick={() => { setPreToken(null); setTotpCode(''); setError(''); }}
                style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}>
                Retour
              </button>
            </form>
          )}

          {!preToken && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, padding: '13px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-3)', display: 'flex' }}><IconInfo size={18} /></span>
              <span style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Compte démo : <b style={{ color: 'var(--text)' }}>admin@sendistri.com</b> / <b style={{ color: 'var(--text)' }}>Admin1234!</b>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 7 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 10, border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', fontSize: 15, outline: 'none' };
const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: 14, border: 'none', borderRadius: 10, background: 'var(--green)', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 18px rgba(14,138,79,0.3)' };
