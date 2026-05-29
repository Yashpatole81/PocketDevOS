/**
 * AI provider and model configuration.
 * Uses OpenAI-compatible endpoints: NVIDIA Build API, Ollama, and custom.
 */

export type ProviderId = "nvidia" | "ollama" | "custom";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseURL: string;
  requiresKey: boolean;
  description: string;
}

export interface ModelConfig {
  id: string;
  provider: ProviderId;
  label: string;
  description: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "nvidia",
    name: "NVIDIA Build",
    baseURL: "https://integrate.api.nvidia.com/v1",
    requiresKey: true,
    description: "NVIDIA Build API (nim.api.nvidia.com)",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseURL: "http://localhost:11434/v1",
    requiresKey: false,
    description: "Local models via Ollama",
  },
  {
    id: "custom",
    name: "Custom Endpoint",
    baseURL: "",
    requiresKey: false,
    description: "Any OpenAI-compatible endpoint",
  },
];

export const MODELS: ModelConfig[] = [
  // NVIDIA Build API
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1",
    provider: "nvidia",
    label: "Llama 3.3 Nemotron Super 49B",
    description: "NVIDIA's top-tier reasoning model",
  },
  {
    id: "google/gemma-3-27b-it",
    provider: "nvidia",
    label: "Gemma 3 27B IT",
    description: "Google Gemma 3 via NVIDIA",
  },
  {
    id: "meta/llama-3.1-70b-instruct",
    provider: "nvidia",
    label: "Llama 3.1 70B Instruct",
    description: "Meta Llama 3.1 via NVIDIA",
  },
  // Ollama (local)
  {
    id: "gemma4:12b",
    provider: "ollama",
    label: "Gemma 4 12B",
    description: "Google Gemma 4 local",
  },
  {
    id: "qwen2.5-coder:7b",
    provider: "ollama",
    label: "Qwen 2.5 Coder 7B",
    description: "Coding-focused local model",
  },
  {
    id: "llama3.2:3b",
    provider: "ollama",
    label: "Llama 3.2 3B",
    description: "Lightweight local model",
  },
];

export const SYSTEM_PROMPT = `You are PocketDevOS, an AI coding assistant running inside a terminal on an Android device. You have access to the filesystem and can run shell commands.

Rules:
- Execute, don't echo. When asked to create/edit a file, use the tool directly.
- Chain actions: read → understand → change → verify.
- Be concise. No filler.
- Bare filenames resolve to the current working directory.
- For write_file and run_command, the user must approve before execution.`;
