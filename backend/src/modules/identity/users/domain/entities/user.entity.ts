export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public username: string,
    public name?: string,
    public picture?: string,
  ) {}
}
