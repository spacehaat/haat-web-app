import { createWebApi } from '@spacehaat/api-client/web';

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/** Production API base. Prefer VITE_API_URL; else same-origin /api (Vercel proxies to Render). */
export function resolveApiBaseUrl() {
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  return '';
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
  apiAddLeadNote,
  apiListRecentClients,
  apiUploadImages,
} = api;
