import { Meeting, User } from '../types';

export const NotificationService = {
  // Check permission status
  getPermissionStatus: () => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  },

  // Request permission
  requestPermission: async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Send a system notification
  send: async (title: string, body: string, icon?: string) => {
    // 1. SMART CHECK: If the user is actively looking at the app, don't show a system notification.
    if (document.visibilityState === 'visible') {
        console.log("App is focused. Suppressing system notification:", title);
        return;
    }

    if (Notification.permission === 'granted') {
      // Changed to 'any' because 'vibrate' is sometimes missing from standard NotificationOptions type definition
      const options: any = {
        body,
        icon: icon || 'https://cdn-icons-png.flaticon.com/512/1165/1165674.png',
        vibrate: [200, 100, 200],
        badge: 'https://cdn-icons-png.flaticon.com/512/1165/1165674.png',
        tag: 'tm-booker-notification', // Tag prevents stacking identical notifications
        requireInteraction: true // Keeps notification on screen until user clicks
      };

      // 2. Use Service Worker if available (Better for PWA/Background)
      if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg) {
                await reg.showNotification(title, options);
                return;
            }
          } catch (e) {
            console.error("SW Notification failed, falling back", e);
          }
      }

      // 3. Fallback for standard web pages if SW fails
      new Notification(title, options);
    }
  },

  // Check for newly added meetings compared to local storage
  checkForNewMeetings: (meetings: Meeting[]) => {
    if (Notification.permission !== 'granted') return;

    const knownIdsStr = localStorage.getItem('known_meeting_ids');
    const currentIds = meetings.map(m => m.id);

    // First time logic: if no data, just save current state and exit to prevent spam
    if (!knownIdsStr) {
      localStorage.setItem('known_meeting_ids', JSON.stringify(currentIds));
      return;
    }

    const knownIds: string[] = JSON.parse(knownIdsStr);
    
    // Find meetings present now that weren't known before
    const newMeetings = meetings.filter(m => !knownIds.includes(m.id));

    if (newMeetings.length > 0) {
      const m = newMeetings[0];
      const count = newMeetings.length;
      
      const title = count === 1 ? "New Event Added! 📅" : `${count} New Events Added! 📅`;
      const body = count === 1 
        ? `${m.title} has been scheduled.`
        : `Check the agenda for ${count} new upcoming meetings.`;

      NotificationService.send(title, body);
    }
    
    // Always sync state
    localStorage.setItem('known_meeting_ids', JSON.stringify(currentIds));
  },

  // Main logic to check for reminders
  checkReminders: (user: User, meetings: Meeting[]) => {
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Normalize dates to ignore time for comparison
    const isSameDay = (d1: Date, d2: Date) => 
      d1.getDate() === d2.getDate() && 
      d1.getMonth() === d2.getMonth() && 
      d1.getFullYear() === d2.getFullYear();

    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.date);

      // Check if meeting is tomorrow
      if (isSameDay(meetingDate, tomorrow)) {
        
        // 1. General Meeting Reminder
        // Key format: notified_meeting_[meetingID]
        const meetingKey = `notified_meeting_${meeting.id}`;
        if (!localStorage.getItem(meetingKey)) {
          NotificationService.send(
            "Meeting Tomorrow! 📅",
            `We have a meeting scheduled for tomorrow at ${meeting.time || 'usual time'}. Don't miss it!`
          );
          localStorage.setItem(meetingKey, 'true');
        }

        // Check for user roles in this meeting
        const userSlots = meeting.slots.filter(s => s.userId === user.id);

        userSlots.forEach(slot => {
          // Key format: notified_role_[slotID]
          const roleKey = `notified_role_${slot.id}`;
          
          if (!localStorage.getItem(roleKey)) {
            const isSpeaker = slot.roleName.toLowerCase().includes('speaker');

            if (isSpeaker) {
              // 3. Speaker specific message
              NotificationService.send(
                "Speech Jitters? 🦋",
                "Feeling nervous about your speech ah? Connect with your mentor for a quick run-through!"
              );
            } else {
              // 2. General Role message
              NotificationService.send(
                "Time to Shine! 🌟",
                `It is your time to shine as ${slot.roleName} tomorrow. You got this!`
              );
            }
            
            localStorage.setItem(roleKey, 'true');
          }
        });
      }
    });
  }
};