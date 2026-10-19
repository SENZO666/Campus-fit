import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { AccountForm, HiddenList, PrivacyForm, TrainingForm } from "@/components/settings/SettingsParts";

const TABS = [
  { value: "training", label: "Training" },
  { value: "privacy", label: "Privacy" },
  { value: "account", label: "Account" },
  { value: "hidden", label: "Muted and blocked" },
];

export default function Settings() {
  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Settings" title="Settings and privacy" testid="settings-title"
        description="Change your training preferences, what you share, and your account details." />
      <Tabs defaultValue="training">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full bg-slate-100 p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="rounded-full px-4 py-2 data-[state=active]:font-bold" data-testid={`settings-tab-${t.value}`}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="mt-8">
          <TabsContent value="training"><TrainingForm /></TabsContent>
          <TabsContent value="privacy"><PrivacyForm /></TabsContent>
          <TabsContent value="account"><AccountForm /></TabsContent>
          <TabsContent value="hidden"><HiddenList /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
