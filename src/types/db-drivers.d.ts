// Ambient Type Declarations for Dual-Engine Drivers (PostgreSQL & MySQL)
// Repository: cygnusorbit/zecratary (GitHub)

declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    ssl?: any;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    [key: string]: any;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    connect(): Promise<any>;
    query(queryText: string, values?: any[]): Promise<any>;
    end(): Promise<void>;
    on(event: string, listener: (err: any, ...args: any[]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    [key: string]: any;
  }
}

declare module 'mysql2/promise' {
  export interface PoolConnection {
    beginTransaction(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    release(): void;
    query(sql: string, values?: any[]): Promise<[any, any]>;
    execute(sql: string, values?: any[]): Promise<[any, any]>;
    [key: string]: any;
  }

  export interface Pool {
    query(sql: string, values?: any[]): Promise<[any, any]>;
    execute(sql: string, values?: any[]): Promise<[any, any]>;
    getConnection(): Promise<PoolConnection>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    [key: string]: any;
  }

  export function createPool(config?: any): Pool;
  export function createConnection(config?: any): Promise<any>;
}
