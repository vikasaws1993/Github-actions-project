import { ApiError } from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.util.js';

/**
 * Authentication Middleware
 * Validates JWT token from Bearer Authorization header or cookies.
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Access denied. No authentication token provided.');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or expired authentication token.');
  }
});

/**
 * Optional Authentication Middleware
 * Decodes JWT token if present in headers, but does not block requests if omitted or invalid.
 */
export const optionalJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
    } catch (_) {
      // Continue without user if token is invalid/expired
    }
  }
  next();
});

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specified user roles.
 * Normalizes role aliases (e.g., 'AROGYA_SEVAK' <=> 'SEVAK')
 * Ensures server-side scoping so Arogya Sevak cannot call Admin-only endpoints.
 *
 * @param  {...string} allowedRoles - List of permitted roles (e.g. 'ADMIN', 'AROGYA_SEVAK')
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `Forbidden: Role '${req.user?.role || 'Guest'}' is not authorized to access this resource.`
      );
    }

    const cleanRole = (str) => String(str).toUpperCase().replace(/[\s_-]+/g, '');
    const userRoleClean = cleanRole(req.user.role);

    // Map role aliases for seamless compatibility across schema evolutions
    const expandedAllowedRoles = allowedRoles.flatMap((role) => {
      const r = cleanRole(role);
      if (r === 'SEVAK' || r === 'AROGYASEVAK' || r === 'OPERATOR') {
        return ['SEVAK', 'AROGYASEVAK', 'OPERATOR', 'DOCTOR', 'STAFF'];
      }
      if (r === 'ADMIN') {
        return ['ADMIN', 'SUPERADMIN', 'WARDADMIN'];
      }
      if (r === 'CITIZEN') {
        return ['CITIZEN', 'PATIENT'];
      }
      return [r];
    });

    if (!expandedAllowedRoles.includes(userRoleClean)) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource.`
      );
    }
    next();
  };
};

