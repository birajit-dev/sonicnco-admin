export type AnalyticsOverview = {
  totalStreams: number;
  totalRevenuePaise: number;
  artistSharePaise: number;
  platformSharePaise: number;
  availableBalancePaise: number;
  paidOutPaise: number;
  pendingPayoutPaise: number;
  activeArtists: number;
  productionCompanies: number;
  liveSongs: number;
  totalSongs: number;
  premiumSongs: number;
  freeSongs: number;
  pendingReviews: number;
  openPayouts: number;
  thisMonthStreams: number;
  thisMonthGrossPaise: number;
  thisMonthArtistPaise: number;
  thisMonthPlatformPaise: number;
  lastMonthStreams: number;
  lastMonthGrossPaise: number;
  lastMonthArtistPaise: number;
  streamsDeltaPct: number;
  revenueDeltaPct: number;
  rangeStreams: number;
  rangeRevenuePaise: number;
  rangeDays: number;
};

export type AnalyticsData = {
  overview: AnalyticsOverview;
  platformBreakdown: {
    platform: string;
    streams: number;
    revenuePaise: number;
    sharePct: number;
  }[];
  dailyTrend: { day: string; streams: number; revenuePaise: number }[];
  monthlyTrend: {
    month: string;
    artists: number;
    releases: number;
    streams: number;
    grossPaise: number;
    artistSharePaise: number;
    platformSharePaise: number;
    revenue: number;
  }[];
  monthlyGrowth: { month: string; artists: number; releases: number; revenue: number }[];
  topSongs: {
    releaseId: string;
    title: string;
    primaryArtist: string;
    artworkUrl: string | null;
    status: string;
    distributionTier: string;
    streams: number;
    revenuePaise: number;
  }[];
  topArtists: {
    userId: string;
    displayName: string;
    email: string;
    accountType: string;
    songCount: number;
    lifetimeStreams: number;
    lifetimeArtistPaise: number;
    availableBalancePaise: number;
  }[];
  catalogueStatus: { status: string; count: number }[];
  countries: { country: string; streams: number; revenuePaise: number }[];
  payoutsByStatus: { status: string; count: number; amountPaise: number }[];
  tierMix: {
    freeSongs: number;
    premiumSongs: number;
    freeArtistPaise: number;
    premiumArtistPaise: number;
  };
  thisPeriod: string;
  lastPeriod: string;
  rangeDays: number;
  generatedAt: string;
  totalStreams: number;
  totalRevenuePaise: number;
};
