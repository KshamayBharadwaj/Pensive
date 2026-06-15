import { z } from "zod";

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);

export const setupSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((v) => v.password === v.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({ password: z.string().min(1, "Password is required.") });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((v) => v.newPassword === v.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const folderNameSchema = z.string().trim().min(1, "Name is required.").max(255)
  .refine((v) => !v.includes("/") && !v.includes("\\"), "Name cannot contain slashes.");

export const uuidSchema = z.string().uuid();

export const filesQuerySchema = z.object({
  folderId: z.string().nullable().optional(),
  view: z.enum(["all", "recent", "favorites"]).default("all"),
  sort: z.enum(["name", "modified", "created", "size", "type"]).default("modified"),
  order: z.enum(["asc", "desc"]).default("desc"),
  filter: z.enum(["all", "documents", "images", "videos", "audio", "archives", "code", "favorites"]).default("all"),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
