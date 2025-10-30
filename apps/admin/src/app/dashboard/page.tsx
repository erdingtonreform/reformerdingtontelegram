'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface DashboardStats {
  totalMembers: number;
  pendingRequests: number;
  totalEvents: number;
  totalPosts: number;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    // Fetch dashboard stats from API
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

        const [membersRes, requestsRes, eventsRes, postsRes] = await Promise.all([
          fetch(`${apiUrl}/api/members`, {
            headers: { 'x-api-key': session?.user?.id || '' }
          }),
          fetch(`${apiUrl}/api/join-requests`, {
            headers: { 'x-api-key': session?.user?.id || '' }
          }),
          fetch(`${apiUrl}/api/events`, {
            headers: { 'x-api-key': session?.user?.id || '' }
          }),
          fetch(`${apiUrl}/api/posts`, {
            headers: { 'x-api-key': (session?.user as any)?.id || '' }
          }),
        ]);

        const members = membersRes.ok ? await membersRes.json() : [];
        const requests = requestsRes.ok ? await requestsRes.json() : [];
        const events = eventsRes.ok ? await eventsRes.json() : [];
        const posts = postsRes.ok ? await postsRes.json() : [];

        setStats({
          totalMembers: members.length,
          pendingRequests: requests.filter((r: any) => r.status === 'PENDING').length,
          totalEvents: events.length,
          totalPosts: posts.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  if (!stats) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  const isAdmin = (session?.user as any)?.role === 'admin';

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to the Reform UK Erdington admin dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">M</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Members
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalMembers}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">P</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Requests
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.pendingRequests}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">E</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Events
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalEvents}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Posts
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.totalPosts}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a
                href="/dashboard/join-requests"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Review Join Requests ({stats.pendingRequests})
              </a>
              <a
                href="/dashboard/events"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Manage Events
              </a>
              {isAdmin && (
                <>
                  <a
                    href="/dashboard/posts"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Manage Posts
                  </a>
                  <a
                    href="/dashboard/analytics"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    View Analytics
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}