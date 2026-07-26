export const STAGES = [
  ['', 'All'],
  ['new', 'New'],
  ['cna', 'Call not attend'],
  ['cmb', 'Call me back'],
  ['qualified', 'Qualified'],
  ['proposal_sent', 'Proposal sent'],
  ['visit_scheduled', 'Visit scheduled'],
  ['negotiation', 'Negotiation'],
  ['won', 'Won'],
  ['lost', 'Lost'],
];

export const PIPELINE_STAGES = STAGES.filter(([value]) => value);

export const STAGE_LABEL = Object.fromEntries(
  PIPELINE_STAGES.map(([value, label]) => [value, label]),
);

export const STAGE_SHORT_LABEL = {
  ...STAGE_LABEL,
  cna: 'CNA',
  cmb: 'CMB',
};
