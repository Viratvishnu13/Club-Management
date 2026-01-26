import React, { useEffect, useState } from 'react';
import { dataService } from '../services/store';
import { Meeting, User, RSVP, RSVPStatus } from '../types';

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
};

interface CalendarViewProps {
  currentUser: User;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ currentUser }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isRefresh, setIsRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // RSVP Modal State
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [rsvpMeetingId, setRsvpMeetingId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  
  // Edit State
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editForm, setEditForm] = useState({ 
    title: '', 
    date: '',
    venue: '',
    time: '',
    theme: '',
    wordOfTheDay: ''
  });

  useEffect(() => {
    const fetchMeetings = async () => {
      setLoading(true);
      const data = await dataService.getMeetings();
      setMeetings(data);
      setLoading(false);
    };
    fetchMeetings();
  }, [isRefresh]);

  const handleEditClick = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    const dateObj = new Date(meeting.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    setEditForm({ 
      title: meeting.title, 
      date: dateStr,
      venue: meeting.venue || '',
      time: meeting.time || '',
      theme: meeting.theme || '',
      wordOfTheDay: meeting.wordOfTheDay || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMeeting && editForm.title && editForm.date) {
      await dataService.updateMeeting(editingMeeting.id, {
        title: editForm.title,
        date: editForm.date,
        venue: editForm.venue,
        time: editForm.time,
        theme: editForm.theme,
        wordOfTheDay: editForm.wordOfTheDay
      });
      setEditingMeeting(null);
      setIsRefresh(prev => prev + 1);
    }
  };

  const openRsvpModal = (meetingId: string) => {
    // RLS Restriction: Guests cannot write to DB
    if (currentUser.isGuest) {
        alert("Please sign in to RSVP. Guests cannot RSVP directly.");
        return;
    }
    setRsvpMeetingId(meetingId);
    setGuestName(currentUser.isGuest ? '' : currentUser.name);
    setShowRsvpModal(true);
  };

  const handleSubmitRsvp = async (status: RSVPStatus) => {
    if (!rsvpMeetingId) return;
    
    const rsvpPayload: RSVP = {
      userId: currentUser.id,
      name: currentUser.name,
      status: status,
      isGuest: false // Guests blocked at entry
    };

    await dataService.rsvpToMeeting(rsvpMeetingId, rsvpPayload);
    
    setShowRsvpModal(false);
    setRsvpMeetingId(null);
    setGuestName('');
    setIsRefresh(prev => prev + 1);
  };

  if (loading) {
     return <div className="p-8 text-center text-gray-500">Loading Events...</div>;
  }

  return (
    <div className="pb-20">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
        <p className="text-xs text-gray-600">Don't miss out on special sessions</p>
      </div>

      <div className="p-4 space-y-4">
        {meetings.map((meeting) => {
          const myRsvp = meeting.rsvps.find(r => r.userId === currentUser.id);
          const yesCount = meeting.rsvps.filter(r => r.status === 'yes').length;
          const maybeCount = meeting.rsvps.filter(r => r.status === 'maybe').length;

          return (
            <div key={meeting.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative transition hover:shadow-md">
              <div className="bg-blue-900 h-2 w-full"></div>
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{meeting.title}</h3>
                    <p className="text-indigo-700 font-semibold text-sm mt-1">{formatDate(meeting.date)}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="bg-blue-100 text-blue-900 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide border border-blue-200">
                      {meeting.type}
                    </div>
                    {currentUser.isAdmin && (
                      <button 
                        onClick={() => handleEditClick(meeting)}
                        className="text-gray-500 hover:text-blue-700 transition p-1 rounded-full hover:bg-blue-50"
                        title="Edit Meeting"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
                  {meeting.venue && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="font-medium">{meeting.venue}</span>
                    </div>
                  )}
                  {meeting.time && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="font-medium">{meeting.time}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-600 font-medium">
                     <span className="font-bold text-gray-900">{yesCount}</span> Members Going
                  </div>
                  
                  <button 
                    onClick={() => openRsvpModal(meeting.id)}
                    className={`px-5 py-2 text-sm font-bold rounded-lg transition shadow-sm flex items-center gap-2 ${
                      myRsvp 
                        ? (myRsvp.status === 'yes' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200')
                        : 'bg-blue-900 text-white hover:bg-blue-800'
                    }`}
                  >
                    {myRsvp ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{myRsvp.status === 'yes' ? 'Going' : 'Not Going'}</span>
                      </>
                    ) : (
                      <span>RSVP</span>
                    )}
                  </button>
                </div>

                {/* Admin View of RSVPs */}
                {currentUser.isAdmin && meeting.rsvps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <details className="text-xs">
                       <summary className="cursor-pointer font-bold text-gray-500 hover:text-gray-800">
                          View RSVP List (Admin Only)
                       </summary>
                       <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <p className="font-bold text-green-700 mb-1">Going ({yesCount})</p>
                            <ul className="list-disc pl-4 text-gray-600">
                               {meeting.rsvps.filter(r => r.status === 'yes').map((r, i) => (
                                 <li key={i}>{r.name}</li>
                               ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-bold text-gray-500 mb-1">Maybe/No ({maybeCount})</p>
                            <ul className="list-disc pl-4 text-gray-500">
                               {meeting.rsvps.filter(r => r.status === 'maybe').map((r, i) => (
                                 <li key={i}>{r.name}</li>
                               ))}
                            </ul>
                          </div>
                       </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {meetings.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No upcoming events found.
          </div>
        )}
      </div>

      {/* RSVP Modal */}
      {showRsvpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
             <h3 className="text-lg font-bold mb-4 text-gray-900">Confirm Attendance</h3>
             
             <div className="flex flex-col gap-3">
               <button 
                 onClick={() => handleSubmitRsvp('yes')}
                 className="w-full bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2"
               >
                 <span>Yes, I'm Going!</span>
               </button>
               <button 
                 onClick={() => handleSubmitRsvp('maybe')}
                 className="w-full bg-white text-gray-600 border border-gray-300 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors"
               >
                 Maybe Next Time
               </button>
               <button 
                 onClick={() => { setShowRsvpModal(false); setRsvpMeetingId(null); }}
                 className="w-full text-gray-400 text-xs hover:text-gray-600 mt-2"
               >
                 Cancel
               </button>
             </div>
           </div>
        </div>
      )}

      {/* Edit Modal (Existing) */}
      {editingMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
             <h3 className="text-xl font-bold mb-4 text-gray-900">Edit Meeting</h3>
             <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Same form fields as before */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                  <input 
                    type="text" 
                    value={editForm.time}
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Venue</label>
                  <input 
                    type="text" 
                    value={editForm.venue}
                    placeholder="e.g. Community Hall"
                    onChange={(e) => setEditForm({...editForm, venue: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Theme</label>
                  <input 
                    type="text" 
                    value={editForm.theme}
                    placeholder="Optional theme"
                    onChange={(e) => setEditForm({...editForm, theme: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Word of the Day</label>
                  <input 
                    type="text" 
                    value={editForm.wordOfTheDay}
                    placeholder="Optional word"
                    onChange={(e) => setEditForm({...editForm, wordOfTheDay: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setEditingMeeting(null)} 
                    className="flex-1 bg-gray-100 py-2.5 rounded-lg text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-900 py-2.5 rounded-lg text-white font-bold hover:bg-blue-800 transition-colors shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};