export class WhatsAppAPIError extends Error {
  public readonly statusCode?: number;
  public readonly response?: unknown;

  constructor(message: string, statusCode?: number, response?: unknown) {
    super(message);
    this.name = 'WhatsAppAPIError';
    this.statusCode = statusCode;
    this.response = response;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class WhatsAppAuthenticationError extends WhatsAppAPIError {
  constructor(message: string = 'Authentication failed', response?: unknown) {
    super(message, 401, response);
    this.name = 'WhatsAppAuthenticationError';
  }
}

export class WhatsAppSessionError extends WhatsAppAPIError {
  constructor(message: string = 'Session error', response?: unknown) {
    super(message, 500, response);
    this.name = 'WhatsAppSessionError';
  }
}

export class WhatsAppValidationError extends WhatsAppAPIError {
  constructor(message: string = 'Validation error', response?: unknown) {
    super(message, 400, response);
    this.name = 'WhatsAppValidationError';
  }
}

export class WhatsAppNetworkError extends Error {
  public readonly originalError: Error;

  constructor(message: string, originalError: Error) {
    super(message);
    this.name = 'WhatsAppNetworkError';
    this.originalError = originalError;
    Error.captureStackTrace(this, this.constructor);
  }
}
