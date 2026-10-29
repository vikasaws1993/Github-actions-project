import { useState, useEffect } from 'react';
import { Appointment } from '../types/citizen.types';
import { citizenApi } from '../services/citizenApi';

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await citizenApi.getAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  return { appointments, loading, refetch: fetchAppointments };
};
