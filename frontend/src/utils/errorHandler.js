/**
 * Utility functions for handling API errors and validation errors
 */

/**
 * Extract a readable error message from various error formats
 * @param {*} error - The error object from API response
 * @returns {string} - A readable error message
 */
export const extractErrorMessage = (error) => {
  // Handle null/undefined
  if (!error) {
    return 'An unknown error occurred';
  }

  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // Handle axios error response
  if (error.response?.data) {
    const data = error.response.data;
    
    // Handle FastAPI validation errors
    if (data.detail && Array.isArray(data.detail)) {
      // Extract messages from validation errors
      const messages = data.detail.map(err => {
        if (typeof err === 'object' && err.msg) {
          const location = err.loc ? err.loc.join('.') : '';
          return location ? `${location}: ${err.msg}` : err.msg;
        }
        return String(err);
      });
      return messages.join(', ');
    }
    
    // Handle simple detail string
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    
    // Handle other error formats
    if (data.message) {
      return data.message;
    }
    
    // Handle validation error object directly
    if (data.type && data.msg) {
      return data.msg;
    }
  }

  // Handle direct validation error objects (FastAPI format)
  if (error.type && error.msg) {
    const location = error.loc ? error.loc.join('.') : '';
    return location ? `${location}: ${error.msg}` : error.msg;
  }

  // Handle array of validation errors
  if (Array.isArray(error)) {
    const messages = error.map(err => extractErrorMessage(err));
    return messages.join(', ');
  }

  // Handle error with message property
  if (error.message) {
    return error.message;
  }

  // Handle objects that might be error responses
  if (typeof error === 'object') {
    // Try to extract any meaningful message
    const possibleMessages = [
      error.detail,
      error.error,
      error.msg,
      error.message,
      error.description
    ].filter(msg => msg && typeof msg === 'string');
    
    if (possibleMessages.length > 0) {
      return possibleMessages[0];
    }
    
    // If it's an object with no extractable message, return generic error
    return 'Invalid data format received from server';
  }

  // Fallback
  return String(error);
};

/**
 * Safe error setter that ensures only strings are set to error state
 * @param {Function} setError - The error setter function
 * @param {*} error - The error to set
 */
export const safeSetError = (setError, error) => {
  const errorMessage = extractErrorMessage(error);
  setError(errorMessage);
};

/**
 * Handle API response errors consistently
 * @param {*} error - The error from API call
 * @param {Function} setError - The error setter function
 * @param {string} defaultMessage - Default message if no error can be extracted
 */
export const handleApiError = (error, setError, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error);
  
  let errorMessage = defaultMessage;
  
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    
    switch (status) {
      case 400:
        errorMessage = extractErrorMessage(error) || 'Bad request - please check your input';
        break;
      case 401:
        errorMessage = 'Authentication required - please log in again';
        break;
      case 403:
        errorMessage = 'Access denied - insufficient permissions';
        break;
      case 404:
        errorMessage = 'Resource not found';
        break;
      case 422:
        errorMessage = extractErrorMessage(error) || 'Validation error - please check your input';
        break;
      case 500:
        errorMessage = 'Server error - please try again later';
        break;
      default:
        errorMessage = extractErrorMessage(error) || `Server error (${status})`;
    }
  } else if (error.request) {
    // Network error
    errorMessage = 'Network error - please check your connection';
  } else {
    // Other error
    errorMessage = extractErrorMessage(error) || defaultMessage;
  }
  
  setError(errorMessage);
};

export default {
  extractErrorMessage,
  safeSetError,
  handleApiError
};
