/* Datenzugriff aus web/js/portal.js – angemeldet wird über die nDashboard-Anmeldung (web/js/auth.js). */
const I = window.NDPortal.internal;
export const sb = I.sb;
export const adminAction = I.adminAction;
export const Store = {
  async all() {
    const { data, error } = await sb.from('kv').select('key, value, updated_at');
    if (error) throw error;
    return data || [];
  },
  getRaw: I.getRaw,
  async set(key, value) {
    const { error } = await sb.from('kv').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  },
  mutate: I.kvMutate,
};
export const Bank = { call: I.bankCall };
export const Monitor = { query: I.monitorQuery, rpc: I.monitorRpc, logAction: I.logAction };
export const pingDb = I.pingDb;
export const pingFunction = I.pingFunction;
export const Auth = {
  async changePassword(current, next) {
    try {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return { ok: false, reason: 'Nicht angemeldet.' };
      const check = await sb.auth.signInWithPassword({ email: user.email, password: current });
      if (check.error) return { ok: false, reason: 'Aktuelles Passwort ist falsch.' };
      const { error } = await sb.auth.updateUser({ password: next });
      if (error) return { ok: false, reason: error.message || 'Änderung fehlgeschlagen.' };
      return { ok: true };
    } catch (e) { return { ok: false, reason: 'Änderung fehlgeschlagen.' }; }
  },
};
export function newKey() {
  try { if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID(); } catch (e) { /* weiter */ }
  const a = new Uint8Array(16); window.crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
}
