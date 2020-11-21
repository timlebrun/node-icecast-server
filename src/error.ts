export class HttpError extends Error {
  constructor(
    public readonly code: number,
    public readonly message: string,
  ) { super(); }
}