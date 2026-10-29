import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';

/**
 * Generate Access Token for a user
 * @param {Object} payload - User identification and role data
 * @returns {string} Signed JWT access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Generate Refresh Token for a user
 * @param {Object} payload - User ID or minimal payload
 * @returns {string} Signed JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

/**
 * Verify an Access Token
 * @param {string} token
 * @returns {Object} Decoded token payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

/**
 * Verify a Refresh Token
 * @param {string} token
 * @returns {Object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};
