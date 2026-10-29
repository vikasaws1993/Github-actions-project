/**
 * Standard API Response Structure
 * Guarantees uniform response shape across all endpoints.
 */
export class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {*} data - Response payload
   * @param {string} message - Human-readable status message
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
