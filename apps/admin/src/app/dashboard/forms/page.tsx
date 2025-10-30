'use client';

import { useState, useEffect } from 'react';

interface Form {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: string;
  member?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms');
      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}/submissions`);
      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const handleViewSubmissions = async (form: Form) => {
    setSelectedForm(form);
    await fetchSubmissions(form.id);
  };

  const handleCreateForm = async (formData: any) => {
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchForms();
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Failed to create form:', error);
    }
  };

  const handleToggleActive = async (formId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        await fetchForms();
      }
    } catch (error) {
      console.error('Failed to toggle form status:', error);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form? This will also delete all submissions.')) {
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchForms();
        if (selectedForm?.id === formId) {
          setSelectedForm(null);
          setSubmissions([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  if (loading) {
    return <div>Loading forms...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📋 Volunteer Forms</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Form
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Forms</h2>
          <div className="space-y-4">
            {forms.map((form) => (
              <div key={form.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{form.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      form.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{form.description}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewSubmissions(form)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Submissions
                  </button>
                  <button
                    onClick={() => handleToggleActive(form.id, form.isActive)}
                    className={`text-sm font-medium ${
                      form.isActive ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {form.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteForm(form.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {forms.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No forms created yet. Create your first volunteer form to get started.
              </div>
            )}
          </div>
        </div>

        {/* Submissions View */}
        <div className="bg-white shadow rounded-lg p-6">
          {selectedForm ? (
            <>
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Submissions for: {selectedForm.title}
              </h2>
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div key={submission.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">
                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                      {submission.member && (
                        <div className="text-sm font-medium">
                          {submission.member.firstName} {submission.member.lastName}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {Object.entries(submission.data).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No submissions yet.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Select a form to view submissions
            </div>
          )}
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <CreateFormModal
          onClose={() => setShowCreateForm(false)}
          onCreate={handleCreateForm}
        />
      )}
    </div>
  );
}

function CreateFormModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fields: [
      { name: 'firstName', type: 'text', label: 'First Name', required: true },
      { name: 'lastName', type: 'text', label: 'Last Name', required: true },
      { name: 'email', type: 'email', label: 'Email Address', required: true },
      { name: 'phone', type: 'tel', label: 'Phone Number', required: false },
      { name: 'availability', type: 'textarea', label: 'When are you available to volunteer?', required: false },
      { name: 'experience', type: 'textarea', label: 'Any relevant experience or skills?', required: false },
      { name: 'gdprConsent', type: 'checkbox', label: 'I consent to my data being processed for volunteer coordination purposes', required: true }
    ]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Volunteer Form</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Form Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p><strong>Default fields included:</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>Name, Email, Phone</li>
                <li>Availability and Experience</li>
                <li>GDPR Consent (required)</li>
              </ul>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Create Form
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}