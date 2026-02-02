import { z } from 'zod';
import { 
  insertUserSchema, 
  insertCarSchema, 
  insertAppointmentSchema, 
  users, 
  cars, 
  workshops, 
  reviews, 
  appointments 
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.validation,
      },
    },
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  cars: {
    list: {
      method: 'GET' as const,
      path: '/api/cars',
      responses: {
        200: z.array(z.custom<typeof cars.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/cars',
      input: insertCarSchema.omit({ userId: true }), // Backend infers userId
      responses: {
        201: z.custom<typeof cars.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  workshops: {
    list: {
      method: 'GET' as const,
      path: '/api/workshops',
      input: z.object({
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof workshops.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/workshops/:id',
      responses: {
        200: z.custom<typeof workshops.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  reviews: {
    list: {
      method: 'GET' as const,
      path: '/api/workshops/:id/reviews',
      responses: {
        200: z.array(z.custom<typeof reviews.$inferSelect>()),
      },
    },
  },
  appointments: {
    create: {
      method: 'POST' as const,
      path: '/api/appointments',
      input: insertAppointmentSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
