'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Member {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  membershipNumber: string | null;
  postcode: string | null;
  wardSlug: string | null;
  status: string;
  createdAt: string;
}

export default function Members() {
  const { data: session } = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMembers();
  }, [session]);

  const fetchMembers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/members`, {
        headers: { 'x-api-key': (session?.user as any)?.id || '' }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading members...</div>;
  }

  const filteredMembers = members.filter(member => {
    if (filter === 'all') return true;
    return member.status.toLowerCase() === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'DELETED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <p className="mt-2 text-gray-600">
          Manage and view all community members
        </p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-4">
          {['all', 'approved', 'pending', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === status
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } border`}
            >
              {status === 'all' ? 'All Members' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredMembers.map((member) => (
            <li key={member.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {member.firstName?.charAt(0) || member.username?.charAt(0) || '?'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </h3>
                        {member.username && (
                          <span className="ml-2 text-sm text-gray-500">
                            @{member.username}
                          </span>
                        )}
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                          {member.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.email && <span>{member.email} • </span>}
                        {member.membershipNumber && <span>Membership: {member.membershipNumber} • </span>}
                        {member.postcode && <span>{member.postcode} • </span>}
                        {member.wardSlug && <span>Ward: {member.wardSlug}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      View Details
                    </button>
                    <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No members found</div>
          </div>
        )}
      </div>
    </div>
  );
}