export abstract class DomainError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED');
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_VIOLATION');
  }
}
