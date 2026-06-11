import { useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { Settings as SettingsIcon, FolderOpen, Save, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  cs2Path: z.string().nullable().optional(),
  autoImport: z.boolean().optional(),
  replaysSubfolder: z.string().optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettingsMutation = useUpdateSettings();

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      cs2Path: "",
      autoImport: false,
      replaysSubfolder: "csgo/replays",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        cs2Path: settings.cs2Path || "",
        autoImport: settings.autoImport ?? false,
        replaysSubfolder: settings.replaysSubfolder || "csgo/replays",
      });
    }
  }, [settings, form]);

  const onSubmit = (data: SettingsValues) => {
    // Watched folders handled separately, but we could merge them here
    updateSettingsMutation.mutate({ 
      data: {
        ...data,
        cs2Path: data.cs2Path || undefined,
        watchedFolders: settings?.watchedFolders || []
      } 
    }, {
      onSuccess: (updated) => {
        toast({ title: "Settings saved", description: "Your preferences have been updated." });
        queryClient.setQueryData(getGetSettingsQueryKey(), updated);
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto pb-12">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <Card className="border-border bg-card">
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure paths and automation for Demo Manager.</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Application Config
          </CardTitle>
          <CardDescription>
            Core configuration for finding and managing CS2 demo files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-6 border border-border p-6 rounded-md bg-secondary/10">
                <FormField
                  control={form.control}
                  name="cs2Path"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-foreground">CS2 Installation Path</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive" 
                            className="pl-9 font-mono text-sm bg-background border-border" 
                            {...field} 
                            value={field.value || ""}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Path to the base CS:GO/CS2 folder. Used to resolve replays.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="replaysSubfolder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-foreground">Replays Subfolder</FormLabel>
                      <FormControl>
                        <Input 
                          className="font-mono text-sm bg-background border-border" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Relative to CS2 path where .dem files are saved. Defaults to csgo/replays.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border border-border p-6 rounded-md bg-secondary/10">
                <FormField
                  control={form.control}
                  name="autoImport"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <div className="space-y-1">
                        <FormLabel className="uppercase text-xs tracking-wider text-foreground">Auto-Import Demos</FormLabel>
                        <FormDescription>
                          Automatically detect and import new .dem files from watched folders.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Watched Folders Display (Readonly for now) */}
              <div className="border border-border p-6 rounded-md bg-secondary/10">
                <h3 className="uppercase text-xs tracking-wider text-foreground mb-4 font-medium">Watched Folders</h3>
                {settings?.watchedFolders && settings.watchedFolders.length > 0 ? (
                  <ul className="space-y-2">
                    {settings.watchedFolders.map((folder, i) => (
                      <li key={i} className="flex items-center text-sm font-mono text-muted-foreground bg-background p-2 rounded border border-border">
                        <Check className="w-3 h-3 text-primary mr-2" />
                        {folder}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No folders currently watched.</p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  className="font-bold uppercase tracking-wide px-8"
                  disabled={updateSettingsMutation.isPending || !form.formState.isDirty}
                  data-testid="btn-save-settings"
                >
                  {updateSettingsMutation.isPending ? "Saving..." : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
