import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Agenda } from './components/Agenda';
import { CalendarView } from './components/CalendarView';
import { Profile } from './components/Profile';
import { User, NotificationLog } from './types';
import { dataService } from './services/store';
import { NotificationService } from './services/notificationService';
import { supabase } from './services/supabaseClient';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<'agenda' | 'calendar' | 'profile'>('agenda');
  const [loadingSession, setLoadingSession] = useState(true);

  // Restore Session on Mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = await dataService.getCurrentSession();
      if (storedUser) {
        setUser(storedUser);
      }
      setLoadingSession(false);
    };
    restoreSession();
  }, []);

  // Trigger Notification Check when User logs in & Setup Realtime Listener
  useEffect(() => {
    let meetingsChannel: any;
    let notificationChannel: any;

    const runChecks = async () => {
      if (user && !user.isGuest) {
        // 1. Initial Checks for Local Reminders
        const meetings = await dataService.getMeetings();
        NotificationService.checkForNewMeetings(meetings);
        NotificationService.checkReminders(user, meetings);

        // 2. Realtime Subscription for Meetings (New Events)
        meetingsChannel = supabase.channel('public:meetings')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meetings' }, payload => {
            const newMeeting = payload.new as any;
            NotificationService.send("New Event Added! 📅", `${newMeeting.title} has been scheduled.`);
          })
          .subscribe();

        // 3. Realtime Subscription for Custom Admin Notifications
        notificationChannel = supabase.channel('public:notifications')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
             const notif = payload.new as NotificationLog;
             // Check if notification is for everyone (null) or specifically for this user
             if (notif.target_user_id === null || notif.target_user_id === user.id) {
                 NotificationService.send(notif.title, notif.body);
             }
          })
          .subscribe();
      }
    };

    runChecks();

    return () => {
      if (meetingsChannel) supabase.removeChannel(meetingsChannel);
      if (notificationChannel) supabase.removeChannel(notificationChannel);
    };
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (loadingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto shadow-2xl relative">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {currentTab === 'agenda' && <Agenda currentUser={user} />}
        {currentTab === 'calendar' && <CalendarView currentUser={user} />}
        {currentTab === 'profile' && <Profile user={user} onUpdate={handleUpdateUser} onLogout={handleLogout} />}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 flex justify-around items-center h-16 shrink-0 z-20">
        <button 
          onClick={() => setCurrentTab('agenda')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentTab === 'agenda' ? 'text-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-[10px] font-bold">Agenda</span>
        </button>

        <button 
          onClick={() => setCurrentTab('calendar')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentTab === 'calendar' ? 'text-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-bold">Events</span>
        </button>

        <button 
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentTab === 'profile' ? 'text-blue-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </div>
    </div>
  );
}

export default App;