import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, LayoutGrid, List, SearchX, Pencil, Eye, Check, X, SlidersHorizontal, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext.jsx';
import FreshBadge from '../components/ui/FreshBadge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { inr, coverImg } from '../utils/helpers.js';
import { profileOf } from '../data/schema.js';
import { BUILDING_TYPES, SPACE_TYPES, AMEN } from '../data/db.js';
import { apiGetListing, apiListListings } from '../utils/api.js';
import { isAdmin } from '../utils/access.js';
import InventoryWizard from '../components/InventoryWizard.jsx';
import GalleryModal from '../components/GalleryModal.jsx';
import ListingDetailModal from '../components/ListingDetailModal.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';

const INITIAL_FILTER = {
  type: 'All',
  fresh: 'All',
  maxPrice: 16000,
  minSeats: 0,
  amenities: [],
  buildingType: 'All',
  virtualOffice: false,
  managedOffice: false,
  hotDesk: false,
  vastu: false,
};

const MIN_SEAT_TIERS = [0, 10, 25, 50];
const PAGE_SIZE = 20;

function normalizeListing(l) {
  return { ...l, id: l._id || l.id, days: l.fresh?.days ?? 0 };
}

function buildApiFilters(bFilter, cityFilter, search, page) {
  return {
    city: cityFilter,
    type: bFilter.type,
    fresh: bFilter.fresh === 'All' ? undefined : bFilter.fresh,
    minSeats: bFilter.minSeats || undefined,
    maxPrice: bFilter.maxPrice,
    amenities: bFilter.amenities.length ? bFilter.amenities : undefined,
    buildingType: bFilter.buildingType,
    virtualOffice: bFilter.virtualOffice || undefined,
    managedOffice: bFilter.managedOffice || undefined,
    hotDesk: bFilter.hotDesk || undefined,
    vastu: bFilter.vastu || undefined,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  };
}

export default function Browser() {
  const {
    cityFilter, searchQuery, authUser,
    proposalIds, addToProposal, removeFromProposal, requestUpdate, saveListing, deleteListing, refreshListings, toast,
  } = useApp();
  const admin = isAdmin(authUser);

  const [searchParams, setSearchParams] = useSearchParams();

  const [bFilter, setBFilter] = useState(INITIAL_FILTER);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [view, setView] = useState('table');
  const [detail, setDetail] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [galleryListing, setGalleryListing] = useState(null);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => { setPage(1); }, [bFilter, cityFilter, debouncedSearch]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiListListings(buildApiFilters(bFilter, cityFilter, debouncedSearch, page));
      setItems((data.items || []).map(normalizeListing));
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
      setInitialLoaded(true);
    } catch (e) {
      toast(e?.message || 'Failed to load listings', 'info');
    } finally {
      setLoading(false);
    }
  }, [bFilter, cityFilter, debouncedSearch, page, toast]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (!listingId) return;
    const local = items.find((x) => x.id === listingId);
    if (local) {
      setDetail(local);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const item = await apiGetListing(listingId);
        if (!cancelled && item) setDetail(normalizeListing(item));
      } catch {
        if (!cancelled) toast('Listing not found', 'info');
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, items, toast]);

  const closeDetail = useCallback(() => {
    setDetail(null);
    if (searchParams.has('listing')) {
      const next = new URLSearchParams(searchParams);
      next.delete('listing');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  const activeFilterCount =
    (bFilter.type !== 'All' ? 1 : 0) +
    (bFilter.fresh !== 'All' ? 1 : 0) +
    (bFilter.minSeats !== 0 ? 1 : 0) +
    (bFilter.maxPrice !== INITIAL_FILTER.maxPrice ? 1 : 0) +
    (bFilter.buildingType !== 'All' ? 1 : 0) +
    bFilter.amenities.length +
    (bFilter.hotDesk ? 1 : 0) +
    (bFilter.managedOffice ? 1 : 0) +
    (bFilter.virtualOffice ? 1 : 0) +
    (bFilter.vastu ? 1 : 0);

  const setSingleFilter = (key, value) => setBFilter((prev) => ({ ...prev, [key]: value }));
  const toggleAmenity = (amenity) => {
    setBFilter((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((x) => x !== amenity)
        : [...prev.amenities, amenity],
    }));
  };
  const toggleFlag = (flag) => setBFilter((prev) => ({ ...prev, [flag]: !prev[flag] }));

  const syncListingInView = useCallback((saved) => {
    if (!saved) return;
    const normalized = normalizeListing(saved);
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === normalized.id);
      if (idx === -1) return [normalized, ...prev];
      const next = [...prev];
      next[idx] = normalized;
      return next;
    });
    setDetail((d) => (d && d.id === normalized.id ? normalized : d));
    setGalleryListing((g) => (g && g.id === normalized.id ? normalized : g));
    setEditListing((e) => (e && e.id === normalized.id ? normalized : e));
  }, []);

  const handleSaveListing = async (listing, editId) => {
    const saved = await saveListing(listing, editId);
    syncListingInView(saved);
    await Promise.all([fetchPage(), refreshListings()]);
    return saved;
  };

  const handleGallerySaved = async (saved) => {
    syncListingInView(saved);
    await Promise.all([fetchPage(), refreshListings()]);
  };

  const handleRequestUpdate = async (listingId) => {
    await requestUpdate(listingId);
    await Promise.all([fetchPage(), refreshListings()]);
  };

  const handleDeleteListing = (listing) => {
    setDeleteTarget(listing);
  };

  const confirmDeleteListing = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteListing(deleteTarget.id);
      setDetail((d) => (d && d.id === deleteTarget.id ? null : d));
      setGalleryListing((g) => (g && g.id === deleteTarget.id ? null : g));
      setDeleteTarget(null);
      await fetchPage();
    } catch {
      // toast already shown
    } finally {
      setDeleting(false);
    }
  };

  const filterGroups = (
    <>
      <div className="filt-grp">
        <div className="filt-lab">Space type</div>
        <div className="filt-opts">
          {['All', ...SPACE_TYPES].map((t) => (
            <button key={t} className={`filt-opt ${bFilter.type === t ? 'on' : ''}`} onClick={() => setSingleFilter('type', t)}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="filt-grp">
        <div className="filt-lab">Freshness</div>
        <div className="filt-opts">
          {[
            ['All', 'All'],
            ['fresh', 'Fresh'],
            ['stale', 'Stale'],
            ['expired', 'Expired'],
          ].map(([v, label]) => (
            <button
              key={v}
              className={`filt-opt ${bFilter.fresh === v ? 'on' : ''}`}
              onClick={() => setSingleFilter('fresh', v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="filt-grp">
        <div className="filt-lab">Min. seats available</div>
        <div className="filt-opts">
          {MIN_SEAT_TIERS.map((s) => (
            <button
              key={s}
              className={`filt-opt ${bFilter.minSeats === s ? 'on' : ''}`}
              onClick={() => setSingleFilter('minSeats', s)}
            >
              {s === 0 ? 'Any' : `${s}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="filt-grp">
        <div className="filt-lab">
          <span>Max price / seat</span>
          <b className="tnum">{inr(bFilter.maxPrice)}</b>
        </div>
        <input
          type="range"
          min="4000"
          max="16000"
          step="500"
          className="range"
          value={bFilter.maxPrice}
          onChange={(e) => setSingleFilter('maxPrice', Number(e.target.value))}
        />
      </div>

      <div className="filt-grp">
        <div className="filt-lab">Building type</div>
        <div className="filt-opts">
          {['All', ...BUILDING_TYPES].map((t) => (
            <button
              key={t}
              className={`filt-opt ${bFilter.buildingType === t ? 'on' : ''}`}
              onClick={() => setSingleFilter('buildingType', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="filt-grp">
        <div className="filt-lab">Availability &amp; compliance</div>
        <div className="amen-wrap">
          <button className={`amen-chip ${bFilter.hotDesk ? 'on' : ''}`} onClick={() => toggleFlag('hotDesk')}>Hot desk available</button>
          <button className={`amen-chip ${bFilter.managedOffice ? 'on' : ''}`} onClick={() => toggleFlag('managedOffice')}>Managed office</button>
          <button className={`amen-chip ${bFilter.virtualOffice ? 'on' : ''}`} onClick={() => toggleFlag('virtualOffice')}>Virtual office</button>
          <button className={`amen-chip ${bFilter.vastu ? 'on' : ''}`} onClick={() => toggleFlag('vastu')}>Vastu compliant</button>
        </div>
      </div>

      <div className="filt-grp">
        <div className="filt-lab">Amenities</div>
        <div className="amen-wrap">
          {AMEN.map((a) => (
            <button key={a} className={`amen-chip ${bFilter.amenities.includes(a) ? 'on' : ''}`} onClick={() => toggleAmenity(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  const showEmpty = initialLoaded && !loading && total === 0;

  return (
    <div className="browser-screen">
      <div className="page-head">
        <div className="row">
          <div>
            <h1>Inventory Browser</h1>
            <p>Every published listing — filter, scan freshness, add to a proposal.</p>
          </div>
          <div className="spacer" />
          <button className="btn filters-btn" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal /> Filters
            {activeFilterCount > 0 ? <span className="filt-count">{activeFilterCount}</span> : null}
          </button>
          <button className="btn primary" onClick={() => { setEditListing(null); setWizardOpen(true); }}>
            <Plus /> Add inventory
          </button>
          <div className="seg">
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}>
              <LayoutGrid />
            </button>
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
              <List />
            </button>
          </div>
        </div>
      </div>

      <div className="browse-wrap">
        <aside className="filters card">
          <div className="filt-head">
            <span>Filters</span>
            <button className="btn ghost sm" onClick={() => setBFilter(INITIAL_FILTER)}>Clear</button>
          </div>
          {filterGroups}
        </aside>

        <div className="browse-main">
          <div className="browse-count">
            <b className="tnum">{total}</b> listing{total !== 1 ? 's' : ''}{' '}
            {cityFilter !== 'All cities' ? `in ${cityFilter}` : 'across all cities'}
            {debouncedSearch ? <> matching <b>&ldquo;{debouncedSearch}&rdquo;</b></> : null}
            <span className="dot-sep">·</span> sorted by freshness
            {loading ? <span className="dot-sep">·</span> : null}
            {loading ? <Loader2 className="spin" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /> : null}
          </div>

          {showEmpty ? (
            <div className="card empty">
              <SearchX />
              <div>No listings match these filters. Try widening price or freshness.</div>
            </div>
          ) : view === 'table' ? (
            <div className="card inv-tbl-wrap">
              <table className="tbl inv-tbl">
                <thead>
                  <tr>
                    <th>Space</th>
                    <th>Type</th>
                    <th className="num">Seats</th>
                    <th className="num">Price / seat</th>
                    <th>Building</th>
                    <th>Freshness</th>
                    <th className="act-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => {
                    const inProposal = proposalIds.includes(l.id);
                    const p = profileOf(l);
                    return (
                      <tr key={l.id} onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="tbl-space">
                            <img className="tbl-thumb" src={coverImg(l)} alt={`${l.operator} ${l.micro}`} loading="lazy" />
                            <div className="tbl-space-meta">
                              <div className="tbl-op">
                                {l.operator}
                                {l.source === 'manual' ? <span className="manual-badge sm"><Pencil /> Manual</span> : null}
                              </div>
                              <div className="tbl-loc">{l.micro}, {l.city}</div>
                            </div>
                          </div>
                        </td>
                        <td>{l.type}</td>
                        <td className="num tnum">{l.seats}</td>
                        <td className="num tnum">{inr(l.price)}</td>
                        <td>{p.identity.buildingType || '—'}</td>
                        <td><FreshBadge fresh={l.fresh} /></td>
                        <td className="act-col">
                          <div className="tbl-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="btn sm" title="Edit listing" onClick={() => { setEditListing(l); setWizardOpen(true); }}>
                              <Pencil />
                            </button>
                            <button className="btn sm" onClick={() => setDetail(l)}>
                              <Eye /> Details
                            </button>
                            {admin ? (
                              <button
                                className="btn sm danger"
                                title="Delete listing"
                                onClick={() => handleDeleteListing(l)}
                              >
                                <Trash2 />
                              </button>
                            ) : null}
                            {inProposal ? (
                              <button
                                className="btn sm danger"
                                onClick={() => { removeFromProposal(l.id); toast('Removed from proposal', 'x'); }}
                              >
                                <X /> Remove
                              </button>
                            ) : (
                              <button className="btn sm primary" onClick={() => addToProposal(l.id)}>
                                <Plus /> Add
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid-cards">
              {items.map((l) => {
                const inProposal = proposalIds.includes(l.id);
                return (
                  <div key={l.id} className="lst-card" onClick={() => setDetail(l)}>
                    <div className="lst-thumb-wrap">
                      <img className="lst-thumb" src={coverImg(l)} alt={`${l.operator} ${l.micro}`} loading="lazy" />
                      <div className="lst-thumb-top">
                        {l.source === 'manual' ? <span className="manual-badge"><Pencil /> Manual</span> : null}
                        <button
                          className="thumb-edit"
                          title="Edit listing"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditListing(l);
                            setWizardOpen(true);
                          }}
                        >
                          <Pencil />
                        </button>
                      </div>
                    </div>
                    <div className="lst-body">
                      <div className="lst-head">
                        <div className="lst-op" title={l.operator}>{l.operator}</div>
                        <div className="lst-sub">
                          <span className="lst-loc">{l.micro}, {l.city}</span>
                          <FreshBadge fresh={l.fresh} />
                        </div>
                      </div>

                      <div className="lst-stats">
                        <div className="stat">
                          <span className="s-num tnum">{l.seats}</span>
                          <span className="s-lab">Seats</span>
                        </div>
                        <div className="stat">
                          <span className="s-num tnum">{inr(l.price)}</span>
                          <span className="s-lab">Per seat/mo</span>
                        </div>
                        <div className="stat">
                          <span className="s-num">{l.type.split(' ')[0]}</span>
                          <span className="s-lab">{l.type.split(' ').slice(1).join(' ') || 'Space'}</span>
                        </div>
                      </div>

                      {l.amenities.length > 0 && (
                        <div className="lst-amen">
                          {l.amenities.slice(0, 3).map((a) => <span key={a} className="chip sm">{a}</span>)}
                          {l.amenities.length > 3 ? <span className="chip sm muted">+{l.amenities.length - 3}</span> : null}
                        </div>
                      )}

                      <div className="lst-actions">
                        <button className="btn sm" onClick={(e) => { e.stopPropagation(); setDetail(l); }}>
                          <Eye /> Details
                        </button>
                        {inProposal ? (
                          <>
                            <button className="btn sm success" disabled>
                              <Check /> Added
                            </button>
                            <button
                              className="btn sm danger icon"
                              title="Remove from proposal"
                              aria-label="Remove from proposal"
                              onClick={(e) => { e.stopPropagation(); removeFromProposal(l.id); toast('Removed from proposal', 'x'); }}
                            >
                              <X />
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn sm primary"
                            onClick={(e) => { e.stopPropagation(); addToProposal(l.id); }}
                          >
                            <Plus /> Add to proposal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
        </div>
      </div>

      <Modal
        show={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="modal-filters"
        footer={(
          <>
            <button className="btn ghost" onClick={() => setBFilter(INITIAL_FILTER)}>Clear all</button>
            <button className="btn primary" onClick={() => setFiltersOpen(false)}>
              Show {total} result{total !== 1 ? 's' : ''}
            </button>
          </>
        )}
      >
        {filterGroups}
      </Modal>

      {detail && !galleryListing && (
        <ListingDetailModal
          listing={detail}
          proposalAdded={proposalIds.includes(detail.id)}
          onClose={closeDetail}
          onEdit={(l) => { setEditListing(l); setWizardOpen(true); closeDetail(); }}
          onGallery={(l) => setGalleryListing(l)}
          onAddProposal={(id) => addToProposal(id)}
          onRemoveProposal={(id) => removeFromProposal(id)}
          onRequestUpdate={handleRequestUpdate}
          onDelete={admin ? handleDeleteListing : undefined}
        />
      )}

      {wizardOpen && (
        <InventoryWizard
          onSave={handleSaveListing}
          editListing={editListing}
          onClose={() => { setWizardOpen(false); setEditListing(null); }}
        />
      )}

      {galleryListing && (
        <GalleryModal
          listing={galleryListing}
          onClose={() => setGalleryListing(null)}
          onBack={() => setGalleryListing(null)}
          onListingUpdated={handleGallerySaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete listing"
        message={deleteTarget
          ? `Delete “${deleteTarget.operator} · ${deleteTarget.micro}”? This cannot be undone.`
          : ''}
        confirmLabel="Delete"
        busy={deleting}
        onCancel={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={confirmDeleteListing}
      />
    </div>
  );
}
