import React, { useState } from 'react';
import { User, DEFAULT_GUEST_AVATAR } from '../types';
import { dataService } from '../services/store';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false); // Toggle for Forgot Password Info

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Direct Login Call - Sign Up removed
      const { user, error: authError } = await dataService.login(email, password);

      if (user) {
        onLogin(user);
      } else {
        setError(authError || 'Authentication failed');
      }
    } catch (err: any) {
      console.error(err);
      setError('Connection error. Please check your internet or database configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin({
      id: 'guest-' + Math.random().toString(36).substr(2, 9),
      username: 'guest',
      name: 'Guest User',
      avatar: DEFAULT_GUEST_AVATAR,
      isAdmin: false,
      isGuest: true
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6 relative">
        
        <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">Toastmasters</h2>
            <p className="mt-2 text-sm text-gray-600">Slot Booking System</p>
        </div>

        {isResetMode ? (
            // --- FORGOT PASSWORD INFO (No Email Form) ---
            <div className="mt-8 space-y-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm leading-5 font-medium text-yellow-800">
                                Contact Administrator
                            </h3>
                            <div className="mt-2 text-sm leading-5 text-yellow-700">
                                <p>
                                    Since this club application uses internal email addresses, automated password reset links cannot be delivered.
                                </p>
                                <p className="mt-2 font-bold">
                                    Please contact the VP Education to reset your password manually.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => { setIsResetMode(false); setError(''); }}
                        className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 transition"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        ) : (
            // --- LOGIN FORM ---
            <form className="mt-8 space-y-6" onSubmit={handleAuth}>
                <div className="rounded-md shadow-sm -space-y-px">
                    <div>
                    <label htmlFor="email" className="sr-only">Email address</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        disabled={loading}
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    </div>
                    <div>
                    <label htmlFor="password" className="sr-only">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        disabled={loading}
                        minLength={6}
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 bg-white rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    </div>
                </div>
                
                <div className="flex justify-end">
                    <button 
                        type="button" 
                        onClick={() => { setIsResetMode(true); setError(''); }}
                        className="text-xs font-medium text-blue-900 hover:text-blue-700"
                    >
                        Forgot password?
                    </button>
                </div>

                {error && (
                    <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded border border-red-100">
                    {error}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                    type="submit"
                    disabled={loading}
                    className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                    >
                    {loading ? 'Processing...' : 'Sign in'}
                    </button>
                    
                    <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-3 text-gray-400 text-xs">OR</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    <button
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                    Continue as Guest
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};