'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  posts: {
    totalPosts: number;
    totalViews: number;
    totalClicks: number;
  };
  members: {
    totalMembers: number;
    approvedMembers: number;
    pendingMembers: number;
    weeklyNewMembers: number;
    monthlyNewMembers: number;
  };
  events: {
    totalEvents: number;
    upcomingEvents: number;
    weeklyEvents: number;
    rotaAssignments: number;
  };
  moderation: {
    totalActions: number;
    weeklyActions: number;
    actionBreakdown: Array<{ action: string; _count: { id: number } }>;
  };
  forms: {
    totalForms: number;
    totalSubmissions: number;
    weeklySubmissions: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [postsRes, membersRes, eventsRes, moderationRes, formsRes] = await Promise.all([
        fetch('/api/analytics/posts'),
        fetch('/api/analytics/members'),
        fetch('/api/analytics/events'),
        fetch('/api/analytics/moderation'),
        fetch('/api/analytics/forms')
      ]);

      const [posts, members, events, moderation, forms] = await Promise.all([
        postsRes.json(),
        membersRes.json(),
        eventsRes.json(),
        moderationRes.json(),
        formsRes.json()
      ]);

      setData({ posts, members, events, moderation, forms });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading analytics...</div>;
  }

  if (!data) {
    return <div>Error loading analytics</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <button
          onClick={fetchAnalytics}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Posts Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">📢 Content Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.posts.totalPosts}</div>
            <div className="text-sm text-blue-600">Total Posts</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.posts.totalViews || 0}</div>
            <div className="text-sm text-green-600">Total Views</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{data.posts.totalClicks || 0}</div>
            <div className="text-sm text-purple-600">Total Clicks</div>
          </div>
        </div>
      </div>

      {/* Members Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">👥 Member Growth</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.members.totalMembers}</div>
            <div className="text-sm text-blue-600">Total Members</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.members.approvedMembers}</div>
            <div className="text-sm text-green-600">Approved</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{data.members.pendingMembers}</div>
            <div className="text-sm text-yellow-600">Pending</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">+{data.members.weeklyNewMembers}</div>
            <div className="text-sm text-purple-600">This Week</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">+{data.members.monthlyNewMembers}</div>
            <div className="text-sm text-indigo-600">This Month</div>
          </div>
        </div>
      </div>

      {/* Events Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">📅 Events & Volunteering</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.events.totalEvents}</div>
            <div className="text-sm text-blue-600">Total Events</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.events.upcomingEvents}</div>
            <div className="text-sm text-green-600">Upcoming</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">+{data.events.weeklyEvents}</div>
            <div className="text-sm text-purple-600">This Week</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{data.events.rotaAssignments}</div>
            <div className="text-sm text-orange-600">Rota Assignments</div>
          </div>
        </div>
      </div>

      {/* Moderation Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">⚖️ Moderation Actions</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{data.moderation.totalActions}</div>
            <div className="text-sm text-red-600">Total Actions</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{data.moderation.weeklyActions}</div>
            <div className="text-sm text-orange-600">This Week</div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Action Breakdown:</h3>
          {data.moderation.actionBreakdown.map((action) => (
            <div key={action.action} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
              <span className="text-sm capitalize">{action.action}</span>
              <span className="font-medium">{action._count.id}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forms Analytics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">📋 Public Forms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.forms.totalForms}</div>
            <div className="text-sm text-blue-600">Active Forms</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.forms.totalSubmissions}</div>
            <div className="text-sm text-green-600">Total Submissions</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">+{data.forms.weeklySubmissions}</div>
            <div className="text-sm text-purple-600">This Week</div>
          </div>
        </div>
      </div>
    </div>
  );
}