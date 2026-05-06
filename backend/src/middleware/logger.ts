import morgan from 'morgan';
import type { RequestHandler } from 'express';

/** HTTP access log — dev: concise; prod: can switch to 'combined' */
export const httpLogger: RequestHandler = morgan(':method :url :status :res[content-length] - :response-time ms :req[x-request-id]');
