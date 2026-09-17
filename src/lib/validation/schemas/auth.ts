import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Public self-registration: creates a brand-new Organization (the signup
// user becomes its OWNER) — never joins an existing one. organizationName
// doubles as the initial CompanySettings.name, so the form only asks once.
export const signupSchema = z
  .object({
    organizationName: z.string().trim().min(1, "Organization name is required"),
    name: z.string().trim().min(1, "Your name is required"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
