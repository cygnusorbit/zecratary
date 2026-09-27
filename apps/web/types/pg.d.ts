// Ambient module declaration for pg
declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized?: boolean };
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    [key: string]: any;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<any>;
    query(queryTextOrConfig: any, values?: any): Promise<any>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export class Client {
    constructor(config?: any);
    connect(): Promise<void>;
    query(queryTextOrConfig: any, values?: any): Promise<any>;
    end(): Promise<void>;
  }

  const pg: {
    Pool: typeof Pool;
    Client: typeof Client;
    [key: string]: any;
  };

  export default pg;
}
