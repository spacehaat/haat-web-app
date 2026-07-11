import { createWebApi } from '@spacehaat/api-client/web';

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/** Empty in dev (Vite proxy). Set VITE_API_URL in production (e.g. Render backend). */
export const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
