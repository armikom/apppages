/** All types for the AppPages data model */

export type UserRole = "user" | "admin";
export type PlanType = "free" | "pro" | "enterprise";
export type MemberRole = "owner" | "editor";
export type AppStatus = "draft" | "published" | "disabled";
export type RequestType = "deletion" | "data_deletion" | "support";
export type RequestStatus = "pending_confirmation" | "new" | "in_progress" | "done" | "rejected";
export type PublisherType = "individual" | "company";
export type Language = "en" | "tr";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  plan: PlanType;
  defaultAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  ownerId: string;
  plan: PlanType;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountMember {
  uid: string;
  role: MemberRole;
  email: string;
  displayName: string;
  joinedAt: Date;
}

export interface PlatformInfo {
  ios?: {
    bundleId: string;
    appStoreUrl?: string;
    appStoreId?: string;
  };
  android?: {
    packageName: string;
    playStoreUrl?: string;
  };
}

export interface PublisherInfo {
  legalEntityName: string;
  type: PublisherType;
  address?: string;
  country: string;
  contactEmail: string;
  supportEmail: string;
  phone?: string;
  website?: string;
}

export interface DataTypeCollected {
  type: string;
  purpose: string;
  sharedWithThirdParties: boolean;
  encryptedInTransit: boolean;
  retentionPeriod: string;
  userCanRequestDeletion: boolean;
}

export interface ThirdPartySdk {
  name: string;
  policyUrl: string;
  dataCollected: string[];
}

export interface DataPractices {
  dataTypesCollected: DataTypeCollected[];
  thirdPartySdks: ThirdPartySdk[];
  accountCreation: boolean;
  childrenTarget: boolean;
  adsEnabled: boolean;
  inAppPurchases: boolean;
  gdprEnabled: boolean;
  kvkkEnabled: boolean;
  ccpaEnabled: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SupportInfo {
  faqItems: FaqItem[];
  contactEmail: string;
  contactMethods?: string[];
  supportFormEnabled: boolean;
}

export interface DeletionInfo {
  stepsToDelete: string[];
  dataDeleted: string[];
  dataRetained: { type: string; period: string }[];
  webFormEnabled: boolean;
}

export interface CustomSection {
  pageType: string;
  title: string;
  content: string;
  position: "before" | "after";
}

export interface AppData {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  icon?: string;
  shortDescription: string;
  primaryColor: string;
  status: AppStatus;
  platforms: PlatformInfo;
  publisher: PublisherInfo;
  defaultLanguage: Language;
  additionalLanguages: Language[];
  dataPractices: DataPractices;
  supportInfo: SupportInfo;
  deletionInfo: DeletionInfo;
  dataDeletionEnabled: boolean;
  dataDeletionInfo?: DeletionInfo;
  useAppleStandardEula: boolean;
  customSections: CustomSection[];
  publishedVersion?: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppVersion {
  version: number;
  appId: string;
  accountId: string;
  snapshot: AppData;
  publishedAt: Date;
  publishedBy: string;
}

export interface PublicRequest {
  id: string;
  appId: string;
  accountId: string;
  type: RequestType;
  status: RequestStatus;
  email: string;
  username?: string;
  reason?: string;
  message?: string;
  confirmationToken?: string;
  confirmedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface PublisherProfile {
  id: string;
  accountId: string;
  name: string;
  publisher: PublisherInfo;
  createdAt: Date;
  updatedAt: Date;
}

/** Plan limits configuration */
export interface PlanLimits {
  maxApps: number;
  customDomain: boolean;
  removeBranding: boolean;
  prioritySupport: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxApps: 10,
    customDomain: false,
    removeBranding: false,
    prioritySupport: false,
  },
  pro: {
    maxApps: 50,
    customDomain: true,
    removeBranding: true,
    prioritySupport: false,
  },
  enterprise: {
    maxApps: -1, // unlimited
    customDomain: true,
    removeBranding: true,
    prioritySupport: true,
  },
};

/** Reserved slugs that cannot be used by apps */
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "dashboard",
  "login",
  "signup",
  "app",
  "apps",
  "settings",
  "account",
  "help",
  "support",
  "privacy",
  "terms",
  "about",
  "contact",
  "status",
  "docs",
  "blog",
  "p",
  "public",
]);

/** Known third-party SDKs with their policy URLs */
export const KNOWN_SDKS: ThirdPartySdk[] = [
  { name: "Firebase Analytics", policyUrl: "https://firebase.google.com/support/privacy", dataCollected: ["analytics", "device_ids"] },
  { name: "Firebase Crashlytics", policyUrl: "https://firebase.google.com/support/privacy", dataCollected: ["crash_diagnostics", "device_ids"] },
  { name: "Google AdMob", policyUrl: "https://policies.google.com/privacy", dataCollected: ["device_ids", "analytics", "ad_interactions"] },
  { name: "Google Maps SDK", policyUrl: "https://policies.google.com/privacy", dataCollected: ["location"] },
  { name: "Facebook SDK", policyUrl: "https://www.facebook.com/privacy/policy", dataCollected: ["device_ids", "analytics"] },
  { name: "RevenueCat", policyUrl: "https://www.revenuecat.com/privacy", dataCollected: ["purchase_history", "device_ids"] },
  { name: "Sentry", policyUrl: "https://sentry.io/privacy/", dataCollected: ["crash_diagnostics", "device_ids"] },
  { name: "Amplitude", policyUrl: "https://amplitude.com/privacy", dataCollected: ["analytics", "device_ids"] },
  { name: "Mixpanel", policyUrl: "https://mixpanel.com/legal/privacy-policy/", dataCollected: ["analytics", "device_ids"] },
  { name: "Adjust", policyUrl: "https://www.adjust.com/terms/privacy-policy/", dataCollected: ["analytics", "device_ids", "ad_interactions"] },
  { name: "OneSignal", policyUrl: "https://onesignal.com/privacy_policy", dataCollected: ["device_ids", "push_tokens"] },
  { name: "Stripe", policyUrl: "https://stripe.com/privacy", dataCollected: ["payment_info"] },
  { name: "AppLovin MAX", policyUrl: "https://www.applovin.com/privacy/", dataCollected: ["device_ids", "analytics", "ad_interactions"] },
  { name: "Unity Ads", policyUrl: "https://unity.com/legal/privacy-policy", dataCollected: ["device_ids", "analytics", "ad_interactions"] },
];

/** Data types for the questionnaire */
export const DATA_TYPE_OPTIONS = [
  { id: "account_info", label: "Account Information (name, email, username)" },
  { id: "location", label: "Location (precise or approximate)" },
  { id: "contacts", label: "Contacts" },
  { id: "photos_media", label: "Photos & Media" },
  { id: "health_fitness", label: "Health & Fitness" },
  { id: "payment_info", label: "Payment Information" },
  { id: "device_ids", label: "Device Identifiers" },
  { id: "crash_diagnostics", label: "Crash & Diagnostics" },
  { id: "analytics", label: "Analytics / Usage Data" },
  { id: "purchase_history", label: "Purchase History" },
  { id: "search_history", label: "Search History" },
  { id: "browsing_history", label: "Browsing History" },
  { id: "messages", label: "Messages / Chat" },
  { id: "user_content", label: "User-Generated Content" },
  { id: "push_tokens", label: "Push Notification Tokens" },
  { id: "ad_interactions", label: "Advertising Interactions" },
] as const;
