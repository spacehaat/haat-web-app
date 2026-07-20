import { createWebApi } from '@spacehaat/api-client/web';

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/** Production API base URL for fetch(). */
export function resolveApiBaseUrl() {
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const { hostname } = window.location;
    // Vercel: same-origin /api — vercel.json proxies to Render (no CORS/cookies issues).
    if (hostname.endsWith('.vercel.app')) return '';
  }
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  return fromEnv;
}

export const apiBaseUrl = resolveApiBaseUrl();

const api = createWebApi({
  baseUrl: apiBaseUrl,
  onUnauthorized: () => onUnauthorized?.(),
});

export const {
  apiLogin,
  apiLogout,
  apiGetMe,
  apiListUsers,
  apiCreateUser,
  apiUpdateUser,
  apiListListings,
  apiGetListing,
  apiCreateListing,
  apiUpdateListing,
  apiVerifyListing,
  apiDeleteListing,
  apiGetProposalDraft,
  apiUpdateProposalDraft,
  apiSendProposal,
  apiGenerateProposalPdf,
  apiListProposals,
  apiGetProposal,
  apiLoadProposalToDraft,
  apiCreateProposalShareLink,
  apiMarkProposalFeedbackSeen,
  apiGetPublicProposal,
  apiUpdatePublicProposal,
  apiListActivity,
  apiGetDashboardStats,
  apiSmartMatchParse,
  apiSmartMatch,
  apiListLeads,
  apiListLeadAssignees,
  apiGetLead,
  apiCreateLead,
  apiParseLead,
  apiCreateLeadFromMatch,
  apiUpdateLead,
  apiDeleteLead,
  apiAddLeadNote,
  apiSetLeadReminder,
  apiListRecentClients,
  apiUploadImages,
} = api;
