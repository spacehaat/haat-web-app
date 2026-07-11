import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Search, MapPin, ChevronDown, Moon, Sun, X } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { filterListingsScope, proposalMatchesSearch } from '../../utils/helpers.js';
import { canSeeScreen } from '../../utils/access.js';
import { pathToScreen } from '../../routes.js';

const SCREEN_LABELS = {
  dashboard: { title: 'Command Center', pill: 'Live' },
  inbox:     { title: 'Inventory Inbox', pill: 'AI Review' },
  browser:   { title: 'Inventory Browser', pill: null },
  match:     { title: 'Smart Match', pill: 'AI' },
  proposal:  { title: 'Proposal Builder', pill: null },
  proposals: { title: 'Proposals', pill: null },
  leads:     { title: 'Leads', pill: 'CRM' },
  freshness: { title: 'Freshness', pill: null },
  users:     { title: 'Users & Access', pill: 'Admin' },
};

const SEARCH_LIMIT = 8;

export default function Topbar() {
  const location = useLocation();
  const screen = pathToScreen(location.pathname);

  const {
    theme, toggleTheme,
    cityFilter, cities, setCityFilter,
    searchQuery, setSearchQuery,
    listings, proposals, authUser,
    openListing, go, toast,
  } = useApp();

  const cfg = SCREEN_LABELS[screen] || { title: '—', pill: null };
  const cityOptions = cities?.length ? cities : ['All cities'];
  const [focused, setFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const searchWrapRef = useRef(null);

  const listingHits = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterListingsScope(listings, { cityFilter, searchQuery })
      .slice(0, SEARCH_LIMIT);
  }, [listings, cityFilter, searchQuery]);

  const proposalHits = useMemo(() => {
    if (!searchQuery.trim() || !canSeeScreen(authUser, 'proposals')) return [];
    return proposals.filter((p) => proposalMatchesSearch(p, searchQuery)).slice(0, 5);
  }, [proposals, searchQuery, authUser]);

  const showDropdown = focused && searchQuery.trim().length > 0
    && (listingHits.length > 0 || proposalHits.length > 0);

  useLayoutEffect(() => {
    if (!showDropdown || !searchWrapRef.current) {
      setDropdownStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const rect = searchWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDropdownStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showDropdown, searchQuery, listingHits.length, proposalHits.length]);

  useEffect(() => {
    const onDoc = (e) => {
      const target = e.target;
      if (searchWrapRef.current?.contains(target)) return;
      if (target.closest?.('.search-dropdown-portal')) return;
      setFocused(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pickListing = (l) => {
    setFocused(false);
    if (canSeeScreen(authUser, 'browser')) {
      openListing(l.id);
    } else {
      toast('You don’t have access to inventory', 'info');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setFocused(false);
      e.currentTarget.blur();
    }
    if (e.key === 'Enter' && searchQuery.trim()) {
      setFocused(false);
      if (canSeeScreen(authUser, 'browser')) go('browser');
      else if (canSeeScreen(authUser, 'proposals')) go('proposals');
    }
  };

  return (
    <header className="topbar">
      <div className="crumb">
        <span>{cfg.title}</span>
        {cfg.pill && <span className="pill">{cfg.pill}</span>}
      </div>

      <div className="search" ref={searchWrapRef}>
        <Search />
        <input
          type="search"
          placeholder="Search listings, operators, clients…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          aria-label="Search listings, operators, and clients"
          autoComplete="off"
        />
        {searchQuery ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => { setSearchQuery(''); setFocused(false); }}
            aria-label="Clear search"
          >
            <X />
          </button>
        ) : null}
      </div>

      {showDropdown && dropdownStyle && createPortal(
        <div className="search-dropdown search-dropdown-portal" style={dropdownStyle}>
          {listingHits.length > 0 && (
            <>
              <div className="search-dd-label">Listings</div>
              {listingHits.map((l) => (
                <button
                  type="button"
                  key={l.id}
                  className="search-dd-item"
                  onClick={() => pickListing(l)}
                >
                  <span className="search-dd-main">{l.operator} · {l.micro}</span>
                  <span className="search-dd-sub">{l.type} · {l.city}</span>
                </button>
              ))}
            </>
          )}
          {proposalHits.length > 0 && (
            <>
              <div className="search-dd-label">Proposals</div>
              {proposalHits.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="search-dd-item"
                  onClick={() => { setFocused(false); go('proposals'); }}
                >
                  <span className="search-dd-main">{p.title}</span>
                  <span className="search-dd-sub">{p.client?.company || p.client?.name || 'No client'}</span>
                </button>
              ))}
            </>
          )}
        </div>,
        document.body,
      )}

      <label className="control city-select-wrap">
        <MapPin />
        <select
          className="city-select"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          aria-label="Filter by city"
        >
          {cityOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <ChevronDown className="city-chevron" aria-hidden />
      </label>

      <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
        {theme === 'light' ? <Moon /> : <Sun />}
      </button>
    </header>
  );
}
