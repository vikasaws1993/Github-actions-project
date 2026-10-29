import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import './Alert.css';

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const IconComponent = ICONS[type] || Info;

  return (
    <div className={`wa-alert wa-alert-${type} ${className}`}>
      <div className="wa-alert-icon">
        <IconComponent size={20} />
      </div>
      <div className="wa-alert-content">
        {title && <h4 className="wa-alert-title">{title}</h4>}
        <p className="wa-alert-message">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="wa-alert-close" aria-label="Close alert">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default Alert;
