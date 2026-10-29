import React from 'react';
import './Card.css';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  hoverable = false,
  ...props
}) => {
  return (
    <div className={`wa-card ${hoverable ? 'wa-card-hoverable' : ''} ${className}`} {...props}>
      {(title || subtitle || action) && (
        <div className="wa-card-header">
          <div>
            {title && <h3 className="wa-card-title">{title}</h3>}
            {subtitle && <p className="wa-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="wa-card-action">{action}</div>}
        </div>
      )}
      <div className="wa-card-body">{children}</div>
    </div>
  );
};

export default Card;
