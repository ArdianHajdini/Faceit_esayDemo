import { useState, useRef } from "react";
import { activateGumroad } from "@/services/licenseService";
import { useTranslation } from "@/services/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldAlert, ExternalLink } from "lucide-react";

const GUMROAD_STORE = "https://ardihajdi.gumroad.com/l/easyDemo2";

interface Props {
  onActivated: () => void;
}

export default function LicensePage({ onActivated }: Props) {
  const t = useTranslation();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"invalid" | "network" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleActivate() {
    const trimmed = key.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    const result = await activateGumroad(trimmed);
    setLoading(false);

    if (result.success) {
      onActivated();
    } else if (result.error === "network") {
      setError("network");
    } else {
      setError("invalid");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleActivate();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
            <ShieldAlert className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            FACEIT easyDemo
          </h1>
          <p className="text-sm text-muted-foreground">Demo Manager</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-lg">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {t.licenseGateHeading}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.licenseGateDesc}
            </p>
          </div>

          <div className="space-y-3">
            <Input
              ref={inputRef}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.licenseGatePlaceholder}
              disabled={loading}
              className="font-mono text-sm tracking-wider"
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />

            {error && (
              <p className="text-sm text-destructive">
                {error === "network"
                  ? t.licenseGateErrorNetwork
                  : t.licenseGateErrorInvalid}
              </p>
            )}

            <Button
              className="w-full"
              onClick={handleActivate}
              disabled={loading || !key.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.licenseGateActivating}
                </>
              ) : (
                t.licenseGateActivate
              )}
            </Button>
          </div>

          <div className="pt-1 border-t border-border">
            <a
              href={GUMROAD_STORE}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {t.licenseGateBuy}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
