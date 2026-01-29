
import React, { useState, useEffect, useRef } from 'react';
import { Meeting, Slot, User } from '../types';
import { dataService, PATHWAYS, LEVELS, getProjects } from '../services/store';

// Simple formatting since we can't guarantee date-fns install in this environment
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Searchable Dropdown Helper Component
const SearchableDropdown = ({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-left cursor-pointer flex justify-between items-center text-sm"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>{value || placeholder}</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
             <input 
                type="text" 
                autoFocus
                placeholder="Search..."
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
             />
          </div>
          {filteredOptions.length > 0 ? (
             filteredOptions.map(opt => (
                <div 
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); setSearchTerm(''); }}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700"
                >
                  {opt}
                </div>
             ))
          ) : (
             <div className="px-4 py-2 text-sm text-gray-500 italic">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
};

interface AgendaProps {
  currentUser: User;
}

export const Agenda: React.FC<AgendaProps> = ({ currentUser }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isRefresh, setIsRefresh] = useState(0); 
  const [loading, setLoading] = useState(true);

  // Admin Modal States
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedMeetingForSlot, setSelectedMeetingForSlot] = useState<string | null>(null);
  const [selectedAdminUser, setSelectedAdminUser] = useState<User | null>(null);
  const [adminSpeakerForm, setAdminSpeakerForm] = useState({
    pathway: '',
    level: 'Level 1',
    project: '',
    title: ''
  });
  
  // Custom Role Modal State
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  
  // Speaker Booking Modal State
  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [speakerForm, setSpeakerForm] = useState({
    pathway: '',
    level: 'Level 1',
    project: '',
    title: ''
  });
  
  // Create Meeting Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMeetingData, setNewMeetingData] = useState({
    date: '',
    title: '',
    type: 'Regular', // Default
    theme: '',
    wordOfTheDay: '',
    venue: '',
    time: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [fetchedMeetings, fetchedUsers] = await Promise.all([
        dataService.getMeetings(),
        dataService.getUsers()
      ]);
      
      setMeetings(fetchedMeetings);
      setUsers(fetchedUsers);
      setLoading(false);

      // Preserve selection logic
      if (fetchedMeetings.length > 0) {
        if (!selectedMeetingId || !fetchedMeetings.find(m => m.id === selectedMeetingId)) {
          setSelectedMeetingId(fetchedMeetings[0].id);
        }
      } else {
        setSelectedMeetingId(null);
      }
    };

    fetchData();
  }, [isRefresh]); // Remove selectedMeetingId from dep array to avoid infinite loops on selection change

  const currentMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Helper to find user in our local cache
  const getUser = (id: string | null) => users.find(u => u.id === id);

  const handleBook = async (slot: Slot) => {
    if (!currentMeeting || currentUser.isGuest) return;

    if (slot.roleName.toLowerCase().includes('speaker')) {
      setBookingSlot(slot);
      setSpeakerForm({ pathway: '', level: 'Level 1', project: '', title: '' });
      setShowSpeakerModal(true);
    } else {
      await dataService.assignSlot(currentMeeting.id, slot.id, currentUser.id);
      setIsRefresh(prev => prev + 1);
    }
  };

  const handleUnbook = async (slotId: string) => {
    if (!currentMeeting || currentUser.isGuest) return;
    await dataService.assignSlot(currentMeeting.id, slotId, null);
    setIsRefresh(prev => prev + 1);
  };

  const handleAdminAssign = async (userId: string) => {
    if (!selectedMeetingForSlot || !selectedSlot) return;

    if (!userId) {
       await dataService.assignSlot(selectedMeetingForSlot, selectedSlot.id, null);
       setShowAdminModal(false);
       setSelectedSlot(null);
       setIsRefresh(prev => prev + 1);
       return;
    }

    const isSpeaker = selectedSlot.roleName.toLowerCase().includes('speaker');
    
    if (isSpeaker) {
        const user = getUser(userId);
        if (user) {
            setSelectedAdminUser(user);
            setAdminSpeakerForm({ pathway: '', level: 'Level 1', project: '', title: '' });
        }
    } else {
        await dataService.assignSlot(selectedMeetingForSlot, selectedSlot.id, userId);
        setShowAdminModal(false);
        setSelectedSlot(null);
        setIsRefresh(prev => prev + 1);
    }
  };

  const handleAdminSpeakerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMeetingForSlot && selectedSlot && selectedAdminUser) {
         await dataService.assignSlot(selectedMeetingForSlot, selectedSlot.id, selectedAdminUser.id, {
             pathway: adminSpeakerForm.pathway,
             level: adminSpeakerForm.level,
             project: adminSpeakerForm.project,
             title: adminSpeakerForm.title
         });
         setShowAdminModal(false);
         setSelectedSlot(null);
         setSelectedAdminUser(null);
         setIsRefresh(prev => prev + 1);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMeetingData.date && newMeetingData.title) {
      await dataService.createMeeting({
        date: newMeetingData.date,
        title: newMeetingData.title,
        type: newMeetingData.type as any,
        theme: newMeetingData.theme,
        wordOfTheDay: newMeetingData.wordOfTheDay,
        venue: newMeetingData.venue,
        time: newMeetingData.time
      });
      setShowCreateModal(false);
      setNewMeetingData({ date: '', title: '', type: 'Regular', theme: '', wordOfTheDay: '', venue: '', time: '' });
      setIsRefresh(prev => prev + 1);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!currentMeeting) return;
    if (window.confirm(`Are you sure you want to delete "${currentMeeting.title}"?`)) {
      await dataService.deleteMeeting(currentMeeting.id);
      setIsRefresh(prev => prev + 1);
    }
  };

  const handleDeleteSlot = async (meetingId: string, slotId: string) => {
    if (window.confirm("Are you sure you want to remove this slot completely?")) {
        await dataService.deleteSlot(meetingId, slotId);
        setIsRefresh(prev => prev + 1);
    }
  };

  const handleAddSpeaker = async () => {
    if (!currentMeeting) return;
    // Uses the new method to add both Speaker and Evaluator
    await dataService.addSpeakerAndEvaluator(currentMeeting.id);
    setIsRefresh(prev => prev + 1);
  };

  const handleAddCustomSlot = () => {
    if (!currentMeeting) return;
    setCustomRoleName('');
    setShowCustomRoleModal(true);
  };

  const handleSubmitCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customRoleName.trim() && currentMeeting) {
      await dataService.addSlot(currentMeeting.id, customRoleName.trim());
      setShowCustomRoleModal(false);
      setIsRefresh(prev => prev + 1);
    }
  };

  const handleSpeakerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMeeting || !bookingSlot) return;
    
    await dataService.assignSlot(currentMeeting.id, bookingSlot.id, currentUser.id, {
      pathway: speakerForm.pathway,
      level: speakerForm.level,
      project: speakerForm.project,
      title: speakerForm.title
    });
    
    setShowSpeakerModal(false);
    setIsRefresh(prev => prev + 1);
  };

  const openAdminAssign = (meetingId: string, slot: Slot) => {
    setSelectedMeetingForSlot(meetingId);
    setSelectedSlot(slot);
    setSelectedAdminUser(null);
    setShowAdminModal(true);
  };

  if (loading && meetings.length === 0) {
      return <div className="p-8 text-center text-gray-500">Loading Agenda...</div>;
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Weekly Agenda</h2>
          <p className="text-xs text-gray-500">
            {currentUser.isGuest ? "View upcoming roles (Guest Mode)" : "Book your roles for upcoming meetings"}
          </p>
        </div>
        {currentUser.isAdmin && (
           <button 
             type="button"
             onClick={() => setShowCreateModal(true)}
             className="bg-blue-900 text-white p-2 rounded-full shadow-lg hover:bg-blue-800"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
             </svg>
           </button>
        )}
      </div>

      {/* Date Selector */}
      <div className="flex overflow-x-auto no-scrollbar p-4 gap-3 bg-gray-50">
        {meetings.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setSelectedMeetingId(m.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMeetingId === m.id 
                ? 'bg-blue-900 text-white shadow-md' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            {formatDate(m.date)}
            {m.type !== 'Regular' && <span className="ml-1 text-[10px] opacity-75">({m.type})</span>}
          </button>
        ))}
      </div>

      {/* Meeting Details */}
      {currentMeeting ? (
        <div className="px-4 mt-2">
           <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
              <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">{currentMeeting.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${currentMeeting.type === 'Regular' ? 'bg-blue-100 text-blue-900' : 'bg-purple-100 text-purple-900'}`}>
                      {currentMeeting.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-1 font-medium">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {formatDate(currentMeeting.date)}
                  </p>
                </div>
                {currentUser.isAdmin && (
                  <button
                    type="button"
                    onClick={handleDeleteMeeting}
                    className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Delete Meeting"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4 text-sm">
                 <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-bold tracking-wide">Venue</span>
                      <span className="text-gray-900 font-medium">{currentMeeting.venue || 'TBD'}</span>
                    </div>
                 </div>
                 <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                      <span className="block text-xs text-gray-500 uppercase font-bold tracking-wide">Time</span>
                      <span className="text-gray-900 font-medium">{currentMeeting.time || 'TBD'}</span>
                    </div>
                 </div>
                 {currentMeeting.theme && (
                   <div className="flex items-start gap-2 mt-2 md:mt-0">
                      <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      <div>
                        <span className="block text-xs text-gray-500 uppercase font-bold tracking-wide">Theme</span>
                        <span className="text-indigo-700 font-bold">{currentMeeting.theme}</span>
                      </div>
                   </div>
                 )}
                 {currentMeeting.wordOfTheDay && (
                   <div className="flex items-start gap-2 mt-2 md:mt-0">
                      <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                      <div>
                        <span className="block text-xs text-gray-500 uppercase font-bold tracking-wide">Word of the Day</span>
                        <span className="text-pink-700 font-bold italic">"{currentMeeting.wordOfTheDay}"</span>
                      </div>
                   </div>
                 )}
              </div>
           </div>

           {/* Slots Grid */}
           <div className="space-y-3">
             {currentMeeting.slots.length === 0 && (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-200 border-dashed">
                    <p className="text-gray-500 text-sm">No roles added yet for this event.</p>
                    {currentUser.isAdmin && (
                        <p className="text-xs text-blue-600 mt-1">Use the buttons below to add roles.</p>
                    )}
                </div>
             )}
             
             {currentMeeting.slots.map(slot => {
               const assignedUser = getUser(slot.userId);
               const isMe = slot.userId === currentUser.id;
               const isOpen = !slot.userId;

               return (
                 <div key={slot.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
                   <div className="flex items-center space-x-4 flex-1">
                     {/* Avatar Area */}
                     <div className="flex-shrink-0">
                       {assignedUser ? (
                         <img 
                           src={assignedUser.avatar} 
                           alt={assignedUser.name} 
                           className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-sm"
                         />
                       ) : (
                         <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                           </svg>
                         </div>
                       )}
                     </div>
                     
                     {/* Text Area */}
                     <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-bold text-gray-900">{slot.roleName}</h4>
                       {assignedUser ? (
                         <div className="flex flex-col">
                           <span className="text-sm text-gray-800 font-semibold">{assignedUser.name}</span>
                           <span className="text-xs text-gray-500">Booked {formatDate(currentMeeting.date)}</span>
                           {slot.speechDetails && (
                             <div className="mt-1.5 bg-blue-50 p-2 rounded-lg border border-blue-100 text-xs text-blue-900">
                               <p className="font-bold">{slot.speechDetails.pathway} - {slot.speechDetails.level}</p>
                               <p className="font-semibold mt-0.5">{slot.speechDetails.project}</p>
                               <p className="italic text-gray-600 mt-0.5">"{slot.speechDetails.title}"</p>
                             </div>
                           )}
                         </div>
                       ) : (
                         <span className="text-sm text-green-600 font-medium italic">Available for booking</span>
                       )}
                     </div>
                   </div>

                   {/* Action Area */}
                   <div className="flex flex-col items-end space-y-2 ml-4">
                     {isOpen && !currentUser.isGuest && (
                       <button 
                         type="button"
                         onClick={() => handleBook(slot)}
                         className="px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full hover:bg-indigo-100 transition shadow-sm border border-indigo-100 whitespace-nowrap"
                       >
                         Book
                       </button>
                     )}
                     
                     {isMe && !isOpen && (
                       <button 
                         type="button"
                         onClick={() => handleUnbook(slot.id)}
                         className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition shadow-sm border border-red-100 flex items-center gap-1"
                         title="Leave Role"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                         <span className="text-xs font-bold">Leave</span>
                       </button>
                     )}

                     {currentUser.isAdmin && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openAdminAssign(currentMeeting.id, slot); }}
                            className="text-gray-500 hover:text-blue-700 p-2 bg-gray-50 rounded-full hover:bg-blue-50 transition"
                            title="Admin Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteSlot(currentMeeting.id, slot.id); }}
                            className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-full hover:bg-red-100 transition border border-red-100"
                            title="Delete Slot"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                     )}
                   </div>
                 </div>
               );
             })}

             {/* Admin Add Slot Controls */}
             {currentUser.isAdmin && (
                 <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
                    <button 
                      type="button"
                      onClick={handleAddSpeaker}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-800 font-bold hover:bg-blue-50 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Speaker & Evaluator
                    </button>
                    <button 
                      type="button"
                      onClick={handleAddCustomSlot}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Custom Role
                    </button>
                 </div>
             )}
           </div>
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500">
           {meetings.length === 0 ? "No meetings scheduled. Check back later!" : "Select a date above to view details."}
        </div>
      )}

      {/* Admin Assign Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 transform transition-all">
            <h3 className="text-lg font-bold mb-4 text-gray-900 border-b pb-2">
                {selectedAdminUser ? 'Speech Details' : <>Assign Role: <span className="text-blue-800">{selectedSlot?.roleName}</span></>}
            </h3>
            
            {!selectedAdminUser ? (
                // User List View
                <>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    <button 
                        type="button"
                        onClick={() => handleAdminAssign(null as any)} 
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-700 font-medium rounded border border-transparent hover:border-red-100 transition-colors"
                    >
                        🚫 Clear Slot (Unassign)
                    </button>
                    {users.map(u => (
                        <button
                        key={u.id}
                        type="button"
                        onClick={() => handleAdminAssign(u.id)}
                        className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-colors"
                        >
                        <img src={u.avatar} alt="" className="h-8 w-8 rounded-full border border-gray-200"/>
                        <span className="text-sm font-semibold text-gray-800">{u.name}</span>
                        </button>
                    ))}
                    </div>
                    <button 
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="mt-4 w-full bg-gray-200 py-2.5 rounded-lg text-gray-800 font-bold hover:bg-gray-300 transition-colors"
                    >
                    Cancel
                    </button>
                </>
            ) : (
                // Speech Details Form View
                <form onSubmit={handleAdminSpeakerSubmit} className="space-y-4">
                   <div className="flex items-center gap-3 mb-4 bg-blue-50 p-2 rounded-lg">
                       <img src={selectedAdminUser.avatar} className="w-8 h-8 rounded-full" alt="avatar"/>
                       <span className="font-bold text-gray-800">{selectedAdminUser.name}</span>
                   </div>

                   <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Pathway</label>
                      <SearchableDropdown 
                        options={PATHWAYS}
                        value={adminSpeakerForm.pathway}
                        onChange={(val) => setAdminSpeakerForm({...adminSpeakerForm, pathway: val})}
                        placeholder="Select Pathway"
                      />
                   </div>
                   
                   <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Level</label>
                      <select 
                        value={adminSpeakerForm.level}
                        onChange={(e) => setAdminSpeakerForm({...adminSpeakerForm, level: e.target.value, project: ''})}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      >
                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                   </div>

                   <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Project</label>
                      <SearchableDropdown 
                        options={getProjects(adminSpeakerForm.pathway, adminSpeakerForm.level)}
                        value={adminSpeakerForm.project}
                        onChange={(val) => setAdminSpeakerForm({...adminSpeakerForm, project: val})}
                        placeholder="Select Project"
                      />
                   </div>

                   <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Speech Title</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. The Power of Silence"
                        value={adminSpeakerForm.title}
                        onChange={(e) => setAdminSpeakerForm({...adminSpeakerForm, title: e.target.value})}
                        className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                   </div>

                   <div className="flex gap-3 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setSelectedAdminUser(null)} 
                        className="flex-1 bg-gray-100 py-2 rounded-lg text-gray-700 font-bold hover:bg-gray-200 transition-colors text-sm"
                      >
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={!adminSpeakerForm.pathway || !adminSpeakerForm.project || !adminSpeakerForm.title}
                        className="flex-1 bg-blue-900 py-2 rounded-lg text-white font-bold hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Assign
                      </button>
                   </div>
                </form>
            )}
          </div>
        </div>
      )}

      {/* Speaker Booking Modal */}
      {showSpeakerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
             <h3 className="text-xl font-bold mb-4 text-gray-900">Book Speech</h3>
             <form onSubmit={handleSpeakerSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pathway</label>
                  <SearchableDropdown 
                    options={PATHWAYS}
                    value={speakerForm.pathway}
                    onChange={(val) => setSpeakerForm({...speakerForm, pathway: val})}
                    placeholder="Select Pathway"
                  />
               </div>
               
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
                  <select 
                    value={speakerForm.level}
                    onChange={(e) => setSpeakerForm({...speakerForm, level: e.target.value, project: ''})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
               </div>

               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Project</label>
                  <SearchableDropdown 
                    options={getProjects(speakerForm.pathway, speakerForm.level)}
                    value={speakerForm.project}
                    onChange={(val) => setSpeakerForm({...speakerForm, project: val})}
                    placeholder="Select Project"
                  />
               </div>

               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Speech Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. The Power of Silence"
                    value={speakerForm.title}
                    onChange={(e) => setSpeakerForm({...speakerForm, title: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
               </div>

               <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowSpeakerModal(false)} 
                    className="flex-1 bg-gray-100 py-2.5 rounded-lg text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={!speakerForm.pathway || !speakerForm.project || !speakerForm.title}
                    className="flex-1 bg-blue-900 py-2.5 rounded-lg text-white font-bold hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm Booking
                  </button>
               </div>
             </form>
           </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
             <h3 className="text-xl font-bold mb-4 text-gray-900">Create New Meeting</h3>
             <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
                    <input 
                      type="date" 
                      required
                      value={newMeetingData.date}
                      onChange={(e) => setNewMeetingData({...newMeetingData, date: e.target.value})}
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 10:00 - 12:00"
                      value={newMeetingData.time}
                      onChange={(e) => setNewMeetingData({...newMeetingData, time: e.target.value})}
                      className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Weekly Meeting..."
                    value={newMeetingData.title}
                    onChange={(e) => setNewMeetingData({...newMeetingData, title: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>

                {/* New: Meeting Type Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Type</label>
                  <select
                    value={newMeetingData.type}
                    onChange={(e) => setNewMeetingData({...newMeetingData, type: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  >
                    <option value="Regular">Regular (Standard Roles)</option>
                    <option value="Special">Special Event (No Default Roles)</option>
                    <option value="Contest">Contest</option>
                  </select>
                  {newMeetingData.type === 'Special' && (
                    <p className="text-xs text-blue-600 mt-1">Special events start with empty roles. Add them manually later.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Venue</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Club Hall A"
                    value={newMeetingData.venue}
                    onChange={(e) => setNewMeetingData({...newMeetingData, venue: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Theme (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Leadership"
                    value={newMeetingData.theme}
                    onChange={(e) => setNewMeetingData({...newMeetingData, theme: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Word of the Day (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Magnanimous"
                    value={newMeetingData.wordOfTheDay}
                    onChange={(e) => setNewMeetingData({...newMeetingData, wordOfTheDay: e.target.value})}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-gray-100 py-3 rounded-xl text-gray-700 font-bold hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 bg-blue-900 py-3 rounded-xl text-white font-bold hover:bg-blue-800 transition-colors shadow-md">Create Meeting</button>
                </div>
             </form>
           </div>
        </div>
      )}

      {/* Custom Role Modal */}
      {showCustomRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
             <h3 className="text-xl font-bold mb-4 text-gray-900">Add Custom Role</h3>
             <form onSubmit={handleSubmitCustomRole} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Role Name</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    placeholder="e.g. Joke Master"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowCustomRoleModal(false)} 
                    className="flex-1 bg-gray-100 py-2.5 rounded-lg text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 bg-blue-900 py-2.5 rounded-lg text-white font-bold hover:bg-blue-800 transition-colors shadow-md"
                  >
                    Add Role
                  </button>
                </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
};
