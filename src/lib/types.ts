export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AdminUser = {
  id: string;
  role: string;
  name: string;
  artistName: string;
  email: string;
  plan: string | null;
  accountType: string;
  status: string;
  createdAt: string;
};

export type AdminRelease = {
  id: string;
  title: string;
  primaryArtist: string;
  status: string;
  genre: string;
  artworkUrl?: string | null;
  distributionTier?: string;
  premiumUpgradedAt?: string | null;
  artistShareBps?: number;
  platformShareBps?: number;
  isrc: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminPayout = {
  id: string;
  reference: string;
  amountPaise: number;
  method: string;
  destination: string;
  status: string;
  requestedAt: string;
  note: string | null;
  userName?: string;
};

export type Overview = {
  stats: Record<string, number>;
};

export type PlatformSettings = {
  platformFeePercent: number;
  minWithdrawalPaise: number;
  maxWithdrawalPaise: number;
  payoutHoldDays: number;
  autoApproveReleases: boolean;
  [key: string]: string | number | boolean;
};

export type KYCEntry = {
  id: string;
  userId: string;
  userName: string;
  documentType: string;
  documentUrl: string | null;
  status: string;
  submittedAt: string;
};

export type Agreement = {
  id: string;
  userId: string;
  userName: string;
  type: string;
  templateKey: string;
  status: string;
  signedAt: string | null;
  signatureName: string | null;
  hasDocument: boolean;
  createdAt: string;
};

export type AuditEntry = {
  id: string | number;
  action: string;
  actor: string;
  target: string;
  details: string;
  createdAt: string;
};

export type AnalyticsData = {
  totalStreams: number;
  totalRevenuePaise: number;
  platformBreakdown: { platform: string; streams: number; revenuePaise: number; sharePct?: number }[];
  monthlyGrowth: { month: string; artists: number; releases: number; revenue: number }[];
  overview?: {
    totalStreams: number;
    totalRevenuePaise: number;
    artistSharePaise: number;
    platformSharePaise: number;
    thisMonthStreams: number;
    thisMonthGrossPaise: number;
    streamsDeltaPct: number;
    revenueDeltaPct: number;
    [key: string]: number;
  };
};

export type PDLActionType = "urgent_dsp_upload" | "youtube_claim_release" | "youtube_topic";

export type PDLEmailLog = {
  id: string;
  actionType: PDLActionType;
  recipientEmail: string;
  ccEmail: string | null;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  customNote: string | null;
  targetUrl: string | null;
  songCount: number;
  releaseIds: string[];
  releaseTitles: string;
  status: "sent" | "failed" | "queued";
  errorMessage: string | null;
  sentBy: string;
  senderName?: string;
  createdAt: string;
};

