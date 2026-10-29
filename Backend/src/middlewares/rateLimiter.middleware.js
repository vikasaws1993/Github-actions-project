/**
 * Rate Limiter Middlewares
 * Rate limiting disabled / passthrough to prevent carrier NAT IP lockouts and allow seamless mobile testing.
 */

export const rateLimiter = (req, res, next) => next();

export const loginRateLimiter = (req, res, next) => next();

export const otpVerifyRateLimiter = (req, res, next) => next();

export const otpRequestRateLimiter = (req, res, next) => next();

export default {
  rateLimiter,
  loginRateLimiter,
  otpVerifyRateLimiter,
  otpRequestRateLimiter,
};
