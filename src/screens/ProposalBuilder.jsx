import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle, Copy, Download, Eye, FilePlus2, FileText, Layers, Loader2, Mail, MessageCircle, RefreshCw, ShieldCheck, Sparkles, UserRound, X, Zap } from 'lucide-react';
import ProposalSpaceCard from '../components/ProposalSpaceCard.jsx';
import { useApp } from '../store/AppContext.jsx';
import { allGalleryPhotos, clientSafeListing, coverNote, inr } from '../utils/helpers.js';
import { profileOf } from '../data/schema.js';
import { apiGenerateProposalPdf } from '../utils/api.js';

export default function ProposalBuilder() {
  const {
    listings, proposalIds, client, coverNote: coverNoteText, coverNoteIdx, proposalTitle,
    editingProposalId, linkedLead,
    authUser,
    go, toast, sendProposal, refreshProposals, applyProposalDraft,
    updateClient, updateCoverNote, updateCoverNoteIdx, updateProposalTitle,
    removeFromProposal, reorderProposal,
  } = useApp();
  const [sendOpen, setSendOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState('wa');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfMeta, setPdfMeta] = useState(null);

  const items = useMemo(
    () => proposalIds.map((id) => listings.find((l) => l.id === id)).filter(Boolean),
    [proposalIds, listings],
  );
  const safeItems = useMemo(() => items.map((l) => clientSafeListing(l, profileOf)), [items]);
  const activeCoverNote = coverNoteText || coverNote(client, items.length, coverNoteIdx);

  // Suggested name — mirrors the backend's auto-title so the preview, the
  // placeholder, and the stored PDF all read the same when left untouched.
  const suggestedTitle = useMemo(() => {
    const who = client.company || client.name;
    const base = who ? `${who} — workspace proposal` : 'Workspace proposal';
    return `${base} · ${items.length} option${items.length !== 1 ? 's' : ''}`;
  }, [client.company, client.name, items.length]);
  const displayTitle = proposalTitle?.trim() || suggestedTitle;

  // Exact render payload that mirrors the live preview (ProposalSpaceCard) so the
  // generated PDF embeds the identical images/labels and metrics.
  const proposalRender = useMemo(() => ({
    listings: safeItems.map((l) => ({
      operator: l.operator,
      type: l.type,
      city: l.city,
      micro: l.micro,
      seats: Number(l.seats || 0),
      price: Number(l.price || 0),
      avail: l.avail || 'Available now',
      freshLabel: l.fresh?.label || 'Verified',
      carpet: Number(l.carpet || 0),
      buildingType: l.buildingType || '',
      nearestMetro: l.nearestMetro || '',
      securityDeposit: l.securityDeposit || '',
      noticePeriod: l.noticePeriod || '',
      amenities: l.amenities || [],
      gallery: allGalleryPhotos(l, profileOf).map((ph) => ({
        src: ph.src,
        label: ph.label || l.type,
      })),
    })),
  }), [safeItems]);

  useEffect(() => {
    if (!items.length || coverNoteText) return;
    updateCoverNote(coverNote(client, items.length, coverNoteIdx));
  }, [items.length, coverNoteText, coverNoteIdx, client]);

  const updateOrder = (idx, delta) => {
    const next = [...proposalIds];
    const swapIdx = idx + delta;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    reorderProposal(next);
  };

  const removeItem = (id) => {
    removeFromProposal(id);
    toast('Removed from proposal', 'x');
  };

  const regenerateNote = () => {
    const nextIdx = (coverNoteIdx + 1) % 3;
    const text = coverNote(client, items.length, nextIdx);
    updateCoverNoteIdx(nextIdx, text);
    toast('Cover note regenerated', 'sparkles');
  };

  const closeModal = () => {
    setSendOpen(false);
    setSent(false);
  };

  const confirmSend = async () => {
    setSending(true);
    try {
      const result = await sendProposal(sendChannel, proposalRender, displayTitle);
      if (result?.pdf) setPdfMeta(result.pdf);
      const pdfLine = result?.pdf?.url ? `\n\nPDF: ${result.pdf.url}` : '';
      await navigator.clipboard.writeText(`${sendMessage}${pdfLine}`);
      setSent(true);
      toast('Message copied — proposal saved to history', 'check-circle');
    } catch (e) {
      toast(e?.message || 'Failed to save proposal', 'info');
    } finally {
      setSending(false);
    }
  };

  const persistProposal = async () => {
    const isCreate = !editingProposalId;
    const result = await apiGenerateProposalPdf(
      proposalRender,
      displayTitle,
      editingProposalId,
      linkedLead?.id || null,
    );
    if (result?.pdf) setPdfMeta(result.pdf);
    if (isCreate && result?.draft) {
      applyProposalDraft(result.draft);
      setPdfMeta(null);
    }
    refreshProposals();
    return result;
  };

  const createProposal = async () => {
    setCreateLoading(true);
    try {
      await persistProposal();
      toast(
        editingProposalId ? 'Proposal updated and saved' : 'Proposal created and saved',
        'check-circle',
      );
    } catch (e) {
      toast(e?.message || (editingProposalId ? 'Failed to update proposal' : 'Failed to create proposal'), 'info');
    } finally {
      setCreateLoading(false);
    }
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    try {
      const { pdf } = await persistProposal();
      const link = document.createElement('a');
      link.href = pdf.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = `${displayTitle.replace(/[^\w]+/g, '_').slice(0, 60) || 'Spacehaat_Proposal'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast(
        editingProposalId ? 'Proposal updated and PDF downloaded' : 'Proposal saved and PDF downloaded',
        'file-down',
      );
    } catch (e) {
      toast(e?.message || 'Failed to generate PDF', 'info');
    } finally {
      setPdfLoading(false);
    }
  };

  const pdfPages = pdfMeta?.pageCount || Math.max(1, Math.ceil(items.length / 2) + 1);
  const pdfSizeMb = pdfMeta?.sizeBytes
    ? `${(pdfMeta.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(0.4, items.length * 0.3).toFixed(1)} MB`;

  const brokerName = authUser?.name || 'Spacehaat';
  const brokerFirst = brokerName.split(' ')[0] || brokerName;

  const sendMessage = useMemo(() => {
    const cl = client.name || 'there';
    const co = client.company || '';
    if (sendChannel === 'wa') {
      return `Hi ${cl}! 👋 As discussed, here's a proposal with ${items.length} workspace options${co ? ` for ${co}` : ''} that match your requirement. All are verified-available right now. PDF link below — let me know which you'd like to visit. — ${brokerFirst}, Spacehaat`;
    }
    return `Dear ${cl},\n\nPlease find a curated proposal of ${items.length} workspace options${co ? ` for ${co}` : ''}, matched to your requirement and verified for live availability.\n\nDo let me know your preferred options and I'll arrange site visits.\n\nWarm regards,\n${brokerName} · Spacehaat`;
  }, [sendChannel, client, items.length, brokerName, brokerFirst]);

  if (!items.length) {
    return (
      <>
        <div className="page-head">
          <div className="row">
            <div>
              <h1>Proposal Builder</h1>
              <p>Selected spaces become a branded, client-ready proposal.</p>
            </div>
          </div>
        </div>
        <div className="card empty prop-empty">
          <div className="prop-empty-icon">
            <FilePlus2 />
          </div>
          <h2 className="prop-empty-title">No spaces selected yet</h2>
          <p className="prop-empty-lead">
            Add spaces from <strong>Smart Match</strong> or the <strong>Inventory Browser</strong>, then build your client-ready proposal here.
          </p>
          <div className="empty-actions">
            <button type="button" className="btn primary" onClick={() => go('match')}>
              <Zap /> Smart Match
            </button>
            <button type="button" className="btn" onClick={() => go('browser')}>
              <Layers /> Inventory Browser
            </button>
          </div>
        </div>
      </>
    );
  }

  const minP = Math.min(...safeItems.map((l) => l.price));
  const maxP = Math.max(...safeItems.map((l) => l.price));
  const who = client.name
    ? `${client.name}${client.company ? ` · ${client.company}` : ''}`
    : (client.company || '[Client name]');

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Proposal Builder</h1>
            <p>Arrange spaces, personalise the note, and send a branded proposal in under a minute.</p>
          </div>
        </div>
      </div>

      {linkedLead ? (
        <div className="card lead-link-banner">
          <UserRound />
          <div>
            <strong>Linked lead:</strong> {linkedLead.title || linkedLead.displayTitle}
            <div className="lead-link-sub">Proposal will be attached to this deal when saved or sent.</div>
          </div>
          <button type="button" className="btn sm" onClick={() => go('leads')}>View leads</button>
        </div>
      ) : null}

      <div className="prop-wrap">
        <div className="prop-editor">
          <div className="card pe-block">
            <div className="pe-head"><FileText /> Proposal name</div>
            <div className="pe-body">
              <label className="fld">
                <input
                  className="inp"
                  placeholder={suggestedTitle}
                  value={proposalTitle}
                  onChange={(e) => updateProposalTitle(e.target.value)}
                  maxLength={120}
                />
                <span className="lab" style={{ marginTop: 6 }}>
                  Used as the document title and the saved proposal name. Leave blank to auto-name it.
                </span>
              </label>
            </div>
          </div>

          <div className="card pe-block">
            <div className="pe-head"><UserRound /> Client</div>
            <div className="pe-body">
              <div className="form-grid">
                <label className="fld">
                  <span className="lab">Contact name</span>
                  <input className="inp" placeholder="e.g. Ananya Rao" value={client.name} onChange={(e) => updateClient({ ...client, name: e.target.value })} />
                </label>
                <label className="fld">
                  <span className="lab">Company</span>
                  <input className="inp" placeholder="e.g. Acme Corp" value={client.company} onChange={(e) => updateClient({ ...client, company: e.target.value })} />
                </label>
              </div>
            </div>
          </div>

          <div className="card pe-block">
            <div className="pe-head">
              <Sparkles />
              AI-drafted cover note
              <button className="btn ghost sm" onClick={regenerateNote}><RefreshCw /> Regenerate</button>
            </div>
            <div className="pe-body">
              <textarea className="inp" rows={4} value={activeCoverNote} onChange={(e) => updateCoverNote(e.target.value)} />
            </div>
          </div>

          <div className="card pe-block">
            <div className="pe-head"><Layers /> Selected spaces <span className="count-pill">{items.length}</span></div>
            <div className="pe-body pe-list">
              {items.map((l, i) => (
                <div key={l.id} className="pe-item">
                  <div className="pe-rank tnum">{i + 1}</div>
                  <div className="pe-info"><b>{l.operator}</b><span>{l.micro}, {l.city} · {l.seats} seats · {inr(l.price)}</span></div>
                  <div className="pe-ctrl">
                    <button className="ic" onClick={() => updateOrder(i, -1)} disabled={i === 0}>↑</button>
                    <button className="ic" onClick={() => updateOrder(i, 1)} disabled={i === items.length - 1}>↓</button>
                    <button className="ic del" onClick={() => removeItem(l.id)}><X /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="prop-preview-wrap">
          <div className="preview-toolbar">
            <span><Eye /> Live preview</span>
            <span className="pv-up">updates as you edit</span>
          </div>
          <div className="doc">
            <div className="doc-head">
              <div className="doc-brand"><img src="/icon.png" alt="" className="doc-logo" /><div><div className="doc-wm">Spacehaat</div><div className="doc-tag">Workspace Proposal</div></div></div>
              <div className="doc-date">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
            <div className="doc-title">{displayTitle}</div>
            <div className="doc-to">Prepared for <b>{who}</b></div>
            <p className="doc-cover">{activeCoverNote}</p>
            <div className="doc-summary">
              <div className="ds"><span>Options</span><b className="tnum">{safeItems.length}</b></div>
              <div className="ds"><span>Price range</span><b className="tnum">{inr(minP)}–{inr(maxP)}</b></div>
              <div className="ds"><span>Cities</span><b>{[...new Set(safeItems.map((l) => l.city))].join(', ')}</b></div>
              <div className="ds"><span>All verified</span><b style={{ color: 'var(--fresh)' }}>✓ Live</b></div>
            </div>
            {safeItems.map((l, i) => (
              <ProposalSpaceCard key={l.id} listing={l} index={i} total={safeItems.length} />
            ))}
            <div className="doc-foot">Spacehaat · Real-time workspace inventory · proposals@spacehaat.in · +91 80 4710 0000</div>
          </div>
        </div>
      </div>

      <div className="sticky-bar prop-actions">
        <span className="chip"><ShieldCheck /> All {items.length} listings freshness-verified</span>
        <div className="spacer" />
        <button className="btn primary" onClick={createProposal} disabled={createLoading || pdfLoading}>
          {createLoading ? <Loader2 className="spin" /> : (editingProposalId ? <RefreshCw /> : <FilePlus2 />)}
          {createLoading
            ? (editingProposalId ? 'Updating…' : 'Creating…')
            : (editingProposalId ? 'Update proposal' : 'Create proposal')}
        </button>
        <button className="btn" onClick={downloadPdf} disabled={pdfLoading || createLoading}>
          {pdfLoading ? <Loader2 className="spin" /> : <Download />}
          {pdfLoading ? 'Generating…' : 'Download PDF'}
        </button>
        <button className="btn" onClick={() => { setSendChannel('em'); setSendOpen(true); }}><Mail /> Email message</button>
        <button className="btn" onClick={() => { setSendChannel('wa'); setSendOpen(true); }}><MessageCircle /> WhatsApp message</button>
      </div>

      {sendOpen && (
        <div className="modal-bg show" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {sendChannel === 'wa' ? <MessageCircle /> : <Mail />}
                Copy {sendChannel === 'wa' ? 'WhatsApp' : 'email'} message
              </h3>
              <button className="x" onClick={closeModal}><X /></button>
            </div>

            {!sent && (
              <>
                <div className="modal-body">
                  <p className="send-hint">
                    Automated send is not enabled yet. Copy the message below and paste it in your {sendChannel === 'wa' ? 'WhatsApp' : 'email'} app.
                  </p>
                  <div className="send-to">
                    <span>For</span>
                    <b>{client.name || 'Client'}{client.company ? ` · ${client.company}` : ''}</b>
                  </div>

                  {sendChannel === 'wa' ? (
                    <div className="wa-preview">
                      <div className="wa-bubble out">
                        {sendMessage}
                        <div className="wa-doc">
                          <span className="wa-doc-ic"><FileText /></span>
                          <div><div className="wdn">Spacehaat_Proposal.pdf</div><div className="wdm">{items.length} spaces · {pdfPages} pages</div></div>
                        </div>
                        <span className="wa-time">Draft</span>
                      </div>
                    </div>
                  ) : (
                    <div className="email-prev">
                      <div className="ep-sub"><span>Subject</span> Workspace proposal — {items.length} options{client.company ? ` for ${client.company}` : ''}</div>
                      <pre>{sendMessage}</pre>
                      <div className="att-card" style={{ marginTop: 0 }}>
                        <div className="att-ico pdf"><FileText /></div>
                        <div className="att-body"><div className="att-name">Spacehaat_Proposal.pdf</div><div className="att-meta">{items.length} spaces · {pdfPages} pages · {pdfSizeMb}</div></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-foot">
                  <button className="btn" onClick={closeModal} disabled={sending}>Cancel</button>
                  <button className="btn primary" onClick={confirmSend} disabled={sending}>
                    <Copy /> {sending ? 'Saving…' : 'Copy message'}
                  </button>
                </div>
              </>
            )}

            {sent && (
              <>
                <div className="modal-body">
                  <div className="sent-ok">
                    <div className="sent-ring"><Check /></div>
                    <h3>Copied & saved</h3>
                    <p>
                      Proposal saved to history. The message is on your clipboard — paste it into {sendChannel === 'wa' ? 'WhatsApp' : 'your email client'} to deliver to {client.name || 'your client'}.
                    </p>
                  </div>
                </div>
                <div className="modal-foot">
                  <button className="btn primary" onClick={closeModal}><CheckCircle /> Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
