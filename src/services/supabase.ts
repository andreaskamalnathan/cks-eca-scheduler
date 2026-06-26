import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '../utils/crypto';

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

    // Seed students (with class_grade)
    const students = [
      { id: "student_1", name: "Alice Anderson", group_tier: "SMP", student_number: "20260001", class_grade: "7A" },
      { id: "student_2", name: "Bob Baker", group_tier: "SMA", student_number: "20260002", class_grade: "10B" },
      { id: "student_3", name: "Charlie Cooper", group_tier: "SMP", student_number: "20260003", class_grade: "8A" },
      { id: "student_4", name: "Diana Prince", group_tier: "SMA", student_number: "20260004", class_grade: "11C" },
      { id: "student_5", name: "Ethan Hunt", group_tier: "SMP", student_number: "20260005", class_grade: "9B" },
      { id: "student_6", name: "Fiona Gallagher", group_tier: "SMA", student_number: "20260006", class_grade: "12A" },
    ];
    const { error: sErr } = await supabase.from('students').insert(students);
    if (sErr) throw sErr;

    // Seed activities
    const activities = [
      { id: "act_basketball", name: "Basketball", teacher_name: "Coach Carter", max_capacity: 24, is_open: true, operational_days: ["Monday","Tuesday","Thursday"], group_eligibility: "both" },
      { id: "act_coding",     name: "Coding Club", teacher_name: "Mr. Smith",   max_capacity: 24, is_open: true, operational_days: ["Monday","Tuesday","Thursday"], group_eligibility: "SMA" },
      { id: "act_music",      name: "Music Band",  teacher_name: "Ms. Davis",   max_capacity: 24, is_open: true, operational_days: ["Monday","Tuesday","Thursday"], group_eligibility: "both" },
      { id: "act_art",        name: "Fine Arts",   teacher_name: "Dr. Jones",   max_capacity: 24, is_open: true, operational_days: ["Monday","Tuesday","Thursday"], group_eligibility: "SMP" },
      { id: "act_soccer",     name: "Soccer",      teacher_name: "Coach Lasso", max_capacity: 2,  is_open: true, operational_days: ["Monday","Tuesday","Thursday"], group_eligibility: "both" },
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
// STUDENTS  (Admin CRUD & Real-time)
// -------------------------------------------------------
export const getStudents = async (): Promise<any[]> => {
  const { data, error } = await supabase.from('students').select('*').order('name');
  if (error) throw error;
  return data || [];
};

export const subscribeStudents = (callback: (data: any[]) => void) => {
  getStudents().then(callback).catch(console.error);
  const channel = supabase
    .channel(`students_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, async () => {
      callback(await getStudents());
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const createStudent = async (
  id: string, name: string, group_tier: string, student_number: string, class_grade: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('students').insert({ id, name, group_tier, student_number, class_grade });
    if (error) throw error;

    // Auto-create login account: username & default password = student_number
    if (student_number) {
      const pwHash = await hashPassword(student_number);
      await Promise.resolve(supabase.from('app_users').insert({
        id: `user_${id}`,
        username: student_number,
        password_hash: pwHash,
        role: 'student',
        reference_id: id,
        display_name: name,
        must_change_password: false,
      })).then(() => {}).catch(console.warn); // non-fatal if user already exists
    }

    return { success: true, message: `Student "${name}" created.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateStudent = async (
  id: string, name: string, group_tier: string, student_number: string, class_grade: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('students').update({ name, group_tier, student_number, class_grade }).eq('id', id);
    if (error) throw error;

    // Keep registrations denormalized columns up-to-date
    await supabase.from('registrations').update({ student_name: name, student_group: group_tier, student_class_grade: class_grade }).eq('student_id', id);

    // Update display_name in app_users
    await Promise.resolve(supabase.from('app_users').update({ display_name: name }).eq('reference_id', id)).then(() => {}).catch(console.warn);

    return { success: true, message: `Student updated successfully.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteStudent = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Delete app_user account first
    await Promise.resolve(supabase.from('app_users').delete().eq('reference_id', id)).then(() => {}).catch(console.warn);
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: "Student deleted." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
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

export const createTeacher = async (
  id: string, name: string, subject_specialty: string, employee_id?: string, class_assignment?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const empId = employee_id?.trim() || null;
    const { error } = await supabase.from('teachers').insert({
      id, name, subject_specialty,
      employee_id: empId,
      class_assignment: class_assignment?.trim() || null,
    });
    if (error) throw error;

    // Auto-create login account if employee_id provided
    if (empId) {
      const pwHash = await hashPassword(empId);
      await Promise.resolve(supabase.from('app_users').insert({
        id: `user_${id}`,
        username: empId,
        password_hash: pwHash,
        role: 'teacher',
        reference_id: id,
        display_name: name,
        must_change_password: false,
      })).then(() => {}).catch(console.warn);
    }

    return { success: true, message: `Teacher "${name}" created.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateTeacher = async (
  id: string, name: string, subject_specialty: string, employee_id?: string, class_assignment?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const empId = employee_id?.trim() || null;
    const { error } = await supabase.from('teachers').update({
      name, subject_specialty,
      employee_id: empId,
      class_assignment: class_assignment?.trim() || null,
    }).eq('id', id);
    if (error) throw error;

    // Update display_name in app_users
    await Promise.resolve(supabase.from('app_users').update({ display_name: name }).eq('reference_id', id)).then(() => {}).catch(console.warn);

    return { success: true, message: `Teacher updated.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const deleteTeacher = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Delete app_user account first
    await Promise.resolve(supabase.from('app_users').delete().eq('reference_id', id)).then(() => {}).catch(console.warn);
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;
    return { success: true, message: `Teacher deleted.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// -------------------------------------------------------
// FORM TEACHER HELPERS
// -------------------------------------------------------
export const getStudentsByClass = async (classGrade: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_grade', classGrade)
    .order('name');
  if (error) throw error;
  return data || [];
};

export interface ClassRegistrationSummary {
  students: any[];
  registrations: any[];
  unregistered: any[]; // students with zero registrations on ANY day
}

export const getClassRegistrationSummary = async (
  classGrade: string
): Promise<ClassRegistrationSummary> => {
  const students = await getStudentsByClass(classGrade);
  const studentIds = students.map((s) => s.id);

  let registrations: any[] = [];
  if (studentIds.length > 0) {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    registrations = data || [];
  }

  const registeredIds = new Set(registrations.map((r) => r.student_id));
  const unregistered = students.filter((s) => !registeredIds.has(s.id));

  return { students, registrations, unregistered };
};

export const subscribeClassRegistrations = (
  classGrade: string,
  callback: (summary: ClassRegistrationSummary) => void
) => {
  const refresh = () =>
    getClassRegistrationSummary(classGrade).then(callback).catch(console.error);

  refresh();

  const channel = supabase
    .channel(`class_regs_${classGrade}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, refresh)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
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
  max_capacity: number, operational_days: string[],
  group_eligibility: "SMP" | "SMA" | "both" = "both"
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.from('activities').insert({
      id, name, teacher_name, max_capacity, is_open: true, operational_days, group_eligibility
    });
    if (error) throw error;
    return { success: true, message: `Activity "${name}" created.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateActivitySettings = async (
  activityId: string, is_open: boolean, teacher_name: string,
  max_capacity: number, operational_days: string[],
  group_eligibility: "SMP" | "SMA" | "both" = "both"
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('activities')
      .update({ is_open, teacher_name, max_capacity, operational_days, group_eligibility })
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

    // Unique registration ID per student + day + activity
    const regId = `${studentId}_${day}_${activityId}`;

    // ADMIN OVERRIDE — bypass all rules
    if (overrideRules) {
      const regData = {
        id: regId, student_id: studentId, student_name: student.name,
        student_group: student.group_tier, student_class_grade: student.class_grade || '',
        activity_id: activityId, activity_name: activity.name, day_of_week: day, 
        status: "Approved", teacher_approved: true
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

    // Rule A.5: Check Group Eligibility (SMP / SMA / both)
    if (activity.group_eligibility && activity.group_eligibility !== 'both') {
      if (student.group_tier !== activity.group_eligibility) {
        return { success: false, message: `This activity is only available for ${activity.group_eligibility} students.` };
      }
    }

    // Rule B: Check if already registered for this specific activity on this day
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', regId)
      .maybeSingle();

    if (existingReg && (existingReg.status === 'Approved' || existingReg.status === 'Queued')) {
      return {
        success: false,
        message: `You are already ${existingReg.status.toLowerCase()} for "${activity.name}" on ${day}.`
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

    // NEW Rule D: Check duplicate activity across different days (student cannot have the same activity on different days)
    const { data: duplicateActivity } = await supabase
      .from('registrations')
      .select('*')
      .eq('student_id', studentId)
      .eq('activity_id', activityId)
      .neq('status', 'Rejected');

    if (duplicateActivity && duplicateActivity.length > 0) {
      const activeDays = duplicateActivity.map(d => d.day_of_week);
      return {
        success: false,
        message: `You are already registered/queued for "${activity.name}" on ${activeDays.join(', ')}. You must choose a different activity.`
      };
    }

    // Rule E: Capacity check to determine if student gets Approved or Queued
    const { count: approvedCount } = await supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('activity_id', activityId)
      .eq('day_of_week', day)
      .eq('status', 'Approved');

    const filled = approvedCount || 0;
    const finalStatus = filled >= activity.max_capacity ? "Queued" : "Approved";

    // Rule F: If registering for a >0 seat activity (which becomes 'Approved'),
    // check if they already have another 'Approved' activity on this day.
    if (finalStatus === 'Approved') {
      const { data: existingApproved } = await supabase
        .from('registrations')
        .select('*')
        .eq('student_id', studentId)
        .eq('day_of_week', day)
        .eq('status', 'Approved')
        .maybeSingle();

      if (existingApproved) {
        return {
          success: false,
          message: `You already have an active registration for "${existingApproved.activity_name}" on ${day}. Ask an Admin to release it if you wish to switch.`
        };
      }
    }

    const userMessage = finalStatus === "Approved"
      ? "Registration complete! Slot successfully booked."
      : "This activity is full. You have been placed in the waiting queue.";

    const regData = {
      id: regId, student_id: studentId, student_name: student.name,
      student_group: student.group_tier, student_class_grade: student.class_grade || '',
      activity_id: activityId, activity_name: activity.name, day_of_week: day, 
      status: finalStatus, teacher_approved: false
    };

    const { error: uErr } = await supabase.from('registrations').upsert(regData);
    if (uErr) throw uErr;

    return { success: true, message: userMessage, data: regData };
  } catch (error: any) {
    console.error("Registration error:", error);
    return { success: false, message: `Error: ${error.message}` };
  }
};

// Teacher approves a queued student (setting teacher_approved to true)
export const approveRegistrationByTeacher = async (
  regId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('registrations')
      .update({ teacher_approved: true })
      .eq('id', regId);
    
    if (error) throw error;
    return { success: true, message: "Approved student audition successfully. Admin can now promote them." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// Teacher rejects a queued student
export const rejectRegistrationByTeacher = async (
  regId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('registrations')
      .update({ status: 'Rejected', teacher_approved: false })
      .eq('id', regId);
    
    if (error) throw error;
    return { success: true, message: "Student marked as Rejected." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// Admin promotes a teacher-approved registration (sets it to Approved and deletes any other Approved registration)
export const promoteQueuedRegistration = async (
  regId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: reg, error: getErr } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', regId)
      .single();
    if (getErr || !reg) throw new Error("Registration not found.");

    // Delete any other active 'Approved' registration for the student on this day
    const { data: otherRegs } = await supabase
      .from('registrations')
      .select('*')
      .eq('student_id', reg.student_id)
      .eq('day_of_week', reg.day_of_week)
      .eq('status', 'Approved');

    if (otherRegs && otherRegs.length > 0) {
      for (const other of otherRegs) {
        if (other.id !== regId) {
          const { error: delErr } = await supabase
            .from('registrations')
            .delete()
            .eq('id', other.id);
          if (delErr) throw delErr;
        }
      }
    }

    // Mark the queued registration as fully Approved
    const { error: updErr } = await supabase
      .from('registrations')
      .update({ status: 'Approved', teacher_approved: true })
      .eq('id', regId);
    if (updErr) throw updErr;

    return { success: true, message: `Successfully changed student's activity to "${reg.activity_name}".` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// Keep old wrapper for backwards compatibility
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