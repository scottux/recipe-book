/**
 * Request Test Helpers
 * 
 * Utilities for making authenticated requests in tests
 */

import request from 'supertest';

/**
 * Make authenticated GET request
 * @param {Object} app - Express app
 * @param {string} url - Request URL
 * @param {string} token - Access token
 * @returns {Promise} Supertest request
 */
export function authenticatedGet(app, url, token) {
  return request(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Make authenticated POST request
 * @param {Object} app - Express app
 * @param {string} url - Request URL
 * @param {string} token - Access token
 * @param {Object} data - Request body
 * @returns {Promise} Supertest request
 */
export function authenticatedPost(app, url, token, data = {}) {
  return request(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make authenticated PUT request
 * @param {Object} app - Express app
 * @param {string} url - Request URL
 * @param {string} token - Access token
 * @param {Object} data - Request body
 * @returns {Promise} Supertest request
 */
export function authenticatedPut(app, url, token, data = {}) {
  return request(app)
    .put(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make authenticated DELETE request
 * @param {Object} app - Express app
 * @param {string} url - Request URL
 * @param {string} token - Access token
 * @returns {Promise} Supertest request
 */
export function authenticatedDelete(app, url, token) {
  return request(app)
    .delete(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Make authenticated PATCH request
 * @param {Object} app - Express app
 * @param {string} url - Request URL
 * @param {string} token - Access token
 * @param {Object} data - Request body
 * @returns {Promise} Supertest request
 */
export function authenticatedPatch(app, url, token, data = {}) {
  return request(app)
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Expect successful response
 * @param {Object} response - Supertest response
 * @param {number} status - Expected status code (default: 200)
 */
export function expectSuccess(response, status = 200) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(true);
}

/**
 * Expect error response
 * @param {Object} response - Supertest response
 * @param {number} status - Expected status code
 * @param {string} errorMessage - Expected error message (optional, partial match)
 */
export function expectError(response, status, errorMessage = null) {
  expect(response.status).toBe(status);
  expect(response.body.success).toBe(false);
  
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
}

/**
 * Expect validation error
 * @param {Object} response - Supertest response
 * @param {string} field - Field that failed validation (optional)
 */
export function expectValidationError(response, field = null) {
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  
  if (field) {
    expect(response.body.error.toLowerCase()).toContain(field.toLowerCase());
  }
}

/**
 * Expect unauthorized response
 * @param {Object} response - Supertest response
 */
export function expectUnauthorized(response) {
  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
}

/**
 * Expect forbidden response
 * @param {Object} response - Supertest response
 */
export function expectForbidden(response) {
  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
}

/**
 * Expect not found response
 * @param {Object} response - Supertest response
 */
export function expectNotFound(response) {
  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
}

/**
 * Expect rate limit response
 * @param {Object} response - Supertest response
 */
export function expectRateLimited(response) {
  expect(response.status).toBe(429);
}