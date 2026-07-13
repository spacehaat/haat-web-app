import { createContext, useContext, useEffect, useMemo, useReducer, useCallback, useRef } from 'react';
import { DB, uid, freshOf } from '../data/db.js';
import {
  apiListListings,
  apiCreateListing,
  apiUpdateListing,
  apiVerifyListing,
  apiGetProposalDraft,
  apiUpdateProposalDraft,
  apiSendProposal,
  apiListProposals,
  apiGetProposal,
  apiLoadProposalToDraft,
  apiListActivity,
  apiLogin,
  apiLogout,
  apiGetMe,
  setUnauthorizedHandler,
} from '../utils/api.js';
import { navigateTo } from '../navigation.js';
import { screenToPath, browserListingPath } from '../routes.js';

// Cities available to a user: admins get the full picker, members only their
// assigned cities (backend enforces this regardless of the UI).
function citiesForUser(user) {
  if (!user || user.role === 'admin') return DB.cities;
  const list = (user.cities || []).filter(Boolean);
  if (!list.length) return ['All cities'];
  return list.length > 1 ? ['All cities', ...list] : list;
}

const AppContext = createContext(null);

const initialState = {
  authUser: null,
  authChecked: false,
  permissionCatalog: [],
  theme: 'light',
  cities: DB.cities,
  cityFilter: 'All cities',
  searchQuery: '',
  proposalIds: [],
  proposalTitle: '',
  client: { name: '', company: '' },
  coverNote: '',
  coverNoteIdx: 0,
  listings: [],
  inbox: [],
  activity: [],
  proposals: [],
  editingProposalId: null,
  linkedLead: null,
  toasts: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'AUTH_USER':        return { ...state, authUser: action.user };
    case 'AUTH_CHECKED':     return { ...state, authChecked: true };
    case 'PERM_CATALOG':     return { ...state, permissionCatalog: action.catalog };
    case 'CITIES':           return { ...state, cities: action.cities };
    case 'RESET_WORKSPACE':  return {
      ...state,
      proposalIds: [], proposalTitle: '', client: { name: '', company: '' },
      coverNote: '', coverNoteIdx: 0, proposals: [],
      listings: [], inbox: [], activity: [],
      searchQuery: '', editingProposalId: null, linkedLead: null,
    };
    case 'THEME':            return { ...state, theme: action.theme };
    case 'CITY':             return { ...state, cityFilter: action.city };
    case 'SEARCH':           return { ...state, searchQuery: action.query };
    case 'PROPOSAL_IDS':     return { ...state, proposalIds: action.ids };
    case 'PROPOSAL_TITLE':   return { ...state, proposalTitle: action.title };
    case 'PROPOSALS':        return { ...state, proposals: action.proposals };
    case 'EDITING_PROPOSAL': return { ...state, editingProposalId: action.id };
    case 'LINKED_LEAD':      return { ...state, linkedLead: action.lead };
    case 'CLIENT':           return { ...state, client: action.client };
    case 'COVER_NOTE':       return { ...state, coverNote: action.text };
    case 'COVER_NOTE_IDX':   return { ...state, coverNoteIdx: action.idx };
    case 'LISTINGS':         return { ...state, listings: action.listings };
    case 'INBOX':            return { ...state, inbox: action.inbox };
    case 'ACTIVITY':         return { ...state, activity: action.activity };
    case 'ADD_TOAST':        return { ...state, toasts: [...state.toasts, action.toast] };
    case 'REMOVE_TOAST':     return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) };
    default:                 return state;
  }
}

function applyDraft(dispatch, draft) {
  if (!draft) return;
  dispatch({ type: 'PROPOSAL_IDS', ids: draft.listingIds || [] });
  dispatch({ type: 'PROPOSAL_TITLE', title: draft.title || '' });
  dispatch({ type: 'CLIENT', client: draft.client || { name: '', company: '' } });
  dispatch({ type: 'COVER_NOTE', text: draft.coverNote || '' });
  dispatch({ type: 'COVER_NOTE_IDX', idx: draft.coverNoteIdx ?? 0 });
  dispatch({
    type: 'LINKED_LEAD',
    lead: draft.leadId ? { id: draft.leadId, title: draft.leadTitle || '' } : null,
  });
}

function normalizeListing(l) {
  return { ...l, id: l._id || l.id, days: l.fresh?.days ?? 0 };
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const coverNoteTimer = useRef(null);
  const titleTimer = useRef(null);

  const go = useCallback((screen) => {
    navigateTo(screenToPath(screen));
  }, []);

  const setCityFilter = useCallback((city) => {
    dispatch({ type: 'CITY', city });
  }, []);

  const setSearchQuery = useCallback((query) => {
    dispatch({ type: 'SEARCH', query });
  }, []);

  const openListing = useCallback((id) => {
    navigateTo(browserListingPath(id));
  }, []);

  const toggleTheme = useCallback(() => {
    const next = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    dispatch({ type: 'THEME', theme: next });
  }, [state.theme]);

  const toast = useCallback((msg, icon = 'check-circle') => {
    const id = Date.now() + Math.random();
    dispatch({ type: 'ADD_TOAST', toast: { id, msg, icon } });
    setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id }), 2800);
  }, []);

  const refreshListings = useCallback(async () => {
    const data = await apiListListings();
    dispatch({
      type: 'LISTINGS',
      listings: (data.items || []).map(normalizeListing),
    });
  }, []);

  const refreshProposals = useCallback(async () => {
    try {
      const data = await apiListProposals({ page: 1, limit: 100 });
      dispatch({ type: 'PROPOSALS', proposals: data.items || [] });
    } catch {
      // keep existing
    }
  }, []);

  // Loads all workspace data for the signed-in user (scoped by the backend).
  const loadAppData = useCallback(async () => {
    try {
      const [listingData, proposalData, activityItems, proposalsList] = await Promise.all([
        apiListListings().catch(() => ({ items: [] })),
        apiGetProposalDraft().catch(() => null),
        apiListActivity().catch(() => []),
        apiListProposals({ page: 1, limit: 100 }).catch(() => ({ items: [] })),
      ]);

      if (Array.isArray(proposalsList?.items)) {
        dispatch({ type: 'PROPOSALS', proposals: proposalsList.items });
      }

      if (Array.isArray(listingData?.items)) {
        dispatch({
          type: 'LISTINGS',
          listings: listingData.items.map(normalizeListing),
        });
      }

      if (proposalData?.draft) applyDraft(dispatch, proposalData.draft);

      if (Array.isArray(activityItems)) {
        dispatch({ type: 'ACTIVITY', activity: activityItems });
      }
    } catch {
      // ignore — gated screens will simply be empty
    }
  }, []);

  // Applies post-login UI state (city scope) for a user.
  const applyAuthUser = useCallback((user) => {
    dispatch({ type: 'AUTH_USER', user });
    const cities = citiesForUser(user);
    dispatch({ type: 'CITIES', cities });
    dispatch({ type: 'CITY', city: cities[0] || 'All cities' });
  }, []);

  // Bootstrap: detect an existing session on first load.
  useEffect(() => {
    let cancelled = false;
    setUnauthorizedHandler(() => {
      dispatch({ type: 'AUTH_USER', user: null });
      dispatch({ type: 'RESET_WORKSPACE' });
    });
    (async () => {
      try {
        const data = await apiGetMe();
        if (cancelled) return;
        if (data?.user) {
          applyAuthUser(data.user);
          if (data.catalog?.permissions) {
            dispatch({ type: 'PERM_CATALOG', catalog: data.catalog.permissions });
          }
          await loadAppData();
        }
      } catch {
        // not authenticated — show login
      } finally {
        if (!cancelled) dispatch({ type: 'AUTH_CHECKED' });
      }
    })();
    return () => { cancelled = true; };
  }, [applyAuthUser, loadAppData]);

  const login = useCallback(async (email, password) => {
    const user = await apiLogin(email, password);
    applyAuthUser(user);
    try {
      const me = await apiGetMe();
      if (me?.catalog?.permissions) dispatch({ type: 'PERM_CATALOG', catalog: me.catalog.permissions });
    } catch {
      // catalog is optional
    }
    await loadAppData();
    return user;
  }, [applyAuthUser, loadAppData]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // clear locally regardless
    }
    dispatch({ type: 'AUTH_USER', user: null });
    dispatch({ type: 'RESET_WORKSPACE' });
    dispatch({ type: 'CITIES', cities: DB.cities });
    dispatch({ type: 'CITY', city: 'All cities' });
    navigateTo('/login');
  }, []);

  const setProposalFromMatch = useCallback(async (ids, client = { name: '', company: '' }, lead = null) => {
    dispatch({ type: 'EDITING_PROPOSAL', id: null });
    dispatch({ type: 'PROPOSAL_IDS', ids });
    dispatch({ type: 'CLIENT', client });
    dispatch({ type: 'COVER_NOTE', text: '' });
    dispatch({ type: 'COVER_NOTE_IDX', idx: 0 });
    dispatch({ type: 'LINKED_LEAD', lead });
    try {
      await apiUpdateProposalDraft({
        listingIds: ids,
        client,
        coverNote: '',
        coverNoteIdx: 0,
        leadId: lead?.id || null,
      });
    } catch (e) {
      toast(e?.message || 'Failed to save proposal draft', 'info');
    }
  }, [toast]);

  const addToProposal = useCallback(async (id) => {
    if (state.proposalIds.includes(id)) { toast('Already in your proposal', 'info'); return; }
    const prev = state.proposalIds;
    const nextIds = [...prev, id];
    dispatch({ type: 'PROPOSAL_IDS', ids: nextIds });
    try {
      await apiUpdateProposalDraft({ listingIds: nextIds });
      const l = state.listings.find(x => x.id === id);
      if (l) toast(`Added ${l.operator} · ${l.micro} to proposal`, 'plus-circle');
    } catch (e) {
      dispatch({ type: 'PROPOSAL_IDS', ids: prev });
      toast(e?.message || 'Failed to add to proposal', 'info');
    }
  }, [state.proposalIds, state.listings, toast]);

  const removeFromProposal = useCallback(async (id) => {
    const prev = state.proposalIds;
    const nextIds = prev.filter(x => x !== id);
    dispatch({ type: 'PROPOSAL_IDS', ids: nextIds });
    try {
      await apiUpdateProposalDraft({ listingIds: nextIds });
    } catch (e) {
      dispatch({ type: 'PROPOSAL_IDS', ids: prev });
      toast(e?.message || 'Failed to update proposal', 'info');
    }
  }, [state.proposalIds, toast]);

  const reorderProposal = useCallback(async (ids) => {
    const prev = state.proposalIds;
    dispatch({ type: 'PROPOSAL_IDS', ids });
    try {
      await apiUpdateProposalDraft({ listingIds: ids });
    } catch (e) {
      dispatch({ type: 'PROPOSAL_IDS', ids: prev });
      toast(e?.message || 'Failed to reorder proposal', 'info');
    }
  }, [state.proposalIds, toast]);

  const updateClient = useCallback(async (client) => {
    dispatch({ type: 'CLIENT', client });
    try {
      await apiUpdateProposalDraft({ client });
    } catch {
      // silent — local preview still works
    }
  }, []);

  const updateCoverNote = useCallback((text) => {
    dispatch({ type: 'COVER_NOTE', text });
    if (coverNoteTimer.current) clearTimeout(coverNoteTimer.current);
    coverNoteTimer.current = setTimeout(() => {
      apiUpdateProposalDraft({ coverNote: text }).catch(() => {});
    }, 600);
  }, []);

  const updateProposalTitle = useCallback((title) => {
    dispatch({ type: 'PROPOSAL_TITLE', title });
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      apiUpdateProposalDraft({ title }).catch(() => {});
    }, 500);
  }, []);

  const updateCoverNoteIdx = useCallback(async (idx, text) => {
    dispatch({ type: 'COVER_NOTE_IDX', idx });
    dispatch({ type: 'COVER_NOTE', text });
    try {
      await apiUpdateProposalDraft({ coverNoteIdx: idx, coverNote: text });
    } catch {
      // silent
    }
  }, []);

  const approveInboxItem = useCallback((m) => {
    const p = m.prof, d = m.dyn;
    const seats = d.availWorkstations || parseInt(String(d.availCabins || '').replace(/\D/g, ''), 10) || 10;
    const price = d.dedicatedDesk || d.privateCabin || d.hotDeskPrice
      || (d.managedPerSqft ? d.managedPerSqft * 70 : 7000);
    const lst = {
      id: uid(), operator: p.operator, city: p.city, micro: p.micro,
      type: p.type, seats, price, days: 0, amenities: p.amenities,
      tier: 'Standard', avail: d.availFrom || 'Available now', fresh: freshOf(0),
    };
    dispatch({ type: 'LISTINGS', listings: [lst, ...state.listings] });
    dispatch({ type: 'INBOX', inbox: state.inbox.filter(i => i.id !== m.id) });
    toast(`${p.operator} · ${p.micro} published — verified just now`, 'badge-check');
  }, [state, toast]);

  const rejectInboxItem = useCallback((id) => {
    dispatch({ type: 'INBOX', inbox: state.inbox.filter(i => i.id !== id) });
    toast('Message rejected and removed from queue', 'trash-2');
  }, [state.inbox, toast]);

  const saveListing = useCallback(async (listing, editId) => {
    try {
      const payload = { ...listing };
      delete payload.id;
      delete payload._id;
      delete payload.days;
      delete payload.fresh;

      const saved = editId
        ? await apiUpdateListing(editId, payload)
        : await apiCreateListing(payload);
      toast(
        editId ? 'Listing updated successfully' : 'Listing published — verified just now',
        editId ? 'check-circle' : 'badge-check',
      );
      await refreshListings();
      return saved;
    } catch (e) {
      toast(e?.message || 'Failed to save listing', 'info');
      throw e;
    }
  }, [refreshListings, toast]);

  const saveGallery = useCallback(async (listingId, images, photoMeta) => {
    try {
      const saved = await apiUpdateListing(listingId, { images, photoMeta, source: 'manual' });
      await refreshListings();
      toast(`Gallery updated — ${images.length} photos`, 'check-circle');
      return saved;
    } catch (e) {
      toast(e?.message || 'Failed to save gallery', 'info');
      throw e;
    }
  }, [refreshListings, toast]);

  const requestUpdate = useCallback(async (listingId) => {
    try {
      await apiVerifyListing(listingId);
      await refreshListings();
      toast('Listing marked as verified', 'badge-check');
    } catch (e) {
      toast(e?.message || 'Failed to mark listing as verified', 'info');
    }
  }, [refreshListings, toast]);

  const loadStoredProposal = useCallback(async (id) => {
    const result = await apiLoadProposalToDraft(id);
    applyDraft(dispatch, result.draft);
    dispatch({ type: 'PROPOSAL_TITLE', title: result.draft.title || '' });
    dispatch({ type: 'EDITING_PROPOSAL', id: result.sourceProposalId || id });
    toast('Proposal loaded into builder — edit and update', 'check-circle');
    return result;
  }, [toast]);

  const applyProposalDraft = useCallback((draft) => {
    applyDraft(dispatch, draft);
  }, []);

  const sendProposal = useCallback(async (channel, render = null, title = '') => {
    const apiChannel = channel === 'wa' ? 'whatsapp' : 'email';
    const sentBy = state.authUser?.name || '';
    const result = await apiSendProposal(
      apiChannel,
      sentBy,
      render,
      title,
      state.linkedLead?.id || null,
    );
    applyDraft(dispatch, result.draft);
    dispatch({ type: 'EDITING_PROPOSAL', id: null });
    dispatch({ type: 'LINKED_LEAD', lead: null });
    dispatch({ type: 'ACTIVITY', activity: [result.activity, ...state.activity] });
    refreshProposals();
    return result;
  }, [state.activity, state.authUser, state.linkedLead, refreshProposals]);

  const value = useMemo(() => ({
    ...state,
    go, toggleTheme, toast, setCityFilter, setSearchQuery, openListing, setProposalFromMatch,
    addToProposal, removeFromProposal, reorderProposal,
    updateClient, updateCoverNote, updateCoverNoteIdx, updateProposalTitle,
    approveInboxItem, rejectInboxItem,
    saveListing, saveGallery, requestUpdate, sendProposal,
    refreshListings, refreshProposals, applyProposalDraft,
    login, logout, loadStoredProposal,
    dispatch,
  }), [
    state, go, toggleTheme, toast, setCityFilter, setSearchQuery, openListing, setProposalFromMatch,
    addToProposal, removeFromProposal, reorderProposal,
    updateClient, updateCoverNote, updateCoverNoteIdx, updateProposalTitle,
    approveInboxItem, rejectInboxItem,
    saveListing, saveGallery, requestUpdate, sendProposal,
    refreshListings, refreshProposals, applyProposalDraft,
    login, logout, loadStoredProposal,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
