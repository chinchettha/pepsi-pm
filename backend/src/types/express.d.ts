export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: number;
        gpid: string;
        permissions: string[];
      };
    }
  }
}
