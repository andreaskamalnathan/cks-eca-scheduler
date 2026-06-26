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

const Home: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('student_1');
  const [activities, setActivities] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [seatCounts, setSeatCounts] = useState<Record<string, number>>({});

  // Per-day selected activity state: { [day]: activityId }
  const [daySelections, setDaySelections] = useState<Record<string, string>>({});

  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'info'>('info');

  // Load students and subscribe to real-time collections
  useEffect(() => {
    getStudents()
      .then(setStudents)
      .catch(err => console.error('Error loading students:', err));

    const unsubSettings = subscribeSystemSettings(setSettings);
    const unsubActs = subscribeActivities(setActivities);
    const unsubRegs = subscribeRegistrations(data => {
      setRegistrations(data);
      // Refresh seat counts on every registration change
      getActivitySeatCounts().then(setSeatCounts).catch(console.error);
    });

    // Initial seat count load
    getActivitySeatCounts().then(setSeatCounts).catch(console.error);

    return () => {
      unsubSettings();
      unsubActs();
      unsubRegs();
    };
  }, []);

  // Find active student data
  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Derive allowed days from system settings based on student tier
  const allowedDays: string[] = (() => {
    if (!currentStudent) {
      return ['Monday', 'Thursday']; // default until loaded
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

  // Filter registrations for the selected student
  const studentRegistrations = registrations.filter(r => r.student_id === selectedStudentId);

  // Helper: get the registration for a specific day (if any)
  const getRegForDay = (day: string) =>
    studentRegistrations.find(r => r.day_of_week === day);

  // Helper: is a day locked (Approved or Queued)
  const isDayLocked = (day: string): boolean => {
    const reg = getRegForDay(day);
    return !!(reg && (reg.status === 'Approved' || reg.status === 'Queued'));
  };

  const handleRegistrationSubmit = async (day: string) => {
    const activityId = daySelections[day];
    if (!selectedStudentId || !activityId || !day) {
      setFeedbackMessage('Please select an activity before submitting.');
      setFeedbackType('error');
      return;
    }

    setFeedbackMessage('Submitting enrollment choice...');
    setFeedbackType('info');

    const result = await registerECA(selectedStudentId, activityId, day, false);

    setFeedbackMessage(result.message);
    setFeedbackType(
      result.success && !result.message.toLowerCase().includes('queue')
        ? 'success'
        : result.success
          ? 'info'
          : 'error'
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <IonBadge color="success" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>
            Approved
          </IonBadge>
        );
      case 'Queued':
        return (
          <IonBadge color="warning" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>
            Queued (Waitlist)
          </IonBadge>
        );
      case 'Rejected':
        return (
          <IonBadge color="danger" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>
            Rejected
          </IonBadge>
        );
      default:
        return (
          <IonBadge color="medium" style={{ borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>
            {status}
          </IonBadge>
        );
    }
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
        <IonToolbar color="primary">
          <IonTitle style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>
            Student ECA Portal
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' }}>
        <IonGrid fixed>
          <IonRow className="ion-justify-content-center">
            <IonCol sizeXl="6" sizeLg="8" sizeMd="10" sizeSm="12">

              {/* ── Profile Card & Student Switcher ── */}
              <IonCard style={{ margin: '0 0 24px 0', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
                <IonCardContent style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 4px' }}>
                        Current Profile
                      </h4>
                      <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1e293b', margin: '0' }}>
                        {currentStudent?.name || 'Loading...'}
                      </h2>
                      <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                        <span style={{ padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
                          {currentStudent?.group_tier} Division
                        </span>
                        <span style={{ padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                          ID: {currentStudent?.student_number}
                        </span>
                      </div>
                    </div>
                    <IonIcon icon={personOutline} style={{ fontSize: '32px', color: 'var(--ion-color-primary)' }} />
                  </div>

                  <IonItem lines="none" style={{ '--background': '#f1f5f9', borderRadius: '8px' }}>
                    <IonLabel style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Switch Profile:</IonLabel>
                    <IonSelect
                      value={selectedStudentId}
                      interface="popover"
                      onIonChange={e => {
                        setSelectedStudentId(e.detail.value);
                        setDaySelections({});
                        setFeedbackMessage('');
                      }}
                      style={{ fontWeight: '600', color: 'var(--ion-color-primary)' }}
                    >
                      {students.map(st => (
                        <IonSelectOption key={st.id} value={st.id}>
                          {st.name} ({st.group_tier})
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </IonItem>
                </IonCardContent>
              </IonCard>

              {/* ── Schedule Rule Info Banner ── */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                padding: '12px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                marginBottom: '24px',
                fontWeight: '500'
              }}>
                <IonIcon icon={alertCircleOutline} style={{ fontSize: '20px', flexShrink: 0 }} />
                <span>
                  <strong>Schedule Rule:</strong>{' '}
                  {currentStudent?.group_tier === 'SMP'
                    ? `SMP students must register activities on: ${allowedDays.join(' and ')}.`
                    : `SMA students must register activities on: ${allowedDays.join(' and ')}.`}
                  {' '}(Loaded from system settings)
                </span>
              </div>

              {/* ── Current Registrations List ── */}
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', paddingLeft: '8px', marginBottom: '12px' }}>
                Your Registrations
              </h3>
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgb(0 0 0 / 0.02)', padding: '8px', marginBottom: '28px' }}>
                <IonList lines="none">
                  {studentRegistrations.map(reg => {
                    const seatsLeft = getSeatsLeft(reg.activity_id, reg.day_of_week);
                    return (
                      <div
                        key={reg.id}
                        style={{
                          margin: '6px 0',
                          padding: '14px',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9',
                          borderLeft: `5px solid ${getStatusColor(reg.status)}`,
                          background: '#f8fafc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                            {reg.activity_name}
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                            📅 <strong>{reg.day_of_week}</strong>
                            {' '}·{' '}
                            <span style={{ color: seatsLeft > 0 ? '#10b981' : '#ef4444' }}>
                              {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left
                            </span>
                          </p>
                          {reg.status === 'Rejected' && (
                            <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>
                              ⚠️ Please choose another available track for {reg.day_of_week}.
                            </p>
                          )}
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: '12px' }}>
                          {renderStatusBadge(reg.status)}
                        </div>
                      </div>
                    );
                  })}
                  {studentRegistrations.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                      No current registrations. Select your activities below!
                    </div>
                  )}
                </IonList>
              </div>

              {/* ── Per-Day Registration Sections ── */}
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', paddingLeft: '8px', marginBottom: '16px' }}>
                Register by Day
              </h3>

              {allowedDays.map(day => {
                const reg = getRegForDay(day);
                const locked = isDayLocked(day);

                if (locked && reg) {
                  // ── Locked Card (Approved or Queued) ──
                  const isApproved = reg.status === 'Approved';
                  const seatsLeft = getSeatsLeft(reg.activity_id, day);
                  return (
                    <IonCard
                      key={day}
                      style={{
                        margin: '0 0 20px 0',
                        border: `1px solid ${isApproved ? '#bbf7d0' : '#fde68a'}`,
                        borderLeft: `5px solid ${isApproved ? '#10b981' : '#f59e0b'}`,
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.04)',
                        borderRadius: '12px'
                      }}
                    >
                      <IonCardContent style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <IonIcon
                                icon={isApproved ? checkmarkCircleOutline : lockClosedOutline}
                                style={{ fontSize: '20px', color: isApproved ? '#10b981' : '#f59e0b' }}
                              />
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {day}
                              </span>
                            </div>
                            <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                              {reg.activity_name}
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {renderStatusBadge(reg.status)}
                              <span style={{ fontSize: '12px', color: seatsLeft > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left
                              </span>
                            </div>
                          </div>
                          <IonIcon icon={lockClosedOutline} style={{ fontSize: '28px', color: isApproved ? '#10b981' : '#f59e0b', opacity: 0.5 }} />
                        </div>
                        <p style={{ margin: '14px 0 0', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                          🔒 This slot is locked. Contact Admin to release this slot.
                        </p>
                      </IonCardContent>
                    </IonCard>
                  );
                }

                // ── Open Registration Form (Rejected or no registration) ──
                const openActivities = activities.filter(act => act.is_open === true);

                return (
                  <IonCard
                    key={day}
                    style={{
                      margin: '0 0 20px 0',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                      borderRadius: '12px'
                    }}
                  >
                    <IonCardContent style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <IonIcon icon={calendarOutline} style={{ fontSize: '20px', color: 'var(--ion-color-primary)' }} />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {day}
                        </span>
                        {reg && reg.status === 'Rejected' && (
                          <IonBadge color="danger" style={{ borderRadius: '6px', padding: '3px 8px', fontSize: '10px' }}>
                            Previously Rejected — Re-select
                          </IonBadge>
                        )}
                        {!reg && (
                          <IonBadge color="medium" style={{ borderRadius: '6px', padding: '3px 8px', fontSize: '10px' }}>
                            No Registration
                          </IonBadge>
                        )}
                      </div>

                      <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <IonItem lines="none" style={{ '--background': 'transparent', padding: '8px 4px' }}>
                          <IonIcon icon={bookOutline} slot="start" color="primary" style={{ fontSize: '20px' }} />
                          <div style={{ width: '100%' }}>
                            <p style={{ margin: '0', fontSize: '11px', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>
                              ECA TRACK FOR {day.toUpperCase()}
                            </p>
                            <IonSelect
                              interface="popover"
                              placeholder="Choose an activity..."
                              value={daySelections[day] || ''}
                              onIonChange={e =>
                                setDaySelections(prev => ({ ...prev, [day]: e.detail.value }))
                              }
                              style={{ fontWeight: '600', color: '#1e293b' }}
                            >
                              {openActivities.map(act => {
                                const seats = getSeatsLeft(act.id, day);
                                return (
                                  <IonSelectOption key={act.id} value={act.id}>
                                    {act.name} — {seats} seat{seats !== 1 ? 's' : ''} left
                                  </IonSelectOption>
                                );
                              })}
                            </IonSelect>
                          </div>
                        </IonItem>
                      </div>

                      <IonButton
                        expand="block"
                        mode="md"
                        color="primary"
                        disabled={!daySelections[day]}
                        style={{
                          '--border-radius': '10px',
                          marginTop: '16px',
                          height: '46px',
                          fontWeight: '700',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                        onClick={() => handleRegistrationSubmit(day)}
                      >
                        Confirm Registration for {day}
                      </IonButton>
                    </IonCardContent>
                  </IonCard>
                );
              })}

              {/* ── Feedback Message ── */}
              {feedbackMessage && (
                <div style={{
                  marginTop: '8px',
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor:
                    feedbackType === 'error'
                      ? '#fef2f2'
                      : feedbackType === 'success'
                        ? '#f0fdf4'
                        : '#fef3c7',
                  borderLeft: `4px solid ${feedbackType === 'error'
                      ? '#ef4444'
                      : feedbackType === 'success'
                        ? '#22c55e'
                        : '#f59e0b'
                    }`,
                  borderRadius: '8px',
                  color:
                    feedbackType === 'error'
                      ? '#991b1b'
                      : feedbackType === 'success'
                        ? '#166534'
                        : '#78350f',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgb(0 0 0 / 0.02)'
                }}>
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