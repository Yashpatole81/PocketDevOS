import { useState, useEffect, useCallback } from "react";
import { useAiStore, type ProviderId } from "@/store/aiStore";
import { ai } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ProviderOption {
  id: ProviderId;
  name: string;
  baseURL: string;
  requiresKey: boolean;
  description: string;
}

interface ModelOption {
  id: string;
  provider: string;
  label: string;
  description: string;
}

const DEFAULT_PROVIDERS: ProviderOption[] = [
  { id: "nvidia", name: "NVIDIA Build", baseURL: "https://integrate.api.nvidia.com/v1", requiresKey: true, description: "NVIDIA Build API" },
  { id: "ollama", name: "Ollama (Local)", baseURL: "http://localhost:11434/v1", requiresKey: false, description: "Local models via Ollama" },
  { id: "custom", name: "Custom Endpoint", baseURL: "", requiresKey: false, description: "Any OpenAI-compatible endpoint" },
];

export function AiSettings({ onClose }: { onClose: () => void }) {
  const { provider, model, baseUrl, setProvider, setModel, setBaseUrl } = useAiStore();

  const [providers, setProviders] = useState<ProviderOption[]>(DEFAULT_PROVIDERS);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
  const [localModel, setLocalModel] = useState(model);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Load config from server
  useEffect(() => {
    ai.getConfig()
      .then((config) => {
        setProviders(config.providers as ProviderOption[]);
        setModels(config.models);
        setLocalBaseUrl(config.current.baseUrl);
        setLocalModel(config.current.model);
      })
      .catch(() => {
        // Use defaults
      });
  }, []);

  // Update base URL when provider changes
  const handleProviderChange = useCallback((newProvider: ProviderId) => {
    setProvider(newProvider);
    const providerConfig = providers.find((p) => p.id === newProvider);
    if (providerConfig && providerConfig.baseURL) {
      setLocalBaseUrl(providerConfig.baseURL);
    }
    // Set first model for this provider
    const providerModels = models.filter((m) => m.provider === newProvider);
    if (providerModels.length > 0) {
      setLocalModel(providerModels[0].id);
    }
  }, [providers, models, setProvider]);

  const filteredModels = models.filter((m) => m.provider === provider);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await ai.setConfig({
        provider,
        model: localModel,
        baseUrl: localBaseUrl,
        apiKey: apiKey || undefined,
      });
      setModel(localModel);
      setBaseUrl(localBaseUrl);
      setSaving(false);
    } catch (err: any) {
      setSaving(false);
    }
  }, [provider, localModel, localBaseUrl, apiKey, setModel, setBaseUrl]);

  const handleTest = useCallback(async () => {
    setTestStatus("testing");
    setTestMessage("");

    try {
      // Save config first, then test by sending a simple request
      await ai.setConfig({
        provider,
        model: localModel,
        baseUrl: localBaseUrl,
        apiKey: apiKey || undefined,
      });

      // Try a minimal chat to test the connection
      const response = await ai.chat(
        [{ role: "user", content: "Say hi in one word." }],
        `test_${Date.now()}`,
      );

      if (response.ok) {
        // Read a bit of the stream to confirm it works
        const reader = response.body?.getReader();
        if (reader) {
          const { value } = await reader.read();
          reader.cancel();
          if (value) {
            setTestStatus("success");
            setTestMessage("Connection successful!");
            return;
          }
        }
        setTestStatus("success");
        setTestMessage("Connection established");
      } else {
        const err = await response.json().catch(() => ({ error: "Connection failed" }));
        setTestStatus("error");
        setTestMessage(err.error || "Connection failed");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.message || "Connection failed");
    }
  }, [provider, localModel, localBaseUrl, apiKey]);

  const currentProvider = providers.find((p) => p.id === provider);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--border)] shrink-0">
        <span className="text-xs font-medium text-[var(--text-primary)]">AI Settings</span>
        <button
          onClick={onClose}
          className="px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Settings form */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Provider selector */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Provider</label>
          <div className="space-y-1">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded text-xs transition-colors",
                  provider === p.id
                    ? "bg-[var(--accent)]/20 border border-[var(--accent)]/50 text-[var(--text-primary)]"
                    : "bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px] opacity-70 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Model selector */}
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Model</label>
          {filteredModels.length > 0 ? (
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full px-3 py-2 rounded text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              {filteredModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          ) : null}
          {/* Free text input for custom model names (Ollama/Custom) */}
          {(provider === "ollama" || provider === "custom") && (
            <input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              placeholder="e.g. gemma4:12b, qwen2.5-coder:7b"
              className="w-full mt-1.5 px-3 py-2 rounded text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
          )}
        </div>

        {/* API Key (for NVIDIA/Custom) */}
        {currentProvider?.requiresKey && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="w-full px-3 py-2 rounded text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
              Get your key from{" "}
              {provider === "nvidia" ? "build.nvidia.com" : "your provider"}
            </p>
          </div>
        )}

        {/* Base URL (for Ollama/Custom) */}
        {(provider === "ollama" || provider === "custom") && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1.5">Base URL</label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full px-3 py-2 rounded text-xs bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        {/* Test connection result */}
        {testStatus !== "idle" && (
          <div
            className={cn(
              "px-3 py-2 rounded text-xs",
              testStatus === "testing" && "bg-[var(--accent)]/10 text-[var(--accent)]",
              testStatus === "success" && "bg-[var(--success)]/10 text-[var(--success)]",
              testStatus === "error" && "bg-[var(--danger)]/10 text-[var(--danger)]",
            )}
          >
            {testStatus === "testing" && "Testing connection..."}
            {testStatus === "success" && `✓ ${testMessage}`}
            {testStatus === "error" && `✗ ${testMessage}`}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-t border-[var(--border)] p-3 space-y-2 shrink-0">
        <button
          onClick={handleTest}
          disabled={testStatus === "testing"}
          className="w-full px-3 py-2 rounded text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border)] transition-colors disabled:opacity-50"
        >
          {testStatus === "testing" ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-3 py-2 rounded text-xs font-medium bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
