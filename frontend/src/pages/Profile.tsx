import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TextField } from '../components/Field';

interface UserMe {
  id: string;
  email: string;
  role: string;
  last_login?: string;
  created_at: string;
  twofa_enabled?: boolean;
}

interface Setup2FaData {
  secret: string;
  qrDataUrl: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [setupData, setSetupData] = useState<Setup2FaData | null>(null);
  const [enableCode, setEnableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const { data: me, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<{ data: UserMe }>('/auth/me')).data.data,
  });

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleString('fr-FR') : '—';

  const notify = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const setup2fa = useMutation({
    mutationFn: async () => (await api.post<{ data: Setup2FaData }>('/auth/2fa/setup')).data.data,
    onSuccess: (data) => setSetupData(data),
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      notify(ax.response?.data?.message ?? 'Erreur', false);
    },
  });

  const enable2fa = useMutation({
    mutationFn: async () => api.post('/auth/2fa/enable', { code: enableCode }),
    onSuccess: () => {
      setSetupData(null);
      setEnableCode('');
      refetch();
      notify('2FA activé avec succès.');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      notify(ax.response?.data?.message ?? 'Code incorrect.', false);
    },
  });

  const disable2fa = useMutation({
    mutationFn: async () => api.post('/auth/2fa/disable', { password: disablePassword }),
    onSuccess: () => {
      setDisablePassword('');
      refetch();
      notify('2FA désactivé.');
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      notify(ax.response?.data?.message ?? 'Mot de passe incorrect.', false);
    },
  });

  const is2faRoleEligible = ['SUPER', 'ADMIN'].includes(user?.role ?? '');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sendistri-dark">Mon profil</h1>

      {msg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {msg.text}
        </div>
      )}

      {/* Infos compte */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-sendistri-dark">Informations du compte</h2>
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          {[
            ['Email', me?.email ?? user?.email ?? '—'],
            ['Rôle', me?.role ?? user?.role ?? '—'],
            ['Dernière connexion', fmtDate(me?.last_login)],
            ['Membre depuis', fmtDate(me?.created_at)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-gray-50 p-3">
              <dt className="text-xs text-gray-500">{k}</dt>
              <dd className="mt-1 font-medium text-gray-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* 2FA — réservé SUPER/ADMIN */}
      {is2faRoleEligible && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold text-sendistri-dark">Double authentification (2FA)</h2>
          <p className="mb-4 text-sm text-gray-500">
            Renforcez la sécurité de votre compte en activant le TOTP (Google Authenticator, Authy…).
          </p>

          {me?.twofa_enabled ? (
            /* 2FA déjà activé — proposer la désactivation */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  ✓ 2FA activé
                </span>
              </div>
              <div className="max-w-xs space-y-3">
                <TextField
                  label="Mot de passe pour désactiver"
                  name="disablePwd"
                  type="password"
                  value={disablePassword}
                  onChange={(v) => setDisablePassword(v)}
                />
                <button
                  onClick={() => disable2fa.mutate()}
                  disabled={!disablePassword || disable2fa.isPending}
                  className="rounded-lg bg-sendistri-red/80 px-4 py-2 text-sm font-medium text-white hover:bg-sendistri-red disabled:opacity-60"
                >
                  {disable2fa.isPending ? 'Désactivation…' : 'Désactiver le 2FA'}
                </button>
              </div>
            </div>
          ) : setupData ? (
            /* Étape 2 : scanner le QR et entrer le code */
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Scannez ce QR code avec votre application d'authentification :
              </p>
              <img src={setupData.qrDataUrl} alt="QR code 2FA" className="h-40 w-40 rounded-lg border" />
              <p className="text-xs text-gray-500">
                Ou entrez le secret manuellement : <span className="font-mono font-bold">{setupData.secret}</span>
              </p>
              <div className="max-w-xs space-y-3">
                <TextField
                  label="Code de validation (6 chiffres)"
                  name="code"
                  value={enableCode}
                  onChange={(v) => setEnableCode(v)}
                  required
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => enable2fa.mutate()}
                    disabled={enableCode.length !== 6 || enable2fa.isPending}
                    className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {enable2fa.isPending ? 'Vérification…' : 'Activer le 2FA'}
                  </button>
                  <button
                    onClick={() => setSetupData(null)}
                    className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Étape 1 : lancer la configuration */
            <button
              onClick={() => setup2fa.mutate()}
              disabled={setup2fa.isPending}
              className="rounded-lg bg-sendistri-green px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {setup2fa.isPending ? 'Configuration…' : 'Configurer le 2FA'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
