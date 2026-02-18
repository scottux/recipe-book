/**
 * Custom error class for import operations
 */
class ImportError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ImportError';
    this.code = code;
    this.details = details;
    this.statusCode = this.getStatusCode(code);
  }

  getStatusCode(code) {
    const statusCodes = {
      // File errors
      NO_FILE: 400,
      FILE_TOO_LARGE: 413,
      INVALID_FILE_TYPE: 400,
      INVALID_JSON: 400,
      EMPTY_FILE: 400,

      // Format errors
      MISSING_FIELD: 400,
      INCOMPATIBLE_VERSION: 400,
      INVALID_VERSION: 400,
      INVALID_STRUCTURE: 400,

      // Validation errors
      INVALID_RECIPE: 422,
      INVALID_COLLECTION: 422,
      INVALID_MEAL_PLAN: 422,
      INVALID_SHOPPING_LIST: 422,
      INVALID_INGREDIENT: 422,
      INVALID_INSTRUCTION: 422,
      INVALID_MEAL: 422,
      FIELD_TOO_LONG: 422,

      // Security errors
      RATE_LIMIT_EXCEEDED: 429,
      INVALID_PASSWORD: 400, // Changed from 401 to 400 for import password validation
      MALICIOUS_CONTENT: 400,
      UNAUTHORIZED: 401,

      // Database errors
      IMPORT_ERROR: 500,
      DUPLICATE_KEY: 409,
      CONNECTION_ERROR: 500,
    };
    return statusCodes[code] || 400;
  }
}

export default ImportError;