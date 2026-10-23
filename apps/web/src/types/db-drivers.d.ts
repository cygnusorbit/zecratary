// Ambient Type Declarations for Database Drivers & Global Array Augmentation
// GitHub: cygnusorbit/zecratary

declare global {
  interface Array<T> {
    rows?: T[];
    rowCount?: number;
  }
  interface ReadonlyArray<T> {
    readonly rows?: T[];
    readonly rowCount?: number;
  }
}

declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<any>;
    query(queryText: string | any, values?: any[]): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): this;
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

export {};
