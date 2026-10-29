import { useState, useEffect } from 'react';
import { HealthRecord, CitizenVitals } from '../types/citizen.types';
import { citizenApi } from '../services/citizenApi';

export const useCitizenHealthRecords = () => {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [vitals, setVitals] = useState<CitizenVitals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recData, vitData] = await Promise.all([
        citizenApi.getHealthRecords(),
        citizenApi.getVitals(),
      ]);
      setRecords(recData);
      setVitals(vitData);
    } catch (err) {
      console.error('Error loading health records:', err);
    } finally {
      setLoading(false);
    }
  };

  return { records, vitals, loading, refetch: fetchData };
};
