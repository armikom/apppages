import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appDataSchema, KNOWN_SDKS, DATA_TYPE_OPTIONS } from "@apppages/shared";
import type { AppDataInput } from "@apppages/shared";
import { useApps } from "../hooks/useApps";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";

const STEPS = ["Basics", "Platforms", "Publisher", "Data Practices", "Support", "Deletion", "Review"];

const DEFAULT_VALUES: Partial<AppDataInput> = {
  name: "",
  slug: "",
  shortDescription: "",
  primaryColor: "#3b82f6",
  defaultLanguage: "en",
  additionalLanguages: [],
  useAppleStandardEula: false,
  dataDeletionEnabled: false,
  customSections: [],
  platforms: { android: { packageName: "", playStoreUrl: "" } },
  publisher: {
    legalEntityName: "",
    type: "individual",
    country: "",
    contactEmail: "",
    supportEmail: "",
  },
  dataPractices: {
    dataTypesCollected: [],
    thirdPartySdks: [],
    accountCreation: false,
    childrenTarget: false,
    adsEnabled: false,
    inAppPurchases: false,
    gdprEnabled: false,
    kvkkEnabled: false,
    ccpaEnabled: false,
  },
  supportInfo: {
    faqItems: [],
    contactEmail: "",
    supportFormEnabled: true,
  },
  deletionInfo: {
    stepsToDelete: [""],
    dataDeleted: [""],
    dataRetained: [],
    webFormEnabled: true,
  },
};

export function CreateAppPage() {
  const navigate = useNavigate();
  const { createApp } = useApps();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<AppDataInput>({
    resolver: zodResolver(appDataSchema),
    defaultValues: DEFAULT_VALUES as AppDataInput,
    mode: "onBlur",
  });

  const { register, handleSubmit, watch, formState: { errors }, control } = form;

  const {
    fields: faqFields,
    append: addFaq,
    remove: removeFaq,
  } = useFieldArray({ control, name: "supportInfo.faqItems" });

  const {
    fields: sdkFields,
    append: addSdk,
    remove: removeSdk,
  } = useFieldArray({ control, name: "dataPractices.thirdPartySdks" });

  const {
    fields: dataTypeFields,
    append: addDataType,
    remove: removeDataType,
  } = useFieldArray({ control, name: "dataPractices.dataTypesCollected" });

  async function onSubmit(data: AppDataInput) {
    setSaving(true);
    setError(null);
    try {
      await createApp(data);
      navigate("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New App</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              i === step
                ? "bg-primary-600 text-white"
                : i < step
                ? "bg-primary-100 text-primary-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {i < step ? <Check className="h-3.5 w-3.5" /> : <span className="w-4 text-center">{i + 1}</span>}
            {s}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {/* Step 0: Basics */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Basic Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App Name *</label>
                <input {...register("name")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="My Awesome App" />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Slug *</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">yourdomain.com/p/</span>
                  <input {...register("slug")} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="my-awesome-app" />
                </div>
                {errors.slug && <p className="text-sm text-red-500 mt-1">{errors.slug.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Description *</label>
                <textarea {...register("shortDescription")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} placeholder="A brief description of your app" />
                {errors.shortDescription && <p className="text-sm text-red-500 mt-1">{errors.shortDescription.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                <input {...register("primaryColor")} type="color" className="h-10 w-20 rounded border border-gray-300 cursor-pointer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Language</label>
                <select {...register("defaultLanguage")} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Platforms */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Platforms</h2>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-sm text-gray-700 mb-3">Android</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Package Name *</label>
                    <input {...register("platforms.android.packageName")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="com.example.myapp" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Play Store URL</label>
                    <input {...register("platforms.android.playStoreUrl")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://play.google.com/store/apps/details?id=..." />
                  </div>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-sm text-gray-700 mb-3">iOS (optional)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bundle ID</label>
                    <input {...register("platforms.ios.bundleId")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="com.example.myapp" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">App Store URL</label>
                    <input {...register("platforms.ios.appStoreUrl")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://apps.apple.com/app/..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Publisher */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Publisher / Developer Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Legal Entity Name *</label>
                <input {...register("publisher.legalEntityName")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select {...register("publisher.type")} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <input {...register("publisher.country")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Turkey" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input {...register("publisher.contactEmail")} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email *</label>
                <input {...register("publisher.supportEmail")} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input {...register("publisher.website")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea {...register("publisher.address")} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={2} />
              </div>
            </div>
          )}

          {/* Step 3: Data Practices */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Data Practices</h2>
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                This questionnaire drives your generated privacy policy. Answer carefully.
                <br />
                <strong>Disclaimer: Generated policies are not legal advice. Consult a qualified attorney.</strong>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "dataPractices.accountCreation" as const, label: "App requires account creation" },
                  { name: "dataPractices.childrenTarget" as const, label: "Targets children under 13" },
                  { name: "dataPractices.adsEnabled" as const, label: "Shows advertisements" },
                  { name: "dataPractices.inAppPurchases" as const, label: "Has in-app purchases" },
                  { name: "dataPractices.gdprEnabled" as const, label: "Include GDPR section" },
                  { name: "dataPractices.kvkkEnabled" as const, label: "Include KVKK section" },
                  { name: "dataPractices.ccpaEnabled" as const, label: "Include CCPA section" },
                ].map(({ name, label }) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <input {...register(name)} type="checkbox" className="rounded border-gray-300" />
                    {label}
                  </label>
                ))}
              </div>

              {/* Data types collected */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Data Types Collected</h3>
                  <button
                    type="button"
                    onClick={() =>
                      addDataType({
                        type: "",
                        purpose: "",
                        sharedWithThirdParties: false,
                        encryptedInTransit: true,
                        retentionPeriod: "",
                        userCanRequestDeletion: true,
                      })
                    }
                    className="text-xs text-primary-600 flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {dataTypeFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        {...register(`dataPractices.dataTypesCollected.${index}.type`)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Select type...</option>
                        {DATA_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeDataType(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input {...register(`dataPractices.dataTypesCollected.${index}.purpose`)} placeholder="Purpose" className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2" />
                    <input {...register(`dataPractices.dataTypesCollected.${index}.retentionPeriod`)} placeholder="Retention period (e.g. 1 year)" className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2" />
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1">
                        <input {...register(`dataPractices.dataTypesCollected.${index}.sharedWithThirdParties`)} type="checkbox" />
                        Shared with 3rd parties
                      </label>
                      <label className="flex items-center gap-1">
                        <input {...register(`dataPractices.dataTypesCollected.${index}.encryptedInTransit`)} type="checkbox" />
                        Encrypted
                      </label>
                      <label className="flex items-center gap-1">
                        <input {...register(`dataPractices.dataTypesCollected.${index}.userCanRequestDeletion`)} type="checkbox" />
                        User can request deletion
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Third-party SDKs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">Third-Party SDKs</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {KNOWN_SDKS.map((sdk) => (
                    <button
                      key={sdk.name}
                      type="button"
                      onClick={() => addSdk(sdk)}
                      className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
                    >
                      + {sdk.name}
                    </button>
                  ))}
                </div>
                {sdkFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 mb-1 text-sm">
                    <span className="flex-1">{watch(`dataPractices.thirdPartySdks.${index}.name`)}</span>
                    <button type="button" onClick={() => removeSdk(index)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Support */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Support Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Contact Email *</label>
                <input {...register("supportInfo.contactEmail")} type="email" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input {...register("supportInfo.supportFormEnabled")} type="checkbox" className="rounded border-gray-300" />
                Enable support contact form on public page
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">FAQ Items</h3>
                  <button type="button" onClick={() => addFaq({ question: "", answer: "" })} className="text-xs text-primary-600 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add FAQ
                  </button>
                </div>
                {faqFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">FAQ #{index + 1}</span>
                      <button type="button" onClick={() => removeFaq(index)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input {...register(`supportInfo.faqItems.${index}.question`)} placeholder="Question" className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2" />
                    <textarea {...register(`supportInfo.faqItems.${index}.answer`)} placeholder="Answer" className="w-full px-2 py-1 border border-gray-300 rounded text-sm" rows={2} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Deletion */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Account & Data Deletion</h2>
              <div>
                <h3 className="font-medium text-sm mb-2">Steps to Delete Account in App *</h3>
                <p className="text-xs text-gray-500 mb-2">
                  Describe the steps a user takes inside your app to delete their account.
                </p>
                <input {...register("deletionInfo.stepsToDelete.0")} placeholder="Step 1: Go to Settings" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" />
                <input {...register("deletionInfo.stepsToDelete.1")} placeholder="Step 2: Tap 'Delete Account'" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2" />
                <input {...register("deletionInfo.stepsToDelete.2")} placeholder="Step 3: Confirm deletion" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data That Will Be Deleted</label>
                <input {...register("deletionInfo.dataDeleted.0")} placeholder="e.g. Profile information, app data" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input {...register("deletionInfo.webFormEnabled")} type="checkbox" className="rounded border-gray-300" />
                Enable web-based deletion request form
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input {...register("useAppleStandardEula")} type="checkbox" className="rounded border-gray-300" />
                Use Apple's Standard EULA (link only on terms page)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input {...register("dataDeletionEnabled")} type="checkbox" className="rounded border-gray-300" />
                Enable separate "Delete Data" page (without account deletion)
              </label>
            </div>
          )}

          {/* Step 6: Review */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Review & Create</h2>
              <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                <strong>Disclaimer:</strong> Generated privacy policies, terms of use, and other legal pages are provided for informational purposes only and do not constitute legal advice. Review all content carefully and consult a qualified attorney.
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Name:</span> {watch("name")}</div>
                <div><span className="text-gray-500">Slug:</span> /{watch("slug")}</div>
                <div><span className="text-gray-500">Publisher:</span> {watch("publisher.legalEntityName")}</div>
                <div><span className="text-gray-500">Language:</span> {watch("defaultLanguage")}</div>
              </div>
              <p className="text-sm text-gray-500">
                Your app will be created as a <strong>draft</strong>. You can preview and publish it from the app detail page.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create App"}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
