export interface ServerStats {
  guildId: string;
  guildName: string;
  activities: number;
  uniqueUsers: number;
  dailyUsers: number;  // CHANGED FROM avgDailyUsers to dailyUsers
  daysSinceAddition: number;
  bets: number;
  volume: number;
  fees: number;
}

export interface ChannelStats {
  channelId: string;
  channelName: string;
  activities: number;
  uniqueUsers: number;
  dailyUsers: number;
  daysSinceAddition: number;
  bets: number;
  volume: number;
  fees: number;
}

export interface ServerWithChannels {
  guildId: string;
  guildName: string;
  totalChannels: number;
  totalActivities: number;
  totalUniqueUsers: number;
  totalDailyUsers: number;
  totalBets: number;
  totalVolume: number;
  totalFees: number;
  daysSinceAddition: number;
  channels: ChannelStats[];
}

export interface DashboardData {
  serverStats: ServerStats[];
  totals: {
    totalServers: number;
    totalActivities: number;
    totalUsers: number;
    totalBets: number;
    totalVolume: number;
    totalFees: number;
  };
  timeRange: string;
  source: string;
}

export interface ChannelDashboardData {
  channelStats: ChannelStats[];
  totals: {
    totalChannels: number;
    totalActivities: number;
    totalUsers: number;
    totalBets: number;
    totalVolume: number;
    totalFees: number;
  };
  timeRange: string;
  source: string;
}

export interface HierarchicalChannelData {
  serversWithChannels: ServerWithChannels[];
  totals: {
    totalServers: number;
    totalChannels: number;
    totalActivities: number;
    totalUsers: number;
    totalBets: number;
    totalVolume: number;
    totalFees: number;
  };
  timeRange: string;
  source: string;
}
