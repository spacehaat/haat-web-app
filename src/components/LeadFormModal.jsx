import { useEffect, useState } from 'react';
import { ClipboardPaste, Loader2, Mail, MapPin, Phone, Sparkles, UserPlus, UserCheck } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { DB } from '../data/db.js';
import { useApp } from '../store/AppContext.jsx';
import { canAssignLeads } from '../utils/access.js';
import { apiCreateLead, apiListLeadAssignees, apiParseLead, apiUpdateLead } from '../utils/api.js';

const CITIES = DB.cities.filter((c) => c !== 'All cities');

const INTERESTED_IN = ['Hot desk', 'Dedicated desk', 'Private office', 'Managed office'];

export const SAMPLE_LEAD_PASTE = `Hi, this is Ananya Rao from PayNest Labs.

We need a private office for 18 people in Koramangala, Bangalore. Budget is around ₹9,000 per seat and we'd like to move in by mid-July. Parking and meeting rooms are must-haves.

Email: ananya@paynest.in
Phone: +91 98765 43210`;

const STAGES = [
  ['new', 'New'],
  ['qualified', 'Qualified'],
  ['proposal_sent', 'Proposal sent'],
  ['visit_scheduled', 'Visit scheduled'],
  ['negotiation', 'Negotiation'],
  ['won', 'Won'],
  ['lost', 'Lost'],
];

const SOURCES = [
  ['manual', 'Manual'],
  ['referral', 'Referral'],
  ['website', 'Website'],
  ['whatsapp', 'WhatsApp'],
  ['smart_match', 'Smart Match'],
];

const PARSE_LABEL = {
  openai: 'AI parsed',
  rules: 'Smart parsed',
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value) {
  if (!value) return todayInputValue();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayInputValue();
  return d.toISOString().slice(0, 10);
}

function emptyForm(defaultCity = 'Bangalore') {
  return {
    leadDate: todayInputValue(),
    name: '',
    contact: '',
    email: '',
    company: '',
    interestedIn: [],
    city: defaultCity,
    microlocation: '',
    seats: '',
    stage: 'new',
    source: 'manual',
    budget: '',
    moveIn: '',
    dueAt: '',
    rawEnquiry: '',
    assigneeId: '',
  };
}

function leadToForm(lead) {
  return {
    leadDate: toDateInput(lead.leadDate),
    name: lead.name || '',
    contact: lead.contact || '',
    email: lead.email || '',
    company: lead.company || '',
    interestedIn: lead.interestedIn || [],
    city: lead.city || 'Bangalore',
    microlocation: lead.microlocation || '',
    seats: lead.seats ? String(lead.seats) : '',
    stage: lead.stage || 'new',
    source: lead.source || 'manual',
    budget: lead.budget ? String(lead.budget) : '',
    moveIn: lead.moveIn || '',
    dueAt: lead.dueAt ? toDateInput(lead.dueAt) : '',
    rawEnquiry: lead.rawEnquiry || '',
    assigneeId: lead.assigneeId || '',
  };
}

function parsedToForm(parsed, defaultCity) {
  const city = CITIES.includes(parsed.city) ? parsed.city : defaultCity;
  const interestedIn = (parsed.interestedIn || []).filter((t) => INTERESTED_IN.includes(t));
  return {
    ...emptyForm(defaultCity),
    name: parsed.name || '',
    contact: parsed.contact || '',
    email: parsed.email || '',
    company: parsed.company || '',
    interestedIn,
    city,
    microlocation: parsed.microlocation || '',
    seats: parsed.seats ? String(parsed.seats) : '',
    source: parsed.source || 'manual',
    budget: parsed.budget ? String(parsed.budget) : '',
    moveIn: parsed.moveIn || '',
    rawEnquiry: parsed.rawEnquiry || '',
  };
}

function formToPayload(form, { canAssign = false, editing = false } = {}) {
  const payload = {
    leadDate: form.leadDate ? new Date(form.leadDate).toISOString() : undefined,
    name: form.name.trim(),
    contact: form.contact.trim(),
    email: form.email.trim(),
    company: form.company.trim(),
    interestedIn: form.interestedIn,
    city: form.city,
    microlocation: form.microlocation.trim(),
    seats: Number(form.seats) || 0,
    stage: form.stage,
    source: form.source,
    budget: Number(form.budget) || 0,
    moveIn: form.moveIn.trim(),
    rawEnquiry: form.rawEnquiry.trim(),
  };
  if (form.dueAt) payload.dueAt = new Date(form.dueAt).toISOString();
  if (canAssign) {
    if (editing) payload.assigneeId = form.assigneeId || null;
    else if (form.assigneeId) payload.assigneeId = form.assigneeId;
  }
  return payload;
}

export default function LeadFormModal({
  show,
  lead,
  defaultCity,
  startWithPaste = false,
  onClose,
  onSaved,
}) {
  const { authUser } = useApp();
  const canAssign = canAssignLeads(authUser);
  const editing = Boolean(lead?.id);
  const [form, setForm] = useState(emptyForm(defaultCity));
  const [pasteText, setPasteText] = useState('');
  const [parseSource, setParseSource] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [suggestedAssigneeId, setSuggestedAssigneeId] = useState('');
  const [loadingAssignees, setLoadingAssignees] = useState(false);

  useEffect(() => {
    if (!show) return;
    setFormError('');
    setParseSource('');
    setPasteText('');
    setShowPaste(!editing && startWithPaste);
    setForm(editing ? leadToForm(lead) : emptyForm(defaultCity));
  }, [show, lead, editing, defaultCity, startWithPaste]);

  useEffect(() => {
    if (!show || !canAssign) return;
    let cancelled = false;
    setLoadingAssignees(true);
    apiListLeadAssignees(form.city)
      .then((data) => {
        if (cancelled) return;
        setAssigneeOptions(data.items || []);
        setSuggestedAssigneeId(data.suggestedId || '');
      })
      .catch(() => {
        if (!cancelled) setAssigneeOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignees(false);
      });
    return () => { cancelled = true; };
  }, [show, canAssign, form.city]);

  const suggestedName = assigneeOptions.find((u) => u.id === suggestedAssigneeId)?.name || '';

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleInterested = (value) => {
    setForm((prev) => ({
      ...prev,
      interestedIn: prev.interestedIn.includes(value)
        ? prev.interestedIn.filter((x) => x !== value)
        : [...prev.interestedIn, value],
    }));
  };

  const parsePaste = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    setFormError('');
    try {
      const { fields, source } = await apiParseLead(pasteText.trim());
      setForm((prev) => ({ ...prev, ...parsedToForm(fields, defaultCity) }));
      setParseSource(source);
      setShowPaste(false);
    } catch (err) {
      setFormError(err?.message || 'Could not parse client details');
    } finally {
      setParsing(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError('');

    if (!form.name.trim() && !form.company.trim()) {
      setFormError('Enter a contact name or company');
      return;
    }
    if (!form.city) {
      setFormError('City is required');
      return;
    }

    setSaving(true);
    try {
      const payload = formToPayload(form, { canAssign, editing });
      const item = editing
        ? await apiUpdateLead(lead.id, payload)
        : await apiCreateLead(payload);
      onSaved(item);
      onClose();
    } catch (err) {
      setFormError(err?.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title={editing ? 'Update lead' : 'Create lead'}
      size="modal-wide"
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving || parsing}>Cancel</button>
          <button type="button" className="btn primary" onClick={submit} disabled={saving || parsing}>
            {saving ? <Loader2 className="spin" /> : <UserPlus />}
            {editing ? 'Save changes' : 'Create lead'}
          </button>
        </>
      )}
    >
      <form onSubmit={submit} className="lead-form">
        {!editing && (
          <div className="lead-paste-panel">
            <div className="lead-paste-head">
              <div className="lead-paste-title">
                <ClipboardPaste />
                <span>Paste client details</span>
                {parseSource ? (
                  <span className="chip sm lead-parse-badge">{PARSE_LABEL[parseSource] || parseSource}</span>
                ) : null}
              </div>
              {!showPaste ? (
                <button type="button" className="btn sm" onClick={() => setShowPaste(true)}>
                  <Sparkles /> Paste &amp; parse
                </button>
              ) : null}
            </div>

            {showPaste ? (
              <>
                <textarea
                  className="inp lead-paste-input"
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste a WhatsApp message, email, or enquiry with name, phone, email, city, seats, budget…"
                />
                <div className="lead-paste-actions">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => setPasteText(SAMPLE_LEAD_PASTE)}
                    disabled={parsing}
                  >
                    Load sample
                  </button>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={parsePaste}
                    disabled={parsing || !pasteText.trim()}
                  >
                    {parsing ? <Loader2 className="spin" /> : <Sparkles />}
                    {parsing ? 'Parsing…' : 'Parse fields'}
                  </button>
                </div>
              </>
            ) : (
              <p className="lead-paste-hint">
                Paste a client message to auto-fill name, contact, city, seats, and more. Review before saving.
              </p>
            )}
          </div>
        )}

        <div className="form-grid">
          <label className="fld">
            <span className="lab">Date</span>
            <input
              type="date"
              className="inp"
              value={form.leadDate}
              onChange={(e) => setField('leadDate', e.target.value)}
            />
          </label>
          <label className="fld">
            <span className="lab">Stage</span>
            <select className="inp" value={form.stage} onChange={(e) => setField('stage', e.target.value)}>
              {STAGES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="lab">Name</span>
            <input
              className="inp"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Ananya Rao"
            />
          </label>
          <label className="fld">
            <span className="lab">Company</span>
            <input
              className="inp"
              value={form.company}
              onChange={(e) => setField('company', e.target.value)}
              placeholder="e.g. PayNest Labs"
            />
          </label>
          <label className="fld">
            <span className="lab">Contact</span>
            <div className="login-input">
              <Phone />
              <input
                value={form.contact}
                onChange={(e) => setField('contact', e.target.value)}
                placeholder="+91 98XXXXXXXX"
              />
            </div>
          </label>
          <label className="fld">
            <span className="lab">Email</span>
            <div className="login-input">
              <Mail />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="client@company.com"
              />
            </div>
          </label>
          <label className="fld">
            <span className="lab"><MapPin /> City</span>
            <select className="inp" value={form.city} onChange={(e) => setField('city', e.target.value)}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="lab">Microlocation</span>
            <input
              className="inp"
              value={form.microlocation}
              onChange={(e) => setField('microlocation', e.target.value)}
              placeholder="e.g. Koramangala"
            />
          </label>
          <label className="fld">
            <span className="lab">Number of seats</span>
            <input
              type="number"
              min="0"
              className="inp"
              value={form.seats}
              onChange={(e) => setField('seats', e.target.value)}
              placeholder="e.g. 25"
            />
          </label>
          <label className="fld">
            <span className="lab">Budget / seat (₹)</span>
            <input
              type="number"
              min="0"
              className="inp"
              value={form.budget}
              onChange={(e) => setField('budget', e.target.value)}
              placeholder="e.g. 9000"
            />
          </label>
          <label className="fld">
            <span className="lab">Source</span>
            <select className="inp" value={form.source} onChange={(e) => setField('source', e.target.value)}>
              {SOURCES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
          <label className="fld">
            <span className="lab">Follow-up date</span>
            <input
              type="date"
              className="inp"
              value={form.dueAt}
              onChange={(e) => setField('dueAt', e.target.value)}
            />
          </label>
          <label className="fld">
            <span className="lab">Move-in</span>
            <input
              className="inp"
              value={form.moveIn}
              onChange={(e) => setField('moveIn', e.target.value)}
              placeholder="e.g. In 2 weeks"
            />
          </label>
          {canAssign ? (
            <label className="fld">
              <span className="lab"><UserCheck /> Assigned to</span>
              <select
                className="inp"
                value={form.assigneeId}
                onChange={(e) => setField('assigneeId', e.target.value)}
                disabled={loadingAssignees}
              >
                <option value="">Auto-assign by city{suggestedName ? ` → ${suggestedName}` : ''}</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.role === 'admin' ? ' (Admin)' : ''}{u.openLeads ? ` · ${u.openLeads} open` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="fld">
          <span className="lab">Interested in</span>
          <div className="amen-wrap">
            {INTERESTED_IN.map((t) => (
              <button
                type="button"
                key={t}
                className={`amen-chip ${form.interestedIn.includes(t) ? 'on' : ''}`}
                onClick={() => toggleInterested(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="fld">
          <span className="lab">Enquiry / notes</span>
          <textarea
            className="inp"
            rows={4}
            value={form.rawEnquiry}
            onChange={(e) => setField('rawEnquiry', e.target.value)}
            placeholder="Original client message or internal notes…"
          />
        </label>

        {formError ? <div className="login-error">{formError}</div> : null}
      </form>
    </Modal>
  );
}
