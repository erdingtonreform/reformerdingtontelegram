'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface Setting {
  key: string;
  value: any;
}

export default function Settings() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

      // Fetch common settings
      const settingsToFetch = [
        'admin_user_ids',
        'ward_leads',
        'telegram_bot_token',
        'public_base_url',
        'analytics_retention_days',
        'moderation_enabled',
      ];

      const fetchedSettings: Record<string, any> = {};

      for (const key of settingsToFetch) {
        try {
          const response = await fetch(`${apiUrl}/api/settings/${key}`, {
            headers: { 'x-api-key': (session?.user as any)?.id || '' }
          });
          if (response.ok) {
            const data = await response.json();
            fetchedSettings[key] = data;
          }
        } catch (error) {
          console.error(`Failed to fetch setting ${key}:`, error);
        }
      }

      setSettings(fetchedSettings);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/settings/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': (session?.user as any)?.id || ''
        },
        body: JSON.stringify({ value }),
      });

      if (response.ok) {
        setSettings({ ...settings, [key]: value });
        alert('Setting updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      alert('Failed to update setting');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading settings...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure system settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Authentication Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin User IDs (CSV)
                </label>
                <input
                  type="text"
                  value={settings.admin_user_ids || ''}
                  onChange={(e) => setSettings({ ...settings, admin_user_ids: e.target.value })}
                  onBlur={(e) => updateSetting('admin_user_ids', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456789,987654321"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ward Leads Configuration (JSON)
                </label>
                <textarea
                  rows={4}
                  value={JSON.stringify(settings.ward_leads || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setSettings({ ...settings, ward_leads: parsed });
                    } catch (error) {
                      // Invalid JSON, keep current value
                    }
                  }}
                  onBlur={(e) => updateSetting('ward_leads', settings.ward_leads)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder='{"castle_vale": ["123456789"], "erdington": ["987654321"]}'
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              System Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Public Base URL
                </label>
                <input
                  type="url"
                  value={settings.public_base_url || ''}
                  onChange={(e) => setSettings({ ...settings, public_base_url: e.target.value })}
                  onBlur={(e) => updateSetting('public_base_url', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://your-app.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Analytics Retention (Days)
                </label>
                <input
                  type="number"
                  value={settings.analytics_retention_days || 365}
                  onChange={(e) => setSettings({ ...settings, analytics_retention_days: parseInt(e.target.value) })}
                  onBlur={(e) => updateSetting('analytics_retention_days', settings.analytics_retention_days)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="3650"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="moderation_enabled"
                  type="checkbox"
                  checked={settings.moderation_enabled || false}
                  onChange={(e) => {
                    const value = e.target.checked;
                    setSettings({ ...settings, moderation_enabled: value });
                    updateSetting('moderation_enabled', value);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="moderation_enabled" className="ml-2 block text-sm text-gray-900">
                  Enable Moderation Features
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Danger Zone
            </h3>
            <div className="space-y-4">
              <div className="border-l-4 border-red-400 bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      These settings affect core system functionality. Changes should be made with caution.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  value={settings.telegram_bot_token || ''}
                  onChange={(e) => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                  onBlur={(e) => updateSetting('telegram_bot_token', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter bot token carefully"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Only change this if you're certain about the new token.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}