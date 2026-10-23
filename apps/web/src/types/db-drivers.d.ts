// Ambient Type Declarations for Database Drivers
declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized?: boolean };
    connectionTimeoutMillis?: number;
    idleTimeoutMillis?: number;
    max?: number;
    [key: string]: any;
  }
  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<any>;
    query(text: string, values?: any[]): Promise<any>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }
}

declare module 'mysql2/promise' {
  export function createConnection(connectionUri: string): Promise<any>;
  export function createPool(config: any): any;
}
