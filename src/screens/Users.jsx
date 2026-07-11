import { useEffect, useMemo, useState } from 'react';
import { UserPlus, ShieldCheck, Shield, Power, Pencil, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { apiListUsers, apiCreateUser, apiUpdateUser } from '../utils/api.js';
import { DB } from '../data/db.js';
import Modal from '../components/ui/Modal.jsx';

import { PERM_LABELS, permissionLabel } from '../utils/access.js';

const GENDERS = [
  ['unspecified', 'Prefer not to say'],
  ['male', 'Male'],
  ['female', 'Female'],
  ['other', 'Other'],
];

const ASSIGNABLE_CITIES = DB.cities.filter((c) => c !== 'All cities');

const EMPTY_FORM = {
  name: '', email: '', phone: '', gender: 'unspecified', password: '',
  role: 'member', cities: [], permissions: ['listings:read', 'proposals:read', 'proposals:write', 'leads:read', 'leads:write'],
};

export default function Users() {
  const { permissionCatalog, authUser, toast } = useApp();
  const catalog = permissionCatalog?.length ? permissionCatalog : Object.keys(PERM_LABELS);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      setUsers(await apiListUsers());
    } catch (e) {
      toast(e?.message || 'Failed to load users', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, phone: u.phone || '', gender: u.gender || 'unspecified',
      password: '', role: u.role, cities: u.cities || [], permissions: u.permissions || [],
    });
    setFormError('');
    setModalOpen(true);
  };

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const toggleInArray = (k, value) => setForm((p) => ({
    ...p,
    [k]: p[k].includes(value) ? p[k].filter((x) => x !== value) : [...p[k], value],
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError('');

    if (!form.name.trim()) return setFormError('Name is required');
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFormError('Enter a valid email');
    if (!editing && form.password.length < 8) return setFormError('Password must be at least 8 characters');
    if (editing && form.password && form.password.length < 8) return setFormError('Password must be at least 8 characters');
    if (form.role === 'member' && !form.cities.length) return setFormError('Assign at least one city to a member');

    setSaving(true);
    try {
      if (editing) {
        const payload = {
          name: form.name.trim(),
          phone: form.phone,
          gender: form.gender,
          role: form.role,
          cities: form.cities,
          permissions: form.permissions,
        };
        if (form.password) payload.password = form.password;
        await apiUpdateUser(editing.id, payload);
        toast('User updated', 'check-circle');
      } else {
        await apiCreateUser({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone,
          gender: form.gender,
          password: form.password,
          role: form.role,
          cities: form.cities,
          permissions: form.permissions,
        });
        toast('User created', 'badge-check');
      }
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setFormError(err?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    const next = u.status === 'active' ? 'disabled' : 'active';
    try {
      await apiUpdateUser(u.id, { status: next });
      toast(next === 'active' ? 'User enabled' : 'User disabled', next === 'active' ? 'check-circle' : 'x');
      await refresh();
    } catch (e) {
      toast(e?.message || 'Failed to update status', 'info');
    }
  };

  const isAdminRole = form.role === 'admin';

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    members: users.filter((u) => u.role === 'member').length,
  }), [users]);

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Users &amp; Access</h1>
            <p>Create team members and control what they can see and do.</p>
          </div>
          <div className="spacer" />
          <button className="btn primary" onClick={openCreate}><UserPlus /> Create user</button>
        </div>
      </div>

      <div className="usr-stats">
        <div className="usr-stat"><b className="tnum">{stats.total}</b><span>Total users</span></div>
        <div className="usr-stat"><b className="tnum">{stats.admins}</b><span>Admins</span></div>
        <div className="usr-stat"><b className="tnum">{stats.members}</b><span>Members</span></div>
      </div>

      <div className="card inv-tbl-wrap">
        <table className="tbl inv-tbl usr-tbl">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Cities</th>
              <th>Access</th>
              <th>Status</th>
              <th className="act-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28 }}><Loader2 className="spin" /></td></tr>
            ) : !users.length ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No users yet.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="usr-cell">
                    <div className="usr-avatar">{(u.name || '?').slice(0, 1).toUpperCase()}</div>
                    <div className="usr-meta">
                      <div className="usr-name">
                        {u.name}
                        {u.id === authUser?.id ? <span className="usr-you">You</span> : null}
                      </div>
                      <div className="usr-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-pill ${u.role}`}>
                    {u.role === 'admin' ? <ShieldCheck /> : <Shield />}
                    {u.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </td>
                <td>{u.role === 'admin' ? 'All cities' : (u.cities?.join(', ') || '—')}</td>
                <td>{u.role === 'admin' ? 'Full access' : `${(u.permissions || []).length} permission${(u.permissions || []).length === 1 ? '' : 's'}`}</td>
                <td>
                  <span className={`status-pill ${u.status}`}>{u.status === 'active' ? 'Active' : 'Disabled'}</span>
                </td>
                <td className="act-col">
                  <div className="tbl-actions">
                    <button className="btn sm" onClick={() => openEdit(u)} title="Edit access"><Pencil /></button>
                    <button
                      className={`btn sm ${u.status === 'active' ? 'danger' : 'primary'}`}
                      onClick={() => toggleStatus(u)}
                      disabled={u.id === authUser?.id}
                      title={u.id === authUser?.id ? 'You cannot change your own status' : 'Toggle status'}
                    >
                      <Power /> {u.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Create user'}
        size="modal-wide"
        footer={(
          <>
            <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn primary" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="spin" /> : <UserPlus />}
              {editing ? 'Save changes' : 'Create user'}
            </button>
          </>
        )}
      >
        <form onSubmit={submit} className="usr-form">
          <div className="form-grid">
            <label className="fld">
              <span className="lab">Full name</span>
              <input className="inp" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Priya Nair" />
            </label>
            <label className="fld">
              <span className="lab">Email {editing ? '(cannot be changed)' : ''}</span>
              <div className="login-input">
                <Mail />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  placeholder="user@spacehaat.in"
                  disabled={!!editing}
                />
              </div>
            </label>
            <label className="fld">
              <span className="lab">Phone</span>
              <div className="login-input">
                <Phone />
                <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+91 98XXXXXXXX" />
              </div>
            </label>
            <label className="fld">
              <span className="lab">Gender</span>
              <select className="inp" value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="fld">
              <span className="lab">{editing ? 'Reset password (optional)' : 'Password'}</span>
              <input
                type="password"
                className="inp"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                placeholder={editing ? 'Leave blank to keep current' : 'Min. 8 characters'}
                autoComplete="new-password"
              />
            </label>
            <label className="fld">
              <span className="lab">Role</span>
              <select className="inp" value={form.role} onChange={(e) => setField('role', e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin (full access)</option>
              </select>
            </label>
          </div>

          {!isAdminRole && (
            <>
              <div className="fld">
                <span className="lab"><MapPin /> Assigned cities <em>— member sees only these</em></span>
                <div className="amen-wrap">
                  {ASSIGNABLE_CITIES.map((c) => (
                    <button
                      type="button"
                      key={c}
                      className={`amen-chip ${form.cities.includes(c) ? 'on' : ''}`}
                      onClick={() => toggleInArray('cities', c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fld">
                <span className="lab"><ShieldCheck /> Permissions</span>
                <div className="amen-wrap">
                  {catalog.map((p) => (
                    <button
                      type="button"
                      key={p}
                      className={`amen-chip ${form.permissions.includes(p) ? 'on' : ''}`}
                      onClick={() => toggleInArray('permissions', p)}
                    >
                      {PERM_LABELS[p] || permissionLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {isAdminRole && (
            <div className="usr-admin-note">
              <ShieldCheck /> Admins have full access to every city and section.
            </div>
          )}

          {formError ? <div className="login-error">{formError}</div> : null}
        </form>
      </Modal>
    </>
  );
}
