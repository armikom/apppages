import { z } from "zod";
import { RESERVED_SLUGS } from "../types/index.js";

/** Slug: 3-60 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen */
export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(60, "Slug must be at most 60 characters")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Slug must be lowercase alphanumeric with hyphens, no leading/trailing hyphen")
  .refine((s) => !RESERVED_SLUGS.has(s), "This slug is reserved");

export const platformInfoSchema = z.object({
  ios: z.object({
    bundleId: z.string().min(1, "Bundle ID is required").regex(/^[a-zA-Z][a-zA-Z0-9.-]*$/, "Invalid bundle ID format"),
    appStoreUrl: z.string().url().optional().or(z.literal("")),
    appStoreId: z.string().optional(),
  }).optional(),
  android: z.object({
    packageName: z.string().min(1, "Package name is required").regex(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/, "Invalid package name format"),
    playStoreUrl: z.string().url().optional().or(z.literal("")),
  }).optional(),
}).refine((p) => p.ios || p.android, "At least one platform is required");

export const publisherInfoSchema = z.object({
  legalEntityName: z.string().min(1, "Legal entity name is required").max(200),
  type: z.enum(["individual", "company"]),
  address: z.string().max(500).optional(),
  country: z.string().min(2, "Country is required").max(100),
  contactEmail: z.string().email("Invalid contact email"),
  supportEmail: z.string().email("Invalid support email"),
  phone: z.string().max(30).optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export const dataTypeCollectedSchema = z.object({
  type: z.string().min(1),
  purpose: z.string().min(1, "Purpose is required"),
  sharedWithThirdParties: z.boolean(),
  encryptedInTransit: z.boolean(),
  retentionPeriod: z.string().min(1, "Retention period is required"),
  userCanRequestDeletion: z.boolean(),
});

export const thirdPartySdkSchema = z.object({
  name: z.string().min(1),
  policyUrl: z.string().url(),
  dataCollected: z.array(z.string()),
});

export const dataPracticesSchema = z.object({
  dataTypesCollected: z.array(dataTypeCollectedSchema),
  thirdPartySdks: z.array(thirdPartySdkSchema),
  accountCreation: z.boolean(),
  childrenTarget: z.boolean(),
  adsEnabled: z.boolean(),
  inAppPurchases: z.boolean(),
  gdprEnabled: z.boolean(),
  kvkkEnabled: z.boolean(),
  ccpaEnabled: z.boolean(),
});

export const faqItemSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(2000),
});

export const supportInfoSchema = z.object({
  faqItems: z.array(faqItemSchema).max(50),
  contactEmail: z.string().email(),
  contactMethods: z.array(z.string()).optional(),
  supportFormEnabled: z.boolean(),
});

export const deletionInfoSchema = z.object({
  stepsToDelete: z.array(z.string().max(500)).transform((arr) => arr.filter((s) => s.trim() !== "")).pipe(z.array(z.string().min(1).max(500)).min(1, "At least one step is required")),
  dataDeleted: z.array(z.string()).transform((arr) => arr.filter((s) => s.trim() !== "")).pipe(z.array(z.string().min(1))),
  dataRetained: z.array(z.object({
    type: z.string().min(1),
    period: z.string().min(1),
  })),
  webFormEnabled: z.boolean(),
});

export const customSectionSchema = z.object({
  pageType: z.string(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  position: z.enum(["before", "after"]),
});

export const appDataSchema = z.object({
  name: z.string().min(1, "App name is required").max(200),
  slug: slugSchema,
  icon: z.string().optional(),
  shortDescription: z.string().min(1, "Description is required").max(500),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color"),
  platforms: platformInfoSchema,
  publisher: publisherInfoSchema,
  defaultLanguage: z.enum(["en", "tr"]),
  additionalLanguages: z.array(z.enum(["en", "tr"])),
  dataPractices: dataPracticesSchema,
  supportInfo: supportInfoSchema,
  deletionInfo: deletionInfoSchema,
  dataDeletionEnabled: z.boolean(),
  dataDeletionInfo: deletionInfoSchema.optional(),
  useAppleStandardEula: z.boolean(),
  customSections: z.array(customSectionSchema).max(20),
});

/** Schema for the public deletion/support request form */
export const publicRequestSchema = z.object({
  email: z.string().email("Valid email is required"),
  username: z.string().max(200).optional(),
  reason: z.string().max(2000).optional(),
  message: z.string().max(5000).optional(),
  type: z.enum(["deletion", "data_deletion", "support"]),
  honeypot: z.string().max(0, "Bot detected").optional(), // must be empty
});

/** Schema for updating request status (dashboard) */
export const requestStatusUpdateSchema = z.object({
  status: z.enum(["new", "in_progress", "done", "rejected"]),
  notes: z.string().max(2000).optional(),
});

export type AppDataInput = z.infer<typeof appDataSchema>;
export type PublicRequestInput = z.infer<typeof publicRequestSchema>;
