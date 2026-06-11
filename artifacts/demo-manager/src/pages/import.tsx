import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useImportDemo } from "@workspace/api-client-react";
import { UploadCloud, File, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

const importSchema = z.object({
  filePath: z.string().min(1, "File path is required"),
  map: z.string().optional(),
  team1Name: z.string().optional(),
  team2Name: z.string().optional(),
});

type ImportValues = z.infer<typeof importSchema>;

export default function ImportDemo() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const importDemoMutation = useImportDemo();

  const form = useForm<ImportValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      filePath: "",
      map: "",
      team1Name: "",
      team2Name: "",
    },
  });

  const onSubmit = (data: ImportValues) => {
    importDemoMutation.mutate({ data }, {
      onSuccess: (demo) => {
        toast({ title: "Demo imported successfully", description: "Parsing has started." });
        setLocation(`/demos/${demo.id}`);
      },
      onError: (error: any) => {
        toast({ 
          title: "Import failed", 
          description: error?.response?.data?.error || error.message || "Failed to import demo",
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Import Demo</h1>
        <p className="text-muted-foreground mt-1">Add a new CS2 demo file to your library for analysis.</p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="uppercase tracking-wider text-sm text-primary flex items-center">
            <UploadCloud className="w-4 h-4 mr-2" />
            File Details
          </CardTitle>
          <CardDescription>
            Provide the absolute path to your .dem file or select it via drag and drop (if using the desktop app).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="filePath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Demo File Path</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <File className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo\replays\match.dem" 
                          className="pl-9 bg-secondary/30 font-mono text-sm" 
                          {...field} 
                          data-testid="input-filepath"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The full absolute path to the .dem file on your system.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                <FormField
                  control={form.control}
                  name="team1Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Team A Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. NAVI" className="bg-secondary/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="team2Name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Team B Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. FaZe" className="bg-secondary/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="map"
                  render={({ field }) => (
                    <FormItem className="col-span-1 md:col-span-2">
                      <FormLabel className="uppercase text-xs tracking-wider text-muted-foreground">Map Override (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. de_mirage (usually auto-detected)" className="bg-secondary/30" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave blank to auto-detect from the demo file.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Alert className="bg-primary/10 border-primary/20 text-primary">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="uppercase tracking-wider text-xs font-bold">Note</AlertTitle>
                <AlertDescription className="text-sm opacity-90">
                  Importing a large demo might take a few moments to parse player slots and generate voice presets.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  className="font-bold uppercase tracking-wide px-8"
                  disabled={importDemoMutation.isPending}
                  data-testid="btn-submit-import"
                >
                  {importDemoMutation.isPending ? "Importing..." : "Import Demo"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
