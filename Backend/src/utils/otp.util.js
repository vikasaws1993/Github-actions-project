import crypto from 'crypto';

/**
 * Generate a random numeric OTP string of given length (default: 6 digits).
 * Guaranteed to have exact length with leading zeros if necessary (e.g. '042718').
 *
 * @param {number} [length=6] - Number of digits
 * @returns {string} OTP string
 */
export const generateOtp = (length = 6) => {
  const max = Math.pow(10, length);
  const randomInt = crypto.randomInt(0, max);
  return randomInt.toString().padStart(length, '0');
};
