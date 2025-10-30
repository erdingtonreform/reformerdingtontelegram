'use client';

import { getProviders, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';

export default function SignIn() {
  const [providers, setProviders] = useState<any>(null);

  useEffect(() => {
    const getProvidersData = async () => {
      const providers = await getProviders();
      setProviders(providers);
    };
    getProvidersData();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access the Reform UK Erdington admin system
          </p>
        </div>
        <div className="mt-8 space-y-6">
          {providers &&
            Object.values(providers).map((provider: any) => (
              <button
                key={provider.name}
                onClick={() => signIn(provider.id)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in with {provider.name}
              </button>
            ))}
          <div className="text-center text-sm text-gray-500">
            <p>This system requires Telegram authentication.</p>
            <p>Only authorized admins and ward leads can access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}