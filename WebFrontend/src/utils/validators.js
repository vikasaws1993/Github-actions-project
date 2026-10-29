/**
 * Common input validation utilities
 */

export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
};

export const isValidPhone = (phone) => {
  // Supports 10 digit Indian mobile numbers
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(String(phone).replace(/\s+/g, ''));
};

export const isNotEmpty = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};
