import { useMemo, useState } from 'react';
import {
  X,
  MapPin,
  LayoutGrid,
  IndianRupee,
  Lock,
  Clock,
  Contact,
  Check,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { INV_SCHEMA } from '../data/schema.js';
import { SPACE_TYPES, AMEN, BUILDING_TYPES, uid, freshOf } from '../data/db.js';

const GROUP_ICONS = { A: MapPin, B: LayoutGrid, C: IndianRupee, D: Lock, E: Clock, F: Contact };

function buildInitialDraft(l) {
  if (!l) return {};
  return {
    'core.operator': l.operator,
    'core.city': l.city,
    'core.micro': l.micro,
    'core.type': l.type,
    'core.seats': l.seats,
    'core.price': l.price,
    'core.tier': l.tier,
    'core.avail': l.avail,
    'core.amenities': l.amenities,
  };
}

export default function InventoryWizard({ editListing, onClose }) {
  const { saveListing } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => buildInitialDraft(editListing));

  const get = (path) => draft[path] ?? '';
  const set = (path, val) => setDraft(prev => ({ ...prev, [path]: val }));

  const groups = INV_SCHEMA;
  const group = groups[step];
  const Icon = GROUP_ICONS[group?.id] || MapPin;
  const pct = useMemo(() => {
    if (!groups.length) return 0;
    return Math.round(((step + 1) / groups.length) * 100);
  }, [step, groups.length]);

  const handleSave = () => {
    const operator  = get('core.operator') || 'Unknown';
    const city      = get('core.city') || 'Bangalore';
    const micro     = get('core.micro') || '';
    const type      = get('core.type') || SPACE_TYPES[0];
    const seats     = parseInt(get('core.seats')) || 10;
    const price     = parseInt(get('core.price')) || 7000;
    const tier      = get('core.tier') || 'Standard';
    const avail     = get('core.avail') || 'Available now';
    const amenities = get('core.amenities') || [];

    const listing = {
      id: editListing ? editListing.id : uid(),
      operator, city, micro, type, seats, price,
      days: 0, amenities, tier, avail, fresh: freshOf(0),
    };

    saveListing(listing, editListing?.id);
    onClose();
  };

  return (
    <div className="modal-bg show" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide modal-wizard" onClick={e => e.stopPropagation()}>
        <div className="wiz-head">
          <div className="modal-head" style={{ borderBottom: '1px solid var(--border-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div className="wsh-icon" style={{ width: 34, height: 34 }}>
                <Icon />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>
                  {editListing ? 'Edit inventory' : 'Add inventory'}
                </h2>
                <div className="mh-sub">Step {step + 1} of {groups.length}</div>
              </div>
            </div>
            <button className="x" onClick={onClose} title="Close"><X /></button>
          </div>
          <div className="wiz-progress"><span style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="wiz">
          <aside className="wiz-rail">
            {groups.map((g, i) => {
              const GI = GROUP_ICONS[g.id] || MapPin;
              const cls = `wiz-step${i === step ? ' current' : ''}${i < step ? ' done' : ''}`;
              return (
                <button key={g.id} className={cls} onClick={() => setStep(i)} type="button">
                  <span className="wiz-dot">
                    {i < step ? <Check /> : <GI />}
                  </span>
                  <span className="wiz-meta">
                    <b>{g.title}</b>
                    <small>{g.tag === 'internal' ? 'Internal only' : g.tag === 'live' ? 'Live fields' : 'Profile'}</small>
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="wiz-main">
            <div className="wiz-body">
              <div className={`wiz-step-head${group?.tag === 'internal' ? ' internal' : ''}`}>
                <div className="wsh-icon">{group?.tag === 'internal' ? <Lock /> : <Icon />}</div>
                <div>
                  <div className="wsh-title">
                    {group?.title}
                    {group?.tag === 'live' && <span className="dyn-tag">live fields</span>}
                    {group?.tag === 'internal' && <span className="dv-pill lock"><Lock /> Internal</span>}
                    {group?.tag === 'static' && <span className="dv-pill static">Static</span>}
                  </div>
                  <div className="wsh-sub">
                    {group?.tag === 'live'
                      ? 'These fields go stale and are kept freshness-verified.'
                      : group?.tag === 'internal'
                        ? 'Not client-visible. Use for sales intelligence and operations.'
                        : 'Core listing identity and profile fields.'}
                  </div>
                </div>
              </div>

              <GroupFields group={group} get={get} set={set} />
            </div>

            <div className="wiz-foot">
              <div className="modal-foot" style={{ borderTop: '1px solid var(--border-2)' }}>
                <button className="btn" onClick={onClose} type="button">Cancel</button>
                <div className="spacer" />
                {step > 0 && (
                  <button className="btn" onClick={() => setStep(s => s - 1)} type="button">Back</button>
                )}
                {step < groups.length - 1 ? (
                  <button className="btn primary" onClick={() => setStep(s => s + 1)} type="button">
                    Continue
                  </button>
                ) : (
                  <button className="btn primary" onClick={handleSave} type="button">
                    <Check /> {editListing ? 'Save' : 'Publish'}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function GroupFields({ group, get, set }) {
  if (!group) return null;

  const fields = group.fields || [];
  const rows = [];
  let pending = null;

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];

    if (f.div) {
      if (pending) { rows.push(<FieldInput key={`solo-${i-1}`} f={pending} get={get} set={set} />); pending = null; }
      rows.push(
        <div key={`div-${i}`} className="inv-div">
          {f.div}
          {f.tag === 'live' && <span className="dyn-tag" style={{ marginLeft: 10 }}><Sparkles /> live</span>}
        </div>
      );
      continue;
    }

    if (f.full || f.t === 'textarea' || f.t === 'list' || f.t === 'chips' || f.t === 'images' || f.t === 'toggle') {
      if (pending) { rows.push(<FieldInput key={`solo-${i-1}`} f={pending} get={get} set={set} />); pending = null; }
      rows.push(<FieldInput key={`f-${i}`} f={f} get={get} set={set} />);
    } else {
      if (pending) {
        rows.push(
          <div key={`pair-${i}`} className="form-grid">
            <FieldInput f={pending} get={get} set={set} />
            <FieldInput f={f} get={get} set={set} />
          </div>
        );
        pending = null;
      } else {
        pending = f;
      }
    }
  }
  if (pending) rows.push(<FieldInput key="solo-last" f={pending} get={get} set={set} />);

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{rows}</div>;
}

function FieldInput({ f, get, set }) {
  const val = get(f.p);

  if (f.t === 'toggle') {
    const on = !!val;
    return (
      <label className="fld toggle-fld" style={{ display: 'flex' }}>
        <div>
          <span className="lab">
            {f.l}
            {f.live && <span className="dyn-tag" style={{ marginLeft: 8 }}>live</span>}
          </span>
        </div>
        <button
          type="button"
          className={`tgl${on ? ' on' : ''}`}
          onClick={() => set(f.p, !on)}
          aria-pressed={on}
        >
          <span className="knob" />
        </button>
      </label>
    );
  }

  if (f.t === 'chips') {
    const choices = f.choices ? f.choices() : AMEN;
    const arr = Array.isArray(val) ? val : [];
    const toggle = (a) => arr.includes(a) ? set(f.p, arr.filter(x => x !== a)) : set(f.p, [...arr, a]);
    return (
      <label className="fld">
        <span className="lab">{f.l}</span>
        <div className="amen-wrap">
          {choices.map(a => (
            <button
              key={a}
              type="button"
              className={`amen-chip${arr.includes(a) ? ' on' : ''}`}
              onClick={() => toggle(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </label>
    );
  }

  if (f.t === 'textarea' || f.t === 'list') {
    const tv = f.t === 'list' && Array.isArray(val) ? val.join('\n') : (val || '');
    return (
      <label className="fld">
        <span className="lab">
          {f.l}
          {f.req && <i className="req">*</i>}
          {f.live && <span className="dyn-tag" style={{ marginLeft: 8 }}>live</span>}
        </span>
        <textarea className="inp" rows={3} value={tv} placeholder={f.ph || ''}
          onChange={e => set(f.p, f.t === 'list' ? e.target.value.split('\n') : e.target.value)} />
      </label>
    );
  }

  if (f.t === 'select') {
    const opts = f.opts ? f.opts() : [];
    return (
      <label className="fld">
        <span className="lab">{f.l}{f.req && <i className="req">*</i>}</span>
        <select className="inp" value={val} onChange={e => set(f.p, e.target.value)}>
          <option value="">Select…</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }

  if (f.t === 'num' || f.t === 'inr') {
    const hasPre = f.t === 'inr';
    return (
      <label className="fld">
        <span className="lab">
          {f.l}
          {f.req && <i className="req">*</i>}
          {f.live && <span className="dyn-tag" style={{ marginLeft: 8 }}>live</span>}
          {f.suf && <span className="unit"> {f.suf}</span>}
        </span>
        <div className={`inp-wrap${hasPre ? ' has-pre' : ''}${f.suf ? ' has-suf' : ''}`}>
          {hasPre && <span className="inp-pre">₹</span>}
          <input
            className={`inp${f.t === 'num' || f.t === 'inr' ? ' tnum' : ''}`}
            type="number"
            min={0}
            value={val || ''}
            placeholder={f.ph || ''}
            onChange={e => set(f.p, e.target.value)}
          />
          {f.suf && <span className="inp-suf">{f.suf}</span>}
        </div>
      </label>
    );
  }

  if (f.t === 'images') {
    return (
      <label className="fld">
        <span className="lab">{f.l}</span>
        <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', padding: 18, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Photos managed via the Gallery editor on each listing.
        </div>
      </label>
    );
  }

  return (
    <label className="fld">
      <span className="lab">
        {f.l}
        {f.req && <i className="req">*</i>}
        {f.live && <span className="dyn-tag" style={{ marginLeft: 8 }}>live</span>}
      </span>
      <input className="inp" type="text" value={val || ''} placeholder={f.ph || ''}
        onChange={e => set(f.p, e.target.value)} />
    </label>
  );
}
