import { useState } from 'react';
import {
  MessageCircle, Mail, Inbox as InboxIcon, Sparkles, CheckCircle, AlertCircle,
  X, Pencil, Check, Clock, ChevronRight, Building2, FileText, Sheet, Download,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import { timeAgo } from '../utils/helpers.js';

const DYN_LABELS = {
  availWorkstations: { lab: 'Open workstations available', type: 'num', suffix: 'seats' },
  availCabins:       { lab: 'Private cabins available', type: 'text' },
  hotDesk:           { lab: 'Hot desk available', type: 'text' },
  dedicatedDesk:     { lab: 'Dedicated desk', type: 'inr', suffix: '/seat/mo' },
  privateCabin:      { lab: 'Private cabin', type: 'inr', suffix: '/seat/mo' },
  hotDeskPrice:      { lab: 'Hot desk rate', type: 'inr', suffix: '/seat/mo' },
  managedPerSqft:    { lab: 'Managed office', type: 'inr', suffix: '/sq ft' },
  availFrom:         { lab: 'Available from', type: 'text' },
};

function AttachmentCard({ att }) {
  const isPdf = att.type === 'pdf';
  return (
    <div className="att-card">
      <div className={`att-ico ${att.type}`}>{isPdf ? <FileText /> : <Sheet />}</div>
      <div className="att-body">
        <div className="att-name">{att.name}</div>
        <div className="att-meta">{att.meta} · <span className="att-parsed"><Sparkles /> parsed by AI</span></div>
      </div>
      <Download className="att-dl" />
    </div>
  );
}

function InboxDetail({ m, onApprove, onReject, onDraft }) {
  const [profOpen, setProfOpen] = useState(false);
  const p = m.prof, d = m.dyn;

  return (
    <>
      <div className="det-head">
        <div className={`tag-source ${m.ch}`}>{m.ch === 'wa' ? <MessageCircle /> : <Mail />}</div>
        <div>
          <div className="det-op">{m.op}</div>
          <div className="det-meta">{m.ch === 'wa' ? 'WhatsApp' : 'Email'} · received {timeAgo(m.mins)}</div>
        </div>
        <div className="spacer" />
        <div className={`conf-badge ${m.conf >= 80 ? 'high' : 'mid'}`} style={{ height: 26 }}>
          <Sparkles />AI confidence {m.conf}%
        </div>
      </div>

      <div className="det-cols">
        <div className="det-raw">
          <div className="det-sub">{m.ch === 'wa' ? <MessageCircle /> : <Mail />} Raw incoming message</div>
          {m.ch === 'wa' ? (
            <div className="wa-bubble" dangerouslySetInnerHTML={{ __html: m.raw.replace(/\n/g, '<br>') }} />
          ) : (
            <div className="email-raw"><pre>{m.raw}</pre></div>
          )}
          {m.att && <AttachmentCard att={m.att} />}
        </div>

        <div className="det-form">
          <div className="det-sub">
            <Sparkles /> Extracted availability &amp; pricing
            <span className="dyn-tag">live fields</span>
            {m.low.length > 0 && (
              <span className="low-note">{m.low.length} need{m.low.length > 1 ? '' : 's'} a check</span>
            )}
          </div>
          <div className="form-grid">
            {Object.entries(d).map(([k, v]) => {
              const cfg = DYN_LABELS[k] || { lab: k, type: 'text' };
              const flagged = m.low.includes(k);
              const val = cfg.type === 'inr' ? (v == null ? '' : v) : (v == null ? '' : String(v));
              return (
                <label key={k} className={`fld${flagged ? ' low' : ''}`}>
                  <span className="lab">
                    {cfg.lab}{flagged ? ' ⚠' : ''}
                    {cfg.suffix && <span className="unit"> {cfg.suffix}</span>}
                  </span>
                  <input
                    className={`inp${cfg.type === 'num' || cfg.type === 'inr' ? ' tnum' : ''}`}
                    defaultValue={val}
                    placeholder={cfg.type === 'inr' ? 'confirm ₹' : ''}
                  />
                </label>
              );
            })}
          </div>
          <div className="verify-line"><Clock /> Approving stamps these fields <b>verified just now</b></div>

          <div className={`prof-block${profOpen ? ' open' : ''}`}>
            <button className="prof-toggle" onClick={() => setProfOpen(o => !o)}>
              <ChevronRight className="pt-caret" />
              <Building2 /> Centre profile <span className="prof-sub">static · set at onboarding</span>
              <span className="prof-edit" onClick={e => { e.stopPropagation(); onDraft(); }}>
                <Pencil /> Edit profile
              </span>
            </button>
            <div className="prof-collapse">
              {p.isNew ? (
                <div className="prof-new"><Sparkles /> {p.centre}</div>
              ) : (
                <div className="prof-grid">
                  <div><span>Centre</span><b>{p.centre}</b></div>
                  <div><span>Address</span><b>{p.address}</b></div>
                  <div><span>Building type</span><b>{p.buildingType}</b></div>
                  <div><span>Space type</span><b>{p.type}</b></div>
                  <div><span>Total seats (capacity)</span><b className="tnum">{p.totalSeats ?? '—'}</b></div>
                  <div><span>Total cabins</span><b className="tnum">{p.totalCabins ?? '—'}</b></div>
                  <div><span>Centre manager</span><b>{p.manager}</b></div>
                  <div><span>Amenities</span><b>{p.amenities.join(', ')}</b></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="det-actions">
        <button className="btn danger" onClick={onReject}><X /> Reject</button>
        <div className="spacer" />
        <button className="btn" onClick={onDraft}><Pencil /> Save as draft</button>
        <button className="btn success" onClick={onApprove}><Check /> Approve &amp; publish</button>
      </div>
    </>
  );
}

export default function Inbox() {
  const { inbox, approveInboxItem, rejectInboxItem, toast } = useApp();
  const [selected, setSelected] = useState(inbox[0]?.id || null);

  const msg = inbox.find(m => m.id === selected);

  if (!inbox.length) {
    return (
      <>
        <div className="page-head"><h1>Inventory Inbox</h1><p>AI review queue</p></div>
        <div className="card empty"><InboxIcon /><div>Queue is clear — every operator message has been processed.</div></div>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Inventory Inbox</h1>
            <p>Messy operator messages in, clean structured listings out — AI extracts, you approve.</p>
          </div>
          <div className="spacer" />
          <span className="chip"><Sparkles /> AI confidence threshold 80%</span>
        </div>
      </div>

      <div className="inbox-wrap">
        <div className="inbox-list card">
          {inbox.map(m => {
            const cls = m.conf >= 80 ? 'high' : 'mid';
            const verdict = m.conf >= 80 ? `${m.conf}% · auto-approved` : `${m.conf}% · needs review`;
            return (
              <div
                key={m.id}
                className={`inbox-item${selected === m.id ? ' sel' : ''}`}
                onClick={() => setSelected(m.id)}
              >
                <div className={`tag-source ${m.ch}`}>{m.ch === 'wa' ? <MessageCircle /> : <Mail />}</div>
                <div className="ib-body">
                  <div className="ib-top">
                    <span className="ib-op">{m.op}</span>
                    <span className="ib-time tnum">{timeAgo(m.mins)}</span>
                  </div>
                  <div className="ib-snip">{m.snippet}</div>
                  <div className={`conf-badge ${cls}`}>
                    {m.conf >= 80 ? <CheckCircle /> : <AlertCircle />}
                    {verdict}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="inbox-detail card">
          {msg && (
            <InboxDetail
              m={msg}
              onApprove={() => {
                approveInboxItem(msg);
                setSelected(inbox.find(m2 => m2.id !== msg.id)?.id || null);
              }}
              onReject={() => {
                rejectInboxItem(msg.id);
                setSelected(inbox.find(m2 => m2.id !== msg.id)?.id || null);
              }}
              onDraft={() => toast('Saved as draft — stays in queue', 'save')}
            />
          )}
        </div>
      </div>
    </>
  );
}
