/**
 * Seed script for Firebase Emulator.
 * Usage: pnpm seed (requires emulators running)
 *
 * Creates 2 sample apps with full data for testing.
 */

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, Timestamp } from "firebase/firestore";

const app = initializeApp({
  projectId: "demo-apppages",
  apiKey: "demo-key",
});

const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const now = Timestamp.now();
const uid = "seed-user-1";
const accountId = uid;

async function seed() {
  console.log("Seeding emulator data...");

  // User profile
  await setDoc(doc(db, `users/${uid}`), {
    uid,
    displayName: "Test Developer",
    email: "dev@example.com",
    photoURL: null,
    role: "user",
    plan: "free",
    defaultAccountId: accountId,
    createdAt: now,
    updatedAt: now,
  });

  // Account
  await setDoc(doc(db, `accounts/${accountId}`), {
    id: accountId,
    name: "Test Developer's Apps",
    ownerId: uid,
    plan: "free",
    createdAt: now,
    updatedAt: now,
  });

  // Member
  await setDoc(doc(db, `accounts/${accountId}/members/${uid}`), {
    uid,
    role: "owner",
    email: "dev@example.com",
    displayName: "Test Developer",
    joinedAt: now,
  });

  // App 1: Weather App
  const app1Id = "weather-app";
  const app1Slug = "weather-pro";
  const app1Data = {
    id: app1Id,
    accountId,
    name: "Weather Pro",
    slug: app1Slug,
    icon: "",
    shortDescription: "Accurate weather forecasts with beautiful widgets",
    primaryColor: "#2563eb",
    status: "published",
    platforms: {
      android: {
        packageName: "com.example.weatherpro",
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.example.weatherpro",
      },
      ios: {
        bundleId: "com.example.weatherpro",
        appStoreUrl: "https://apps.apple.com/app/weather-pro/id123456789",
        appStoreId: "123456789",
      },
    },
    publisher: {
      legalEntityName: "Example Software LLC",
      type: "company",
      address: "123 Tech Street, San Francisco, CA 94105",
      country: "United States",
      contactEmail: "contact@example.com",
      supportEmail: "support@example.com",
      phone: "+1-555-0123",
      website: "https://example.com",
    },
    defaultLanguage: "en",
    additionalLanguages: ["tr"],
    dataPractices: {
      dataTypesCollected: [
        {
          type: "location",
          purpose: "Provide local weather forecasts",
          sharedWithThirdParties: false,
          encryptedInTransit: true,
          retentionPeriod: "30 days",
          userCanRequestDeletion: true,
        },
        {
          type: "analytics",
          purpose: "Improve app performance and user experience",
          sharedWithThirdParties: true,
          encryptedInTransit: true,
          retentionPeriod: "1 year",
          userCanRequestDeletion: true,
        },
        {
          type: "device_ids",
          purpose: "Analytics and crash reporting",
          sharedWithThirdParties: true,
          encryptedInTransit: true,
          retentionPeriod: "1 year",
          userCanRequestDeletion: false,
        },
      ],
      thirdPartySdks: [
        { name: "Firebase Analytics", policyUrl: "https://firebase.google.com/support/privacy", dataCollected: ["analytics", "device_ids"] },
        { name: "Firebase Crashlytics", policyUrl: "https://firebase.google.com/support/privacy", dataCollected: ["crash_diagnostics", "device_ids"] },
        { name: "Google AdMob", policyUrl: "https://policies.google.com/privacy", dataCollected: ["device_ids", "analytics", "ad_interactions"] },
      ],
      accountCreation: false,
      childrenTarget: false,
      adsEnabled: true,
      inAppPurchases: true,
      gdprEnabled: true,
      kvkkEnabled: true,
      ccpaEnabled: true,
    },
    supportInfo: {
      faqItems: [
        { question: "How accurate are the forecasts?", answer: "We use data from multiple weather services to provide the most accurate forecasts possible." },
        { question: "How do I add widgets?", answer: "Long-press on your home screen, select Widgets, and find Weather Pro in the list." },
        { question: "Can I get forecasts for multiple locations?", answer: "Yes! Tap the + button on the main screen to add additional locations." },
      ],
      contactEmail: "support@example.com",
      contactMethods: ["email"],
      supportFormEnabled: true,
    },
    deletionInfo: {
      stepsToDelete: [
        "Open Weather Pro app",
        "Go to Settings (gear icon in top right)",
        "Scroll down and tap 'Delete Account'",
        "Confirm deletion in the dialog",
      ],
      dataDeleted: ["User preferences", "Saved locations", "Notification settings"],
      dataRetained: [
        { type: "Aggregated analytics", period: "Up to 1 year" },
        { type: "Transaction records", period: "As required by law" },
      ],
      webFormEnabled: true,
    },
    dataDeletionEnabled: false,
    useAppleStandardEula: false,
    customSections: [],
    publishedVersion: 1,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, `accounts/${accountId}/apps/${app1Id}`), app1Data);
  await setDoc(doc(db, `slugs/${app1Slug}`), { accountId, appId: app1Id, createdAt: now });
  await setDoc(doc(db, `accounts/${accountId}/apps/${app1Id}/versions/1`), {
    version: 1,
    appId: app1Id,
    accountId,
    snapshot: app1Data,
    publishedAt: now,
    publishedBy: uid,
  });

  // App 2: Task Manager (Turkish-focused, draft)
  const app2Id = "task-manager";
  const app2Slug = "gorev-yoneticisi";
  const app2Data = {
    id: app2Id,
    accountId,
    name: "Görev Yöneticisi",
    slug: app2Slug,
    icon: "",
    shortDescription: "Görevlerinizi kolayca yönetin ve takip edin",
    primaryColor: "#059669",
    status: "draft",
    platforms: {
      android: {
        packageName: "com.example.gorevyoneticisi",
        playStoreUrl: "",
      },
    },
    publisher: {
      legalEntityName: "Example Software LLC",
      type: "company",
      address: "123 Tech Street, San Francisco, CA 94105",
      country: "Turkey",
      contactEmail: "contact@example.com",
      supportEmail: "destek@example.com",
      website: "https://example.com",
    },
    defaultLanguage: "tr",
    additionalLanguages: ["en"],
    dataPractices: {
      dataTypesCollected: [
        {
          type: "account_info",
          purpose: "Hesap oluşturma ve giriş",
          sharedWithThirdParties: false,
          encryptedInTransit: true,
          retentionPeriod: "Hesap silinene kadar",
          userCanRequestDeletion: true,
        },
        {
          type: "user_content",
          purpose: "Görev ve proje verilerini saklamak",
          sharedWithThirdParties: false,
          encryptedInTransit: true,
          retentionPeriod: "Hesap silinene kadar",
          userCanRequestDeletion: true,
        },
      ],
      thirdPartySdks: [
        { name: "Firebase Analytics", policyUrl: "https://firebase.google.com/support/privacy", dataCollected: ["analytics", "device_ids"] },
        { name: "Sentry", policyUrl: "https://sentry.io/privacy/", dataCollected: ["crash_diagnostics", "device_ids"] },
      ],
      accountCreation: true,
      childrenTarget: false,
      adsEnabled: false,
      inAppPurchases: false,
      gdprEnabled: true,
      kvkkEnabled: true,
      ccpaEnabled: false,
    },
    supportInfo: {
      faqItems: [
        { question: "Görevlerimi nasıl paylaşabilirim?", answer: "Görev detay sayfasından paylaş butonuna tıklayarak diğer kullanıcılarla paylaşabilirsiniz." },
      ],
      contactEmail: "destek@example.com",
      contactMethods: ["email"],
      supportFormEnabled: true,
    },
    deletionInfo: {
      stepsToDelete: [
        "Uygulamayı açın",
        "Ayarlar'a gidin",
        "'Hesabı Sil' seçeneğine tıklayın",
        "Silme işlemini onaylayın",
      ],
      dataDeleted: ["Hesap bilgileri", "Tüm görevler ve projeler", "Bildirim ayarları"],
      dataRetained: [],
      webFormEnabled: true,
    },
    dataDeletionEnabled: true,
    dataDeletionInfo: {
      stepsToDelete: [
        "Uygulamayı açın",
        "Ayarlar > Veri Yönetimi'ne gidin",
        "'Verilerimi Sil' seçeneğine tıklayın",
      ],
      dataDeleted: ["Tüm görevler ve projeler"],
      dataRetained: [{ type: "Hesap bilgileri", period: "Hesap silinene kadar" }],
      webFormEnabled: true,
    },
    useAppleStandardEula: false,
    customSections: [],
    publishedVersion: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, `accounts/${accountId}/apps/${app2Id}`), app2Data);
  await setDoc(doc(db, `slugs/${app2Slug}`), { accountId, appId: app2Id, createdAt: now });

  // Sample request for App 1
  await setDoc(doc(db, `accounts/${accountId}/apps/${app1Id}/requests/sample-req-1`), {
    type: "deletion",
    status: "new",
    email: "enduser@example.com",
    username: "john_doe",
    reason: "I no longer use this app",
    message: null,
    confirmationToken: null,
    confirmedAt: now,
    notes: null,
    appId: app1Id,
    accountId,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
  });

  console.log("✅ Seed data created successfully!");
  console.log("   - 1 user (dev@example.com)");
  console.log("   - 1 account");
  console.log("   - 2 apps (Weather Pro: published, Görev Yöneticisi: draft)");
  console.log("   - 1 sample deletion request");
  console.log("");
  console.log("   Published app URL: http://localhost:5000/p/weather-pro");
  console.log("   Privacy policy: http://localhost:5000/p/weather-pro/privacy");

  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
