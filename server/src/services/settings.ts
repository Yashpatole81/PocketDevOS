import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ProviderId } from "../ai/config.js";

/**
 * AI settings storage.
 * Settings stored in ~/.pocketdevos/settings.json
 * API keys stored in ~/.pocketdevos/keys.json (plain JSON for now)
 */

const SETTINGS_DIR = join(homedir(), ".pocketdevos");
const SETTINGS_FILE = join(SETTINGS_DIR, "settings.json");
const KEYS_FILE = join(SETTINGS_DIR, "keys.json");

export interface AiSettings {
  provider: ProviderId;
  model: string;
  baseUrl: string;
  apiKey: string;
}

const DEFAULT_SETTINGS: AiSettings = {
  provider: "ollama",
  model: "gemma4:12b",
  baseUrl: "http://localhost:11434/v1",
  apiKey: "",
};

function ensureDir(): void {
  if (!existsSync(SETTINGS_DIR)) {
    mkdirSync(SETTINGS_DIR, { recursive: true });
  }
}

/**
 * Settings manager - loads on startup, saves on change.
 */
class SettingsManager {
  private settings: AiSettings;

  constructor() {
    this.settings = this.load();
  }

  private load(): AiSettings {
    ensureDir();

    // Load settings
    let settings: Partial<AiSettings> = {};
    if (existsSync(SETTINGS_FILE)) {
      try {
        settings = JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
      } catch {
        settings = {};
      }
    }

    // Load API key from keys file
    let apiKey = "";
    if (existsSync(KEYS_FILE)) {
      try {
        const keys = JSON.parse(readFileSync(KEYS_FILE, "utf-8"));
        const provider = settings.provider || DEFAULT_SETTINGS.provider;
        apiKey = keys[provider] || "";
      } catch {
        apiKey = "";
      }
    }

    return {
      provider: settings.provider || DEFAULT_SETTINGS.provider,
      model: settings.model || DEFAULT_SETTINGS.model,
      baseUrl: settings.baseUrl || DEFAULT_SETTINGS.baseUrl,
      apiKey,
    };
  }

  private save(): void {
    ensureDir();

    // Save settings (without API key)
    const { apiKey, ...settingsWithoutKey } = this.settings;
    writeFileSync(SETTINGS_FILE, JSON.stringify(settingsWithoutKey, null, 2), "utf-8");

    // Save API key separately
    let keys: Record<string, string> = {};
    if (existsSync(KEYS_FILE)) {
      try {
        keys = JSON.parse(readFileSync(KEYS_FILE, "utf-8"));
      } catch {
        keys = {};
      }
    }

    if (apiKey) {
      keys[this.settings.provider] = apiKey;
    } else {
      delete keys[this.settings.provider];
    }

    writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), "utf-8");
  }

  get(): AiSettings {
    return { ...this.settings };
  }

  update(partial: Partial<AiSettings>): AiSettings {
    this.settings = { ...this.settings, ...partial };

    // If provider changed, load the key for the new provider
    if (partial.provider && !partial.apiKey) {
      try {
        if (existsSync(KEYS_FILE)) {
          const keys = JSON.parse(readFileSync(KEYS_FILE, "utf-8"));
          this.settings.apiKey = keys[this.settings.provider] || "";
        }
      } catch {
        this.settings.apiKey = "";
      }
    }

    this.save();
    return this.get();
  }
}

export const settingsManager = new SettingsManager();
