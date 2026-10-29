import crypto from 'crypto';

/**
 * Hash a plain text password using Node.js crypto scrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Format: "salt:derivedKey"
 */
export const hashPassword = async (password) => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
};

/**
 * Verify a plain text password against a stored "salt:derivedKey" hash
 * @param {string} password - Plain text password
 * @param {string} storedHash - Stored hash from database
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (password, storedHash) => {
  return new Promise((resolve) => {
    if (!storedHash || !storedHash.includes(':')) {
      return resolve(false);
    }
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
};
