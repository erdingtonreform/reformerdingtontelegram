'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Event {
  id: string;
  title: string;
  startTs: string;
  endTs: string | null;
  location: string | null;
  wardSlug: string | null;
  publishedAt: string | null;
  rotaSlots: RotaSlot[];
}

interface RotaSlot {
  id: string;
  role: string;
  required: boolean;
  assignedMemberId: string | null;
  assignedAt: string | null;
  assignedMember: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    username: string | null;
  } | null;
}

interface Member {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

export default function Events() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchMembers();
  }, [session]);

  const fetchEvents = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/events`, {
        headers: { 'x-api-key': (session?.user as any)?.id || '' }
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/members-for-slots`, {
        headers: { 'x-api-key': (session?.user as any)?.id || '' }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': (session?.user as any)?.id || ''
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const newEvent = await response.json();
        setEvents([...events, newEvent]);
        setShowCreateForm(false);
        fetchEvents(); // Refresh to get updated rota slots
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleAssignSlot = async (eventId: string, slotId: string, memberId: string | null) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/events/${eventId}/slots/${slotId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': (session?.user as any)?.id || ''
        },
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        fetchEvents(); // Refresh events to show updated assignments
      }
    } catch (error) {
      console.error('Failed to assign slot:', error);
    }
  };

  const handlePublishRota = async (eventId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/events/${eventId}/publish-rota`, {
        method: 'POST',
        headers: {
          'x-api-key': (session?.user as any)?.id || ''
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert('Rota published successfully!');
        fetchEvents(); // Refresh to show published status
      } else {
        const error = await response.json();
        alert(`Failed to publish rota: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to publish rota:', error);
      alert('Failed to publish rota');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading events...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="mt-2 text-gray-600">
            Manage ward events and activities
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Create Event
        </button>
      </div>

      {showCreateForm && (
        <EventForm
          onSubmit={handleCreateEvent}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {showRotaModal && selectedEvent && (
        <RotaModal
          event={selectedEvent}
          members={members}
          onAssignSlot={handleAssignSlot}
          onPublishRota={handlePublishRota}
          onClose={() => {
            setShowRotaModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div key={event.id} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">📅</span>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(event.startTs).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {event.location && (
                  <p className="text-sm text-gray-600">
                    📍 {event.location}
                  </p>
                )}
                {event.wardSlug && (
                  <p className="text-sm text-gray-600">
                    🏘️ {event.wardSlug}
                  </p>
                )}
                {event.rotaSlots && event.rotaSlots.length > 0 && (
                  <p className="text-sm text-gray-600">
                    👥 {event.rotaSlots.filter(slot => slot.assignedMemberId).length}/{event.rotaSlots.length} assigned
                  </p>
                )}
                {event.publishedAt && (
                  <p className="text-sm text-green-600">
                    ✅ Published to volunteers
                  </p>
                )}
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowRotaModal(true);
                  }}
                  className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  Manage Rota
                </button>
                <button className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Edit
                </button>
                <button className="inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No events scheduled</div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 hover:text-blue-500"
          >
            Create your first event
          </button>
        </div>
      )}
    </div>
  );
}

function EventForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    startTs: '',
    endTs: '',
    location: '',
    wardSlug: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Create New Event</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date & Time</label>
            <input
              type="datetime-local"
              required
              value={formData.startTs}
              onChange={(e) => setFormData({ ...formData, startTs: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date & Time</label>
            <input
              type="datetime-local"
              value={formData.endTs}
              onChange={(e) => setFormData({ ...formData, endTs: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ward</label>
            <select
              value={formData.wardSlug}
              onChange={(e) => setFormData({ ...formData, wardSlug: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All wards</option>
              <option value="castle_vale">Castle Vale</option>
              <option value="erdington">Erdington</option>
              <option value="gravelly_hill">Gravelly Hill</option>
              <option value="kingstanding">Kingstanding</option>
              <option value="perry_common">Perry Common</option>
              <option value="pype_hayes">Pype Hayes</option>
              <option value="stockland_green">Stockland Green</option>
              <option value="oscott">Oscott</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Event
          </button>
        </div>
      </form>
    </div>
  );
}

function RotaModal({ event, members, onAssignSlot, onPublishRota, onClose }: {
  event: Event;
  members: Member[];
  onAssignSlot: (eventId: string, slotId: string, memberId: string | null) => void;
  onPublishRota: (eventId: string) => void;
  onClose: () => void;
}) {
  const unassignedRequired = event.rotaSlots.filter(slot => slot.required && !slot.assignedMemberId);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Manage Rota: {event.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {event.rotaSlots.filter(slot => slot.assignedMemberId).length} of {event.rotaSlots.length} slots assigned
            </span>
            <button
              onClick={() => onPublishRota(event.id)}
              disabled={unassignedRequired.length > 0 || event.publishedAt !== null}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                unassignedRequired.length > 0 || event.publishedAt !== null
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {event.publishedAt ? 'Already Published' : 'Publish to Volunteers'}
            </button>
          </div>
          {unassignedRequired.length > 0 && (
            <p className="text-red-600 text-sm mt-1">
              Cannot publish: {unassignedRequired.length} required slot{unassignedRequired.length > 1 ? 's' : ''} unassigned
            </p>
          )}
        </div>

        <div className="space-y-3">
          {event.rotaSlots.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-3 ${slot.required ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                <span className="font-medium">{slot.role}</span>
                {slot.required && <span className="ml-2 text-xs text-red-600">(Required)</span>}
              </div>
              <select
                value={slot.assignedMemberId || ''}
                onChange={(e) => onAssignSlot(event.id, slot.id, e.target.value || null)}
                className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName || ''} {member.username ? `(${member.username})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}