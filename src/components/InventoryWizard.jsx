import { useMemo, useRef, useState } from 'react';
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
  UploadCloud,
  Star,
  Loader2,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import {
  INV_SCHEMA,
  listingToDraft,
  draftToListingPayload,
  validateListingDraft,
} from '../data/schema.js';
import { AMEN } from '../data/db.js';
import { apiUploadImages } from '../utils/api.js';

const GROUP_ICONS = { A: MapPin, B: LayoutGrid, C: IndianRupee, D: Lock, E: Clock, F: Contact };

async function resolveDraftImages(draftPhotos, listingId) {
  const photos = Array.isArray(draftPhotos) ? draftPhotos.filter((p) => p?.src) : [];
  if (!photos.length) return { images: [], photoMeta: [] };

  const pending = photos.filter((p) => p.file);
  let uploaded = [];
  if (pending.length) {
    uploaded = await apiUploadImages(pending.map((p) => p.file), listingId);
  }

  const images = [];
  const photoMeta = [];
  let uploadIdx = 0;
  for (const photo of photos) {
    let src = photo.src;
    if (photo.file) {
      src = uploaded[uploadIdx++]?.url;
      if (photo.src?.startsWith('blob:')) URL.revokeObjectURL(photo.src);
    }
    if (!src) continue;
    images.push(src);
    photoMeta.push({ label: photo.label || '', price: photo.price ?? '' });
  }
  return { images, photoMeta };
}

export default function InventoryWizard({ editListing, onClose, onSave }) {
  const { saveListing, toast } = useApp();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(() => listingToDraft(editListing));
  const [saving, setSaving] = useState(false);

  const get = (path) => draft[path] ?? '';
  const set = (path, val) => setDraft((prev) => ({ ...prev, [path]: val }));

  const groups = INV_SCHEMA;
  const group = groups[step];
  const Icon = GROUP_ICONS[group?.id] || MapPin;
  const pct = useMemo(() => {
    if (!groups.length) return 0;
    return Math.round(((step + 1) / groups.length) * 100);
  }, [step, groups.length]);

  const handleSave = async () => {
    const errors = validateListingDraft(draft);
    if (errors.length) {
      toast?.(errors[0], 'info');
      return;
    }

    setSaving(true);
    try {
      const payload = draftToListingPayload(draft);
      const { images, photoMeta } = await resolveDraftImages(draft.images, editListing?.id);
      payload.images = images;
      payload.photoMeta = photoMeta;

      const persist = onSave || saveListing;
      await persist(payload, editListing?.id);
      onClose();
    } catch {
      // toast already shown by saveListing / onSave
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg show" onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
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
            <button className="x" onClick={onClose} title="Close" disabled={saving}><X /></button>
          </div>
          <div className="wiz-progress"><span style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="wiz">
          <aside className="wiz-rail">
            {groups.map((g, i) => {
              const GI = GROUP_ICONS[g.id] || MapPin;
              const cls = `wiz-step${i === step ? ' current' : ''}${i < step ? ' done' : ''}`;
              return (
                <button key={g.id} className={cls} onClick={() => setStep(i)} type="button" disabled={saving}>
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
                <button className="btn" onClick={onClose} type="button" disabled={saving}>Cancel</button>
                <div className="spacer" />
                {step > 0 && (
                  <button className="btn" onClick={() => setStep(s => s - 1)} type="button" disabled={saving}>Back</button>
                )}
                {step < groups.length - 1 ? (
                  <button className="btn primary" onClick={() => setStep(s => s + 1)} type="button" disabled={saving}>
                    Continue
                  </button>
                ) : (
                  <button className="btn primary" onClick={handleSave} type="button" disabled={saving}>
                    {saving ? <Loader2 className="spin" /> : <Check />}
                    {saving ? 'Saving…' : editListing ? 'Save' : 'Publish'}
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

function ImagesField({ photos, onChange }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const list = Array.isArray(photos) ? photos : [];

  const updatePhoto = (i, field, val) => {
    const next = [...list];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  const removePhoto = (i) => {
    const removed = list[i];
    if (removed?.file && removed.src?.startsWith('blob:')) URL.revokeObjectURL(removed.src);
    onChange(list.filter((_, idx) => idx !== i));
  };

  const setCover = (i) => {
    const next = [...list];
    const [item] = next.splice(i, 1);
    next.unshift(item);
    onChange(next);
  };

  const addFiles = (files) => {
    const imageFiles = [...files].filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    onChange([
      ...list,
      ...imageFiles.map((file) => ({
        src: URL.createObjectURL(file),
        file,
        label: '',
        price: '',
      })),
    ]);
  };

  return (
    <label className="fld">
      <span className="lab">Workspace photos</span>
      <div className="img-uploader">
        <div className="img-grid">
          {list.map((p, i) => (
            <div className="ph-card" key={`${p.src}-${i}`}>
              <div className={`img-thumb${i === 0 ? ' cover' : ''}`}>
                <img src={p.src} alt={`Photo ${i + 1}`} />
                {i === 0 ? (
                  <span className="cover-tag">Cover</span>
                ) : (
                  <button type="button" className="img-cover" title="Set as cover" onClick={() => setCover(i)}>
                    <Star />
                  </button>
                )}
                <button type="button" className="img-x" onClick={() => removePhoto(i)}>
                  <X />
                </button>
              </div>
              <input
                className="inp ph-name"
                type="text"
                value={p.label || ''}
                onChange={(e) => updatePhoto(i, 'label', e.target.value)}
                placeholder="Photo name (e.g. Private cabin)"
              />
              <div className="ph-price">
                <span className="ph-cur">₹</span>
                <input
                  className="inp tnum"
                  type="text"
                  inputMode="numeric"
                  value={p.price ?? ''}
                  onChange={(e) => updatePhoto(i, 'price', e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="Optional price"
                />
                <span className="ph-unit">/seat</span>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`img-drop${dragging ? ' drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <UploadCloud />
          <span>Add photos</span>
          <small>JPG / PNG · first photo is the cover</small>
        </div>
      </div>
    </label>
  );
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
    return <ImagesField photos={val} onChange={(next) => set(f.p, next)} />;
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
