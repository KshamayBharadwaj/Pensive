import { z } from "zod";

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);

export const setupSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
