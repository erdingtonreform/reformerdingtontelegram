'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Form {
  id: string;
  title: string;
  description: string | null;
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
  }>;
}

export default function PublicFormPage() {
  const { id } = useParams();
  const [form, setForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`/api/forms/${id}`);
      if (response.ok) {
        const formData = await response.json();
        setForm(formData);
        // Initialize form data with empty values
        const initialData: Record<string, any> = {};
        formData.fields.forEach((field: any) => {
          initialData[field.name] = field.type === 'checkbox' ? false : '';
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Failed to fetch form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/forms/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        alert('Failed to submit form. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit form:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData({ ...formData, [name]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">Loading form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600">The form you're looking for doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your volunteer application has been submitted successfully. We'll review your application and get back to you soon.
          </p>
          <p className="text-sm text-gray-500">
            A confirmation email will be sent to the address you provided.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {form.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name]}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                />
              ) : field.type === 'checkbox' ? (
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.checked)}
                    required={field.required}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-600">
                    {field.label}
                  </label>
                </div>
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name]}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
          ))}

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">📋 GDPR Privacy Notice</h3>
            <p className="text-xs text-blue-800">
              Your personal data will be processed in accordance with our privacy policy for volunteer coordination purposes.
              We will retain your data for 12 months after your last volunteer activity. You have the right to access,
              rectify, or delete your data at any time by contacting us.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Powered by Reform UK Erdington Volunteer Platform
          </p>
        </div>
      </div>
    </div>
  );
}