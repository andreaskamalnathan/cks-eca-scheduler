import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseKey);

// -------------------------------------------------------
// DATABASE SEEDING
// -------------------------------------------------------
export const seedDatabase = async () => {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('students').select('id').limit(1);

    if (checkError) {
      console.warn("⚠️ Seeding skipped: Run supabase_schema.sql first.", checkError);
      return;
    }
    if (existing && existing.length > 0) {
      console.log("Database already seeded.");
      return;
    }

    console.log("Seeding Supabase with default data...");

    // Seed teachers first
    const teachers = [
      { id: "teacher_1", name: "Coach Carter", subject_specialty: "Basketball" },
      { id: "teacher_2", name: "Mr. Smith", subject_specialty: "Coding" },
      { id: "teacher_3", name: "Ms. Davis", subject_specialty: "Music" },
      { id: "teacher_4", name: "Dr. Jones", subject_specialty: "Fine Arts" },
      { id: "teacher_5", name: "Coach Lasso", subject_specialty: "Soccer" },
    ];
    await supabase.from('teachers').insert(teachers);

    // Seed students
    const students = [
      { id: "student_1", name: "Alice Anderson", group_tier: "SMP", student_number: "20260001" },
      { id: "student_2", name: "Bob Baker", group_tier: "SMA", student_number: "20260002" },
      { id: "student_3", name: "Charlie Cooper", group_tier: "SMP", student_number: "20260003" },
      { id: "student_4", name: "Diana Prince", group_tier: "SMA", student_number: "20260004" },
      { id: "student_5", name: "Ethan Hunt", group_tier: "SMP", student_number: "20260005" },
      { id: "student_6", name: "Fiona Gallagher", group_tier: "SMA", student_number: "20260006" },
    ];
    const { error: sErr } = await supabase.from('students').insert(students);
    if (sErr) throw sErr;

    // Seed activities
    const activities = [
      { id: "act_basketball", name: "Basketball", teacher_name: "Coach Carter", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_coding", name: "Coding Club", teacher_name: "Mr. Smith", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_music", name: "Music Band", teacher_name: "Ms. Davis", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_art", name: "Fine Arts", teacher_name: "Dr. Jones", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_soccer", name: "Soccer", teacher_name: "Coach Lasso", max_capacity: 2, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
    ];
    const { error: aErr } = await supabase.from('activities').insert(activities);
    if (aErr) throw aErr;

    console.log("✅ Supabase seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// -------------------------------------------------------
// SYSTEM SETTINGS  (SMP / SMA days configuration)
// -------------------------------------------------------
export const getSystemSettings = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) { console.error("Error loading system settings:", error); return {}; }
  const map: Record<string, string> = {};
  (data || []).forEach(row => { map[row.key] = row.value; });
  return map;
};

export const updateSystemSetting = async (key: string, value: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key, value });
    if (error) throw error;
    return { success: true, message: `Setting "${key}" updated.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const subscribeSystemSettings = (callback: (settings: Record<string, string>) => void) => {
  getSystemSettings().then(callback);
  const channel = supabase
    .channel(`system_settings_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, async () => {
      callback(await getSystemSettings());
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// -------------------------------------------------------
// STUDENTS
// -------------------------------------------------------
export const getStudents = async (): Promise<any[]> => {
  const { data, error } = await supabase.from('students').select('*').order('name');
  if (error) throw error;
  return data || [];
};

// -------------------------------------------------------
// TEACHERS  (Admin CRUD)
// -------------------------------------------------------
export const getTeachers = async (): Promise<any[]> => {
  const { data, error } = await supabase.from('teachers').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const subscribeTeachers = (callback: (data: any[]) => void) => {
  getTeachers().then(callback).catch(console.error);
  const channel = supabase
    .channel(`teachers_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, async () => {
      callback(await getTeachers());
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const createTeacher = async (id: string, name: string, subject_specialty: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('teachers').insert({ id, name, subject_specialty });
    if (error) throw error;
    return { success: true, message: `Teacher "${name}" created.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateTeacher = async (id: string, name: string, subject_specialty: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('teachers').update({ name, subject_specialty }).eq('id', id);
    if (error) throw error;
    return { success: true, message: `Teacher updated.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteTeacher = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: `Teacher deleted.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// -------------------------------------------------------
// ACTIVITIES  (Admin CRUD)
// -------------------------------------------------------
export const getActivities = async (): Promise<any[]> => {
  const { data, error } = await supabase.from('activities').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const subscribeActivities = (callback: (data: any[]) => void) => {
  getActivities().then(callback).catch(console.error);
  const channel = supabase
    .channel(`activities_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, async () => {
      callback(await getActivities());
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const createActivity = async (
  id: string, name: string, teacher_name: string,
  max_capacity: number, operational_days: string[]
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('activities').insert({
      id, name, teacher_name, max_capacity, is_open: true, operational_days
    });
    if (error) throw error;
    return { success: true, message: `Activity "${name}" created.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateActivitySettings = async (
  activityId: string, is_open: boolean, teacher_name: string,
  max_capacity: number, operational_days: string[]
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('activities')
      .update({ is_open, teacher_name, max_capacity, operational_days })
      .eq('id', activityId);
    if (error) throw error;
    return { success: true, message: "Activity updated successfully." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteActivity = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: "Activity deleted." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// -------------------------------------------------------
// REGISTRATIONS
// -------------------------------------------------------
export const subscribeRegistrations = (callback: (data: any[]) => void) => {
  const fetch = async () => {
    const { data, error } = await supabase
      .from('registrations').select('*').order('created_at', { ascending: false });
    if (!error && data) callback(data);
  };
  fetch().catch(console.error);
  const channel = supabase
    .channel(`registrations_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, fetch)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// Returns a map: { "activityId_day": approvedCount }
export const getActivitySeatCounts = async (): Promise<Record<string, number>> => {
  const { data, error } = await supabase
    .from('registrations')
    .select('activity_id, day_of_week')
    .eq('status', 'Approved');
  if (error) { console.error(error); return {}; }
  const counts: Record<string, number> = {};
  (data || []).forEach(row => {
    const key = `${row.activity_id}_${row.day_of_week}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

// -------------------------------------------------------
// REGISTRATION LOGIC
// -------------------------------------------------------
export const registerECA = async (
  studentId: string,
  activityId: string,
  day: string,
  overrideRules = false
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    // Fetch student
    const { data: student, error: sErr } = await supabase
      .from('students').select('*').eq('id', studentId).single();
    if (sErr || !student) return { success: false, message: "Student record not found." };

    // Fetch activity
    const { data: activity, error: aErr } = await supabase
      .from('activities').select('*').eq('id', activityId).single();
    if (aErr || !activity) return { success: false, message: "Activity not found." };

    const regId = `${studentId}_${day}`;

    // ADMIN OVERRIDE — bypass all rules
    if (overrideRules) {
      const regData = {
        id: regId, student_id: studentId, student_name: student.name,
        student_group: student.group_tier, activity_id: activityId,
        activity_name: activity.name, day_of_week: day, status: "Approved"
      };
      const { error: uErr } = await supabase.from('registrations').upsert(regData);
      if (uErr) throw uErr;
      return { success: true, message: "Admin Override: Registration forced successfully.", data: regData };
    }

    // STUDENT RULES ──────────────────────────────────────────

    // Rule A: Activity must be open
    if (!activity.is_open) {
      return { success: false, message: "This activity has been closed by the Administrator." };
    }

    // Rule B: Check schedule lock — cannot change if already Approved or Queued for this day
    const { data: existingReg } = await supabase
      .from('registrations').select('*').eq('id', regId).maybeSingle();

    if (existingReg && (existingReg.status === 'Approved' || existingReg.status === 'Queued')) {
      return {
        success: false,
        message: `You are already ${existingReg.status.toLowerCase()} for "${existingReg.activity_name}" on ${day}. Contact an Admin to release your slot before choosing a different activity.`
      };
    }

    // Rule C: Enforce Group Schedule (read from system_settings)
    const settings = await getSystemSettings();
    const smpDays = (settings['smp_days'] || 'Monday,Thursday').split(',');
    const smaDays = (settings['sma_days'] || 'Tuesday,Thursday').split(',');

    if (student.group_tier === 'SMP' && !smpDays.includes(day)) {
      return { success: false, message: `SMP students can only register on: ${smpDays.join(', ')}.` };
    }
    if (student.group_tier === 'SMA' && !smaDays.includes(day)) {
      return { success: false, message: `SMA students can only register on: ${smaDays.join(', ')}.` };
    }

    // Rule D: Cannot pick the same activity on both days
    const allowedDays = student.group_tier === 'SMP' ? smpDays : smaDays;
    const otherDays = allowedDays.filter((d: string) => d !== day);
    for (const otherDay of otherDays) {
      const { data: otherReg } = await supabase
        .from('registrations').select('*').eq('id', `${studentId}_${otherDay}`).maybeSingle();
      if (otherReg && otherReg.activity_id === activityId) {
        return { success: false, message: `You already have "${activity.name}" on ${otherDay}. Please choose a different activity for ${day}.` };
      }
    }

    // Rule E: Capacity check
    const { count: approvedCount } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('day_of_week', day)
      .eq('status', 'Approved');

    const filled = approvedCount || 0;
    const finalStatus = filled >= activity.max_capacity ? "Queued" : "Approved";
    const userMessage = finalStatus === "Approved"
      ? "Registration complete! Slot successfully booked."
      : "This activity is full. You have been placed in the waiting queue.";

    const regData = {
      id: regId, student_id: studentId, student_name: student.name,
      student_group: student.group_tier, activity_id: activityId,
      activity_name: activity.name, day_of_week: day, status: finalStatus
    };

    const { error: uErr } = await supabase.from('registrations').upsert(regData);
    if (uErr) throw uErr;

    return { success: true, message: userMessage, data: regData };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, message: `Error: ${error.message}` };
  }
};

export const setRegistrationStatus = async (
  regId: string, status: "Approved" | "Queued" | "Rejected"
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('registrations').update({ status }).eq('id', regId);
    if (error) throw error;
    return { success: true, message: `Status updated to ${status}.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteRegistration = async (regId: string) => {
  await supabase.from('registrations').delete().eq('id', regId);
};

// -------------------------------------------------------
// DIRECT DB EDITOR (Admin raw-access)
// -------------------------------------------------------
export const getCollectionDocuments = async (collectionName: string): Promise<any[]> => {
  const { data, error } = await supabase.from(collectionName).select('*');
  if (error) throw error;
  return (data || []).map(row => ({ _id: row.id, ...row }));
};

export const saveCollectionDocument = async (collectionName: string, docId: string, data: any) => {
  const clean = { ...data };
  delete clean._id;
  clean.id = docId;
  const { error } = await supabase.from(collectionName).upsert(clean);
  if (error) throw error;
};

export const deleteCollectionDocument = async (collectionName: string, docId: string) => {
  const { error } = await supabase.from(collectionName).delete().eq('id', docId);
  if (error) throw error;
};
