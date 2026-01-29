import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Agenda } from './components/Agenda';
import { CalendarView } from './components/CalendarView';
import { Profile } from './components/Profile';
import { User } from './types';
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
    let channel: any;

    const runChecks = async () => {
      if (user && !user.isGuest) {
        // Fetch meetings to check dates and new additions
        const meetings = await dataService.getMeetings();
        NotificationService.checkReminders(user, meetings);
        NotificationService.checkForNewMeetings(meetings);
      }
    };

    if (user) {
        runChecks();

        // Realtime listener for new meetings
        channel = supabase
        .channel('table-db-changes')
        .on(
            'postgres_changes',
            {
            event: 'INSERT',
            schema: 'public',
            table: 'meetings',
            },
            (payload) => {
                // Only notify if permission granted
                if (NotificationService.getPermissionStatus() === 'granted') {
                    const newEvent = payload.new as any;
                    NotificationService.send(
                        "New Event Added! 📅",
                        `${newEvent.title} on ${new Date(newEvent.date).toLocaleDateString()}`
                    );
                }
            }
        )
        .subscribe();
    }

    return () => {
        if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  if (loadingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-900 font-bold">Loading...</div>;
  }

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const handleLogout = async () => {
    await dataService.logout();
    setUser(null);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'agenda':
        return <Agenda currentUser={user} />;
      case 'calendar':
        return <CalendarView currentUser={user} />;
      case 'profile':
        return <Profile user={user} onUpdate={setUser} onLogout={handleLogout} />;
      default:
        return <Agenda currentUser={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row max-w-7xl mx-auto shadow-2xl overflow-hidden md:h-screen">
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-blue-900">TM Booker</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setCurrentTab('agenda')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentTab === 'agenda' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <span>Agenda</span>
          </button>
          <button 
            onClick={() => setCurrentTab('calendar')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentTab === 'calendar' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Upcoming</span>
          </button>
          <button 
            onClick={() => setCurrentTab('profile')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${currentTab === 'profile' ? 'bg-blue-50 text-blue-900 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span>Profile</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center space-x-3">
            <img src={user.avatar} className="w-10 h-10 rounded-full" alt="" />
            <div className="overflow-hidden">
               <p className="text-sm font-bold truncate">{user.name}</p>
               <p className="text-xs text-gray-500">Member</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative no-scrollbar md:h-full">
        {renderContent()}
      </main>

      {/* Mobile Bottom Navigation (Sticky) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 pb-safe">
        <button 
          onClick={() => setCurrentTab('agenda')}
          className={`flex flex-col items-center p-2 rounded-lg ${currentTab === 'agenda' ? 'text-blue-900' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          <span className="text-[10px] font-medium mt-1">Agenda</span>
        </button>
        <button 
          onClick={() => setCurrentTab('calendar')}
          className={`flex flex-col items-center p-2 rounded-lg ${currentTab === 'calendar' ? 'text-blue-900' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="text-[10px] font-medium mt-1">Upcoming</span>
        </button>
        <button 
          onClick={() => setCurrentTab('profile')}
          className={`flex flex-col items-center p-2 rounded-lg ${currentTab === 'profile' ? 'text-blue-900' : 'text-gray-400'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-medium mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}

export default App;