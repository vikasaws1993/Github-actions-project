import React from 'react';
import { Calendar as CalendarIcon, Clock, Plus, CheckCircle, User } from 'lucide-react';
import Card from '@/components/common/Card/Card';
import Button from '@/components/common/Button/Button';

export const Appointments = () => {
  const appointmentsList = [
    {
      id: 1,
      patient: 'Kavita Sundaram',
      doctor: 'Dr. Aarav Sharma',
      time: '10:30 AM',
      type: 'General Checkup',
      status: 'Confirmed',
    },
    {
      id: 2,
      patient: 'Vikram Sethi',
      doctor: 'Dr. Priya Nair',
      time: '11:15 AM',
      type: 'Cardiology Followup',
      status: 'In Progress',
    },
    {
      id: 3,
      patient: 'Ananya Roy',
      doctor: 'Dr. Aarav Sharma',
      time: '02:00 PM',
      type: 'Post-Surgery Dressing',
      status: 'Scheduled',
    },
  ];

  return (
    <div className="wa-appointments-page">
      <div className="wa-page-header" style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <Button variant="primary" icon={Plus}>
          New Appointment
        </Button>
      </div>

      <Card className="wa-mt-4" title="Today's Schedule">
        <div className="wa-table-responsive">
          <table className="wa-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Patient</th>
                <th>Attending Doctor</th>
                <th>Consultation Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointmentsList.map((apt) => (
                <tr key={apt.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Clock size={14} color="var(--primary-600)" />
                      {apt.time}
                    </span>
                  </td>
                  <td>{apt.patient}</td>
                  <td>{apt.doctor}</td>
                  <td>{apt.type}</td>
                  <td>
                    <span className="badge badge-info">{apt.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Appointments;
