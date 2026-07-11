import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, ExternalLink, FileText, FolderOpen, Heart,
  Layers, Loader2, MapPin, MessageCircle, Pencil, Search, Send, Share2, Sparkles, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import ProposalFeedbackModal from '../components/ProposalFeedbackModal.jsx';
import { inr } from '../utils/helpers.js';
import { can } from '../utils/access.js';
import { apiCreateProposalShareLink, apiListProposals } from '../utils/api.js';
import { proposalEditPath, PATHS } from '../routes.js';

const PAGE_SIZE = 15;

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function priceRange(summary) {
  const { priceMin, priceMax } = summary || {};
  if (!priceMin && !priceMax) return '—';
  if (priceMin === priceMax) return inr(priceMin);
  return `${inr(priceMin)}–${inr(priceMax)}`;
}

export default function Proposals() {
  const {
    authUser, refreshProposals, go, toast,
  } = useApp();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [feedbackNewTotal, setFeedbackNewTotal] = useState(0);
  const [feedbackProposal, setFeedbackProposal] = useState(null);

  const canEdit = can(authUser, 'proposals:write');

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [searchQuery]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiListProposals({ page, limit: PAGE_SIZE, search: searchQuery });
      setItems(data.items || []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
      setFeedbackNewTotal(data.feedbackNewTotal ?? 0);
      setInitialLoaded(true);
    } catch (e) {
      toast(e?.message || 'Failed to load proposals', 'info');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, toast]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  useEffect(() => {
    refreshProposals();
  }, [refreshProposals]);

  const currentPage = Math.min(page, pageCount);
  const rangeStart = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, total);

  const pageItems = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= pageCount; i += 1) {
      if (i === 1 || i === pageCount || Math.abs(i - currentPage) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…');
      }
    }
    return pages;
  }, [pageCount, currentPage]);

  const handleShare = async (p) => {
    if (!p.pdfUrl) return;
    const shareData = {
      title: p.title || 'Spacehaat workspace proposal',
      text: p.title || 'Spacehaat workspace proposal',
      url: p.pdfUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(p.pdfUrl);
      toast('PDF link copied to clipboard', 'check-circle');
    } catch (e) {
      if (e?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(p.pdfUrl);
        toast('PDF link copied to clipboard', 'check-circle');
      } catch {
        toast('Could not share the link', 'info');
      }
    }
  };

  const handleClientLink = async (p) => {
    try {
      const existingPath = p.shareToken ? `/p/${p.shareToken}` : '';
      const result = existingPath ? { sharePath: existingPath } : await apiCreateProposalShareLink(p.id);
      const url = `${window.location.origin}${result.sharePath}`;
      await navigator.clipboard.writeText(url);
      toast('Client portal link copied', 'check-circle');
      fetchPage();
    } catch (e) {
      toast(e?.message || 'Could not create client link', 'info');
    }
  };

  const handleEdit = (p) => {
    navigate(proposalEditPath(p.id));
  };

  const handleFeedbackSeen = useCallback(() => {
    fetchPage();
  }, [fetchPage]);

  const openFeedback = (p) => {
    setFeedbackProposal({ id: p.id, title: p.title });
  };

  const feedbackSummary = (p) => {
    const fb = p.feedback || {};
    const parts = [];
    if (fb.shortlisted) parts.push(`${fb.shortlisted} shortlisted`);
    if (fb.visitRequests) parts.push(`${fb.visitRequests} visit${fb.visitRequests === 1 ? '' : 's'}`);
    if (fb.comments) parts.push(`${fb.comments} comment${fb.comments === 1 ? '' : 's'}`);
    return parts.join(' · ');
  };

  const showEmpty = initialLoaded && !loading && total === 0 && !searchQuery;
  const showNoMatches = initialLoaded && !loading && total === 0 && searchQuery;

  return (
    <>
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Proposals</h1>
            <p>Every proposal you generate or send is saved here with its PDF.</p>
          </div>
          <div className="spacer" />
          <button className="btn primary" onClick={() => go('proposal')}>
            <Sparkles /> Build a proposal
          </button>
        </div>

        <div className="prop-toolbar">
          <div className="prop-search">
            <Search />
            <input
              type="search"
              placeholder="Search by proposal name or client…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search proposals by name or client"
              autoComplete="off"
            />
            {searchInput ? (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <X />
              </button>
            ) : null}
          </div>
          {total > 0 && (
            <span className="prop-count">
              {searchQuery
                ? `${total} match${total === 1 ? '' : 'es'}`
                : `${total} proposal${total === 1 ? '' : 's'}`}
              {feedbackNewTotal > 0 ? (
                <span className="prop-new-pill">{feedbackNewTotal} new update{feedbackNewTotal === 1 ? '' : 's'}</span>
              ) : null}
            </span>
          )}
        </div>
      </div>

      {loading && !initialLoaded ? (
        <div className="card empty">
          <Loader2 className="spin" />
          <div>Loading proposals…</div>
        </div>
      ) : showEmpty ? (
        <div className="card empty">
          <FolderOpen />
          <div>
            No proposals yet.
            <br />
            Generate or send a proposal from the <b>Proposal Builder</b> and it will appear here.
          </div>
          <div style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={() => go('proposal')}><FileText /> Go to Proposal Builder</button>
          </div>
        </div>
      ) : showNoMatches ? (
        <div className="card empty">
          <FolderOpen />
          <div>No proposals match &ldquo;{searchQuery}&rdquo;.</div>
        </div>
      ) : (
        <>
          <div className="prop-history-grid">
            {items.map((p) => {
              const who = p.client?.name
                ? `${p.client.name}${p.client.company ? ` · ${p.client.company}` : ''}`
                : (p.client?.company || 'No client set');
              const isSent = p.status === 'sent';
              const dateLabel = isSent ? `Sent ${formatDate(p.sentAt)}` : `Generated ${formatDate(p.generatedAt)}`;
              const hasFeedback = (p.feedback?.total || 0) > 0;
              const summary = feedbackSummary(p);

              return (
                <div key={p.id} className={`card prop-hist${p.feedbackNewCount ? ' has-new-feedback' : ''}`}>
                  <div className="ph-top">
                    <div className="ph-title">{p.title}</div>
                    <div className="ph-badges">
                      {p.feedbackNewCount ? (
                        <span className="ph-new-badge">{p.feedbackNewCount} new</span>
                      ) : null}
                      <span className={`ph-status ${isSent ? 'sent' : 'draft'}`}>
                        {isSent ? <><Send /> Sent</> : <><FileText /> Generated</>}
                      </span>
                    </div>
                  </div>

                  <div className="ph-client">{who}</div>

                  <div className="ph-stats">
                    <div className="ph-stat"><Layers /><span>{p.summary?.listingCount || 0} space{p.summary?.listingCount === 1 ? '' : 's'}</span></div>
                    <div className="ph-stat"><span className="ph-price">{priceRange(p.summary)}</span></div>
                    {p.summary?.cities?.length ? (
                      <div className="ph-stat"><MapPin /><span>{p.summary.cities.join(', ')}</span></div>
                    ) : null}
                  </div>

                  {hasFeedback ? (
                    <div className="ph-feedback-line">
                      {p.feedback?.shortlisted ? <span><Heart /> {p.feedback.shortlisted}</span> : null}
                      {p.feedback?.visitRequests ? <span><CalendarDays /> {p.feedback.visitRequests}</span> : null}
                      {p.feedback?.comments ? <span><MessageCircle /> {p.feedback.comments}</span> : null}
                      <span className="ph-feedback-sub">{summary}</span>
                    </div>
                  ) : null}

                  <div className="ph-foot">
                    <span className="ph-date">{dateLabel}{isSent && p.channel ? ` · via ${p.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}` : ''}</span>
                    <div className="ph-actions">
                      {p.pdfUrl ? (
                        <a
                          className="btn sm primary"
                          href={p.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink /> Open PDF
                        </a>
                      ) : (
                        <span className="ph-nopdf">No PDF</span>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() => handleEdit(p)}
                        >
                          <Pencil /> Edit
                        </button>
                      )}
                      {p.pdfUrl && (
                        <button type="button" className="btn sm" onClick={() => handleShare(p)}>
                          <Share2 /> Share
                        </button>
                      )}
                      <button type="button" className="btn sm" onClick={() => handleClientLink(p)}>
                        <Share2 /> Client link
                      </button>
                      {(hasFeedback || p.shareToken) ? (
                        <button type="button" className="btn sm" onClick={() => openFeedback(p)}>
                          <MessageCircle /> Feedback{p.feedbackNewCount ? ` (${p.feedbackNewCount})` : ''}
                        </button>
                      ) : null}
                      {p.leadId ? (
                        <button type="button" className="btn sm ghost" onClick={() => navigate(PATHS.leads)}>
                          View leads
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {total > PAGE_SIZE && (
            <div className="inv-pagination">
              <span className="pg-info">
                Showing <b className="tnum">{rangeStart}</b>–<b className="tnum">{rangeEnd}</b> of <b className="tnum">{total}</b>
              </span>
              <div className="pg-controls">
                <button
                  className="btn sm pg-btn"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setPage(currentPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </button>
                {pageItems.map((it, i) => (
                  it === '…' ? (
                    <span key={`gap-${i}`} className="pg-gap">…</span>
                  ) : (
                    <button
                      key={it}
                      className={`btn sm pg-num ${it === currentPage ? 'on' : ''}`}
                      onClick={() => setPage(it)}
                      disabled={loading}
                    >
                      {it}
                    </button>
                  )
                ))}
                <button
                  className="btn sm pg-btn"
                  disabled={currentPage === pageCount || loading}
                  onClick={() => setPage(currentPage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {feedbackProposal ? (
        <ProposalFeedbackModal
          proposalId={feedbackProposal.id}
          proposalTitle={feedbackProposal.title}
          onClose={() => setFeedbackProposal(null)}
          onSeen={handleFeedbackSeen}
        />
      ) : null}
    </>
  );
}
