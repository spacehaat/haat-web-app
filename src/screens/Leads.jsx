import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, MapPin, MessageSquarePlus,
  Search, UserRound, X, Layers, FileText, Clock, Mail, Phone,
  Plus, Pencil, ClipboardPaste, UserCheck, Filter, RotateCcw,
  Calendar, Users, IndianRupee, Building2, Trash2,
} from 'lucide-react';
import LeadFormModal from '../components/LeadFormModal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { useApp } from '../store/AppContext.jsx';
import {
  apiAddLeadNote, apiDeleteLead, apiGetLead, apiListLeadAssignees, apiListLeads, apiUpdateLead,
} from '../utils/api.js';
import { canAssignLeads, isAdmin } from '../utils/access.js';

const PAGE_SIZE = 20;

const STAGES = [
  ['', 'All'],
  ['new', 'New'],
  ['qualified', 'Qualified'],
  ['proposal_sent', 'Proposal sent'],
  ['visit_scheduled', 'Visit scheduled'],
  ['negotiation', 'Negotiation'],
  ['won', 'Won'],
  ['lost', 'Lost'],
];

const STAGE_LABEL = Object.fromEntries(STAGES.filter(([v]) => v).map(([v, l]) => [v, l]));

const SOURCES = [
  ['', 'All sources'],
  ['manual', 'Manual'],
  ['whatsapp', 'WhatsApp'],
  ['website', 'Website'],
  ['referral', 'Referral'],
  ['smart_match', 'Smart Match'],
];

const SOURCE_LABEL = {
  smart_match: 'Smart Match',
  manual: 'Manual',
  referral: 'Referral',
  website: 'Website',
  whatsapp: 'WhatsApp',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function leadSubtitle(lead) {
  const parts = [];
  if (lead.seats) parts.push(`${lead.seats} seats`);
  if (lead.microlocation) parts.push(lead.microlocation);
  else if (lead.city) parts.push(lead.city);
  return parts.join(' · ') || lead.displayTitle || '';
}

function isOverdue(dueAt) {
  return dueAt && new Date(dueAt) < new Date();
}

function initials(name) {
  if (!name) return '?';
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

function LeadNameCell({ lead }) {
  return (
    <div className="lead-name-cell">
      <strong>{lead.name || lead.company || 'Unnamed lead'}</strong>
      {lead.name && lead.company ? <span>{lead.company}</span> : null}
    </div>
  );
}

function LocationCell({ lead }) {
  if (!lead.city && !lead.microlocation) return '—';
  return (
    <div className="lead-loc-cell">
      {lead.city ? <span>{lead.city}</span> : null}
      {lead.microlocation ? <small>{lead.microlocation}</small> : null}
    </div>
  );
}

function RequirementCell({ lead }) {
  const types = lead.interestedIn?.length ? lead.interestedIn.join(', ') : null;
  if (!types && !lead.seats) return '—';
  return (
    <div className="lead-req-cell">
      {types ? <span>{types}</span> : null}
      {lead.seats ? <small>{lead.seats} seats</small> : null}
    </div>
  );
}

export default function Leads() {
  const { cityFilter, authUser, toast, go } = useApp();
  const canAssign = canAssignLeads(authUser);
  const admin = isAdmin(authUser);

  const defaultCity = cityFilter && cityFilter !== 'All cities' ? cityFilter : 'Bangalore';

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigneeOptions, setAssigneeOptions] = useState([]);
  const [detailAssignees, setDetailAssignees] = useState([]);

  useEffect(() => {
    if (!canAssign) return;
    apiListLeadAssignees(cityFilter !== 'All cities' ? cityFilter : '')
      .then((data) => setAssigneeOptions(data.items || []))
      .catch(() => setAssigneeOptions([]));
  }, [canAssign, cityFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, stageFilter, sourceFilter, cityFilter, assigneeFilter]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiListLeads({
        page,
        limit: PAGE_SIZE,
        search: searchQuery,
        stage: stageFilter,
        source: sourceFilter,
        city: cityFilter,
        assignee: assigneeFilter,
      });
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
    } catch (e) {
      toast(e?.message || 'Failed to load leads', 'info');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, stageFilter, sourceFilter, cityFilter, assigneeFilter, toast]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const hasActiveFilters = Boolean(
    searchQuery || stageFilter || sourceFilter || assigneeFilter
    || (cityFilter && cityFilter !== 'All cities'),
  );

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStageFilter('');
    setSourceFilter('');
    setAssigneeFilter('');
  };

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      const item = await apiGetLead(id);
      setDetail(item);
      if (canAssign) {
        const data = await apiListLeadAssignees(item.city || '');
        setDetailAssignees(data.items || []);
      }
    } catch (e) {
      toast(e?.message || 'Could not load lead', 'info');
    } finally {
      setDetailLoading(false);
    }
  };

  const openCreate = () => {
    setEditingLead(null);
    setPasteMode(false);
    setFormOpen(true);
  };

  const openPasteCreate = () => {
    setEditingLead(null);
    setPasteMode(true);
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditingLead(detail);
    setPasteMode(false);
    setDetail(null);
    setFormOpen(true);
  };

  const handleDeleteLead = () => {
    if (!detail) return;
    setConfirmDelete(true);
  };

  const confirmDeleteLead = async () => {
    if (!detail) return;
    setDeleting(true);
    try {
      await apiDeleteLead(detail.id);
      setConfirmDelete(false);
      setDetail(null);
      await fetchPage();
      toast('Lead deleted', 'trash-2');
    } catch (e) {
      toast(e?.message || 'Could not delete lead', 'info');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaved = async (item) => {
    toast(editingLead ? 'Lead updated' : 'Lead created', 'check-circle');
    await fetchPage();
    if (editingLead && detail?.id === item.id) setDetail(item);
    else if (!editingLead) setDetail(item);
    setEditingLead(null);
  };

  const updateStage = async (stage) => {
    if (!detail) return;
    try {
      const item = await apiUpdateLead(detail.id, { stage });
      setDetail(item);
      fetchPage();
      toast('Lead stage updated', 'check-circle');
    } catch (e) {
      toast(e?.message || 'Could not update lead', 'info');
    }
  };

  const updateAssignee = async (assigneeId) => {
    if (!detail) return;
    try {
      const item = await apiUpdateLead(detail.id, { assigneeId: assigneeId || null });
      setDetail(item);
      fetchPage();
      toast('Lead assignee updated', 'check-circle');
    } catch (e) {
      toast(e?.message || 'Could not update assignee', 'info');
    }
  };

  const addNote = async () => {
    if (!detail || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const item = await apiAddLeadNote(detail.id, noteText.trim());
      setDetail(item);
      setNoteText('');
      toast('Note added', 'check-circle');
    } catch (e) {
      toast(e?.message || 'Could not add note', 'info');
    } finally {
      setNoteSaving(false);
    }
  };

  const currentPage = Math.min(page, pageCount);
  const rangeStart = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const pageItems = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= pageCount; i += 1) {
      if (i === 1 || i === pageCount || Math.abs(i - currentPage) <= 1) pages.push(i);
      else if (pages[pages.length - 1] !== '…') pages.push('…');
    }
    return pages;
  }, [pageCount, currentPage]);

  const stageCounts = useMemo(() => {
    const counts = {};
    for (const lead of items) counts[lead.stage] = (counts[lead.stage] || 0) + 1;
    return counts;
  }, [items]);

  return (
    <div className="leads-screen">
      <div className="page-head leads-page-head">
        <div className="row">
          <div>
            <h1>Leads</h1>
            <p>Track every enquiry from first match through proposal to close.</p>
          </div>
          <div className="spacer" />
          <div className="leads-head-actions">
            <button className="btn" onClick={openPasteCreate}>
              <ClipboardPaste /> Paste lead
            </button>
            <button className="btn" onClick={openCreate}>
              <Plus /> Create lead
            </button>
            <button className="btn primary" onClick={() => go('match')}>
              <UserRound /> Smart Match
            </button>
          </div>
        </div>
      </div>

      <div className="leads-summary card">
        <div className="leads-stat">
          <b className="tnum">{total}</b>
          <span>{hasActiveFilters ? 'Matching leads' : 'Total leads'}</span>
        </div>
        {cityFilter && cityFilter !== 'All cities' ? (
          <div className="leads-stat">
            <b>{cityFilter}</b>
            <span>City scope</span>
          </div>
        ) : null}
        <div className="leads-stage-pills">
          {STAGES.filter(([v]) => v).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`lead-stage-pill ${value} ${stageFilter === value ? 'on' : ''}`}
              onClick={() => setStageFilter(stageFilter === value ? '' : value)}
            >
              {label}
              {stageCounts[value] ? <em className="tnum">{stageCounts[value]}</em> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="card leads-filter-card">
        <div className="leads-search-wrap">
          <Search />
          <input
            type="search"
            className="leads-search-input"
            placeholder="Search name, email, phone, company, city, microlocation, stage, source, seats, budget, assignee…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput ? (
            <button type="button" className="leads-search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">
              <X />
            </button>
          ) : null}
        </div>

        <div className="leads-filter-row">
          <label className="leads-filter-field">
            <span><Filter /> Stage</span>
            <select className="inp" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              {STAGES.map(([v, label]) => <option key={v || 'all'} value={v}>{label}</option>)}
            </select>
          </label>
          <label className="leads-filter-field">
            <span>Source</span>
            <select className="inp" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              {SOURCES.map(([v, label]) => <option key={v || 'all'} value={v}>{label}</option>)}
            </select>
          </label>
          {canAssign ? (
            <label className="leads-filter-field">
              <span><UserCheck /> Assignee</span>
              <select className="inp" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
                <option value="">All assignees</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          {hasActiveFilters ? (
            <button type="button" className="btn sm leads-clear-btn" onClick={clearFilters}>
              <RotateCcw /> Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className="card leads-table-card">
        <div className="leads-table-meta">
          <span className="leads-result-count">
            {loading ? 'Loading…' : (
              <>Showing <b className="tnum">{rangeStart}</b>–<b className="tnum">{rangeEnd}</b> of <b className="tnum">{total}</b></>
            )}
          </span>
        </div>

        <div className="leads-tbl-scroll">
          <table className="tbl leads-tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Lead</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Requirement</th>
                <th>Location</th>
                <th>Stage</th>
                <th>Source</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="leads-loading"><Loader2 className="spin" /> Loading leads…</td></tr>
              ) : items.length ? items.map((lead) => (
                <tr key={lead.id} className="leads-row" onClick={() => openDetail(lead.id)}>
                  <td className="lead-date-cell tnum">{formatDate(lead.leadDate)}</td>
                  <td><LeadNameCell lead={lead} /></td>
                  <td className="tnum lead-contact-cell">{lead.contact || '—'}</td>
                  <td className="lead-email-cell">{lead.email || '—'}</td>
                  <td><RequirementCell lead={lead} /></td>
                  <td><LocationCell lead={lead} /></td>
                  <td>
                    <span className={`lead-stage ${lead.stage}`}>
                      {STAGE_LABEL[lead.stage] || lead.stage}
                    </span>
                  </td>
                  <td>
                    <span className={`lead-source ${lead.source || 'manual'}`}>
                      {SOURCE_LABEL[lead.source] || lead.source || '—'}
                    </span>
                  </td>
                  <td>
                    <div className="lead-assignee-cell">
                      <span className="lead-assignee-avatar">{initials(lead.assigneeName)}</span>
                      <span>{lead.assigneeName || '—'}</span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="leads-empty">
                    <div className="leads-empty-inner">
                      <Search />
                      <strong>No leads found</strong>
                      <p>{hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create one manually, paste a client message, or use Smart Match.'}</p>
                      {hasActiveFilters ? (
                        <button type="button" className="btn sm" onClick={clearFilters}>Clear filters</button>
                      ) : (
                        <button type="button" className="btn primary sm" onClick={openPasteCreate}>Paste lead</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > PAGE_SIZE && (
        <div className="inv-pagination leads-pagination">
          <span className="pg-info">
            Page <b className="tnum">{currentPage}</b> of <b className="tnum">{pageCount}</b>
          </span>
          <div className="pg-controls">
            <button className="btn sm pg-btn" disabled={currentPage === 1 || loading} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft />
            </button>
            {pageItems.map((it, i) => (
              it === '…' ? <span key={`gap-${i}`} className="pg-gap">…</span> : (
                <button key={it} className={`btn sm pg-num ${it === currentPage ? 'on' : ''}`} onClick={() => setPage(it)} disabled={loading}>
                  {it}
                </button>
              )
            ))}
            <button className="btn sm pg-btn" disabled={currentPage === pageCount || loading} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight />
            </button>
          </div>
        </div>
      )}

      <LeadFormModal
        show={formOpen}
        lead={editingLead}
        defaultCity={defaultCity}
        startWithPaste={pasteMode}
        onClose={() => { setFormOpen(false); setEditingLead(null); setPasteMode(false); }}
        onSaved={handleSaved}
      />

      {(detail || detailLoading) && (
        <div className="lead-drawer-backdrop" onClick={() => !detailLoading && setDetail(null)}>
          <aside className="lead-drawer" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="lead-drawer-loading"><Loader2 className="spin" /></div>
            ) : (
              <>
                <div className="lead-drawer-hero">
                  <div className="lead-drawer-hero-top">
                    <div className="lead-drawer-identity">
                      <span className="lead-drawer-avatar">{initials(detail.name || detail.company)}</span>
                      <div>
                        <h2>{detail.name || detail.company || 'Lead'}</h2>
                        {detail.company && detail.name ? (
                          <div className="lead-drawer-company"><Building2 /> {detail.company}</div>
                        ) : null}
                        {leadSubtitle(detail) ? (
                          <div className="lead-drawer-sub">{leadSubtitle(detail)}</div>
                        ) : null}
                      </div>
                    </div>
                    <div className="lead-drawer-actions">
                      <button className="btn sm" onClick={openEdit} aria-label="Edit lead">
                        <Pencil /> Edit
                      </button>
                      {admin ? (
                        <button className="btn sm danger" onClick={handleDeleteLead} aria-label="Delete lead">
                          <Trash2 /> Delete
                        </button>
                      ) : null}
                      <button className="icon-btn lead-drawer-close" onClick={() => setDetail(null)} aria-label="Close">
                        <X />
                      </button>
                    </div>
                  </div>
                  <div className="lead-drawer-hero-meta">
                    <span className={`lead-stage ${detail.stage}`}>{STAGE_LABEL[detail.stage] || detail.stage}</span>
                    <span className={`lead-source ${detail.source}`}>{SOURCE_LABEL[detail.source] || detail.source}</span>
                    <span className="lead-drawer-date"><Calendar /> {formatDate(detail.leadDate)}</span>
                  </div>
                </div>

                <div className="lead-drawer-body">
                  <div className="lead-drawer-kpis">
                    <div className="lead-kpi">
                      <Layers />
                      <b className="tnum">{detail.listingIds?.length || 0}</b>
                      <span>Shortlisted</span>
                    </div>
                    <div className="lead-kpi">
                      <FileText />
                      <b className="tnum">{detail.proposalIds?.length || 0}</b>
                      <span>Proposals</span>
                    </div>
                    <div className={`lead-kpi ${isOverdue(detail.dueAt) ? 'overdue' : ''}`}>
                      <Clock />
                      <b>{formatDate(detail.dueAt)}</b>
                      <span>{isOverdue(detail.dueAt) ? 'Overdue' : 'Follow-up'}</span>
                    </div>
                  </div>

                  <div className="lead-drawer-panel">
                    <div className="lead-drawer-panel-title">Pipeline</div>
                    <div className="lead-stage-track">
                      {STAGES.filter(([v]) => v).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={`lead-stage-step ${value} ${detail.stage === value ? 'on' : ''}`}
                          onClick={() => updateStage(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lead-drawer-panel">
                    <div className="lead-drawer-panel-title">Contact</div>
                    <div className="lead-contact-list">
                      {detail.email ? (
                        <a className="lead-contact-row" href={`mailto:${detail.email}`}>
                          <span className="lead-contact-icon"><Mail /></span>
                          <span className="lead-contact-text">
                            <small>Email</small>
                            <b>{detail.email}</b>
                          </span>
                        </a>
                      ) : null}
                      {detail.contact ? (
                        <a className="lead-contact-row" href={`tel:${detail.contact.replace(/\s/g, '')}`}>
                          <span className="lead-contact-icon"><Phone /></span>
                          <span className="lead-contact-text">
                            <small>Phone</small>
                            <b>{detail.contact}</b>
                          </span>
                        </a>
                      ) : null}
                      {!detail.email && !detail.contact ? (
                        <div className="lead-contact-empty">No contact details yet</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="lead-drawer-panel">
                    <div className="lead-drawer-panel-title">Assignment</div>
                    <div className="lead-assign-row">
                      <span className="lead-assignee-avatar lg">{initials(detail.assigneeName)}</span>
                      <div className="lead-assign-info">
                        <small>Assigned to</small>
                        {canAssign ? (
                          <select
                            className="inp lead-assign-select"
                            value={detail.assigneeId || ''}
                            onChange={(e) => updateAssignee(e.target.value)}
                          >
                            <option value="">Auto-assign by city</option>
                            {detailAssignees.map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        ) : (
                          <b>{detail.assigneeName || '—'}</b>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lead-drawer-panel">
                    <div className="lead-drawer-panel-title">Requirement</div>
                    <div className="lead-req-grid">
                      {detail.interestedIn?.map((t) => (
                        <div key={t} className="lead-req-item"><Users /><span>{t}</span></div>
                      ))}
                      {detail.city ? (
                        <div className="lead-req-item"><MapPin /><span>{detail.city}{detail.microlocation ? ` · ${detail.microlocation}` : ''}</span></div>
                      ) : null}
                      {detail.seats ? (
                        <div className="lead-req-item"><Users /><span>{detail.seats} seats</span></div>
                      ) : null}
                      {detail.budget ? (
                        <div className="lead-req-item"><IndianRupee /><span>≤ ₹{detail.budget}/seat</span></div>
                      ) : null}
                      {detail.moveIn ? (
                        <div className="lead-req-item"><Calendar /><span>{detail.moveIn}</span></div>
                      ) : null}
                    </div>
                  </div>

                  {detail.rawEnquiry ? (
                    <div className="lead-drawer-panel">
                      <div className="lead-drawer-panel-title">Original enquiry</div>
                      <div className="lead-enquiry">{detail.rawEnquiry}</div>
                    </div>
                  ) : null}

                  <div className="lead-drawer-panel">
                    <div className="lead-drawer-panel-title">Notes</div>
                    <div className="lead-notes">
                      {(detail.notes || []).length ? (detail.notes || []).map((n, i) => (
                        <div key={`${n.at}-${i}`} className="lead-note">
                          <div className="lead-note-dot" />
                          <div className="lead-note-body">
                            <div className="lead-note-meta">{n.who} · {formatDate(n.at)}</div>
                            <div>{n.text}</div>
                          </div>
                        </div>
                      )) : (
                        <div className="lead-notes-empty">No notes yet — add the first follow-up below.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lead-drawer-footer">
                  <textarea
                    className="inp lead-note-input"
                    rows={2}
                    placeholder="Add a follow-up note…"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote();
                    }}
                  />
                  <button
                    className="btn primary lead-note-submit"
                    disabled={noteSaving || !noteText.trim()}
                    onClick={addNote}
                  >
                    {noteSaving ? <Loader2 className="spin" /> : <MessageSquarePlus />}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete && Boolean(detail)}
        title="Delete lead"
        message={detail
          ? `Delete “${detail.name || detail.company || 'this lead'}”? This cannot be undone.`
          : ''}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => { if (!deleting) setConfirmDelete(false); }}
        onConfirm={confirmDeleteLead}
      />
    </div>
  );
}
