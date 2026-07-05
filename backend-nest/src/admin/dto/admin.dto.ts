import { z } from 'zod';
import {
  adminListQuerySchema,
  approveBodySchema,
  commentBodySchema,
  rejectBodySchema,
} from '../../butcher-applications/routes/schemas';

export type AdminListQueryDto = z.infer<typeof adminListQuerySchema>;
export type ApproveApplicationBodyDto = z.infer<typeof approveBodySchema>;
export type RejectApplicationBodyDto = z.infer<typeof rejectBodySchema>;
export type CommentApplicationBodyDto = z.infer<typeof commentBodySchema>;
