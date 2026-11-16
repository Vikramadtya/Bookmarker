import { HttpException } from '@nestjs/common';

/** 402: the plan does not allow this. The app turns `code` into an upgrade prompt. */
export class PaymentRequiredException extends HttpException {
  constructor(message: string, code: string) {
    super({ message, code, upgrade: true }, 402);
  }
}
