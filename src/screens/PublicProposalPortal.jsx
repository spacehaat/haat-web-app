import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarCheck, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Download,
  Expand, Heart, Loader2, MapPin, MessageCircle, Send, X, XCircle,
} from 'lucide-react';
import { apiGetPublicProposal, apiUpdatePublicProposal, apiBaseUrl } from '../utils/api.js';
import { inr } from '../utils/helpers.js';
import './PublicProposalPortal.css';

function pdfUrlForToken(token) {
  return `${apiBaseUrl}/api/v1/public/proposals/${encodeURIComponent(token)}/pdf`;
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'SH';
}

function statusFor(feedback, listingId) {
  const hit = (feedback?.interactions || []).find((x) => x.listingId === listingId);
  if (!hit?.status || hit.status === 'none') return 'pending';
  return hit.status;
}

function listingPhotos(listing) {
  const imgs = listing.images?.length ? listing.images : [];
  if (!imgs.length) return [{ src: '', label: listing.type || 'Workspace' }];
  return imgs.map((src, i) => ({
    src,
    label: i === 0 ? (listing.type || 'Main view') : `Photo ${i + 1}`,
  }));
}

function priceRangeLabel(listings) {
  const prices = listings.map((l) => l.price).filter(Boolean);
  if (!prices.length) return '—';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return inr(min);
  return `₹${Math.round(min / 1000)}k–${Math.round(max / 1000)}k`;
}

function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className={`toast show`}>
      <CheckCircle2 className="i" />
      {message}
    </div>
  );
}

function GalleryCarousel({ listing, slide, onSlide, onExpand }) {
  const photos = listingPhotos(listing);
  const count = photos.length;
  const current = photos[slide] || photos[0];

  const go = (dir) => {
    onSlide((slide + dir + count) % count);
  };

  return (
    <div className="sc-gallery">
      <div className="sc-slides" style={{ transform: `translateX(${-slide * 100}%)` }}>
        {photos.map((p) => (
          <img
            key={p.src + p.label}
            src={p.src}
            alt={p.label}
            loading="lazy"
            onClick={() => onExpand(slide)}
          />
        ))}
      </div>
      <div className="sc-count">{slide + 1} / {count}</div>
      {count > 1 ? (
        <>
          <button type="button" className="sc-nav prev" aria-label="Previous photo" onClick={() => go(-1)}>
            <ChevronLeft className="i" />
          </button>
          <button type="button" className="sc-nav next" aria-label="Next photo" onClick={() => go(1)}>
            <ChevronRight className="i" />
          </button>
        </>
      ) : null}
      <button type="button" className="sc-expand" aria-label="View full size" onClick={() => onExpand(slide)}>
        <Expand className="i" />
      </button>
      <div className="sc-cap">
        <span className="type-pill">{listing.type}</span>
        <span className="photo-lab">{current?.label}</span>
      </div>
    </div>
  );
}

function Lightbox({ listing, index, onClose, onIndex }) {
  const photos = listingPhotos(listing);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, onClose, onIndex, photos.length]);

  useEffect(() => {
    const stage = document.getElementById('lbStage');
    if (!stage) return undefined;
    let x0 = null;
    const onStart = (e) => { x0 = e.touches[0].clientX; };
    const onEnd = (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) onIndex((index + (dx < 0 ? 1 : -1) + photos.length) % photos.length);
      x0 = null;
    };
    stage.addEventListener('touchstart', onStart, { passive: true });
    stage.addEventListener('touchend', onEnd);
    return () => {
      stage.removeEventListener('touchstart', onStart);
      stage.removeEventListener('touchend', onEnd);
    };
  }, [index, onIndex, photos.length]);

  return (
    <div className="lightbox show">
      <div className="lb-top">
        <div className="lb-title">
          {listing.operator}
          <span>{listing.micro}, {listing.city}</span>
        </div>
        <div className="lb-spacer" />
        <span className="lb-count">{index + 1} / {photos.length}</span>
        <button type="button" className="lb-close" aria-label="Close" onClick={onClose}>
          <X className="i" />
        </button>
      </div>
      <div className="lb-stage" id="lbStage">
        <button type="button" className="lb-nav prev" aria-label="Previous" onClick={() => onIndex((index - 1 + photos.length) % photos.length)}>
          <ChevronLeft className="i" />
        </button>
        <div className="lb-track" style={{ transform: `translateX(${-index * 100}%)` }}>
          {photos.map((p) => (
            <div key={p.src + p.label} className="lb-slide">
              <img src={p.src} alt={p.label} />
            </div>
          ))}
        </div>
        <button type="button" className="lb-nav next" aria-label="Next" onClick={() => onIndex((index + 1) % photos.length)}>
          <ChevronRight className="i" />
        </button>
      </div>
      <div className="lb-thumbs">
        {photos.map((p, i) => (
          <img
            key={p.src + p.label}
            src={p.src}
            alt=""
            className={i === index ? 'on' : ''}
            onClick={() => onIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}

function VisitModal({ shortlisted, advisor, onClose, onSubmit, busy }) {
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const preferredDates = [date1, date2].filter(Boolean);
    if (!preferredDates.length) return;
    await onSubmit({ preferredDates, visitNote: note });
    setSent(true);
  };

  if (sent) {
    return (
      <div className="modal-bg show" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
        <div className="modal">
          <div className="modal-body">
            <div className="sent-ok">
              <div className="sent-ring"><Check style={{ width: 26, height: 26 }} /></div>
              <h3>Visit request sent</h3>
              <p>{advisor} will confirm your slot shortly — check your email or WhatsApp.</p>
              <button type="button" className="btn primary" style={{ marginTop: 18 }} onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-bg show" onClick={(e) => e.target.classList.contains('modal-bg') && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3>Request a visit</h3>
            <p>We&apos;ll confirm a slot within a few hours</p>
          </div>
          <button type="button" className="x" onClick={onClose}><X className="i" /></button>
        </div>
        <div className="modal-body">
          <div className="visit-list">
            {shortlisted.map((s) => (
              <div key={s.id} className="visit-row">
                <img src={s.images?.[0]} alt="" />
                <div>
                  <b>{s.operator}</b><br />
                  <span>{s.micro}, {s.city}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="field">
            <label>Preferred dates</label>
            <div className="date-row">
              <input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} />
              <input type="date" value={date2} onChange={(e) => setDate2(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Anything we should know?</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Prefer mornings, team of 4 visiting" />
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
          <button type="button" className="btn primary" style={{ flex: 1, justifyContent: 'center' }} onClick={submit} disabled={busy}>
            <CalendarCheck className="i" /> Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function SpaceCard({
  listing, status, comments, panelOpen, slide, saving,
  onSlide, onExpand, onLike, onReject, onTogglePanel, onSendComment, commentDraft, onCommentDraft,
}) {
  const metro = listing.nearestMetro || '—';
  const carpet = listing.carpet ? `${listing.carpet.toLocaleString('en-IN')} sqft` : '—';

  return (
    <article className={`space-card ${status === 'shortlisted' ? 'shortlisted' : ''}`}>
      {status === 'shortlisted' ? (
        <div className="sc-ribbon"><Heart className="i" /> Shortlisted by you</div>
      ) : null}
      <GalleryCarousel listing={listing} slide={slide} onSlide={onSlide} onExpand={onExpand} />
      <div className="sc-body">
        <div className="sc-top">
          <div className="sc-title">
            <h3>{listing.operator}</h3>
            <div className="sc-loc"><MapPin className="i" /> {listing.micro}, {listing.city}</div>
          </div>
          <div className="sc-price">
            <b className="tnum">{inr(listing.price)}</b>
            <span>per seat / month</span>
          </div>
        </div>
        <div className="sc-specs">
          <div className="ssp"><span>Seats</span><b className="tnum">{listing.seats || '—'}</b></div>
          <div className="ssp"><span>Carpet area</span><b className="tnum">{carpet}</b></div>
          <div className="ssp"><span>Availability</span><b>{listing.avail || 'Available now'}</b></div>
          <div className="ssp"><span>Nearest metro</span><b>{metro}</b></div>
        </div>
        {listing.amenities?.length ? (
          <div className="sc-amen">
            {listing.amenities.map((a) => (
              <span key={a} className="amen-chip"><Check className="i" />{a}</span>
            ))}
          </div>
        ) : null}
        <div className="sc-actions">
          <button
            type="button"
            className={`act-btn like ${status === 'shortlisted' ? 'on' : ''}`}
            onClick={onLike}
            disabled={!!saving}
          >
            <Heart className="i" />
            <span className="lab">{status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}</span>
          </button>
          <button type="button" className="act-btn reject" onClick={onReject} disabled={!!saving}>
            <X className="i" />
            <span className="lab">Not for me</span>
          </button>
          <button type="button" className="act-btn comment" onClick={onTogglePanel}>
            <MessageCircle className="i" />
            <span className="lab">Comment</span>
          </button>
          <div className="act-spacer" />
          <span className="comment-count">
            {comments.length ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : ''}
          </span>
        </div>
        <div className={`sc-comment-panel ${panelOpen ? 'open' : ''}`}>
          <div className="cmt-box">
            <textarea
              placeholder="Ask a question or leave a note about this space…"
              value={commentDraft}
              onChange={(e) => onCommentDraft(e.target.value)}
            />
            <button type="button" className="btn primary" style={{ alignSelf: 'flex-end' }} onClick={onSendComment} disabled={!!saving}>
              <Send className="i" />
            </button>
          </div>
          {comments.length ? (
            <div className="cmt-list">
              {comments.map((c, i) => (
                <div key={`${c.createdAt}-${i}`} className="cmt-item">
                  <div className="cmt-av">Y</div>
                  <div className="body">
                    <span className="who">You</span>
                    <span className="when">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Just now'}
                    </span>
                    <div>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RejectedRow({ listing, onUndo }) {
  return (
    <div className="rej-strip">
      <img src={listing.images?.[0]} alt="" />
      <div className="info">
        <b>{listing.operator}</b>
        <span>{listing.micro}, {listing.city} · {inr(listing.price)}/seat</span>
      </div>
      <button type="button" className="undo-link" onClick={onUndo}>Undo</button>
    </div>
  );
}

export default function PublicProposalPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [slideById, setSlideById] = useState({});
  const [panelOpenById, setPanelOpenById] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [overallDraft, setOverallDraft] = useState('');
  const [overallSent, setOverallSent] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await apiGetPublicProposal(token);
        if (alive) setData(result);
      } catch (e) {
        if (alive) setError(e?.message || 'This proposal link is not available.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const feedback = data?.feedback || {};
  const proposal = data?.proposal;
  const listings = data?.listings || [];
  const advisor = proposal?.sentBy || 'Spacehaat';
  const clientName = proposal?.client?.company || proposal?.client?.name || 'you';

  const buckets = useMemo(() => {
    const out = { shortlisted: [], pending: [], rejected: [] };
    listings.forEach((l) => {
      const st = statusFor(feedback, l.id);
      out[st === 'shortlisted' ? 'shortlisted' : st === 'rejected' ? 'rejected' : 'pending'].push(l);
    });
    return out;
  }, [feedback, listings]);

  const totalSeats = useMemo(() => listings.reduce((a, l) => a + (l.seats || 0), 0), [listings]);

  const updateFeedback = useCallback(async (payload, successMsg) => {
    setSaving(payload.listingId || 'overall');
    try {
      const result = await apiUpdatePublicProposal(token, payload);
      setData((prev) => ({ ...prev, feedback: result.feedback }));
      if (successMsg) setToast(successMsg);
      return result;
    } catch (e) {
      setToast(e?.message || 'Could not save your update.');
      throw e;
    } finally {
      setSaving('');
    }
  }, [token]);

  const toggleLike = (listingId) => {
    const current = statusFor(feedback, listingId);
    const next = current === 'shortlisted' ? 'none' : 'shortlisted';
    updateFeedback(
      { listingId, status: next },
      next === 'shortlisted' ? 'Added to your shortlist' : 'Removed from shortlist',
    );
  };

  const rejectListing = (listingId) => {
    updateFeedback({ listingId, status: 'rejected' }, 'Moved to "Not interested" — you can undo anytime');
  };

  const undoReject = (listingId) => {
    updateFeedback({ listingId, status: 'none' }, '');
  };

  const sendComment = (listingId) => {
    const text = (commentDrafts[listingId] || '').trim();
    if (!text) return;
    updateFeedback({ listingId, comment: text }, 'Comment sent').then(() => {
      setCommentDrafts((prev) => ({ ...prev, [listingId]: '' }));
      setPanelOpenById((prev) => ({ ...prev, [listingId]: true }));
    });
  };

  const sendOverall = () => {
    const text = overallDraft.trim();
    if (!text) return;
    updateFeedback({ comment: text }, 'Feedback sent').then(() => {
      setOverallDraft('');
      setOverallSent(true);
    });
  };

  const submitVisit = async ({ preferredDates, visitNote }) => {
    for (const listing of buckets.shortlisted) {
      await updateFeedback({ listingId: listing.id, preferredDates, visitNote }, '');
    }
    setToast('Visit request sent');
  };

  if (loading) {
    return (
      <div className="public-portal">
        <div className="portal-loading"><Loader2 className="spin" /> Loading proposal…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="public-portal">
        <div className="portal-error">
          <XCircle />
          <h1>Proposal link unavailable</h1>
          <p>{error || 'This proposal link is invalid or expired.'}</p>
        </div>
      </div>
    );
  }

  const expiryLabel = proposal.expiresAt
    ? new Date(proposal.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="public-portal">
      <header className="topbar">
        <div className="portal-container topbar-in">
          <div className="brand">
            <div className="brand-mark"><img src="/icon.png" alt="Spacehaat" /></div>
            <div>
              <div className="brand-name">Spacehaat</div>
              <div className="brand-sub">Workspace Proposal</div>
            </div>
          </div>
          <div className="tb-spacer" />
          {expiryLabel ? (
            <div className="expiry-note"><Clock className="i" /> Link valid until {expiryLabel}</div>
          ) : null}
          <a className="btn" href={pdfUrlForToken(token)} target="_blank" rel="noopener noreferrer">
            <Download className="i" /> Download PDF
          </a>
        </div>
      </header>

      <section className="hero">
        <div className="portal-container">
        <div className="hero-kicker"><span className="dot" /> Live proposal · updated in real time</div>
        <h1>
          A shortlist of spaces,<br />
          picked for <em>{clientName}</em>
        </h1>
        <p>{proposal.coverNote || `Review the curated workspace options below and share your feedback with ${advisor}.`}</p>
        <div className="hero-meta">
          <div className="hm">
            <div className="hm-av">{initials(advisor)}</div>
            <div><b>{advisor}</b><span>Your workspace advisor</span></div>
          </div>
          <div className="hm stat"><div><b className="tnum">{listings.length}</b><span>Spaces</span></div></div>
          <div className="hm stat"><div><b className="tnum">{totalSeats}</b><span>Total seats</span></div></div>
          <div className="hm stat"><div><b className="tnum">{priceRangeLabel(listings)}</b><span>Per seat / mo</span></div></div>
        </div>
        </div>
      </section>

      <main className="wrap">
        <div className="portal-container">
        <div className="sec-lab">
          <h2>Shortlisted</h2>
          <span className="cnt">{buckets.shortlisted.length}</span>
          <div className="line" />
        </div>
        <div>
          {buckets.shortlisted.length
            ? buckets.shortlisted.map((listing) => (
              <SpaceCard
                key={listing.id}
                listing={listing}
                status="shortlisted"
                comments={(feedback.comments || []).filter((c) => c.listingId === listing.id)}
                panelOpen={!!panelOpenById[listing.id]}
                slide={slideById[listing.id] || 0}
                saving={saving === listing.id}
                onSlide={(next) => setSlideById((prev) => {
                  const cur = prev[listing.id] || 0;
                  return { ...prev, [listing.id]: typeof next === 'function' ? next(cur) : next };
                })}
                onExpand={(idx) => setLightbox({ listingId: listing.id, index: idx })}
                onLike={() => toggleLike(listing.id)}
                onReject={() => rejectListing(listing.id)}
                onTogglePanel={() => setPanelOpenById((prev) => ({ ...prev, [listing.id]: !prev[listing.id] }))}
                onSendComment={() => sendComment(listing.id)}
                commentDraft={commentDrafts[listing.id] || ''}
                onCommentDraft={(v) => setCommentDrafts((prev) => ({ ...prev, [listing.id]: v }))}
              />
            ))
            : <p style={{ fontSize: 13, color: 'var(--faint)', padding: '6px 2px 4px' }}>Nothing shortlisted yet — tap the heart on any space below.</p>}
        </div>

        <div className="sec-lab">
          <h2>For your review</h2>
          <span className="cnt">{buckets.pending.length}</span>
          <div className="line" />
        </div>
        <div>
          {buckets.pending.length
            ? buckets.pending.map((listing) => (
              <SpaceCard
                key={listing.id}
                listing={listing}
                status="pending"
                comments={(feedback.comments || []).filter((c) => c.listingId === listing.id)}
                panelOpen={!!panelOpenById[listing.id]}
                slide={slideById[listing.id] || 0}
                saving={saving === listing.id}
                onSlide={(next) => setSlideById((prev) => {
                  const cur = prev[listing.id] || 0;
                  return { ...prev, [listing.id]: typeof next === 'function' ? next(cur) : next };
                })}
                onExpand={(idx) => setLightbox({ listingId: listing.id, index: idx })}
                onLike={() => toggleLike(listing.id)}
                onReject={() => rejectListing(listing.id)}
                onTogglePanel={() => setPanelOpenById((prev) => ({ ...prev, [listing.id]: !prev[listing.id] }))}
                onSendComment={() => sendComment(listing.id)}
                commentDraft={commentDrafts[listing.id] || ''}
                onCommentDraft={(v) => setCommentDrafts((prev) => ({ ...prev, [listing.id]: v }))}
              />
            ))
            : <p style={{ fontSize: 13, color: 'var(--faint)' }}>You&apos;ve reviewed everything — nice!</p>}
        </div>

        {buckets.rejected.length ? (
          <>
            <div className="sec-lab">
              <h2>Not interested</h2>
              <span className="cnt">{buckets.rejected.length}</span>
              <div className="line" />
            </div>
            <div>
              {buckets.rejected.map((listing) => (
                <RejectedRow key={listing.id} listing={listing} onUndo={() => undoReject(listing.id)} />
              ))}
            </div>
          </>
        ) : null}

        <div className="sec-lab"><h2>Overall feedback</h2><div className="line" /></div>
        <div className="feedback-card">
          <h3>Anything else on your mind?</h3>
          <p className="sub">General notes about the shortlist, budget, timeline — goes straight to {advisor}.</p>
          <textarea
            value={overallDraft}
            onChange={(e) => setOverallDraft(e.target.value)}
            placeholder={`e.g. Loving the options — could we also see something closer to another area?`}
          />
          <div className="feedback-foot">
            <button type="button" className="btn primary" onClick={sendOverall} disabled={saving === 'overall'}>
              <Send className="i" /> Send feedback
            </button>
            <div className={`feedback-sent ${overallSent ? 'show' : ''}`} style={{ marginLeft: 14 }}>
              <CheckCircle2 className="i" /> Sent to {advisor}
            </div>
          </div>
        </div>
        </div>
      </main>

      <footer className="pfoot">
        <div className="portal-container pfoot-in">
          <div className="who">
            <div className="hm-av">{initials(advisor)}</div>
            <div><b>{advisor}</b><span>Workspace Advisor · Spacehaat</span></div>
          </div>
        </div>
      </footer>

      <div className={`portal-sticky-bar ${buckets.shortlisted.length ? 'show' : ''}`}>
        <div className="sb-inner">
          <span className="sb-txt"><b>{buckets.shortlisted.length}</b> shortlisted</span>
          <button type="button" className="btn primary" onClick={() => setVisitOpen(true)}>
            <CalendarCheck className="i" /> Request a visit
          </button>
        </div>
      </div>

      {visitOpen ? (
        <VisitModal
          shortlisted={buckets.shortlisted}
          advisor={advisor}
          onClose={() => setVisitOpen(false)}
          onSubmit={submitVisit}
          busy={!!saving}
        />
      ) : null}

      {lightbox ? (
        <Lightbox
          listing={listings.find((l) => l.id === lightbox.listingId)}
          index={lightbox.index}
          onClose={() => {
            setSlideById((prev) => ({ ...prev, [lightbox.listingId]: lightbox.index }));
            setLightbox(null);
          }}
          onIndex={(idx) => setLightbox((lb) => {
            const listing = listings.find((l) => l.id === lb.listingId);
            const count = listingPhotos(listing).length;
            const next = typeof idx === 'function' ? idx(lb.index) : idx;
            return { ...lb, index: ((next % count) + count) % count };
          })}
        />
      ) : null}

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
