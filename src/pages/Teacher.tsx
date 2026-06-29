/**
 * src/pages/Teacher.tsx
 *
 * Role-aware Teacher Portal:
 *  - Subject/Activity teacher  → sees only their own activities & evaluation queue
 *  - Form teacher              → sees "My Class" tab: student registration summary + unregistered list
 *  - Teacher who is both       → both tabs
 *  - Admin                     → full portal with teacher selector, all tabs
 */
import React, { useEffect, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonItem,
  IonLabel, IonSelect, IonSelectOption, IonButton, IonCard,
  IonCardContent, IonGrid, IonRow, IonCol, IonBadge, IonList, IonIcon, IonSegment, IonSegmentButton
} from '@ionic/react';
import {
  checkmarkCircleOutline,
  closeCircleOutline,
  schoolOutline,
  peopleOutline,
  hourglassOutline,
  funnelOutline,
  alertCircleOutline,
  personOutline,
} from 'ionicons/icons';
import {
  subscribeRegistrations,
  subscribeActivities,
  subscribeTeachers,
  approveRegistrationByTeacher,
  rejectRegistrationByTeacher,
  getActivitySeatCounts,
  subscribeClassRegistrations,
  subscribeSystemSettings,
  ClassRegistrationSummary,
} from '../services/supabase';
import { useAuth } from '../context/AuthContext';

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

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Form Teacher Class Tab
// ─────────────────────────────────────────────────────────────────────────────
const FormTeacherClassTab: React.FC<{ classGrade: string }> = ({ classGrade }) => {
  const [summary, setSummary] = useState<ClassRegistrationSummary | null>(null);
  const [dayFilter, setDayFilter] = useState<string>('All');
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubRegs = subscribeClassRegistrations(classGrade, setSummary);
    const unsubSettings = subscribeSystemSettings(setSettings);
    return () => {
      unsubRegs();
      unsubSettings();
    };
  }, [classGrade]);

  if (!summary) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--eca-text-muted)' }}>
        Loading class data…
      </div>
    );
  }

  const { students, registrations, unregistered } = summary;

  // Build per-student registration map
  const regsByStudent: Record<string, any[]> = {};
  for (const reg of registrations) {
    if (!regsByStudent[reg.student_id]) regsByStudent[reg.student_id] = [];
    regsByStudent[reg.student_id].push(reg);
  }

  const classGroupTier = students[0]?.group_tier || (
    classGrade.startsWith('10') || classGrade.startsWith('11') || classGrade.startsWith('12') ? 'SMA' : 'SMP'
  );

  const allowedClassDays = classGroupTier === 'SMP'
    ? (settings['smp_days'] || 'Monday,Thursday').split(',').map((d: string) => d.trim()).filter(Boolean)
    : (settings['sma_days'] || 'Tuesday,Thursday').split(',').map((d: string) => d.trim()).filter(Boolean);

  // Day-filtered registrations for the "Not Registered" panel
  const unregisteredOnDay =
    dayFilter === 'All'
      ? unregistered
      : students.filter(s => {
        const smpDays = (settings['smp_days'] || 'Monday,Thursday').split(',').map((d: string) => d.trim()).filter(Boolean);
        const smaDays = (settings['sma_days'] || 'Tuesday,Thursday').split(',').map((d: string) => d.trim()).filter(Boolean);
        const studentAllowedDays = s.group_tier === 'SMP' ? smpDays : smaDays;
        if (!studentAllowedDays.includes(dayFilter)) {
          // Student is not scheduled for this day, so they are not unregistered
          return false;
        }
        const studentRegs = regsByStudent[s.id] || [];
        return !studentRegs.some(
          r => r.day_of_week === dayFilter && (r.status === 'Approved' || r.status === 'Queued')
        );
      });

  const badgeForStatus = (status: string, teacherApproved: boolean) => {
    if (status === 'Approved') return <IonBadge color="success" style={{ borderRadius: '5px', fontSize: '10px' }}>Active</IonBadge>;
    if (status === 'Queued' && teacherApproved) return <IonBadge color="warning" style={{ borderRadius: '5px', fontSize: '10px' }}>Audition Passed</IonBadge>;
    if (status === 'Queued') return <IonBadge color="medium" style={{ borderRadius: '5px', fontSize: '10px' }}>Queued</IonBadge>;
    if (status === 'Rejected') return <IonBadge color="danger" style={{ borderRadius: '5px', fontSize: '10px' }}>Rejected</IonBadge>;
    return <IonBadge color="medium" style={{ borderRadius: '5px', fontSize: '10px' }}>{status}</IonBadge>;
  };

  return (
    <div>
      {/* Class Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IonIcon icon={schoolOutline} style={{ fontSize: '24px', color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--eca-text-label)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>My Class</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>Class {classGrade}</div>
          <div style={{ fontSize: '12px', color: 'var(--eca-text-secondary)' }}>{students.length} student{students.length !== 1 ? 's' : ''} enrolled</div>
        </div>
      </div>

      {/* Day filter */}
      <IonCard className="premium-card" style={{ margin: '0 0 20px 0' }}>
        <IonCardContent style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-secondary)' }}>
            <IonIcon icon={funnelOutline} />
            <span>FILTER BY DAY:</span>
          </div>
          <select
            value={dayFilter}
            onChange={e => setDayFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--eca-border)', fontSize: '13px', background: 'var(--eca-bg-input)', fontWeight: '600', color: 'var(--eca-text-primary)' }}
          >
            <option value="All">All Days</option>
            {allowedClassDays.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </IonCardContent>
      </IonCard>

      {/* Student Registration Table */}
      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: '0 0 12px 4px' }}>
        Student Activity Choices ({students.length})
      </h3>
      <div className="premium-list-container" style={{ marginBottom: '28px' }}>
        <IonList lines="full" style={{ background: 'transparent' }}>
          {students.map(student => {
            const studentRegs = (regsByStudent[student.id] || []).filter(
              r => dayFilter === 'All' || r.day_of_week === dayFilter
            );
            return (
              <IonItem key={student.id} className="premium-list-item" style={{ '--padding-top': '10px', '--padding-bottom': '10px' }}>
                <IonLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--eca-text-primary)' }}>{student.name}</span>
                    <span style={{ fontSize: '11px', padding: '1px 7px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '8px', fontWeight: '700' }}>
                      {student.group_tier}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--eca-text-secondary)', margin: '0 0 4px' }}>
                    NIS: <strong>{student.student_number}</strong>
                  </p>
                  {studentRegs.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {studentRegs.map(reg => (
                        <div key={reg.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--eca-bg-item)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--eca-border-subtle)', fontSize: '11px' }}>
                          <span style={{ fontWeight: '600', color: 'var(--eca-text-secondary)' }}>{reg.activity_name}</span>
                          <span style={{ color: 'var(--eca-text-muted)' }}>({reg.day_of_week})</span>
                          {badgeForStatus(reg.status, reg.teacher_approved)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                      ⚠️ No registration{dayFilter !== 'All' ? ` on ${dayFilter}` : ''}
                    </span>
                  )}
                </IonLabel>
                <div slot="end">
                  {studentRegs.length === 0 && (
                    <IonBadge color="danger" style={{ borderRadius: '6px', fontSize: '10px' }}>Not Registered</IonBadge>
                  )}
                </div>
              </IonItem>
            );
          })}
          {students.length === 0 && (
            <div style={emptyPlaceholderStyle}>
              No students found in Class {classGrade}.
            </div>
          )}
        </IonList>
      </div>

      {/* Not Registered Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <IonIcon icon={alertCircleOutline} style={{ fontSize: '18px', color: '#ef4444' }} />
        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444', margin: 0 }}>
          Students Not Registered{dayFilter !== 'All' ? ` on ${dayFilter}` : ''} ({unregisteredOnDay.length})
        </h3>
      </div>
      <div className="premium-list-container" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '28px' }}>
        <IonList lines="full" style={{ background: 'transparent' }}>
          {unregisteredOnDay.map(student => (
            <IonItem key={student.id} className="premium-list-item" style={{ '--padding-top': '8px', '--padding-bottom': '8px' }}>
              <IonIcon icon={personOutline} slot="start" style={{ color: '#ef4444', fontSize: '18px' }} />
              <IonLabel>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>{student.name}</div>
                <p style={{ fontSize: '11px', color: 'var(--eca-text-secondary)', margin: 0 }}>
                  NIS: {student.student_number} · {student.group_tier}
                </p>
              </IonLabel>
              <IonBadge color="danger" slot="end" style={{ borderRadius: '6px', fontSize: '10px' }}>
                No Activity
              </IonBadge>
            </IonItem>
          ))}
          {unregisteredOnDay.length === 0 && (
            <div style={{ ...emptyPlaceholderStyle, color: '#10b981', fontWeight: '600' }}>
              All students in this class have registered{dayFilter !== 'All' ? ` for ${dayFilter}` : ''}!
            </div>
          )}
        </IonList>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Activity Evaluation Tab (existing teacher functionality)
// ─────────────────────────────────────────────────────────────────────────────
interface ActivityTabProps {
  selectedTeacherName: string;
  activities: any[];
  registrations: any[];
  seatCounts: Record<string, number>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  showSelector?: boolean;
  teachers?: any[];
  onTeacherChange?: (name: string) => void;
}

const ActivityEvaluationTab: React.FC<ActivityTabProps> = ({
  selectedTeacherName, activities, registrations, seatCounts,
  onApprove, onReject, showSelector, teachers, onTeacherChange,
}) => {
  const [dayFilter, setDayFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'name' | 'class_name'>('name');
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubSettings = subscribeSystemSettings(setSettings);
    return unsubSettings;
  }, []);

  const smpDays = (settings['smp_days'] || 'Monday,Thursday').split(',').map((d: string) => d.trim()).filter(Boolean);
  const smaDays = (settings['sma_days'] || 'Tuesday,Thursday').split(',').map((d: string) => d.trim()).filter(Boolean);
  const activeDays = Array.from(new Set([...smpDays, ...smaDays]));
  const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  activeDays.sort((a, b) => weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b));

  const teacherActivities = activities.filter(act => act.teacher_name === selectedTeacherName);
  const teacherActivityIds = teacherActivities.map(act => act.id);
  const filteredRegs = registrations.filter(reg => teacherActivityIds.includes(reg.activity_id));

  const processRosterList = (list: any[]) => {
    let result = [...list];
    if (dayFilter !== 'All') result = result.filter(r => r.day_of_week === dayFilter);
    result.sort((a, b) => {
      if (sortOrder === 'class_name') {
        const ca = a.student_class_grade || '', cb = b.student_class_grade || '';
        if (ca !== cb) return ca.localeCompare(cb);
      }
      return (a.student_name || '').localeCompare(b.student_name || '');
    });
    return result;
  };

  const queuedRegs = processRosterList(filteredRegs.filter(r => r.status === 'Queued' && !r.teacher_approved));
  const pendingAdminRegs = processRosterList(filteredRegs.filter(r => r.status === 'Queued' && r.teacher_approved));
  const approvedRegs = processRosterList(filteredRegs.filter(r => r.status === 'Approved'));
  const rejectedRegs = processRosterList(filteredRegs.filter(r => r.status === 'Rejected'));

  const dayPillStyle = (count: number, max: number): React.CSSProperties => {
    const pct = max > 0 ? count / max : 0;
    let bg = 'rgba(56, 189, 248, 0.15)', color = '#38bdf8';
    if (pct >= 1) { bg = 'rgba(239, 68, 68, 0.15)'; color = '#fca5a5'; }
    else if (pct >= 0.75) { bg = 'rgba(245, 158, 11, 0.15)'; color = '#fcd34d'; }
    return { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700', background: bg, color, whiteSpace: 'nowrap' };
  };

  return (
    <div>
      {/* Teacher Selector (admin only) */}
      {showSelector && teachers && onTeacherChange && (
        <IonCard className="premium-card" style={{ margin: '0 0 24px 0' }}>
          <IonCardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <IonIcon icon={schoolOutline} style={{ fontSize: '28px', color: 'var(--ion-color-primary)' }} />
              <div>
                <h4 style={{ color: 'var(--eca-text-secondary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '0' }}>Active Instructor Profile</h4>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: '2px 0 0' }}>{selectedTeacherName || 'No Teacher Selected'}</h2>
              </div>
            </div>
            <IonItem lines="none" style={{ '--background': 'var(--eca-bg-list)', borderRadius: '8px', border: '1px solid var(--eca-border)', marginTop: '8px' }}>
              <IonLabel style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-label)' }}>Select Instructor:</IonLabel>
              <IonSelect value={selectedTeacherName} interface="popover" onIonChange={e => onTeacherChange(e.detail.value)} style={{ fontWeight: '600', color: 'var(--ion-color-primary)' }}>
                {teachers.map(t => <IonSelectOption key={t.id} value={t.name}>{t.name}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
          </IonCardContent>
        </IonCard>
      )}

      {/* Current teacher identity (non-admin, non-selector) */}
      {!showSelector && (
        <div className="banner-success" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '14px 18px', borderRadius: '10px' }}>
          <IonIcon icon={schoolOutline} style={{ fontSize: '22px' }} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.8 }}>Your Activities</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{selectedTeacherName}</div>
          </div>
        </div>
      )}

      {/* Assigned Activities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 4px' }}>
        <IonIcon icon={peopleOutline} style={{ fontSize: '18px', color: 'var(--ion-color-primary)' }} />
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: '0' }}>Your Assigned Activities</h3>
      </div>
      <IonRow style={{ marginBottom: '24px' }}>
        {teacherActivities.map(act => (
          <IonCol size="12" sizeMd="6" key={act.id}>
            <div className="premium-card" style={{ padding: '16px', borderRadius: '12px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>{act.name}</h4>
                <IonBadge color={act.is_open ? 'success' : 'danger'} style={{ borderRadius: '6px' }}>{act.is_open ? 'Open' : 'Closed'}</IonBadge>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(act.operational_days || []).map((day: string) => {
                  const key = `${act.id}_${day}`;
                  const count = seatCounts[key] || 0;
                  return <span key={day} style={dayPillStyle(count, act.max_capacity)}>{count} / {act.max_capacity} on {day}</span>;
                })}
              </div>
            </div>
          </IonCol>
        ))}
        {teacherActivities.length === 0 && (
          <IonCol size="12">
            <div className="premium-card" style={{ padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#cbd5e1', border: '1px dashed rgba(255,255,255,0.1)' }}>
              No activities currently assigned.
            </div>
          </IonCol>
        )}
      </IonRow>

      {/* Filter & Sort Controls */}
      <IonCard className="premium-card" style={{ margin: '0 0 24px 0' }}>
        <IonCardContent style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--eca-text-secondary)' }}>
            <IonIcon icon={funnelOutline} /><span>ROSTER CONTROLS:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--eca-text-secondary)' }}>Day:</span>
            <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--eca-border)', fontSize: '13px', background: 'var(--eca-bg-input)', fontWeight: '600', color: 'var(--eca-text-primary)' }}>
              <option value="All">All Days</option>
              {activeDays.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--eca-text-secondary)' }}>Arrange by:</span>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--eca-border)', fontSize: '13px', background: 'var(--eca-bg-input)', fontWeight: '600', color: 'var(--eca-text-primary)' }}>
              <option value="name">Name (A-Z)</option>
              <option value="class_name">Class (A-Z) then Name</option>
            </select>
          </div>
        </IonCardContent>
      </IonCard>

      {/* Evaluation Queue */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '4px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', margin: '0' }}>Evaluation Queue (Auditions)</h3>
          <IonBadge color="warning" style={{ borderRadius: '12px', fontSize: '11px', padding: '4px 8px' }}>{queuedRegs.length} Action Needed</IonBadge>
        </div>
        <div className="premium-list-container">
          <IonList lines="full" style={{ background: 'transparent' }}>
            {queuedRegs.map(reg => (
              <IonItem key={reg.id} className="premium-list-item" style={{ '--padding-top': '8px', '--padding-bottom': '8px' }}>
                <IonLabel>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>
                    {reg.student_name}{' '}
                    <span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '10px', fontWeight: '700', marginLeft: '6px' }}>Class {reg.student_class_grade || 'TBA'}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--eca-text-secondary)', marginTop: '2px' }}>
                    Grade/Tier: <strong style={{ color: 'var(--ion-color-primary)' }}>{reg.student_group}</strong>{' | '}Activity: <strong>{reg.activity_name}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--eca-text-secondary)', marginTop: '2px' }}>Day: <strong style={{ color: '#0d9488' }}>{reg.day_of_week}</strong></div>
                </IonLabel>
                <div slot="end" style={{ display: 'flex', gap: '8px' }}>
                  <IonButton color="success" size="small" mode="md" style={{ '--border-radius': '6px', height: '32px' }} onClick={() => onApprove(reg.id)}>
                    <IonIcon icon={checkmarkCircleOutline} slot="start" />Approve
                  </IonButton>
                  <IonButton color="danger" size="small" mode="md" style={{ '--border-radius': '6px', height: '32px' }} onClick={() => onReject(reg.id)}>
                    <IonIcon icon={closeCircleOutline} slot="start" />Reject
                  </IonButton>
                </div>
              </IonItem>
            ))}
            {queuedRegs.length === 0 && <div style={emptyPlaceholderStyle}>No students waiting for auditions.</div>}
          </IonList>
        </div>
      </div>

      {/* Roster Lists */}
      <IonRow>
        {/* Pending Admin */}
        <IonCol size="12" style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '4px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f59e0b', margin: '0' }}>
              Teacher Approved (Pending Admin Activation) ({pendingAdminRegs.length})
            </h3>
          </div>
          <div className="premium-list-container">
            <IonList lines="full" style={{ background: 'transparent' }}>
              {pendingAdminRegs.map(reg => (
                <IonItem key={reg.id} className="premium-list-item">
                  <IonLabel>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>
                      {reg.student_name}{' '}
                      <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '8px', fontWeight: '700', marginLeft: '6px' }}>Class {reg.student_class_grade || 'TBA'}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--eca-text-secondary)' }}>Passed Audition for {reg.activity_name} on {reg.day_of_week}. Waiting for Admin to transfer.</p>
                  </IonLabel>
                  <IonBadge color="warning" slot="end" style={{ borderRadius: '6px' }}>Audition Passed</IonBadge>
                </IonItem>
              ))}
              {pendingAdminRegs.length === 0 && <div style={emptyPlaceholderStyle}>No students in pending admin state.</div>}
            </IonList>
          </div>
        </IonCol>

        {/* Approved */}
        <IonCol size="12" sizeMd="6">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', margin: '0 0 12px 4px' }}>Active Approved Roster ({approvedRegs.length})</h3>
          <div className="premium-list-container" style={{ minHeight: '150px' }}>
            <IonList lines="full" style={{ background: 'transparent' }}>
              {approvedRegs.map(reg => (
                <IonItem key={reg.id} className="premium-list-item">
                  <IonLabel>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>{reg.student_name}{' '}<span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '8px', fontWeight: '700', marginLeft: '6px' }}>Class {reg.student_class_grade || 'TBA'}</span></div>
                    <p style={{ fontSize: '12px', color: 'var(--eca-text-secondary)' }}>{reg.activity_name} ({reg.day_of_week})</p>
                  </IonLabel>
                  <IonBadge color="success" slot="end" style={{ borderRadius: '6px' }}>Active</IonBadge>
                </IonItem>
              ))}
              {approvedRegs.length === 0 && <div style={emptyPlaceholderStyle}>No approved students yet.</div>}
            </IonList>
          </div>
        </IonCol>

        {/* Rejected */}
        <IonCol size="12" sizeMd="6">
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#ef4444', margin: '0 0 12px 4px' }}>Rejected Auditions ({rejectedRegs.length})</h3>
          <div className="premium-list-container" style={{ minHeight: '150px' }}>
            <IonList lines="full" style={{ background: 'transparent' }}>
              {rejectedRegs.map(reg => (
                <IonItem key={reg.id} className="premium-list-item">
                  <IonLabel>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--eca-text-primary)' }}>{reg.student_name}{' '}<span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '8px', fontWeight: '700', marginLeft: '6px' }}>Class {reg.student_class_grade || 'TBA'}</span></div>
                    <p style={{ fontSize: '12px', color: 'var(--eca-text-secondary)' }}>{reg.activity_name} ({reg.day_of_week})</p>
                  </IonLabel>
                  <IonBadge color="danger" slot="end" style={{ borderRadius: '6px' }}>Rejected</IonBadge>
                </IonItem>
              ))}
              {rejectedRegs.length === 0 && <div style={emptyPlaceholderStyle}>No rejected students.</div>}
            </IonList>
          </div>
        </IonCol>
      </IonRow>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: Teacher page
// ─────────────────────────────────────────────────────────────────────────────
const Teacher: React.FC = () => {
  const { currentUser, isAdmin, isFormTeacher } = useAuth();

  const [teachers, setTeachers] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<string>('');

  // Determine the teacher name to use
  const getDefaultTeacherName = (): string => {
    // For a logged-in teacher, use their display name from session
    if (currentUser?.role === 'teacher') return currentUser.displayName || '';
    // For admin, restore from localStorage
    return localStorage.getItem('selectedTeacher') || '';
  };

  const [selectedTeacher, setSelectedTeacher] = useState<string>(getDefaultTeacherName());

  // Determine which class the form teacher manages
  const selectedTeacherObj = teachers.find(t => t.name === selectedTeacher);
  const formTeacherClass = currentUser?.role === 'teacher'
    ? (currentUser.classAssignment ?? null)
    : (isAdmin ? (selectedTeacherObj?.class_assignment ?? null) : null);

  // Determine which tabs to show:
  // - hasActivities: teacher has at least one activity assigned (subject teacher role)
  // - isForm: teacher has a class assignment
  const hasActivities = activities.some(act => act.teacher_name === selectedTeacher);
  const isForm = !!formTeacherClass;
  const showBothTabs = (currentUser?.role === 'teacher' || isAdmin) && hasActivities && isForm;

  // Active tab: 'activities' | 'class'
  const [activeTab, setActiveTab] = useState<'activities' | 'class'>(
    showBothTabs ? 'class' : (isForm ? 'class' : 'activities')
  );

  useEffect(() => {
    const unsubTeachers = subscribeTeachers(data => {
      setTeachers(data);
      if (isAdmin) {
        setSelectedTeacher(prev => {
          const next = prev || (data[0]?.name ?? '');
          if (!prev && data.length > 0) localStorage.setItem('selectedTeacher', next);
          return next;
        });
      }
    });
    const unsubActs = subscribeActivities(setActivities);
    const unsubRegs = subscribeRegistrations(data => {
      setRegistrations(data);
      getActivitySeatCounts().then(setSeatCounts).catch(console.error);
    });
    return () => { unsubTeachers(); unsubActs(); unsubRegs(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamically update activeTab when selectedTeacher, activities, or teachers list changes
  useEffect(() => {
    const hasActs = activities.some(act => act.teacher_name === selectedTeacher);
    const isFormTeacher = !!formTeacherClass;
    const both = isFormTeacher && hasActs;

    if (both) {
      if (activeTab !== 'class' && activeTab !== 'activities') {
        setActiveTab('class');
      }
    } else if (isFormTeacher) {
      setActiveTab('class');
    } else {
      setActiveTab('activities');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeacher, activities, teachers, formTeacherClass]);

  const handleTeacherChange = (name: string) => {
    setSelectedTeacher(name);
    localStorage.setItem('selectedTeacher', name);
  };

  const handleApprove = async (regId: string) => {
    const res = await approveRegistrationByTeacher(regId);
    if (res.success) {
      setFeedback("Audition approved! Student moves to Pending Admin list.");
      setTimeout(() => setFeedback(''), 3000);
      getActivitySeatCounts().then(setSeatCounts).catch(console.error);
    } else setFeedback(`❌ Error: ${res.message}`);
  };

  const handleReject = async (regId: string) => {
    const res = await rejectRegistrationByTeacher(regId);
    if (res.success) {
      setFeedback("Student marked as Rejected.");
      setTimeout(() => setFeedback(''), 3000);
      getActivitySeatCounts().then(setSeatCounts).catch(console.error);
    } else setFeedback(`❌ Error: ${res.message}`);
  };

  // Determine tab options
  const shouldShowClassTab = showBothTabs ? activeTab === 'class' : isForm;
  const shouldShowActivitiesTab = showBothTabs ? activeTab === 'activities' : !isForm;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle style={{ fontWeight: '700', letterSpacing: '-0.5px' }}>
            {isAdmin ? 'Teacher Portal' : isForm && !hasActivities ? 'Form Teacher Portal' : 'Teacher Evaluation Desk'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid fixed>
          <IonRow className="ion-justify-content-center">
            <IonCol sizeXl="8" sizeLg="10" sizeMd="12" sizeSm="12">

              {/* Feedback */}
              {feedback && (
                <div className="banner-success" style={{ margin: '0 0 20px 0', padding: '12px 16px', borderLeft: '4px solid #10b981', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}>
                  {feedback}
                </div>
              )}

              {/* Tab Switcher (only when both tabs exist) */}
              {showBothTabs && (
                <IonSegment value={activeTab} onIonChange={e => setActiveTab(e.detail.value as any)} mode="md"
                  style={{ marginBottom: '24px', background: 'var(--eca-segment-bg)', border: '1px solid var(--eca-segment-border)', borderRadius: '8px', padding: '2px' }}>
                  <IonSegmentButton value="class" style={{ '--color-checked': '#7c3aed', fontWeight: '700' }}>
                    <IonLabel><IonIcon icon={schoolOutline} /> My Class</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="activities" style={{ '--color-checked': '#7c3aed', fontWeight: '700' }}>
                    <IonLabel><IonIcon icon={peopleOutline} /> My Activities</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              )}

              {/* Class Tab header even without segment */}
              {isForm && !showBothTabs && (
                <div className="banner-info" style={{ marginBottom: '16px', padding: '6px 10px', borderRadius: '8px', display: 'inline-block', fontSize: '12px', fontWeight: '700' }}>
                  Form Teacher View
                </div>
              )}

              {/* ── ACTIVITIES TAB ── */}
              {shouldShowActivitiesTab && (
                <ActivityEvaluationTab
                  selectedTeacherName={selectedTeacher}
                  activities={activities}
                  registrations={registrations}
                  seatCounts={seatCounts}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  showSelector={isAdmin}
                  teachers={teachers}
                  onTeacherChange={handleTeacherChange}
                />
              )}

              {/* ── CLASS TAB ── */}
              {shouldShowClassTab && formTeacherClass && (
                <FormTeacherClassTab classGrade={formTeacherClass} />
              )}

            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Teacher;
