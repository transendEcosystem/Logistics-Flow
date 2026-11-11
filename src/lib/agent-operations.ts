export const INTERNAL_AGENTS = [
  { id: 'research-qualification', name: 'Research & Qualification', output: 'Evidence-backed commercial opportunity brief' },
  { id: 'enquiry-follow-up', name: 'Enquiry & Quotation Follow-up', output: 'Follow-up drafts and sales handovers' },
  { id: 'assessment-campaign', name: 'Assessment & Campaign', output: 'Questionnaires, segments and personalised reports' },
  { id: 'social-video', name: 'Social Content & Video', output: 'Creative briefs, scripts and generated media' },
] as const;

export type InternalAgentId = typeof INTERNAL_AGENTS[number]['id'];
export const AGENT_DEFAULT_BRIEFS: Record<InternalAgentId, string> = {
  'research-qualification': 'Research the selected company\'s public online presence, comparable competitors and relevant commercial opportunities. Provide source-backed findings and focused discovery questions.',
  'enquiry-follow-up': 'Review the selected company\'s available enquiries and quotations. Prepare relevant follow-up drafts, identify missing information and recommend the next sales handover.',
  'assessment-campaign': 'Create a focused sales opportunity assessment and campaign for the selected company. Include transparent scoring, personalised result examples and one relevant next action.',
  'social-video': 'Analyse the selected company\'s market and audience. Develop relevant video concepts, a storyboard, captions and an activation-word campaign, with an evidence-based creative brief.',
};

export type AgentRunStatus = 'queued' | 'running' | 'awaiting_approval' | 'approved' | 'rejected' | 'failed';

export const AGENT_OUTBOUND_POLICY = {
  messagesRequireApproval: true,
  socialPostsRequireApproval: true,
} as const;