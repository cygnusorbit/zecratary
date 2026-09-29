// Ambient Type Declarations for Dual-Engine Drivers (PostgreSQL & MySQL)
// GitHub: cygnusorbit/zecratary
// Ensures production builds succeed when either driver is dynamically loaded

declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<any>;
    query(queryText: string, values?: any[]): Promise<any>;
    end(): Promise<void>;
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
  }

  export interface Pool {
    query(sql: string, values?: any[]): Promise<[any, any]>;
    execute(sql: string, values?: any[]): Promise<[any, any]>;
    getConnection(): Promise<PoolConnection>;
    end(): Promise<void>;
  }

  export function createPool(config: any): Pool;
  export function createConnection(config: any): Promise<any>;
}
