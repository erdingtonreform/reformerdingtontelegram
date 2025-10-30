'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface JoinRequest {
  id: string;
  telegramUserId: string;
  chatId: string;
  wardSlug: string | null;
  source: string;
  status: string;
  createdAt: string;
  member: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    membershipNumber: string | null;
    postcode: string | null;
  };
}

export default function JoinRequests() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [session]);

  const fetchRequests = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/join-requests`, {
        headers: { 'x-api-key': (session?.user as any)?.id || '' }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      // For now, we'll just update the local state
      // In a real implementation, you'd call an API endpoint
      setRequests(requests.filter(r => r.id !== requestId));
      alert('Join request approved!');
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setRequests(requests.filter(r => r.id !== requestId));
      alert('Join request rejected!');
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading join requests...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Join Requests</h1>
        <p className="mt-2 text-gray-600">
          Review and approve membership join requests
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">No pending join requests</div>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.member.firstName} {request.member.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        @{request.member.username || 'No username'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Ward: {request.wardSlug || 'Unknown'}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Email:</span> {request.member.email || 'Not provided'}
                    </div>
                    <div>
                      <span className="font-medium">Postcode:</span> {request.member.postcode || 'Not provided'}
                    </div>
                    <div>
                      <span className="font-medium">Membership #:</span> {request.member.membershipNumber || 'Not provided'}
                    </div>
                    <div>
                      <span className="font-medium">Requested:</span> {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      {request.source === 'COMMUNITY' ? 'Community Group' : 'Volunteer Ops'}
                    </span>
                  </div>
                </div>

                <div className="flex space-x-3 ml-6">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}