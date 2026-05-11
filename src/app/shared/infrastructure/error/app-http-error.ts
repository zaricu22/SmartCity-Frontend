export class AppHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = 'AppHttpError';
  }
}
