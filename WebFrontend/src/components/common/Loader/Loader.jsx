import React from 'react';
import './Loader.css';

export const Loader = ({
  message = 'Loading...',
  subtext = 'Fetching data, please wait',
  fullPage = false,
  size = 'md',
  card = false,
  asTableRow = false,
  colSpan = 1,
  className = '',
  style = {},
}) => {
  const content = (
    <div
      className={`am-global-loader-container ${size ? `size-${size}` : ''} ${card ? 'am-loader-card' : ''} ${className}`}
      style={style}
    >
      <div className={`am-global-spinner ${size ? `spinner-${size}` : ''}`} />
      {message && <p className="am-global-loader-text">{message}</p>}
      {subtext && <span className="am-global-loader-subtext">{subtext}</span>}
    </div>
  );

  if (asTableRow) {
    return (
      <tr className="am-loader-table-row">
        <td colSpan={colSpan} className="am-loader-table-cell">
          {content}
        </td>
      </tr>
    );
  }

  if (fullPage) {
    return <div className="am-global-loader-fullpage">{content}</div>;
  }

  return content;
};

export default Loader;
