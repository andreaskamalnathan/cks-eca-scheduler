import React, { useEffect, useState } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonItem,
  IonLabel, IonSelect, IonSelectOption, IonButton, IonCard,
  IonCardContent, IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonList
} from '@ionic/react';
import {
  bookOutline, calendarOutline, personOutline,
  alertCircleOutline, lockClosedOutline, checkmarkCircleOutline
} from 'ionicons/icons';
import {
  getStudents,
  subscribeActivities,
  subscribeRegistrations,
  subscribeSystemSettings,
  registerECA,
  getActivitySeatCounts
} from '../services/supabase';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();

  const [students, setStudents] = useState<any[]>([]);

  // For admin: persisted selector; for student: locked to their own referenceId
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (currentUser?.role === 'student' && currentUser.referenceId) {
      return currentUser.referenceId;
    }
    return localStorage.getItem('selectedStudentId') || '';
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});

  // Track selected activity per day: { [day]: activityId }
  const [daySelections, setDaySelections] = useState<Record<string, string>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info'>('info');

  // Load students and subscribe to real-time collections
  useEffect(() => {
    // Only load the full student list for admins (so they can switch)
    if (isAdmin) {
      getStudents()
        .then((data) => {
          setStudents(data);
          // If no student selected yet, pick the first
          if (!selectedStudentId && data.length > 0) {
            setSelectedStudentId(data[0].id);
          }
        })
        .catch(err => console.error('Error loading students:', err));
    } else if (currentUser?.role === 'student' && currentUser.referenceId) {
      // For a student, just load their own record so we have all fields
      getStudents()
        .then((data) => setStudents(data))
        .catch(console.error);
    }

    const unsubSettings = subscribeSystemSettings(setSettings);
    const unsubActs = subscribeActivities(setActivities);
    const unsubRegs = subscribeRegistrations(data => {
      setRegistrations(data);
      getActivitySeatCounts().then(setSeatCounts).catch(console.error);
    });

    getActivitySeatCounts().then(setSeatCounts).catch(console.error);

    return () => {
      unsubSettings();
      unsubActs();
      unsubRegs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selectedStudentId in sync with auth for students
  useEffect(() => {
    if (currentUser?.role === 'student' && currentUser.referenceId) {
      setSelectedStudentId(currentUser.referenceId);
    }
  }, [currentUser]);

  // Persist selectedStudentId when it changes (admin only)
  const handleStudentChange = (id: string) => {
    setSelectedStudentId(id);
    localStorage.setItem('selectedStudentId', id);
    setDaySelections({});
    setFeedbackMessage('');
  };

  // Find active student data
  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Derive allowed days from system settings based on student tier
  const allowedDays: string[] = (() => {
    if (!currentStudent) {
      return ['Monday', 'Thursday'];
    }
    if (currentStudent.group_tier === 'SMP') {
      return (settings['smp_days'] || 'Monday,Thursday')
        .split(',')
        .map((d: string) => d.trim())
        .filter(Boolean);
    }
    return (settings['sma_days'] || 'Tuesday,Thursday')
      .split(',')
      .map((d: string) => d.trim())
      .filter(Boolean);
  })();

  const studentRegistrations = registrations.filter(r => r.student_id === selectedStudentId);

  const getApprovedRegForDay = (day: string) =>
    studentRegistrations.find(r => r.day_of_week === day && r.status === 'Approved');

  const isDayLocked = (day: string): boolean => {
    // Only lock the day if they have a fully Approved registration
    return studentRegistrations.some(r => r.day_of_week === day && r.status === 'Approved');
  };

  const handleRegistrationSubmit = async (day: string) => {
    const activityId = daySelections[day];
    if (!selectedStudentId || !activityId || !day) return;

    setFeedbackMessage("Submitting your enrollment choice...");
    setFeedbackType('info');

    const result = await registerECA(selectedStudentId, activityId, day, false);

    setFeedbackMessage(result.message);
    setFeedbackType(result.success ? 'success' : 'error');

    if (result.success) {
      setDaySelections(prev => ({ ...prev, [day]: '' }));
    }
  };

  const renderStatusBadge = (status: string, teacherApproved: boolean) => {
    if (status === 'Approved') {
      return <IonBadge color="success" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>Approved</IonBadge>;
    }
    if (status === 'Queued') {
      return (
        <IonBadge color="warning" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>
          {teacherApproved ? 'Queued (Teacher Approved)' : 'Queued (Audition)'}
        </IonBadge>
      );
    }
    if (status === 'Rejected') {
      return <IonBadge color="danger" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>Rejected</IonBadge>;
    }
    return <IonBadge color="medium" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>{status}</IonBadge>;
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return '#10b981';
    if (status === 'Queued') return '#f59e0b';
    if (status === 'Rejected') return '#ef4444';
    return '#6b7280';
  };

  const getSeatsLeft = (actId: string, day: string): number => {
    const act = activities.find(a => a.id === actId);
    if (!act) return 0;
    const used = seatCounts[`${actId}_${day}`] || 0;
    return Math.max(0, act.max_capacity - used);
  };

  return (
    <IonPage>
      <IonHeader collapse="fade">
        <IonToolbar color="success">
          <IonTitle style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>
            {isAdmin ? 'Student ECA Portal' : 'My ECA Portal'}
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonGrid fixed>
          <IonRow className="ion-justify-content-center">
            <IonCol sizeXl="6" sizeLg="8" sizeMd="10" sizeSm="12">

              {/* Profile Card */}
              <IonCard className="premium-card" style={{ margin: '0 0 24px 0' }}>
                <IonCardContent style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ color: 'var(--eca-text-label)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 4px' }}>Current Profile</h4>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--eca-text-primary)', margin: '0' }}>{currentStudent?.name || 'Loading...'}</h2>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                        <span style={{ padding: '4px 10px', background: 'var(--eca-segment-active-bg)', color: 'var(--eca-segment-active-text)', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>{currentStudent?.group_tier} Division</span>
                        <span style={{ padding: '4px 10px', background: 'var(--eca-segment-bg)', color: 'var(--eca-text-secondary)', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>ID: {currentStudent?.student_number}</span>
                        {currentStudent?.class_grade && (
                          <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--eca-color-success)', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>Class {currentStudent.class_grade}</span>
                        )}
                      </div>
                    </div>
                    <IonIcon icon={personOutline} style={{ fontSize: '32px', color: 'var(--ion-color-success)' }} />
                  </div>

                  {/* Admin-only: Student selector */}
                  {isAdmin && (
                    <IonItem lines="none" style={{ '--background': 'var(--eca-bg-list)', borderRadius: '8px', border: '1px solid var(--eca-border)' }}>
                      <IonLabel style={{ fontSize: '13px', fontWeight: '600', color: 'var(--eca-text-label)' }}>Switch Profile:</IonLabel>
                      <IonSelect
                        value={selectedStudentId}
                        interface="popover"
                        onIonChange={e => handleStudentChange(e.detail.value)}
                        style={{ fontWeight: '600', color: 'var(--ion-color-success)' }}
                      >
                        {students.map(st => (
                          <IonSelectOption key={st.id} value={st.id}>{st.name} ({st.group_tier})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  )}

                  {/* Student-only: identity note */}
                  {!isAdmin && (
                    <div className="banner-info" style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '500' }}>
                      🎓 You are viewing your personal ECA registration portal.
                    </div>
                  )}
                </IonCardContent>
              </IonCard>

              {/* Schedule Info Banner */}
              <div className="banner-info" style={{ padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginBottom: '24px', fontWeight: '500' }}>
                <IonIcon icon={alertCircleOutline} style={{ fontSize: '20px', flexShrink: 0 }} />
                <span>
                  <strong>Schedule Rule:</strong>{' '}
                  {currentStudent?.group_tier === 'SMP'
                    ? `SMP students must register different activities on: ${allowedDays.join(' and ')}.`
                    : `SMA students must register different activities on: ${allowedDays.join(' and ')}.`}
                </span>
              </div>

              {/* Current Registrations List */}
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', paddingLeft: '8px', marginBottom: '12px' }}>Your Registrations</h3>
              <div className="premium-list-container" style={{ marginBottom: '28px' }}>
                <IonList lines="none" style={{ background: 'transparent' }}>
                  {studentRegistrations.map(reg => {
                    const seatsLeft = getSeatsLeft(reg.activity_id, reg.day_of_week);
                    return (
                      <div key={reg.id} style={{ margin: '6px 0', padding: '14px', borderRadius: '8px', border: '1px solid var(--eca-border-subtle)', borderLeft: `5px solid ${getStatusColor(reg.status)}`, background: 'var(--eca-bg-item)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0', fontSize: '15px', fontWeight: '700', color: 'var(--eca-text-primary)' }}>{reg.activity_name}</h4>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--eca-text-secondary)', fontWeight: '500' }}>
                            📅 <strong>{reg.day_of_week}</strong> · <span style={{ color: seatsLeft > 0 ? '#10b981' : '#ef4444' }}>{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</span>
                          </p>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: '12px' }}>{renderStatusBadge(reg.status, reg.teacher_approved)}</div>
                      </div>
                    );
                  })}
                  {studentRegistrations.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--eca-color-danger)', fontSize: '14px' }}>No current registrations. Select your activities below!</div>
                  )}
                </IonList>
              </div>

              {/* Register by Day Forms */}
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--eca-text-primary)', paddingLeft: '8px', marginBottom: '16px' }}>Register by Day</h3>

              {allowedDays.map(day => {
                const approvedReg = getApprovedRegForDay(day);
                const locked = isDayLocked(day);

                if (locked && approvedReg) {
                  const seatsLeft = getSeatsLeft(approvedReg.activity_id, day);
                  return (
                    <IonCard key={day} style={{ margin: '0 0 20px 0', border: '1px solid rgba(16, 185, 129, 0.3)', borderLeft: '5px solid #10b981', borderRadius: '12px', background: 'var(--eca-bg-card)' }}>
                      <IonCardContent style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '20px', color: '#10b981' }} />
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-label)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day}</span>
                            </div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '800', color: 'var(--eca-text-primary)' }}>{approvedReg.activity_name}</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {renderStatusBadge(approvedReg.status, approvedReg.teacher_approved)}
                              <span style={{ fontSize: '12px', color: seatsLeft > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</span>
                            </div>
                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--eca-text-secondary)', fontWeight: '500' }}>
                              Your enrollment for this day is locked. Contact Admin to release it.
                            </p>
                          </div>
                          <IonIcon icon={lockClosedOutline} style={{ fontSize: '28px', color: '#10b981', opacity: 0.5 }} />
                        </div>
                      </IonCardContent>
                    </IonCard>
                  );
                }

                // Filter out activities that the student is already registered or queued for on this day
                const activeOrQueuedActivityIds = studentRegistrations
                  .filter(r => r.day_of_week === day && r.status !== 'Rejected')
                  .map(r => r.activity_id);

                // Filter by day, status, and group eligibility levels (SMP/SMA/both)
                const openActivities = activities.filter(act =>
                  act.is_open === true &&
                  (act.operational_days || []).includes(day) &&
                  !activeOrQueuedActivityIds.includes(act.id) &&
                  (!act.group_eligibility || act.group_eligibility === 'both' || act.group_eligibility === currentStudent?.group_tier)
                );

                const selectedActivityId = daySelections[day] || '';
                const seatsLeft = selectedActivityId ? getSeatsLeft(selectedActivityId, day) : 0;

                return (
                  <IonCard key={day} className="premium-card" style={{ margin: '0 0 20px 0' }}>
                    <IonCardContent style={{ padding: '20px' }}>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <IonIcon icon={calendarOutline} style={{ fontSize: '20px', color: 'var(--ion-color-primary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eca-text-label)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day}</span>
                      </div>

                      {/* Dropdown: Activity Selection */}
                      <div style={{ background: 'var(--eca-bg-list)', borderRadius: '8px', border: '1px solid var(--eca-border)', overflow: 'hidden', marginBottom: '12px' }}>
                        <IonItem lines="none" style={{ '--background': 'transparent', padding: '8px 4px' }}>
                          <IonIcon icon={bookOutline} slot="start" color="primary" style={{ fontSize: '20px' }} />
                          <div style={{ width: '100%' }}>
                            <p style={{ margin: '0', fontSize: '11px', color: 'var(--eca-text-label)', fontWeight: '700', letterSpacing: '0.5px' }}>
                              CHOOSE ACTIVITY
                            </p>
                            <IonSelect
                              interface="popover"
                              placeholder="Select activity..."
                              value={selectedActivityId}
                              onIonChange={e => {
                                setDaySelections(prev => ({ ...prev, [day]: e.detail.value }));
                              }}
                              style={{ fontWeight: '600', color: 'var(--eca-text-secondary)' }}
                            >
                              {openActivities.map(act => {
                                const seats = getSeatsLeft(act.id, day);
                                return (
                                  <IonSelectOption key={act.id} value={act.id}>
                                    {act.name} — {seats > 0 ? `${seats} seat(s) left` : '0 seats left (Auditions Queue)'}
                                  </IonSelectOption>
                                );
                              })}
                            </IonSelect>
                          </div>
                        </IonItem>
                      </div>

                      {selectedActivityId && seatsLeft === 0 && (
                        <div className="banner-warning" style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          marginBottom: '12px'
                        }}>
                          ⚠️ This activity is full. You will be placed in the Auditions Queue. You can still register for another activity with open seats while waiting for approval.
                        </div>
                      )}

                      {/* Submit Button */}
                      <IonButton
                        expand="block"
                        mode="md"
                        color="primary"
                        disabled={!selectedActivityId}
                        style={{ '--border-radius': '10px', marginTop: '16px', height: '46px', fontWeight: '700' }}
                        onClick={() => handleRegistrationSubmit(day)}
                      >
                        {seatsLeft === 0 ? "Join Auditions Queue" : "Confirm Registration"}
                      </IonButton>

                    </IonCardContent>
                  </IonCard>
                );
              })}

              {/* Feedback Message */}
              {feedbackMessage && (
                <div className={feedbackType === 'error' ? 'banner-warning' : feedbackType === 'success' ? 'banner-success' : 'banner-info'}
                  style={{ marginTop: '8px', marginBottom: '24px', padding: '16px', borderRadius: '8px', fontSize: '14px', fontWeight: '600', borderLeft: `4px solid ${feedbackType === 'error' ? '#ef4444' : feedbackType === 'success' ? '#22c52dff' : '#f59e0b'}` }}>
                  {feedbackMessage}
                </div>
              )}

            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Home;