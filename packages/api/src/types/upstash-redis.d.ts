declare module "@upstash/redis" {
  export class Redis<TData = unknown> {
    constructor(config: unknown);
    fetch(request: Request): Promise<Response>;
  }
}
