import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { config } from '../config/environment.js';

/**
 * Health Check Controller
 * Provides system status, uptime, and environment details.
 */
export const getHealthStatus = asyncHandler(async (req, res) => {
  const healthData = {
    status: 'UP',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsage: {
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  };

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, healthData, 'WardArogya Backend is healthy and running'));
});
