import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

// Local Firestore Config
const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-eca-project.firebaseapp.com",
  projectId: "demo-eca-project",
  storageBucket: "demo-eca-project.appspot.com",
  messagingSenderId: "demo-sender",
  appId: "demo-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Connect to local Firestore Emulator
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  connectFirestoreEmulator(db, "localhost", 8080);
}

// Database Seeding Logic
export const seedDatabase = async () => {
  try {
    const studentsRef = collection(db, "students");
    const snapshot = await getDocs(studentsRef);
    if (!snapshot.empty) {
      console.log("Database already seeded with students.");
      return;
    }

    console.log("Seed needed: Seeding collections in Firestore...");
    const batch = writeBatch(db);

    // Mock Students
    const students = [
      { id: "student_1", name: "Alice Anderson", group_tier: "SMP", student_number: "20260001" },
      { id: "student_2", name: "Bob Baker", group_tier: "SMA", student_number: "20260002" },
      { id: "student_3", name: "Charlie Cooper", group_tier: "SMP", student_number: "20260003" },
      { id: "student_4", name: "Diana Prince", group_tier: "SMA", student_number: "20260004" },
      { id: "student_5", name: "Ethan Hunt", group_tier: "SMP", student_number: "20260005" },
      { id: "student_6", name: "Fiona Gallagher", group_tier: "SMA", student_number: "20260006" }
    ];

    students.forEach(st => {
      batch.set(doc(db, "students", st.id), st);
    });

    // Mock Activities
    const activities = [
      { id: "act_basketball", name: "Basketball", teacher_name: "Coach Carter", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_coding", name: "Coding Club", teacher_name: "Mr. Smith", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_music", name: "Music Band", teacher_name: "Ms. Davis", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_art", name: "Fine Arts", teacher_name: "Dr. Jones", max_capacity: 24, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] },
      { id: "act_soccer", name: "Soccer", teacher_name: "Coach Lasso", max_capacity: 2, is_open: true, operational_days: ["Monday", "Tuesday", "Thursday"] } // Capacity: 2 for easy testing of waitlist
    ];

    activities.forEach(act => {
      batch.set(doc(db, "activities", act.id), act);
    });

    await batch.commit();
    console.log("Firestore successfully seeded!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

// ----------------------------------------------------
// Core API Calls
// ----------------------------------------------------

export const getStudents = async (): Promise<any[]> => {
  const querySnapshot = await getDocs(collection(db, "students"));
  return querySnapshot.docs.map(d => d.data());
};

export const getActivities = async (): Promise<any[]> => {
  const querySnapshot = await getDocs(collection(db, "activities"));
  return querySnapshot.docs.map(d => d.data());
};

// Subscribes to activities in real-time
export const subscribeActivities = (callback: (data: any[]) => void) => {
  return onSnapshot(collection(db, "activities"), (snapshot) => {
    const list = snapshot.docs.map(doc => doc.data());
    callback(list);
  });
};

// Subscribes to registrations in real-time
export const subscribeRegistrations = (callback: (data: any[]) => void) => {
  return onSnapshot(collection(db, "registrations"), (snapshot) => {
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(list);
  });
};

// Enforces Student registration or Admin Override
export const registerECA = async (
  studentId: string, 
  activityId: string, 
  day: string, 
  overrideRules = false
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    // 1. Check Student
    const studentDoc = await getDoc(doc(db, "students", studentId));
    if (!studentDoc.exists()) {
      return { success: false, message: "Student record not found." };
    }
    const student = studentDoc.data();

    // 2. Check Activity
    const activityDoc = await getDoc(doc(db, "activities", activityId));
    if (!activityDoc.exists()) {
      return { success: false, message: "Activity not found." };
    }
    const activity = activityDoc.data();

    const regId = `${studentId}_${day}`;

    // --- ADMIN OVERRIDE ---
    if (overrideRules) {
      const regData = {
        student_id: studentId,
        student_name: student.name,
        student_group: student.group_tier,
        activity_id: activityId,
        activity_name: activity.name,
        day_of_week: day,
        status: "Approved",
        created_at: serverTimestamp()
      };
      await setDoc(doc(db, "registrations", regId), regData);
      return { success: true, message: "Admin Override: Registration forced successfully.", data: regData };
    }

    // --- STUDENT REGISTRATION AUTOMATED RULES ---

    // Rule A: Check Activity Status
    if (!activity.is_open) {
      return { success: false, message: "This activity has been closed by the Administrator." };
    }

    // Rule B: Enforce Group Tier Schedule Restrictions
    if (student.group_tier === "SMP" && day !== "Monday" && day !== "Thursday") {
      return { success: false, message: "SMP students can only register for Monday and Thursday activities." };
    }
    if (student.group_tier === "SMA" && day !== "Tuesday" && day !== "Thursday") {
      return { success: false, message: "SMA students can only register for Tuesday and Thursday activities." };
    }

    // Rule C: Double Activity Limitation
    // A student can register for 2 different activities on 2 different days.
    // In our system, the ID is `studentId_day` so registering updates/overwrites the choice for that day.
    // However, we should also check if they are trying to register for the SAME activity on both days.
    const otherDay = day === "Thursday" 
      ? (student.group_tier === "SMP" ? "Monday" : "Tuesday")
      : "Thursday";
    const otherRegDoc = await getDoc(doc(db, "registrations", `${studentId}_${otherDay}`));
    if (otherRegDoc.exists() && otherRegDoc.data().activity_id === activityId) {
      return { success: false, message: `You are already registered for ${activity.name} on ${otherDay}. You must choose a different activity for ${day}.` };
    }

    // Rule D: Capacity & Queue Calculation
    // Find count of Approved registrations for this activity + day combo
    const regsRef = collection(db, "registrations");
    const q = query(regsRef, where("activity_id", "==", activityId), where("day_of_week", "==", day), where("status", "==", "Approved"));
    const snapshot = await getDocs(q);
    const currentApprovedCount = snapshot.size;

    let finalStatus = "Approved";
    let userMessage = "Registration complete! Slot successfully booked.";

    if (currentApprovedCount >= activity.max_capacity) {
      finalStatus = "Queued";
      userMessage = "This activity is full for the selected day. You have been placed in the waiting queue.";
    }

    const regData = {
      student_id: studentId,
      student_name: student.name,
      student_group: student.group_tier,
      activity_id: activityId,
      activity_name: activity.name,
      day_of_week: day,
      status: finalStatus,
      created_at: serverTimestamp()
    };

    await setDoc(doc(db, "registrations", regId), regData);
    return { success: true, message: userMessage, data: regData };

  } catch (error: any) {
    console.error("Error in registration:", error);
    return { success: false, message: `Critical Database Error: ${error.message}` };
  }
};

// Teacher actions: Approve / Reject student from queue
export const setRegistrationStatus = async (
  regId: string, 
  status: "Approved" | "Queued" | "Rejected"
): Promise<{ success: boolean; message: string }> => {
  try {
    await updateDoc(doc(db, "registrations", regId), { status });
    return { success: true, message: `Registration status updated to ${status}.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// Admin actions: Toggle Activity status
export const updateActivitySettings = async (
  activityId: string, 
  is_open: boolean, 
  teacher_name: string,
  max_capacity = 24
): Promise<{ success: boolean; message: string }> => {
  try {
    await updateDoc(doc(db, "activities", activityId), { 
      is_open, 
      teacher_name,
      max_capacity 
    });
    return { success: true, message: "Activity parameters updated successfully." };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

// Admin/Teacher action: Delete registration (e.g. to clear a slot)
export const deleteRegistration = async (regId: string) => {
  await deleteDoc(doc(db, "registrations", regId));
};

// ----------------------------------------------------
// Direct Database Viewer & Editor Queries
// ----------------------------------------------------

export const getCollectionDocuments = async (collectionName: string): Promise<any[]> => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
};

export const saveCollectionDocument = async (collectionName: string, docId: string, data: any) => {
  const cleanData = { ...data };
  delete cleanData._id; // Remove metadata ID
  await setDoc(doc(db, collectionName, docId), cleanData);
};

export const deleteCollectionDocument = async (collectionName: string, docId: string) => {
  await deleteDoc(doc(db, collectionName, docId));
};
