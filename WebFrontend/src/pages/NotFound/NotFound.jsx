import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import Button from '@/components/common/Button/Button';

export const NotFound = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'var(--warning-50)',
        color: 'var(--warning-500)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
      }}>
        <AlertTriangle size={32} />
      </div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginBottom: '2rem' }}>
        The ward section or medical record you are looking for does not exist or has been relocated.
      </p>
      <Link to="/">
        <Button variant="primary" icon={Home}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFound;
