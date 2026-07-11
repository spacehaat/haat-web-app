import { createWebApi } from '@spacehaat/api-client/web';

let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

const api = createWebApi({
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
