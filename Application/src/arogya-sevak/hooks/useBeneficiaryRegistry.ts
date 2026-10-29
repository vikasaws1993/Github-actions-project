import { useState, useEffect } from 'react';
import { Beneficiary, SevakDashboardStats } from '../types/sevak.types';
import { sevakApi } from '../services/sevakApi';

export const useBeneficiaryRegistry = () => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [stats, setStats] = useState<SevakDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistry();
  }, []);

  const loadRegistry = async () => {
    try {
      setLoading(true);
      const [bens, st] = await Promise.all([
        sevakApi.getBeneficiaries(),
        sevakApi.getDashboardStats(),
      ]);
      setBeneficiaries(bens);
      setStats(st);
    } catch (err) {
      console.error('[Registry] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { beneficiaries, stats, loading, refetch: loadRegistry };
};
