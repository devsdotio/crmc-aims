import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters."),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * OAuth2 password grant body (application/x-www-form-urlencoded or JSON).
 * Swagger UI sends `username` + `password` (+ optional `grant_type=password`).
 */
export const tokenPasswordSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username (email) is required.")
    .email("Username must be a valid email address.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters."),
  grant_type: z.string().optional(),
});

export type SignInSchema = z.infer<typeof signInSchema>;
export type TokenPasswordSchema = z.infer<typeof tokenPasswordSchema>;
