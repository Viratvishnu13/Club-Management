import { User, Meeting, Slot, DEFAULT_ROLES, SpeechDetails, RSVP, DEFAULT_AVATAR } from '../types';
import { supabase } from './supabaseClient';

export const PATHWAYS = [
  "Dynamic Leadership",
  "Effective Coaching",
  "Engaging Humor",
  "Innovative Planning",
  "Leadership Development",
  "Motivational Strategies",
  "Persuasive Influence",
  "Presentation Mastery",
  "Strategic Relationships",
  "Team Collaboration",
  "Visionary Communication"
];

export const LEVELS = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];

// --- PROJECT DATA ---

// Updated to New Level 1 Curriculum
const LEVEL_1_PROJECTS = [
  "Ice Breaker",
  "Writing a Speech with Purpose",
  "Introduction to Vocal Variety and Body Language",
  "Evaluation and Feedback"
];

const LEVEL_2_COMMON = ["Introduction to Toastmasters Mentoring"];

const LEVEL_3_ELECTIVES = [
  "Active Listening",
  "Connect with Storytelling",
  "Connect with Your Audience",
  "Create a Podcast",
  "Focus on the Positive",
  "Inspire Your Audience",
  "Interpersonal Communication",
  "Know Your Sense of Humor",
  "Make Connections Through Networking",
  "Prepare for an Interview",
  "Understanding Vocal Variety",
  "Using Descriptive Language",
  "Using Presentation Software"
];

const LEVEL_4_ELECTIVES = [
  "Building a Social Media Presence",
  "Create a Podcast",
  "Manage Online Meetings",
  "Manage Projects Successfully",
  "Managing a Difficult Audience",
  "Public Relations Strategies",
  "Question-and-Answer Session",
  "Write a Compelling Blog"
];

const LEVEL_5_ELECTIVES = [
  "Ethical Leadership",
  "High Performance Leadership",
  "Leading in Your Volunteer Organization",
  "Lessons Learned",
  "Moderate a Panel Discussion",
  "Prepare to Speak Professionally"
];

// Required projects per Path and Level (excluding L1 which is global, and Electives)
const PATH_SPECIFIC_REQS: Record<string, Record<string, string[]>> = {
  "Dynamic Leadership": {
    "Level 2": ["Understanding Your Leadership Style", "Understanding Your Communication Style"],
    "Level 3": ["Negotiate the Best Outcome"],
    "Level 4": ["Manage Change"],
    "Level 5": ["Lead in Any Situation"]
  },
  "Effective Coaching": {
    "Level 2": ["Understanding Your Leadership Style", "Understanding Your Communication Style"],
    "Level 3": ["Reaching Consensus"],
    "Level 4": ["Improvement Through Positive Coaching"],
    "Level 5": ["High Performance Leadership"]
  },
  "Engaging Humor": {
    "Level 2": ["Know Your Sense of Humor", "Connect with Your Audience"],
    "Level 3": ["Engage Your Audience with Humor"],
    "Level 4": ["The Power of Humor in an Impromptu Speech"],
    "Level 5": ["Deliver Your Message with Humor"]
  },
  "Innovative Planning": {
    "Level 2": ["Understanding Your Leadership Style", "Connect with Your Audience"],
    "Level 3": ["Present a Proposal"],
    "Level 4": ["Manage Projects Successfully"],
    "Level 5": ["High Performance Leadership"]
  },
  "Leadership Development": {
    "Level 2": ["Understanding Your Leadership Style", "Managing Time"],
    "Level 3": ["Planning and Implementing"],
    "Level 4": ["Leading Your Team"],
    "Level 5": ["Manage Successful Events"]
  },
  "Motivational Strategies": {
    "Level 2": ["Understanding Your Communication Style", "Active Listening"],
    "Level 3": ["Understanding Emotional Intelligence"],
    "Level 4": ["Motivate Others"],
    "Level 5": ["Team Building"]
  },
  "Persuasive Influence": {
    "Level 2": ["Understanding Your Leadership Style", "Active Listening"],
    "Level 3": ["Understanding Conflict Resolution"],
    "Level 4": ["Leading in Difficult Situations"],
    "Level 5": ["High Performance Leadership"]
  },
  "Presentation Mastery": {
    "Level 2": ["Understanding Your Communication Style", "Effective Body Language"],
    "Level 3": ["Persuasive Speaking"],
    "Level 4": ["Managing a Difficult Audience"],
    "Level 5": ["Prepare to Speak Professionally"]
  },
  "Strategic Relationships": {
    "Level 2": ["Understanding Your Leadership Style", "Active Listening"],
    "Level 3": ["Make Connections Through Networking"],
    "Level 4": ["Public Relations Strategies"],
    "Level 5": ["Leading in Your Volunteer Organization"]
  },
  "Team Collaboration": {
    "Level 2": ["Understanding Your Leadership Style", "Active Listening"],
    "Level 3": ["Successful Collaboration"],
    "Level 4": ["Motivate Others"],
    "Level 5": ["Lead in Any Situation"]
  },
  "Visionary Communication": {
    "Level 2": ["Understanding Your Leadership Style", "Understanding Your Communication Style"],
    "Level 3": ["Develop a Communication Plan"],
    "Level 4": ["Communicate Change"],
    "Level 5": ["Develop Your Vision"]
  }
};

export const getProjects = (pathway: string, level: string): string[] => {
  if (!pathway || !level) return [];

  if (level === "Level 1") {
    return LEVEL_1_PROJECTS;
  }

  let projects: string[] = [];

  // Add Path Specific Requirements
  if (PATH_SPECIFIC_REQS[pathway] && PATH_SPECIFIC_REQS[pathway][level]) {
    projects = [...projects, ...PATH_SPECIFIC_REQS[pathway][level]];
  }

  // Add Common Level 2
  if (level === "Level 2") {
    projects = [...projects, ...LEVEL_2_COMMON];
  }

  // Add Electives
  if (level === "Level 3") {
    // Filter out if an elective is already a required project for this path (unlikely but safe)
    const electives = LEVEL_3_ELECTIVES.filter(e => !projects.includes(e));
    projects = [...projects, ...electives];
  }
  if (level === "Level 4") {
    const electives = LEVEL_4_ELECTIVES.filter(e => !projects.includes(e));
    projects = [...projects, ...electives];
  }
  if (level === "Level 5") {
    const electives = LEVEL_5_ELECTIVES.filter(e => !projects.includes(e));
    projects = [...projects, ...electives];
  }

  // Returned without sorting to preserve Required -> Elective order
  return projects; 
};

// --- DATA MAPPING HELPERS ---
const mapSlotFromDB = (s: any): Slot => ({
  id: s.id,
  roleName: s.role_name,
  userId: s.user_id,
  isLocked: s.is_locked,
  speechDetails: s.speech_details
});

// Helper to determine sort order
const getRoleRank = (roleName: string): number => {
  const r = roleName.toLowerCase();
  
  // Catch any variation of "Toastmaster" (e.g. "Toastmaster", "Toastmaster of the Day")
  if (r.includes("toastmaster")) return 1;
  if (r.includes("table topics")) return 2;
  if (r.includes("general evaluator")) return 3;
  
  // Dynamic Speakers: Prepared Speaker 1 -> 101, Speaker 2 -> 102
  if (r.includes("prepared speaker")) {
    const num = parseInt(r.replace(/\D/g, '')) || 99;
    return 100 + num;
  }

  // Dynamic Evaluators: Evaluator 1 -> 201, Evaluator 2 -> 202
  // Note: ensure "General Evaluator" doesn't get caught here (handled above)
  if (r.includes("evaluator") && !r.includes("general")) {
    const num = parseInt(r.replace(/\D/g, '')) || 99;
    return 200 + num;
  }

  // Aux roles
  if (r.includes("timer")) return 300;
  if (r.includes("ah-counter")) return 301;
  if (r.includes("grammarian")) return 302;

  // Custom roles at the end
  return 1000;
};

// Supabase returns snake_case, our app uses camelCase.
const mapMeetingFromDB = (m: any): Meeting => {
  const slots = m.slots ? m.slots.map(mapSlotFromDB) : [];

  // Robust Sort
  slots.sort((a: Slot, b: Slot) => {
    const rankA = getRoleRank(a.roleName);
    const rankB = getRoleRank(b.roleName);

    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const nameCompare = a.roleName.localeCompare(b.roleName);
    if (nameCompare !== 0) return nameCompare;
    return a.id.localeCompare(b.id);
  });

  // Handle Joined RSVPs (Best for RLS)
  let rsvps: RSVP[] = [];
  if (m.rsvps && Array.isArray(m.rsvps)) {
    rsvps = m.rsvps.map((r: any) => ({
      userId: r.user_id,
      name: r.name,
      status: r.status,
      isGuest: r.is_guest
    }));
  } 
  // Fallback for legacy JSON column
  else if (m.rsvp_list && Array.isArray(m.rsvp_list)) {
    rsvps = m.rsvp_list;
  }

  // --- AUTO-RSVP SYNC ---
  // Ensure every slot holder is in the RSVP list as 'yes'
  if (m.slots && Array.isArray(m.slots)) {
    m.slots.forEach((s: any) => {
      // Check for user_id and the joined user object (if fetched via getMeetings join)
      if (s.user_id) {
         const existingRsvp = rsvps.find(r => r.userId === s.user_id);
         
         if (!existingRsvp) {
             // User has a slot but no RSVP record.
             // If we have the user details from the join, add them.
             // Note: 'users' is the table alias from the join in getMeetings
             const userObj = s.users; 
             if (userObj) {
                 rsvps.push({
                     userId: s.user_id,
                     name: userObj.name || 'Member',
                     status: 'yes',
                     isGuest: userObj.is_guest
                 });
             }
         } else {
             // User has a slot and an RSVP. Ensure it is 'yes'.
             if (existingRsvp.status !== 'yes') {
                 existingRsvp.status = 'yes';
             }
         }
      }
    });
  }

  return {
    id: m.id,
    date: m.date,
    title: m.title,
    type: m.type as any,
    theme: m.theme,
    wordOfTheDay: m.word_of_the_day,
    venue: m.venue,
    time: m.time,
    rsvps: rsvps,
    slots: slots
  };
};

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  username: u.username,
  email: u.email, // Added email mapping
  name: u.name,
  avatar: u.avatar || DEFAULT_AVATAR,
  isAdmin: u.is_admin,
  isGuest: u.is_guest
});

class Store {
  
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data.map(mapUserFromDB);
  }

  async getMeetings(): Promise<Meeting[]> {
    // Fetch meetings and join slots (WITH USER DETAILS) and rsvps
    // We order by date ascending
    const { data, error } = await supabase
      .from('meetings')
      .select('*, slots(*, users(id, name, is_guest)), rsvps(*)')
      .order('date', { ascending: true });

    if (error || !data) {
      console.error('Error fetching meetings:', error);
      return [];
    }

    return data.map(mapMeetingFromDB);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const dbUpdates: any = {};
    if (updates.avatar) dbUpdates.avatar = updates.avatar;
    if (updates.name) dbUpdates.name = updates.name;
    // Allow updating email in profile table if needed (e.g. to fix desync)
    if (updates.email) dbUpdates.email = updates.email;
    
    // Update the profile table
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error("Error updating user profile", error);
      return null;
    }
    return mapUserFromDB(data);
  }

  // Updates the password for the CURRENTLY authenticated user
  async updatePassword(newPassword: string): Promise<boolean> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error("Error updating password", error);
      return false;
    }
    return true;
  }

  async createMeeting(data: Partial<Meeting>): Promise<Meeting | null> {
    const meetingPayload = {
      title: data.title,
      date: data.date,
      type: data.type || 'Regular',
      theme: data.theme,
      word_of_the_day: data.wordOfTheDay,
      venue: data.venue,
      time: data.time
    };

    const { data: meetingData, error: meetingError } = await supabase
      .from('meetings')
      .insert(meetingPayload)
      .select()
      .single();

    if (meetingError || !meetingData) {
      console.error("Error creating meeting", meetingError);
      return null;
    }

    // Only create default slots for Regular meetings
    if (meetingPayload.type === 'Regular') {
      const slotsPayload = DEFAULT_ROLES.map(role => ({
        meeting_id: meetingData.id,
        role_name: role,
        user_id: null
      }));

      const { error: slotsError } = await supabase
        .from('slots')
        .insert(slotsPayload);

      if (slotsError) {
        console.error("Error creating slots", slotsError);
      }
    }

    return this.getMeetingById(meetingData.id);
  }

  async getMeetingById(id: string): Promise<Meeting | null> {
      // Must fetch user details in slots here as well for consistency
      const { data, error } = await supabase
      .from('meetings')
      .select('*, slots(*, users(id, name, is_guest)), rsvps(*)')
      .eq('id', id)
      .single();
    
    if (error || !data) return null;
    return mapMeetingFromDB(data);
  }

  async updateMeeting(id: string, updates: Partial<Meeting>): Promise<void> {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.venue) dbUpdates.venue = updates.venue;
    if (updates.time) dbUpdates.time = updates.time;
    if (updates.theme) dbUpdates.theme = updates.theme;
    if (updates.wordOfTheDay) dbUpdates.word_of_the_day = updates.wordOfTheDay;

    await supabase.from('meetings').update(dbUpdates).eq('id', id);
  }

  async deleteMeeting(id: string): Promise<void> {
    await supabase.from('meetings').delete().eq('id', id);
  }

  async assignSlot(meetingId: string, slotId: string, userId: string | null, speechDetails?: SpeechDetails): Promise<void> {
    const updates = {
      user_id: userId,
      speech_details: speechDetails || null
    };

    const { error } = await supabase
      .from('slots')
      .update(updates)
      .eq('id', slotId);

    if (error) {
      console.error("Error assigning slot", error);
      return;
    }

    // Auto-RSVP logic: If a user is taking a role, mark them as 'yes'
    if (userId) {
      // Fetch the user details to construct the RSVP object correctly
      // We explicitly fetch to ensure we have the correct name and status
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, username, is_guest')
        .eq('id', userId)
        .single();
        
      if (!userError && userData) {
        const rsvp: RSVP = {
          userId: userData.id,
          name: userData.name || userData.username || 'Member',
          status: 'yes',
          isGuest: !!userData.is_guest
        };
        await this.rsvpToMeeting(meetingId, rsvp);
      }
    }
  }

  async addSlot(meetingId: string, roleName: string): Promise<void> {
     await supabase.from('slots').insert({
       meeting_id: meetingId,
       role_name: roleName,
       user_id: null
     });
  }

  async addSpeakerAndEvaluator(meetingId: string): Promise<void> {
    const { data: slots } = await supabase
      .from('slots')
      .select('role_name')
      .eq('meeting_id', meetingId);
    
    if (!slots) return;

    const speakerCount = slots.filter(s => 
      s.role_name.toLowerCase().includes('prepared speaker')
    ).length;

    const evalCount = slots.filter(s => 
      s.role_name.toLowerCase().includes('evaluator') && 
      !s.role_name.toLowerCase().includes('general')
    ).length;

    const newSpeakerNum = speakerCount + 1;
    const newEvalNum = evalCount + 1; 

    const payload = [
      {
        meeting_id: meetingId,
        role_name: `Prepared Speaker ${newSpeakerNum}`,
        user_id: null
      },
      {
        meeting_id: meetingId,
        role_name: `Evaluator ${newEvalNum}`,
        user_id: null
      }
    ];

    await supabase.from('slots').insert(payload);
  }

  async deleteSlot(meetingId: string, slotId: string): Promise<void> {
    await supabase.from('slots').delete().eq('id', slotId);
  }

  // RLS-Friendly RSVP: Upsert to 'rsvps' table
  async rsvpToMeeting(meetingId: string, rsvp: RSVP): Promise<void> {
    const payload = {
      meeting_id: meetingId,
      // CHANGE: Send null for guests to avoid UUID format errors in the DB
      user_id: rsvp.isGuest ? null : rsvp.userId,
      name: rsvp.name,
      status: rsvp.status,
      is_guest: rsvp.isGuest
    };

    // Upsert matches on (meeting_id, user_id) PK
    const { error } = await supabase
      .from('rsvps')
      .upsert(payload);

    if (error) {
      console.error("Error saving RSVP:", error);
    }
  }

  // SIGN UP via Supabase Auth
  async signUp(email: string, passwordInput: string): Promise<{ user: User | null; error?: string }> {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: passwordInput,
    });
    
    if (authError) {
      console.error("Supabase SignUp Error:", authError);
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
        return { user: null, error: 'Signup failed. Please check your email.' };
    }

    // Immediately create profile to ensure smooth login
    // Note: We use upsert to avoid conflicts if a trigger exists
     const newProfile = {
         id: authData.user.id,
         username: email,
         email: email,
         name: email.split('@')[0], 
         avatar: DEFAULT_AVATAR,
         is_admin: false,
         is_guest: false
     };

     const { data: profileData, error: profileError } = await supabase
        .from('users')
        .upsert(newProfile)
        .select()
        .single();
     
     if (profileError) {
         console.error("Profile creation error:", profileError);
         // Fallback: use constructed profile, but database might be out of sync
     }

     return { user: mapUserFromDB(profileData || newProfile) };
  }

  // LOGIN via Supabase Auth (Required for RLS)
  async login(email: string, passwordInput: string): Promise<{ user: User | null; error?: string }> {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: passwordInput,
    });
    
    if (authError || !authData.user) {
      console.error("Supabase Auth Error:", authError);
      return { user: null, error: authError?.message || 'Authentication failed' };
    }

    // 2. Fetch User Profile from 'users' table using the Auth User ID
    let { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id) 
        .single();
    
    // Auto-create profile if missing (Fallback if SQL Trigger fails or hasn't run)
    if (!profileData) {
         console.log("Profile missing, attempting to auto-create...");
         const newProfile = {
             id: authData.user.id,
             username: email, // Use email as username
             email: email, // Save email explicitly
             name: email.split('@')[0], 
             avatar: DEFAULT_AVATAR,
             is_admin: false,
             is_guest: false
         };

         const { data: createdProfile, error: createError } = await supabase
            .from('users')
            .insert(newProfile)
            .select()
            .single();
         
         if (createError) {
             console.error("Failed to auto-create profile:", createError);
             return { user: null, error: 'User authenticated but profile creation failed.' };
         }
         profileData = createdProfile;
    } else {
        // SYNC: Ensure email column in public table is populated if missing
        if (!profileData.email && authData.user.email) {
            console.log("Syncing email to public profile...");
            await supabase
                .from('users')
                .update({ email: authData.user.email })
                .eq('id', profileData.id);
            profileData.email = authData.user.email;
        }
    }

    return { user: mapUserFromDB(profileData) };
  }

  async logout() {
    await supabase.auth.signOut();
  }

  // Restore session on page reload
  async getCurrentSession(): Promise<User | null> {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();
      
      if (profileData) {
        // SYNC: Check if email needs syncing on session restore
        if (!profileData.email && data.session.user.email) {
             await supabase
                .from('users')
                .update({ email: data.session.user.email })
                .eq('id', profileData.id);
             profileData.email = data.session.user.email;
        }
        return mapUserFromDB(profileData);
      }
    }
    return null;
  }
}

export const dataService = new Store();