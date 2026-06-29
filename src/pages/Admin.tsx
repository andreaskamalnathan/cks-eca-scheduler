import React, { useEffect, useState, useCallback } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar,
  IonItem, IonLabel, IonToggle, IonList, IonGrid, IonRow, IonCol,
  IonBadge, IonButton, IonCard, IonCardContent, IonIcon,
  IonInput, IonSegment, IonSegmentButton, IonCheckbox, IonSelect,
  IonSelectOption
} from '@ionic/react';
import {
  settingsOutline, peopleOutline, serverOutline, trashOutline,
  pencilOutline, checkmarkCircleOutline, addCircleOutline, refreshOutline,
  personAddOutline, calendarOutline, starOutline, personOutline,
  alertCircleOutline, funnelOutline, keyOutline, swapHorizontalOutline,
  closeCircleOutline
} from 'ionicons/icons';
import {
  subscribeActivities, subscribeRegistrations, subscribeStudents, subscribeTeachers,
  updateActivitySettings, createActivity, deleteActivity,
  registerECA, deleteRegistration, promoteQueuedRegistration,
  getCollectionDocuments, saveCollectionDocument, deleteCollectionDocument,
  createTeacher, updateTeacher, deleteTeacher,
  createStudent, updateStudent, deleteStudent,
  subscribeSystemSettings, updateSystemSetting,
  getActivitySeatCounts
} from '../services/supabase';

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const emptyPlaceholderStyle: React.CSSProperties = {
  padding: '24px',
  textAlign: 'center',
  color: 'var(--eca-text-muted)',
  fontSize: '13px',
  background: 'var(--eca-bg-card)',
  border: '1px solid var(--eca-border)',
  borderRadius: '12px',
  margin: '8px 0',
  boxSizing: 'border-box'
};
const CLASS_GRADES = [
  '7A', '7B', '7C',
  '8A', '8B', '8C',
  '9A', '9B', '9C',
  '10A', '10B', '10C',
  '11A', '11B', '11C',
  '12A', '12B', '12C'
];

const Admin: React.FC = () => {
  // Load activeTab from localStorage if present
  const [activeTab, setActiveTab] = useState<'activities' | 'teachers' | 'students' | 'registrations' | 'settings' | 'db_editor'>(
    (localStorage.getItem('adminActiveTab') as any) || 'activities'
  );
  const [activities, setActivities] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [feedbackColor, setFeedbackColor] = useState('#0f766e');

  // ── Activity form state ──
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [actFormName, setActFormName] = useState('');
  const [actFormTeacher, setActFormTeacher] = useState('');
  const [actFormCapacity, setActFormCapacity] = useState(24);
  const [actFormDays, setActFormDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [actFormOpen, setActFormOpen] = useState(true);
  const [actFormEligibility, setActFormEligibility] = useState<'SMP' | 'SMA' | 'both'>('both');

  // ── Teacher form state ──
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [tchrFormName, setTchrFormName] = useState('');
  const [tchrFormSpecialty, setTchrFormSpecialty] = useState('');
  const [tchrFormEmployeeId, setTchrFormEmployeeId] = useState('');
  const [tchrFormClassAssignment, setTchrFormClassAssignment] = useState('');

  // ── Teacher Password Reset state ──
  const [resetPwdTeacherId, setResetPwdTeacherId] = useState<string | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');

  // ── Student form state ──
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studFormName, setStudFormName] = useState('');
  const [studFormNumber, setStudFormNumber] = useState('');
  const [studFormTier, setStudFormTier] = useState<'SMP' | 'SMA'>('SMP');
  const [studFormClass, setStudFormClass] = useState('');

  // ── Student List Filters ──
  const [filterStudClass, setFilterStudClass] = useState<string>('All');
  const [filterStudActivity, setFilterStudActivity] = useState<string>('All');
  const [filterStudDay, setFilterStudDay] = useState<string>('All');

  // ── Unregistered Students Filters ──
  const [unregClassFilter, setUnregClassFilter] = useState<string>('All');
  const [unregDayFilter, setUnregDayFilter] = useState<string>('Monday');

  // ── Roster Filters ──
  const [rosterFilterStatus, setRosterFilterStatus] = useState<string>('All');
  const [rosterSortOrder, setRosterSortOrder] = useState<'asc' | 'desc'>('asc');

  // ── Student move state ──
  const [movingRegId, setMovingRegId] = useState<string | null>(null);
  const [moveActivityId, setMoveActivityId] = useState('');
  const [moveDay, setMoveDay] = useState('');

  // ── Responsive state ──
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Settings state ──
  const [smpDaysEdit, setSmpDaysEdit] = useState<string[]>([]);
  const [smaDaysEdit, setSmaDaysEdit] = useState<string[]>([]);

  // ── DB Editor state ──
  const [selectedDbCollection, setSelectedDbCollection] = useState('students');
  const [dbDocuments, setDbDocuments] = useState<any[]>([]);
  const [editingDbDocId, setEditingDbDocId] = useState<string | null>(null);
  const [dbDocRawJson, setDbDocRawJson] = useState('');
  const [dbNewDocId, setDbNewDocId] = useState('');
  const [dbNewDocJson, setDbNewDocJson] = useState('{\n  \n}');

  const showFeedback = (msg: string, color = '#0f766e') => {
    setFeedback(msg);
    setFeedbackColor(color);
    setTimeout(() => setFeedback(''), 4000);
  };

  const refreshSeatCounts = useCallback(async () => {
    const counts = await getActivitySeatCounts();
    setSeatCounts(counts);
  }, []);

  useEffect(() => {
    const unsubStudents = subscribeStudents(setStudents);
    const unsubActs = subscribeActivities(setActivities);
    const unsubTeachers = subscribeTeachers(setTeachers);
    const unsubRegs = subscribeRegistrations((data) => {
      setRegistrations(data);
      refreshSeatCounts();
    });
    const unsubSettings = subscribeSystemSettings((s) => {
      setSystemSettings(s);
      setSmpDaysEdit((s['smp_days'] || 'Monday,Thursday').split(','));
      setSmaDaysEdit((s['sma_days'] || 'Tuesday,Thursday').split(','));
    });
    refreshSeatCounts();
    return () => { unsubStudents(); unsubActs(); unsubTeachers(); unsubRegs(); unsubSettings(); };
  }, [refreshSeatCounts]);

  const handleTabChange = (tab: any) => {
    setActiveTab(tab);
    localStorage.setItem('adminActiveTab', tab);
  };

  // Fetch DB editor documents
  const fetchDbCollection = async () => {
    try {
      const docs = await getCollectionDocuments(selectedDbCollection);
      setDbDocuments(docs);
    } catch (err: any) {
      showFeedback(`Error: ${err.message}`, '#b91c1c');
    }
  };
  useEffect(() => {
    if (activeTab === 'db_editor') fetchDbCollection();
  }, [selectedDbCollection, activeTab]);

  // ── ACTIVITY CRUD ────────────────────────────────────────
  const openNewActivityForm = () => {
    setEditingActivityId(null);
    setActFormName(''); setActFormTeacher(''); setActFormCapacity(24);
    setActFormDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']); setActFormOpen(true);
    setActFormEligibility('both');
    setShowActivityForm(true);
  };

  const openEditActivityForm = (act: any) => {
    setEditingActivityId(act.id);
    setActFormName(act.name); setActFormTeacher(act.teacher_name || '');
    setActFormCapacity(act.max_capacity); setActFormDays(act.operational_days || []);
    setActFormOpen(act.is_open);
    setActFormEligibility(act.group_eligibility || 'both');
    setShowActivityForm(true);
  };

  const handleSaveActivity = async () => {
    if (!actFormName.trim()) { showFeedback('Activity name is required.', '#b91c1c'); return; }
    if (actFormDays.length === 0) { showFeedback('Select at least one day.', '#b91c1c'); return; }
    let res;
    if (editingActivityId) {
      res = await updateActivitySettings(editingActivityId, actFormOpen, actFormTeacher, actFormCapacity, actFormDays, actFormEligibility);
    } else {
      const newId = `act_${actFormName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      res = await createActivity(newId, actFormName.trim(), actFormTeacher, actFormCapacity, actFormDays, actFormEligibility);
    }
    if (res.success) { showFeedback(res.message); setShowActivityForm(false); }
    else showFeedback(`Error: ${res.message}`, '#b91c1c');
  };

  const handleDeleteActivity = async (id: string, name: string) => {
    if (!window.confirm(`Delete activity "${name}"? This will remove all student registrations for it.`)) return;
    const res = await deleteActivity(id);
    if (res.success) showFeedback(res.message);
    else showFeedback(`Error: ${res.message}`, '#b91c1c');
  };

  const toggleDay = (day: string, list: string[], setter: (v: string[]) => void, limit?: number) => {
    if (list.includes(day)) {
      setter(list.filter(d => d !== day));
    } else {
      if (limit && list.length >= limit) {
        showFeedback(`You can select a maximum of ${limit} days. Please uncheck another day first.`, '#b91c1c');
        return;
      }
      setter([...list, day]);
    }
  };

  // ── TEACHER CRUD ─────────────────────────────────────────
  const openNewTeacherForm = () => {
    setEditingTeacherId(null);
    setTchrFormName('');
    setTchrFormSpecialty('');
    setTchrFormEmployeeId('');
    setTchrFormClassAssignment('');
    setShowTeacherForm(true);
  };

  const openEditTeacherForm = (t: any) => {
    setEditingTeacherId(t.id);
    setTchrFormName(t.name);
    setTchrFormSpecialty(t.subject_specialty || '');
    setTchrFormEmployeeId(t.employee_id || '');
    setTchrFormClassAssignment(t.class_assignment || '');
    setShowTeacherForm(true);
  };

  const handleSaveTeacher = async () => {
    if (!tchrFormName.trim()) { showFeedback('Teacher name is required.', '#b91c1c'); return; }
    let res;
    if (editingTeacherId) {
      res = await updateTeacher(editingTeacherId, tchrFormName.trim(), tchrFormSpecialty, tchrFormEmployeeId.trim() || undefined, tchrFormClassAssignment.trim() || undefined);
    } else {
      const newId = `teacher_${Date.now()}`;
      res = await createTeacher(newId, tchrFormName.trim(), tchrFormSpecialty, tchrFormEmployeeId.trim() || undefined, tchrFormClassAssignment.trim() || undefined);
    }
    if (res.success) { showFeedback(res.message); setShowTeacherForm(false); }
    else showFeedback(`Error: ${res.message}`, '#b91c1c');
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!window.confirm(`Delete teacher "${name}"?`)) return;
    const res = await deleteTeacher(id);
    if (res.success) showFeedback(res.message);
    else showFeedback(`Error: ${res.message}`, '#b91c1c');
  };

  // ── STUDENT CRUD ─────────────────────────────────────────
  const openNewStudentForm = () => {
    setEditingStudentId(null);
    setStudFormName('');
    setStudFormNumber('');
    setStudFormTier('SMP');
    setStudFormClass('');
    setShowStudentForm(true);
  };

  const openEditStudentForm = (s: any) => {
    setEditingStudentId(s.id);
    setStudFormName(s.name);
    setStudFormNumber(s.student_number);
    setStudFormTier(s.group_tier || 'SMP');
    setStudFormClass(s.class_grade || '');
    setShowStudentForm(true);
  };

  const handleSaveStudent = async () => {
    if (!studFormName.trim()) { showFeedback('Student name is required.', '#b91c1c'); return; }
    if (!studFormNumber.trim()) { showFeedback('Student ID number is required.', '#b91c1c'); return; }
    let res;
    if (editingStudentId) {
      res = await updateStudent(editingStudentId, studFormName.trim(), studFormTier, studFormNumber.trim(), studFormClass);
    } else {
      const newId = `student_${Date.now()}`;
      res = await createStudent(newId, studFormName.trim(), studFormTier, studFormNumber.trim(), studFormClass);
    }
    if (res.success) { showFeedback(res.message); setShowStudentForm(false); }
    else showFeedback(`Error: ${res.message}`, '#b91c1c');
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Delete student "${name}"? This will delete all their registrations.`)) return;
    const res = await deleteStudent(id);
    if (res.success) showFeedback(res.message);
    else showFeedback(`Error: ${res.message}`, '#b91c1c');
  };

  // ── STUDENT PLACEMENT & PROMOTION ──────────────────────────
  const handleMoveStudent = async (reg: any) => {
    if (!moveActivityId || !moveDay) { showFeedback('Select activity and day.', '#b91c1c'); return; }
    const result = await registerECA(reg.student_id, moveActivityId, moveDay, true);
    if (result.success) {
      if (reg.day_of_week !== moveDay || reg.activity_id !== moveActivityId) {
        await deleteRegistration(reg.id);
      }
      showFeedback(`Moved ${reg.student_name} successfully!`);
      setMovingRegId(null);
    } else showFeedback(`Error: ${result.message}`, '#b91c1c');
  };

  const handlePromoteStudent = async (regId: string, studentName: string, actName: string) => {
    if (!window.confirm(`Promote ${studentName} to "${actName}"? This will activate this choice and remove any other active registration for them on this day.`)) return;
    const result = await promoteQueuedRegistration(regId);
    if (result.success) {
      showFeedback(result.message);
    } else {
      showFeedback(`Error: ${result.message}`, '#b91c1c');
    }
  };

  const handleReleaseRegistration = async (id: string, studentName: string) => {
    if (!window.confirm(`Release ${studentName}'s registration? They will be able to re-select.`)) return;
    await deleteRegistration(id);
    showFeedback(`${studentName}'s registration released.`);
  };

  // ── SYSTEM SETTINGS ──────────────────────────────────────
  const handleSaveSettings = async () => {
    if (smpDaysEdit.length !== 2) {
      showFeedback('Please select exactly 2 days for the SMP Group.', '#b91c1c');
      return;
    }
    if (smaDaysEdit.length !== 2) {
      showFeedback('Please select exactly 2 days for the SMA Group.', '#b91c1c');
      return;
    }
    const r1 = await updateSystemSetting('smp_days', smpDaysEdit.join(','));
    const r2 = await updateSystemSetting('sma_days', smaDaysEdit.join(','));
    if (r1.success && r2.success) showFeedback('Schedule settings saved!');
    else showFeedback('Error saving settings.', '#b91c1c');
  };

  // ── DB EDITOR ────────────────────────────────────────────
  const handleSaveDbDoc = async (id: string) => {
    try {
      const parsed = JSON.parse(dbDocRawJson);
      await saveCollectionDocument(selectedDbCollection, id, parsed);
      showFeedback(`Document '${id}' updated.`);
      setEditingDbDocId(null); fetchDbCollection();
    } catch (err: any) { alert(`Invalid JSON: ${err.message}`); }
  };

  const handleCreateDbDoc = async () => {
    if (!dbNewDocId) { alert('Enter a Document ID.'); return; }
    try {
      const parsed = JSON.parse(dbNewDocJson);
      await saveCollectionDocument(selectedDbCollection, dbNewDocId, parsed);
      showFeedback(`Created '${dbNewDocId}'!`);
      setDbNewDocId(''); fetchDbCollection();
    } catch (err: any) { alert(`Invalid JSON: ${err.message}`); }
  };

  const handleDeleteDbDoc = async (id: string) => {
    if (!window.confirm(`Delete '${id}' from database?`)) return;
    await deleteCollectionDocument(selectedDbCollection, id);
    showFeedback(`Deleted '${id}'.`); fetchDbCollection();
  };

  // ── SEAT HELPER ──────────────────────────────────────────
  const getSeatLabel = (actId: string, day: string, maxCap: number) => {
    const filled = seatCounts[`${actId}_${day}`] || 0;
    const avail = Math.max(0, maxCap - filled);
    return `${filled}/${maxCap} filled · ${avail} available`;
  };

  const renderBadge = (reg: any) => {
    if (reg.status === 'Approved') {
      return <IonBadge color="success" style={{ borderRadius: '6px' }}>Approved (Active)</IonBadge>;
    }
    if (reg.status === 'Queued') {
      if (reg.teacher_approved) {
        return <IonBadge color="warning" style={{ borderRadius: '6px' }}>⭐ Teacher Approved</IonBadge>;
      }
      return <IonBadge color="medium" style={{ borderRadius: '6px' }}>Queued</IonBadge>;
    }
    return <IonBadge color="danger" style={{ borderRadius: '6px' }}>Rejected</IonBadge>;
  };

  const renderEligibilityBadge = (eligibility: string) => {
    if (eligibility === 'SMP') {
      return <IonBadge color="secondary" style={{ borderRadius: '4px', marginLeft: '6px' }}>SMP Only</IonBadge>;
    }
    if (eligibility === 'SMA') {
      return <IonBadge color="danger" style={{ borderRadius: '4px', marginLeft: '6px' }}>SMA Only</IonBadge>;
    }
    return <IonBadge color="medium" style={{ borderRadius: '4px', marginLeft: '6px' }}>SMP & SMA</IonBadge>;
  };

  // ── FILTER & SORT PROCESSING ──
  const getFilteredStudents = () => {
    let result = [...students];
    if (filterStudClass !== 'All') {
      result = result.filter(s => s.class_grade === filterStudClass);
    }
    if (filterStudActivity !== 'All') {
      const studentIdsWithActivity = registrations
        .filter(r => r.activity_id === filterStudActivity && r.status === 'Approved')
        .map(r => r.student_id);
      result = result.filter(s => studentIdsWithActivity.includes(s.id));
    }
    if (filterStudDay !== 'All') {
      const studentIdsOnDay = registrations
        .filter(r => r.day_of_week === filterStudDay && r.status === 'Approved')
        .map(r => r.student_id);
      result = result.filter(s => studentIdsOnDay.includes(s.id));
    }
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  };

  const getUnregisteredStudents = () => {
    let result = [...students];

    // Filter students by schedule configuration for the selected day
    const smpDays = (systemSettings['smp_days'] || 'Monday,Thursday')
      .split(',')
      .map((d: string) => d.trim())
      .filter(Boolean);

    const smaDays = (systemSettings['sma_days'] || 'Tuesday,Thursday')
      .split(',')
      .map((d: string) => d.trim())
      .filter(Boolean);

    result = result.filter(s => {
      const allowedDays = s.group_tier === 'SMP' ? smpDays : smaDays;
      return allowedDays.includes(unregDayFilter);
    });

    if (unregClassFilter !== 'All') {
      result = result.filter(s => s.class_grade === unregClassFilter);
    }
    // Filter out students who have an approved registration for the selected day
    const registeredOnDay = registrations
      .filter(r => r.day_of_week === unregDayFilter && r.status === 'Approved')
      .map(r => r.student_id);

    result = result.filter(s => !registeredOnDay.includes(s.id));
    result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  };

  const getFilteredRegistrations = () => {
    let result = [...registrations];

    // Status Filter
    if (rosterFilterStatus === 'NeedsAdmin') {
      result = result.filter(r => r.status === 'Queued' && r.teacher_approved);
    } else if (rosterFilterStatus === 'TeacherRejected') {
      result = result.filter(r => r.status === 'Rejected');
    } else if (rosterFilterStatus === 'Approved') {
      result = result.filter(r => r.status === 'Approved');
    } else if (rosterFilterStatus === 'QueuedPendingAudition') {
      result = result.filter(r => r.status === 'Queued' && !r.teacher_approved);
    }

    // Sort order
    result.sort((a, b) => {
      const nameA = a.student_name || '';
      const nameB = b.student_name || '';
      return rosterSortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return result;
  };

  // ── INLINED JSX RENDERERS (FIXES TEXTBOX LOST FOCUS BUG) ──
  const renderActivityFormPanel = () => {
    if (!showActivityForm) return null;
    return (
      <div style={{ background: 'var(--eca-bg-card)', borderRadius: '12px', border: '1px solid var(--eca-border)', padding: '20px', marginBottom: '24px', boxShadow: 'var(--eca-shadow-card)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>
          {editingActivityId ? '✏️ Edit Activity' : '➕ New Activity'}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Activity Name *</IonLabel>
            <IonInput value={actFormName} placeholder="e.g. Drama Club" onIonInput={e => setActFormName(String(e.detail.value))} />
          </IonItem>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Max Seats</IonLabel>
            <IonInput type="number" value={actFormCapacity} onIonInput={e => setActFormCapacity(Number(e.detail.value))} />
          </IonItem>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Assign Teacher</IonLabel>
            <IonSelect interface="popover" value={actFormTeacher} onIonChange={e => setActFormTeacher(e.detail.value)} placeholder="Select teacher" style={{ color: 'var(--eca-text-secondary)' }}>
              <option value="">— None —</option>
              {teachers.map(t => <IonSelectOption key={t.id} value={t.name}>{t.name}</IonSelectOption>)}
            </IonSelect>
          </IonItem>

          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Eligible Students</IonLabel>
            <IonSelect interface="popover" value={actFormEligibility} onIonChange={e => setActFormEligibility(e.detail.value)} style={{ color: 'var(--eca-text-secondary)' }}>
              <IonSelectOption value="both">Both SMP & SMA</IonSelectOption>
              <IonSelectOption value="SMP">SMP Students Only</IonSelectOption>
              <IonSelectOption value="SMA">SMA Students Only</IonSelectOption>
            </IonSelect>
          </IonItem>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-secondary)', marginBottom: '8px' }}>OPERATIONAL DAYS *</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {ALL_DAYS.map(day => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>
                <IonCheckbox
                  checked={actFormDays.includes(day)}
                  onIonChange={() => toggleDay(day, actFormDays, setActFormDays)}
                />
                {day}
              </label>
            ))}
          </div>
        </div>
        {editingActivityId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <IonToggle checked={actFormOpen} onIonChange={e => setActFormOpen(e.detail.checked)} color="success" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--eca-text-secondary)' }}>Registration Open</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <IonButton size="small" color="success" mode="md" style={{ '--border-radius': '6px' }} onClick={handleSaveActivity}>
            <IonIcon icon={checkmarkCircleOutline} slot="start" /> Save
          </IonButton>
          <IonButton size="small" color="medium" mode="md" style={{ '--border-radius': '6px' }} onClick={() => setShowActivityForm(false)}>Cancel</IonButton>
        </div>
      </div>
    );
  };

  const renderTeacherFormPanel = () => {
    if (!showTeacherForm) return null;
    return (
      <div style={{ background: 'var(--eca-bg-card)', borderRadius: '12px', border: '1px solid var(--eca-border)', padding: '20px', marginBottom: '24px', boxShadow: 'var(--eca-shadow-card)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>
          {editingTeacherId ? '✏️ Edit Teacher' : '➕ New Teacher'}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Full Name *</IonLabel>
            <IonInput value={tchrFormName} placeholder="e.g. Ms. Johnson" onIonInput={e => setTchrFormName(String(e.detail.value))} />
          </IonItem>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Subject / Specialty</IonLabel>
            <IonInput value={tchrFormSpecialty} placeholder="e.g. Drama" onIonInput={e => setTchrFormSpecialty(String(e.detail.value))} />
          </IonItem>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Employee ID (login username)</IonLabel>
            <IonInput value={tchrFormEmployeeId} placeholder="e.g. EMP001" onIonInput={e => setTchrFormEmployeeId(String(e.detail.value))} />
          </IonItem>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Class Assignment (Form Teacher)</IonLabel>
            <IonSelect interface="popover" value={tchrFormClassAssignment} placeholder="None — Subject Teacher" onIonChange={e => setTchrFormClassAssignment(e.detail.value)} style={{ color: 'var(--eca-text-secondary)' }}>
              <IonSelectOption value="">— None (Subject Teacher) —</IonSelectOption>
              {CLASS_GRADES.map(c => <IonSelectOption key={c} value={c}>Class {c}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <IonButton size="small" color="success" mode="md" style={{ '--border-radius': '6px' }} onClick={handleSaveTeacher}>
            <IonIcon icon={checkmarkCircleOutline} slot="start" /> Save
          </IonButton>
          <IonButton size="small" color="medium" mode="md" style={{ '--border-radius': '6px' }} onClick={() => setShowTeacherForm(false)}>Cancel</IonButton>
        </div>
      </div>
    );
  };

  const renderStudentFormPanel = () => {
    if (!showStudentForm) return null;
    return (
      <div style={{ background: 'var(--eca-bg-card)', borderRadius: '12px', border: '1px solid var(--eca-border)', padding: '20px', marginBottom: '24px', boxShadow: 'var(--eca-shadow-card)' }}>
        <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>
          {editingStudentId ? '✏️ Edit Student' : '➕ New Student'}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Full Name *</IonLabel>
            <IonInput value={studFormName} placeholder="e.g. Alice Anderson" onIonInput={e => setStudFormName(String(e.detail.value))} />
          </IonItem>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Student ID Number *</IonLabel>
            <IonInput value={studFormNumber} placeholder="e.g. 20260001" onIonInput={e => setStudFormNumber(String(e.detail.value))} />
          </IonItem>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Division (SMP/SMA)</IonLabel>
            <IonSelect interface="popover" value={studFormTier} onIonChange={e => setStudFormTier(e.detail.value)} style={{ color: 'var(--eca-text-secondary)' }}>
              <IonSelectOption value="SMP">SMP (Junior High)</IonSelectOption>
              <IonSelectOption value="SMA">SMA (Senior High)</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)' }}>
            <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Class / Grade</IonLabel>
            <IonSelect interface="popover" value={studFormClass} placeholder="Select Class" onIonChange={e => setStudFormClass(e.detail.value)} style={{ color: 'var(--eca-text-secondary)' }}>
              <IonSelectOption value="">— None —</IonSelectOption>
              {CLASS_GRADES.map(c => <IonSelectOption key={c} value={c}>Class {c}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <IonButton size="small" color="success" mode="md" style={{ '--border-radius': '6px' }} onClick={handleSaveStudent}>
            <IonIcon icon={checkmarkCircleOutline} slot="start" /> Save
          </IonButton>
          <IonButton size="small" color="medium" mode="md" style={{ '--border-radius': '6px' }} onClick={() => setShowStudentForm(false)}>Cancel</IonButton>
        </div>
      </div>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="danger">
          <IonTitle style={{ fontWeight: '800' }}>Admin Control Center</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid fixed>
          <IonRow className="ion-justify-content-center">
            <IonCol sizeXl="11" sizeLg="12">

              {/* Tab Selector */}
              <IonSegment scrollable value={activeTab} onIonChange={e => handleTabChange(e.detail.value as any)} mode="md"
                style={{
                  marginBottom: '24px',
                  background: 'var(--eca-segment-bg)',
                  border: '1px solid var(--eca-segment-border)',
                  borderRadius: '10px',
                  padding: '2px',
                  '--color': '#94a3b8',
                  '--color-checked': '#ffffff',
                  '--background-checked': '#e11d48',
                } as any}>
                <IonSegmentButton value="activities" style={{ fontWeight: '700' }}>
                  <IonLabel><IonIcon icon={settingsOutline} /> Activities</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="teachers" style={{ fontWeight: '700' }}>
                  <IonLabel><IonIcon icon={personAddOutline} /> Teachers</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="students" style={{ fontWeight: '700' }}>
                  <IonLabel><IonIcon icon={personOutline} /> Students</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="registrations" style={{ fontWeight: '700' }}>
                  <IonLabel><IonIcon icon={peopleOutline} /> Roster</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="settings" style={{ fontWeight: '700' }}>
                  <IonLabel><IonIcon icon={calendarOutline} /> Schedule</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="db_editor" style={{ fontWeight: '700' }}>
                  <IonLabel><IonIcon icon={serverOutline} /> DB Editor</IonLabel>
                </IonSegmentButton>
              </IonSegment>

              {/* Feedback Banner */}
              {feedback && (
                <div style={{
                  marginBottom: '20px',
                  padding: '14px 16px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderLeft: `5px solid ${feedbackColor}`,
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                }}>
                  {feedback}
                </div>
              )}

              {/* ========== TAB 1: ACTIVITIES ========== */}
              {activeTab === 'activities' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', margin: 0 }}>Activity Management</h3>
                    <IonButton color="danger" mode="md" style={{ '--border-radius': '8px' }} onClick={openNewActivityForm}>
                      <IonIcon icon={addCircleOutline} slot="start" /> New Activity
                    </IonButton>
                  </div>

                  {renderActivityFormPanel()}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {activities.map(act => (
                      <IonCard key={act.id} className="premium-card" style={{ margin: 0 }}>
                        <IonCardContent style={{ padding: '20px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>{act.name}</h3>
                              {renderEligibilityBadge(act.group_eligibility)}
                            </div>
                            <IonBadge color={act.is_open ? 'success' : 'medium'} style={{ borderRadius: '6px' }}>
                              {act.is_open ? 'Open' : 'Closed'}
                            </IonBadge>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--eca-text-secondary)', lineHeight: '1.8' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--eca-border-subtle)', paddingBottom: '4px', marginBottom: '4px' }}>
                              <span>Teacher:</span>
                              <strong style={{ color: 'var(--eca-text-primary)' }}>{act.teacher_name || '—'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--eca-border-subtle)', paddingBottom: '4px', marginBottom: '4px' }}>
                              <span>Max Seats:</span>
                              <strong style={{ color: 'var(--eca-text-primary)' }}>{act.max_capacity}</strong>
                            </div>
                            <div style={{ marginBottom: '6px' }}>
                              <span>Days: </span>
                              {(act.operational_days || []).map((d: string) => (
                                <span key={d} className="activity-day-badge" style={{ display: 'inline-block', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: '700', marginRight: '4px' }}>{d}</span>
                              ))}
                            </div>
                            {/* Seat counts per day */}
                            <div className="activity-seat-status-box" style={{ borderRadius: '6px', padding: '8px', marginTop: '8px' }}>
                              <div className="seat-status-header" style={{ fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>SEAT STATUS</div>
                              {(act.operational_days || []).map((d: string) => {
                                const filled = seatCounts[`${act.id}_${d}`] || 0;
                                const avail = Math.max(0, act.max_capacity - filled);
                                return (
                                  <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                                    <span className="seat-row-label">{d}:</span>
                                    <span>
                                      <strong className={avail === 0 ? 'seat-row-count-full' : 'seat-row-count'}>{avail} available</strong>
                                      <span className="seat-row-fraction"> ({filled}/{act.max_capacity})</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                            <IonButton size="small" color="primary" mode="md" style={{ '--border-radius': '6px' }} onClick={() => openEditActivityForm(act)}>
                              <IonIcon icon={pencilOutline} slot="start" /> Edit
                            </IonButton>
                            <IonButton size="small" color="danger" fill="outline" mode="md" style={{ '--border-radius': '6px' }} onClick={() => handleDeleteActivity(act.id, act.name)}>
                              <IonIcon icon={trashOutline} />
                            </IonButton>
                          </div>
                        </IonCardContent>
                      </IonCard>
                    ))}
                  </div>
                </div>
              )}

              {/* ========== TAB 2: TEACHERS ========== */}
              {activeTab === 'teachers' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', margin: 0 }}>Teacher Management</h3>
                    <IonButton color="danger" mode="md" style={{ '--border-radius': '8px' }} onClick={openNewTeacherForm}>
                      <IonIcon icon={personAddOutline} slot="start" /> New Teacher
                    </IonButton>
                  </div>

                  {renderTeacherFormPanel()}

                  {/* Password Reset Inline Panel */}
                  {resetPwdTeacherId && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>🔑 Reset Password for: <strong>{teachers.find(t => t.id === resetPwdTeacherId)?.name}</strong></span>
                      <input
                        type="text"
                        value={resetPwdValue}
                        onChange={e => setResetPwdValue(e.target.value)}
                        placeholder="New password (min 4 chars)"
                        style={{ flex: 1, minWidth: '180px', padding: '7px 10px', borderRadius: '6px', background: 'var(--eca-bg-input)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'var(--eca-text-primary)', fontSize: '13px', outline: 'none' }}
                      />
                      <IonButton size="small" color="warning" mode="md" style={{ '--border-radius': '6px' }}
                        onClick={async () => {
                          if (!resetPwdValue.trim() || resetPwdValue.trim().length < 4) { showFeedback('Password must be at least 4 characters.', '#b91c1c'); return; }
                          const { adminResetPassword } = await import('../services/auth');
                          // Find user by reference_id (teacher id)
                          const { supabase } = await import('../services/supabase');
                          const { data: appUser } = await supabase.from('app_users').select('id').eq('reference_id', resetPwdTeacherId).maybeSingle();
                          if (!appUser) { showFeedback('No login account found for this teacher.', '#b91c1c'); return; }
                          const res = await adminResetPassword(appUser.id, resetPwdValue.trim());
                          if (res.success) { showFeedback(res.message); setResetPwdTeacherId(null); setResetPwdValue(''); }
                          else showFeedback(`Error: ${res.message}`, '#b91c1c');
                        }}>
                        🔒 Set Password
                      </IonButton>
                      <IonButton size="small" color="medium" mode="md" style={{ '--border-radius': '6px' }} onClick={() => { setResetPwdTeacherId(null); setResetPwdValue(''); }}>Cancel</IonButton>
                    </div>
                  )}

                  <div className="premium-list-container" style={{ overflow: 'hidden' }}>
                    <IonList lines="full" style={{ background: 'transparent' }}>
                      {teachers.map(t => (
                        <IonItem key={t.id} className="premium-list-item" style={{ '--padding-top': '12px', '--padding-bottom': '12px' }}>
                          <IonLabel style={{ margin: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: 0 }}>{t.name}</h3>
                              {t.class_assignment && (
                                <IonBadge color="danger" style={{ borderRadius: '5px', fontSize: '10px' }}>Form Teacher · Class {t.class_assignment}</IonBadge>
                              )}
                            </div>
                            <p style={{ color: 'var(--eca-text-secondary)', fontSize: '13px', margin: '2px 0 0' }}>
                              Specialty: <strong>{t.subject_specialty || '—'}</strong>
                              {t.employee_id && <> · Employee ID: <strong style={{ color: '#f16363ff' }}>{t.employee_id}</strong></>}
                            </p>
                            <p style={{ color: 'var(--eca-text-muted)', fontSize: '12px', margin: '2px 0 0' }}>
                              Activities: {activities.filter(a => a.teacher_name === t.name).map(a => a.name).join(', ') || '—'}
                            </p>
                            {isMobile && (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <IonButton size="small" color="warning" fill="outline" mode="md" style={{ '--border-radius': '6px' }}
                                  onClick={() => { setResetPwdTeacherId(t.id); setResetPwdValue(''); }}
                                  title="Reset Password">
                                  <IonIcon icon={keyOutline} />
                                </IonButton>
                                <IonButton size="small" color="primary" mode="md" style={{ '--border-radius': '6px' }} onClick={() => openEditTeacherForm(t)}>
                                  <IonIcon icon={pencilOutline} />
                                </IonButton>
                                <IonButton size="small" color="danger" fill="outline" mode="md" style={{ '--border-radius': '6px' }} onClick={() => handleDeleteTeacher(t.id, t.name)}>
                                  <IonIcon icon={trashOutline} />
                                </IonButton>
                              </div>
                            )}
                          </IonLabel>
                          {!isMobile && (
                            <div slot="end" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <IonButton size="small" color="warning" fill="outline" mode="md" style={{ '--border-radius': '6px' }}
                                onClick={() => { setResetPwdTeacherId(t.id); setResetPwdValue(''); }}>
                                🔑 Reset Pwd
                              </IonButton>
                              <IonButton size="small" color="primary" mode="md" style={{ '--border-radius': '6px' }} onClick={() => openEditTeacherForm(t)}>
                                <IonIcon icon={pencilOutline} />
                              </IonButton>
                              <IonButton size="small" color="danger" fill="outline" mode="md" style={{ '--border-radius': '6px' }} onClick={() => handleDeleteTeacher(t.id, t.name)}>
                                <IonIcon icon={trashOutline} />
                              </IonButton>
                            </div>
                          )}
                        </IonItem>
                      ))}
                      {teachers.length === 0 && (
                        <div style={emptyPlaceholderStyle}>No teachers yet. Add one above.</div>
                      )}
                    </IonList>
                  </div>
                </div>
              )}

              {/* ========== TAB 3: STUDENTS ========== */}
              {activeTab === 'students' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', margin: 0 }}>Student Registry</h3>
                    <IonButton color="danger" mode="md" style={{ '--border-radius': '8px' }} onClick={openNewStudentForm}>
                      <IonIcon icon={addCircleOutline} slot="start" /> New Student
                    </IonButton>
                  </div>

                  {renderStudentFormPanel()}

                  <IonRow>
                    {/* Primary Student List with Filters */}
                    <IonCol size="12" sizeLg="7">
                      <IonCard className="premium-card" style={{ margin: '0 0 16px 0' }}>
                        <IonCardContent style={{ padding: '14px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonIcon icon={funnelOutline} /> FILTER DATA:
                          </div>

                          {/* Class Filter */}
                          <select value={filterStudClass} onChange={e => setFilterStudClass(e.target.value)}
                            style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', fontWeight: '600', outline: 'none' }}>
                            <option value="All">All Classes</option>
                            {CLASS_GRADES.map(c => <option key={c} value={c}>Class {c}</option>)}
                          </select>

                          {/* Activity Filter */}
                          <select value={filterStudActivity} onChange={e => setFilterStudActivity(e.target.value)}
                            style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', fontWeight: '600', outline: 'none' }}>
                            <option value="All">All Activities</option>
                            {activities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
                          </select>

                          {/* Day Filter */}
                          <select value={filterStudDay} onChange={e => setFilterStudDay(e.target.value)}
                            style={{ padding: '5px 8px', borderRadius: '6px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', fontWeight: '600', outline: 'none' }}>
                            <option value="All">All Days</option>
                            {ALL_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </IonCardContent>
                      </IonCard>

                      <div className="premium-list-container" style={{ overflow: 'hidden' }}>
                        <IonList lines="full" style={{ background: 'transparent' }}>
                          {getFilteredStudents().map(s => (
                            <IonItem key={s.id} className="premium-list-item" style={{ '--padding-top': '10px', '--padding-bottom': '10px' }}>
                              <IonLabel>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: '0 0 2px' }}>
                                  {s.name}
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--eca-text-secondary)', margin: 0 }}>
                                  ID: <strong>{s.student_number}</strong> · Tier: <strong>{s.group_tier}</strong> · Class: <strong style={{ color: '#f16363ff' }}>{s.class_grade || 'None'}</strong>
                                </p>
                                <p style={{ fontSize: '11px', color: 'var(--eca-text-muted)', margin: '2px 0 0' }}>
                                  Active: {registrations.filter(r => r.student_id === s.id && r.status === 'Approved').map(r => `${r.activity_name} (${r.day_of_week})`).join(', ') || 'None'}
                                </p>
                              </IonLabel>
                              <div slot="end" style={{ display: 'flex', gap: '8px' }}>
                                <IonButton size="small" color="primary" mode="md" style={{ '--border-radius': '6px' }} onClick={() => openEditStudentForm(s)}>
                                  <IonIcon icon={pencilOutline} />
                                </IonButton>
                                <IonButton size="small" color="danger" fill="outline" mode="md" style={{ '--border-radius': '6px' }} onClick={() => handleDeleteStudent(s.id, s.name)}>
                                  <IonIcon icon={trashOutline} />
                                </IonButton>
                              </div>
                            </IonItem>
                          ))}
                          {getFilteredStudents().length === 0 && (
                            <div style={emptyPlaceholderStyle}>No students found matching filters.</div>
                          )}
                        </IonList>
                      </div>
                    </IonCol>

                    {/* Students Without Activities Panel */}
                    <IonCol size="12" sizeLg="5">
                      <div style={{ paddingLeft: '10px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#fca5a5', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IonIcon icon={alertCircleOutline} /> Students Without Activity
                        </h4>

                        <IonCard style={{ margin: '0 0 16px 0', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <IonCardContent style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#fca5a5' }}>CRITERIA:</div>

                            <select value={unregClassFilter} onChange={e => setUnregClassFilter(e.target.value)}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--eca-bg-input)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--eca-color-danger)', fontSize: '11px', fontWeight: '600', outline: 'none' }}>
                              <option value="All">All Classes</option>
                              {CLASS_GRADES.map(c => <option key={c} value={c}>Class {c}</option>)}
                            </select>

                            <select value={unregDayFilter} onChange={e => setUnregDayFilter(e.target.value)}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--eca-bg-input)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--eca-color-danger)', fontSize: '11px', fontWeight: '600', outline: 'none' }}>
                              {ALL_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </IonCardContent>
                        </IonCard>

                        <div className="premium-list-container" style={{ border: '1px solid rgba(239, 68, 68, 0.15)', overflow: 'hidden' }}>
                          <IonList lines="full" style={{ background: 'transparent' }}>
                            {getUnregisteredStudents().map(s => (
                              <IonItem key={s.id} className="premium-list-item">
                                <IonLabel>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>
                                    {s.name}
                                  </div>
                                  <p style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                    Class {s.class_grade || 'None'} · {s.group_tier} · ID: {s.student_number}
                                  </p>
                                </IonLabel>
                                <IonBadge color="danger" slot="end" style={{ borderRadius: '6px', fontSize: '10px' }}>
                                  No Activity on {unregDayFilter}
                                </IonBadge>
                              </IonItem>
                            ))}
                            {getUnregisteredStudents().length === 0 && (
                              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                All students have registered activities for this criteria!
                              </div>
                            )}
                          </IonList>
                        </div>
                      </div>
                    </IonCol>
                  </IonRow>
                </div>
              )}

              {/* ========== TAB 4: ROSTER / STUDENT PLACEMENTS ========== */}
              {activeTab === 'registrations' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--eca-text-primary)', margin: 0 }}>Student Placement Ledger</h3>
                  </div>

                  {/* Roster Filter Controls */}
                  <IonCard className="premium-card" style={{ margin: '0 0 20px 0' }}>
                    <IonCardContent style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--eca-text-secondary)' }}>
                        <IonIcon icon={funnelOutline} />
                        <span>FILTERS:</span>
                      </div>

                      {/* Status Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--eca-text-secondary)' }}>Status:</span>
                        <select value={rosterFilterStatus} onChange={e => setRosterFilterStatus(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '13px', fontWeight: '600', outline: 'none' }}>
                          <option value="All">All Registrations</option>
                          <option value="NeedsAdmin">Needs Admin Action (Teacher Approved)</option>
                          <option value="QueuedPendingAudition">Queued (Waiting Audition)</option>
                          <option value="Approved">Approved (Active)</option>
                          <option value="TeacherRejected">Rejected by Teacher</option>
                        </select>
                      </div>

                      {/* Sort Order */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--eca-text-secondary)' }}>Order:</span>
                        <select value={rosterSortOrder} onChange={e => setRosterSortOrder(e.target.value as any)}
                          style={{ padding: '6px 10px', borderRadius: '6px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '13px', fontWeight: '600', outline: 'none' }}>
                          <option value="asc">Student Name (A-Z)</option>
                          <option value="desc">Student Name (Z-A)</option>
                        </select>
                      </div>
                    </IonCardContent>
                  </IonCard>

                  <div className="premium-list-container" style={{ overflow: 'hidden' }}>
                    <IonList lines="full" style={{ background: 'transparent' }}>
                      {getFilteredRegistrations().map(reg => {
                        const act = activities.find(a => a.id === reg.activity_id);
                        const isTeacherApprovedQueue = reg.status === 'Queued' && reg.teacher_approved;

                        const otherApprovedOnDay = registrations.find(r =>
                          r.student_id === reg.student_id &&
                          r.day_of_week === reg.day_of_week &&
                          r.status === 'Approved' &&
                          r.id !== reg.id
                        );

                        return (
                          <IonItem key={reg.id} className="premium-list-item" style={{ '--padding-top': '12px', '--padding-bottom': '12px' }}>
                            <IonLabel style={{ margin: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: 0 }}>
                                  {reg.student_name}
                                  <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '8px', fontWeight: '700', marginLeft: '6px' }}>
                                    Class {reg.student_class_grade || 'None'}
                                  </span>
                                </h3>
                                {renderBadge(reg)}
                              </div>
                              <p style={{ color: 'var(--eca-text-secondary)', fontSize: '13px', margin: '2px 0' }}>
                                Tier: <strong>{reg.student_group}</strong> · Activity: <strong style={{ color: '#f16363ff' }}>{reg.activity_name}</strong>
                              </p>
                              <p style={{ color: 'var(--eca-text-muted)', fontSize: '12px', margin: 0 }}>
                                Day: <strong>{reg.day_of_week}</strong>
                                {' · '}
                                <span style={{ color: 'var(--eca-text-secondary)' }}>{getSeatLabel(reg.activity_id, reg.day_of_week, act?.max_capacity || 24)}</span>
                              </p>
                              {isTeacherApprovedQueue && otherApprovedOnDay && (
                                <p style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '600', marginTop: '4px' }}>
                                  ⚠️ Active backup: "{otherApprovedOnDay.activity_name}" will be automatically replaced upon activation.
                                </p>
                              )}

                              {/* Mobile actions & move selector inside label */}
                              {isMobile && (
                                <div style={{ marginTop: '12px' }}>
                                  {movingRegId === reg.id ? (
                                    <div style={{ background: 'var(--eca-bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--eca-border-input)', width: '100%', boxSizing: 'border-box' }}>
                                      <select value={moveActivityId} onChange={e => setMoveActivityId(e.target.value)}
                                        style={{ width: '100%', padding: '6px', borderRadius: '4px', marginBottom: '8px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', outline: 'none' }}>
                                        <option value="">Select Activity</option>
                                        {activities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
                                      </select>
                                      <select value={moveDay} onChange={e => setMoveDay(e.target.value)}
                                        style={{ width: '100%', padding: '6px', borderRadius: '4px', marginBottom: '8px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', outline: 'none' }}>
                                        <option value="">Select Day</option>
                                        {ALL_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                      </select>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <IonButton size="small" color="success" mode="md" onClick={() => handleMoveStudent(reg)}>Move</IonButton>
                                        <IonButton size="small" color="medium" mode="md" onClick={() => setMovingRegId(null)}>Cancel</IonButton>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      {isTeacherApprovedQueue && (
                                        <IonButton size="small" color="success" mode="md" style={{ '--border-radius': '6px' }}
                                          onClick={() => handlePromoteStudent(reg.id, reg.student_name, reg.activity_name)}
                                          title="Activate">
                                          <IonIcon icon={starOutline} />
                                        </IonButton>
                                      )}
                                      <IonButton size="small" color="tertiary" mode="md" style={{ '--border-radius': '6px' }}
                                        onClick={() => { setMovingRegId(reg.id); setMoveActivityId(reg.activity_id); setMoveDay(reg.day_of_week); }}
                                        title="Move">
                                        <IonIcon icon={swapHorizontalOutline} />
                                      </IonButton>
                                      <IonButton size="small" color="warning" mode="md" style={{ '--border-radius': '6px' }}
                                        onClick={() => handleReleaseRegistration(reg.id, reg.student_name)}
                                        title="Release">
                                        <IonIcon icon={closeCircleOutline} />
                                      </IonButton>
                                      <IonButton size="small" color="danger" fill="outline" mode="md" style={{ '--border-radius': '6px' }}
                                        onClick={() => handleReleaseRegistration(reg.id, reg.student_name)}
                                        title="Delete">
                                        <IonIcon icon={trashOutline} />
                                      </IonButton>
                                    </div>
                                  )}
                                </div>
                              )}
                            </IonLabel>

                            {/* Desktop actions in slot="end" */}
                            {!isMobile && (
                              <div slot="end">
                                {movingRegId === reg.id ? (
                                  <div style={{ background: 'var(--eca-bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--eca-border-input)', width: '220px' }}>
                                    <select value={moveActivityId} onChange={e => setMoveActivityId(e.target.value)}
                                      style={{ width: '100%', padding: '6px', borderRadius: '4px', marginBottom: '8px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', outline: 'none' }}>
                                      <option value="">Select Activity</option>
                                      {activities.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
                                    </select>
                                    <select value={moveDay} onChange={e => setMoveDay(e.target.value)}
                                      style={{ width: '100%', padding: '6px', borderRadius: '4px', marginBottom: '8px', background: 'var(--eca-bg-input)', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', fontSize: '12px', outline: 'none' }}>
                                      <option value="">Select Day</option>
                                      {ALL_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <IonButton size="small" color="success" mode="md" onClick={() => handleMoveStudent(reg)}>Move</IonButton>
                                      <IonButton size="small" color="medium" mode="md" onClick={() => setMovingRegId(null)}>Cancel</IonButton>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                    {isTeacherApprovedQueue && (
                                      <IonButton size="small" color="success" mode="md" style={{ '--border-radius': '6px', fontWeight: '700' }}
                                        onClick={() => handlePromoteStudent(reg.id, reg.student_name, reg.activity_name)}>
                                        <IonIcon icon={starOutline} slot="start" />
                                        Activate
                                      </IonButton>
                                    )}
                                    <IonButton size="small" color="tertiary" mode="md" style={{ '--border-radius': '6px' }}
                                      onClick={() => { setMovingRegId(reg.id); setMoveActivityId(reg.activity_id); setMoveDay(reg.day_of_week); }}>
                                      Move
                                    </IonButton>
                                    <IonButton size="small" color="warning" mode="md" style={{ '--border-radius': '6px' }}
                                      onClick={() => handleReleaseRegistration(reg.id, reg.student_name)}>
                                      Release
                                    </IonButton>
                                    <IonButton size="small" color="danger" fill="outline" mode="md" style={{ '--border-radius': '6px' }}
                                      onClick={() => handleReleaseRegistration(reg.id, reg.student_name)}>
                                      <IonIcon icon={trashOutline} />
                                    </IonButton>
                                  </div>
                                )}
                              </div>
                            )}
                          </IonItem>
                        );
                      })}
                      {getFilteredRegistrations().length === 0 && (
                        <div style={emptyPlaceholderStyle}>No registrations match current filters.</div>
                      )}
                    </IonList>
                  </div>
                </div>
              )}

              {/* ========== TAB 5: SCHEDULE SETTINGS ========== */}
              {activeTab === 'settings' && (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--eca-text-primary)', margin: '0 0 8px' }}>Group Schedule Configuration</h3>
                  <p style={{ color: 'var(--eca-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                    Configure which days each student group can select activities on. Changes take effect immediately.
                  </p>
                  <IonRow>
                    {/* SMP Days */}
                    <IonCol size="12" sizeMd="6">
                      <IonCard className="premium-card">
                        <IonCardContent style={{ padding: '24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <span style={{ padding: '4px 12px', background: 'var(--eca-segment-active-bg)', color: 'var(--eca-segment-active-text)', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>SMP Group</span>
                            <span style={{ fontSize: '13px', color: 'var(--eca-text-muted)' }}>Junior High School</span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-secondary)', marginBottom: '12px' }}>ALLOWED ACTIVITY DAYS:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {ALL_DAYS.map(day => (
                              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', background: smpDaysEdit.includes(day) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: `1px solid ${smpDaysEdit.includes(day) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}` }}>
                                <IonCheckbox
                                  checked={smpDaysEdit.includes(day)}
                                  onIonChange={() => toggleDay(day, smpDaysEdit, setSmpDaysEdit, 2)}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>{day}</span>
                              </label>
                            ))}
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                    {/* SMA Days */}
                    <IonCol size="12" sizeMd="6">
                      <IonCard className="premium-card">
                        <IonCardContent style={{ padding: '24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <span style={{ padding: '4px 12px', background: 'rgba(236, 72, 153, 0.15)', color: '#cb0256ff', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>SMA Group</span>
                            <span style={{ fontSize: '13px', color: 'var(--eca-text-muted)' }}>Senior High School</span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-secondary)', marginBottom: '12px' }}>ALLOWED ACTIVITY DAYS:</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {ALL_DAYS.map(day => (
                              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 14px', background: smaDaysEdit.includes(day) ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: `1px solid ${smaDaysEdit.includes(day) ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.08)'}` }}>
                                <IonCheckbox
                                  checked={smaDaysEdit.includes(day)}
                                  onIonChange={() => toggleDay(day, smaDaysEdit, setSmaDaysEdit, 2)}
                                />
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>{day}</span>
                              </label>
                            ))}
                          </div>
                        </IonCardContent>
                      </IonCard>
                    </IonCol>
                  </IonRow>
                  <IonButton expand="block" color="danger" mode="md"
                    style={{ '--border-radius': '10px', marginTop: '20px', height: '48px', fontWeight: '700' }}
                    onClick={handleSaveSettings}>
                    Save Schedule Settings
                  </IonButton>
                </div>
              )}

              {/* ========== TAB 6: DB EDITOR ========== */}
              {activeTab === 'db_editor' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--eca-text-primary)', margin: 0 }}>Direct Database Editor</h3>
                    <IonButton color="medium" size="small" mode="md" onClick={fetchDbCollection} style={{ '--border-radius': '6px' }}>
                      <IonIcon icon={refreshOutline} slot="start" /> Reload
                    </IonButton>
                  </div>
                  <IonRow>
                    <IonCol size="12" sizeMd="5">
                      <div className="premium-card" style={{ padding: '16px', marginBottom: '16px' }}>
                        <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-secondary)', marginBottom: '12px' }}>
                          <IonLabel style={{ fontWeight: '700', fontSize: '13px', color: 'var(--eca-text-label)' }}>Table:</IonLabel>
                          <IonSelect value={selectedDbCollection} interface="popover"
                            onIonChange={e => { setSelectedDbCollection(e.detail.value); setEditingDbDocId(null); }}
                            style={{ fontWeight: '700', color: '#f43f5e' }}>
                            <IonSelectOption value="students">students</IonSelectOption>
                            <IonSelectOption value="teachers">teachers</IonSelectOption>
                            <IonSelectOption value="activities">activities</IonSelectOption>
                            <IonSelectOption value="registrations">registrations</IonSelectOption>
                            <IonSelectOption value="system_settings">system_settings</IonSelectOption>
                          </IonSelect>
                        </IonItem>
                        <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-secondary)', margin: '0 0 8px 2px' }}>ROWS ({dbDocuments.length})</h4>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '6px' }}>
                          <IonList style={{ background: 'transparent' }}>
                            {dbDocuments.map(doc => (
                              <IonItem button key={doc._id}
                                style={{ '--background': editingDbDocId === doc._id ? 'rgba(244, 63, 94, 0.15)' : 'transparent', '--color': 'var(--eca-text-primary)' }}
                                onClick={() => { setEditingDbDocId(doc._id); setDbDocRawJson(JSON.stringify(doc, null, 2)); }}>
                                <IonLabel>
                                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-primary)' }}>{doc._id}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--eca-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.name || doc.student_name || doc.activity_name || doc.value || ''}
                                  </div>
                                </IonLabel>
                                <IonButton fill="clear" color="danger" size="small" slot="end"
                                  onClick={e => { e.stopPropagation(); handleDeleteDbDoc(doc._id); }}>
                                  <IonIcon icon={trashOutline} />
                                </IonButton>
                              </IonItem>
                            ))}
                            {dbDocuments.length === 0 && (
                              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No rows found.</div>
                            )}
                          </IonList>
                        </div>
                      </div>
                    </IonCol>
                    <IonCol size="12" sizeMd="7">
                      {editingDbDocId ? (
                        <div className="premium-card" style={{ padding: '20px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>
                              Editing: <span style={{ color: '#f43f5e' }}>{editingDbDocId}</span>
                            </h4>
                            <IonBadge color="danger">RAW JSON</IonBadge>
                          </div>
                          <textarea value={dbDocRawJson} onChange={e => setDbDocRawJson(e.target.value)}
                            style={{ width: '100%', height: '240px', fontFamily: 'monospace', fontSize: '12px', padding: '12px', borderRadius: '6px', border: '1px solid var(--eca-border-input)', background: 'var(--eca-bg-input)', color: 'var(--eca-text-primary)', resize: 'vertical', outline: 'none' }} />
                          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                            <IonButton size="small" color="success" mode="md" style={{ '--border-radius': '6px' }} onClick={() => handleSaveDbDoc(editingDbDocId)}>
                              <IonIcon icon={checkmarkCircleOutline} slot="start" /> Save Row
                            </IonButton>
                            <IonButton size="small" color="medium" mode="md" style={{ '--border-radius': '6px' }} onClick={() => setEditingDbDocId(null)}>Cancel</IonButton>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--eca-bg-list)', borderRadius: '12px', border: '1px dashed var(--eca-border-input)', padding: '40px', textAlign: 'center', color: 'var(--eca-text-secondary)', marginBottom: '16px' }}>
                          Select a row from the list to edit its raw data.
                        </div>
                      )}
                      <div className="premium-card" style={{ padding: '20px' }}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>Insert New Row</h4>
                        <IonItem lines="none" style={{ '--background': 'var(--eca-bg-input)', borderRadius: '8px', border: '1px solid var(--eca-border-input)', color: 'var(--eca-text-primary)', marginBottom: '12px' }}>
                          <IonLabel position="stacked" style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)' }}>Row ID</IonLabel>
                          <IonInput value={dbNewDocId} placeholder="e.g. student_99" onIonInput={e => setDbNewDocId(String(e.detail.value))} />
                        </IonItem>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-secondary)', marginBottom: '6px' }}>DATA (JSON)</div>
                        <textarea value={dbNewDocJson} onChange={e => setDbNewDocJson(e.target.value)}
                          style={{ width: '100%', height: '110px', fontFamily: 'monospace', fontSize: '12px', padding: '10px', borderRadius: '6px', border: '1px solid var(--eca-border-input)', background: 'var(--eca-bg-input)', color: 'var(--eca-color-success)', outline: 'none' }} />
                        <IonButton expand="block" color="danger" mode="md"
                          style={{ '--border-radius': '8px', marginTop: '12px', height: '40px', fontWeight: '700' }}
                          onClick={handleCreateDbDoc}>
                          <IonIcon icon={addCircleOutline} slot="start" /> Insert Row
                        </IonButton>
                      </div>
                    </IonCol>
                  </IonRow>
                </div>
              )}

            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Admin;