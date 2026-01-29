import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { dataService } from '../services/store';
import { NotificationService } from '../services/notificationService';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onLogout }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [allUsers, setAllUsers] = useState<User[]>([]); // For Admin Directory
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotificationStatus(NotificationService.getPermissionStatus());
    
    // If admin, fetch all users for the directory
    if (user.isAdmin) {
        dataService.getUsers().then(setAllUsers);
    }
  }, [user.isAdmin]);

  const handleEnableNotifications = async () => {
    const granted = await NotificationService.requestPermission();
    setNotificationStatus(granted ? 'granted' : 'denied');
    if (granted) {
      NotificationService.send('Notifications Enabled', 'You will now receive reminders for meetings and roles!');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    // This updates the actual Auth password for the logged-in user
    const success = await dataService.updatePassword(password);
    setLoading(false);

    if (success) {
      setMessage('Success! Your login password has been updated.');
      setPassword('');
      setConfirmPassword('');
    } else {
      setMessage('Failed to update password. Try again.');
    }
  };

  // Logic to resize image and convert to Base64
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const base64Image = await resizeAndConvertToBase64(file);
      const updated = await dataService.updateUser(user.id, { avatar: base64Image });
      if (updated) {
        onUpdate(updated);
        setMessage('Profile photo updated successfully!');
      }
    } catch (err) {
      console.error(err);
      setMessage('Error uploading image. Please try a smaller file.');
    } finally {
      setLoading(false);
    }
  };

  const resizeAndConvertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; // Limit width to save DB space
          const scaleSize = MAX_WIDTH / img.width;
          
          // Only resize if bigger than MAX_WIDTH
          if (scaleSize < 1) {
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
          } else {
              canvas.width = img.width;
              canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Compress to JPEG with 0.7 quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Header Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="relative group">
             <img src={user.avatar} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-indigo-50 shadow-sm" />
             {!user.isGuest && (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-900 text-white p-1.5 rounded-full border-2 border-white hover:bg-blue-700 transition"
                  title="Upload Photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
             )}
          </div>
          <h3 className="mt-4 text-xl font-bold text-gray-900">{user.name}</h3>
          
          <div className="flex flex-col items-center mt-1">
            {user.email && (
                <p className="text-sm text-gray-600 font-medium">{user.email}</p>
            )}
            <p className="text-xs text-gray-400">@{user.username}</p>
          </div>
          
          {user.isAdmin && <span className="mt-2 text-xs font-bold text-blue-900 bg-blue-100 px-3 py-1 rounded-full">Administrator</span>}
          {user.isGuest && <span className="mt-2 text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Guest Account</span>}
        </div>

        {/* Notification Settings */}
        {!user.isGuest && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
             <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Preferences</h4>
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-gray-900">Push Notifications</p>
                   <p className="text-xs text-gray-500">Get reminders for meetings and your roles</p>
                </div>
                {notificationStatus === 'granted' ? (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">Enabled</span>
                ) : (
                  <button 
                    onClick={handleEnableNotifications}
                    className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 hover:bg-blue-100"
                  >
                    Enable
                  </button>
                )}
             </div>
          </div>
        )}

        {/* Avatar Settings - Only for Registered Users */}
        {!user.isGuest && (
            <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Change Profile Photo</h4>
              
              <div className="space-y-3">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden" 
                  />
                  
                  <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition"
                  >
                      <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-600 font-medium">Click to upload from device</p>
                      <p className="text-xs text-gray-500">JPG, PNG, GIF</p>
                  </div>
                  
                  {loading && <p className="text-center text-xs text-blue-600 animate-pulse">Processing image...</p>}
              </div>
            </div>
        )}

        {/* Change Password */}
        {!user.isGuest && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Change Password</h4>
              <p className="text-xs text-gray-500 mb-4">
                Update your Supabase login credentials directly below.
              </p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">New Password</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Confirm Password</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                {message && <p className={`text-sm ${message.includes('Success') || message.includes('Avatar') || message.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
        )}

        {/* Admin Directory */}
        {user.isAdmin && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider flex items-center justify-between">
                    <span>Club Directory (Admin)</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{allUsers.length} Users</span>
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {allUsers.map(u => (
                        <div key={u.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-100 transition">
                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                                <p className="text-xs text-blue-600 truncate select-all">{u.email}</p>
                            </div>
                            {u.isAdmin && <span className="ml-auto text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Admin</span>}
                        </div>
                    ))}
                </div>
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800 border border-yellow-100">
                    <strong>Tip:</strong> Copy an email above and use it in the Supabase SQL Editor to manually reset a password if a user forgets it.
                </div>
            </div>
        )}

        <button 
          onClick={onLogout}
          className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-semibold hover:bg-red-100 transition"
        >
          {user.isGuest ? 'Exit Guest Mode (Login)' : 'Logout'}
        </button>
      </div>
    </div>
  );
};