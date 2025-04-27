class ApiError extends Error {
    constructor(
      statusCode,
      message = 'Something went wrong',
      errors = [],
      stack = ''
    ) {
      super(message);
  
      this.statusCode = statusCode;
      this.message = message;
      this.errors = errors; // for validation errors, multiple problems
      this.success = false; // always false because it's an error
  
      if (stack) {
        this.stack = stack; // custom stack if provided
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  module.exports = ApiError;
  