import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

type DateRange = 'today' | '7days' | '30days';

interface EventCount {
  event_name: string;
  count: number;
}

interface DailyStats {
  date: string;
  users: number;
  sessions: number;
  pageviews: number;
}

interface GA4Analytics {
  totalUsers: number;
  totalSessions: number;
  totalPageviews: number;
  engagementRate: number;
  avgSessionDuration: number;
  totalConversions: number;
  eventCounts: EventCount[];
  dailyStats: DailyStats[];
}

export const useGA4Analytics = (dateRange: DateRange = '7days') => {
  const [analytics, setAnalytics] = useState<GA4Analytics>({
    totalUsers: 0,
    totalSessions: 0,
    totalPageviews: 0,
    engagementRate: 0,
    avgSessionDuration: 0,
    totalConversions: 0,
    eventCounts: [],
    dailyStats: [],
  });
  const [loading, setLoading] = useState(true);

  const { startDate, endDate } = useMemo(() => {
    const end = endOfDay(new Date());
    let start: Date;

    switch (dateRange) {
      case 'today':
        start = startOfDay(new Date());
        break;
      case '7days':
        start = startOfDay(subDays(new Date(), 7));
        break;
      case '30days':
        start = startOfDay(subDays(new Date(), 30));
        break;
      default:
        start = startOfDay(subDays(new Date(), 7));
    }

    return { startDate: start, endDate: end };
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all events in the date range
      const { data: events, error } = await supabase
        .from('ga4_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!events || events.length === 0) {
        setAnalytics({
          totalUsers: 0,
          totalSessions: 0,
          totalPageviews: 0,
          engagementRate: 0,
          avgSessionDuration: 0,
          totalConversions: 0,
          eventCounts: [],
          dailyStats: [],
        });
        setLoading(false);
        return;
      }

      // Calculate unique users
      const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean));
      const totalUsers = uniqueUsers.size;

      // Calculate unique sessions
      const uniqueSessions = new Set(events.map(e => e.session_id).filter(Boolean));
      const totalSessions = uniqueSessions.size;

      // Calculate pageviews
      const totalPageviews = events.filter(e => e.event_name === 'page_view').length;

      // Calculate conversions
      const conversionEvents = ['conversion', 'purchase', 'plan_upgrade'];
      const totalConversions = events.filter(e => 
        conversionEvents.includes(e.event_name)
      ).length;

      // Calculate engagement rate (sessions with 2+ events / total sessions)
      const sessionEventCounts: Record<string, number> = {};
      events.forEach(e => {
        if (e.session_id) {
          sessionEventCounts[e.session_id] = (sessionEventCounts[e.session_id] || 0) + 1;
        }
      });
      const engagedSessions = Object.values(sessionEventCounts).filter(c => c >= 2).length;
      const engagementRate = totalSessions > 0 
        ? Math.round((engagedSessions / totalSessions) * 100) 
        : 0;

      // Count events by type
      const eventCountMap: Record<string, number> = {};
      events.forEach(e => {
        eventCountMap[e.event_name] = (eventCountMap[e.event_name] || 0) + 1;
      });
      const eventCounts: EventCount[] = Object.entries(eventCountMap)
        .map(([event_name, count]) => ({ event_name, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate daily stats
      const dailyMap: Record<string, { users: Set<string>; sessions: Set<string>; pageviews: number }> = {};
      
      events.forEach(e => {
        const date = format(new Date(e.created_at), 'yyyy-MM-dd');
        if (!dailyMap[date]) {
          dailyMap[date] = { users: new Set(), sessions: new Set(), pageviews: 0 };
        }
        if (e.user_id) dailyMap[date].users.add(e.user_id);
        if (e.session_id) dailyMap[date].sessions.add(e.session_id);
        if (e.event_name === 'page_view') dailyMap[date].pageviews++;
      });

      const dailyStats: DailyStats[] = Object.entries(dailyMap)
        .map(([date, stats]) => ({
          date,
          users: stats.users.size,
          sessions: stats.sessions.size,
          pageviews: stats.pageviews,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setAnalytics({
        totalUsers,
        totalSessions,
        totalPageviews,
        engagementRate,
        avgSessionDuration: 0, // Would need more data to calculate
        totalConversions,
        eventCounts,
        dailyStats,
      });
    } catch (error) {
      console.error('Error fetching GA4 analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return { analytics, loading, refetch: fetchAnalytics };
};
