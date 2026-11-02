export interface LocalEndpoint {
	name: string;
	baseUrl: string;
	modelsPath?: string;
	format?: "openai" | "ollama";
}

export interface DiscoveredModel {
	provider: string;
	id: string;
	baseUrl: string;
	contextWindow: number;
	maxTokens: number;
}

export const DEFAULT_ENDPOINTS: LocalEndpoint[] = [
	{ name: "llamacpp", baseUrl: "http://localhost:8080" },
	{ name: "llamacpp-18080", baseUrl: "http://localhost:18080" },
	{ name: "ollama", baseUrl: "http://localhost:11434", modelsPath: "/api/tags", format: "ollama" },
	{ name: "lmstudio", baseUrl: "http://localhost:1234" },
	{ name: "vllm", baseUrl: "http://localhost:8000" },
	{ name: "localai", baseUrl: "http://localhost:8080" },
];

const DEFAULT_CONTEXT_WINDOW = 32768;
const DEFAULT_MAX_TOKENS = 4096;

interface OpenAIModelsResponse {
	data?: Array<{
		id: string;
		object?: string;
		max_model_len?: number;
		context_window?: number;
		meta?: { n_ctx?: number; n_ctx_train?: number };
	}>;
}

interface OllamaTagsResponse {
	models?: Array<{ name: string; model?: string; size?: number }>;
}

interface OllamaShowResponse {
	model_info?: Record<string, unknown>;
}

const OLLAMA_CONTEXT_KEYS = [
	"llama.context_length",
	"llama.context_length_train",
	"mixtral.context_length",
	"gpt_neox.context_length",
	"qwen2.context_length",
	"bert.context_length",
	"nomic-bert.context_length",
];

async function fetchJson<T>(url: string, timeoutMs: number, init?: RequestInit): Promise<T | undefined> {
	try {
		const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
		if (!response.ok) return undefined;
		return (await response.json()) as T;
	} catch {
		return undefined;
	}
}

export function openAICompatibleBaseUrl(serverRoot: string): string {
	const root = serverRoot.replace(/\/+$/, "");
	return root.endsWith("/v1") ? root : `${root}/v1`;
}

function toDiscoveredModel(endpoint: LocalEndpoint, id: string, contextWindow: number | undefined): DiscoveredModel {
	const ctx = contextWindow ?? DEFAULT_CONTEXT_WINDOW;
	return {
		provider: endpoint.name,
		id,
		baseUrl: openAICompatibleBaseUrl(endpoint.baseUrl),
		contextWindow: ctx,
		maxTokens: Math.min(ctx, DEFAULT_MAX_TOKENS),
	};
}

function parseOpenAIResponse(endpoint: LocalEndpoint, data: OpenAIModelsResponse): DiscoveredModel[] {
	if (!data.data || !Array.isArray(data.data)) return [];

	return data.data
		.filter((model) => model.object === "model" || model.id)
		.map((model) => {
			const contextWindow =
				model.meta?.n_ctx ?? model.meta?.n_ctx_train ?? model.max_model_len ?? model.context_window;
			return toDiscoveredModel(endpoint, model.id, contextWindow);
		});
}

async function parseOllamaResponse(
	endpoint: LocalEndpoint,
	data: OllamaTagsResponse,
	timeoutMs: number,
): Promise<DiscoveredModel[]> {
	if (!data.models || !Array.isArray(data.models)) return [];

	const names = data.models.map((model) => model.name);
	const contextWindows = await Promise.all(
		names.map(async (name) => {
			const info = await fetchJson<OllamaShowResponse>(`${endpoint.baseUrl}/api/show`, timeoutMs, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name }),
			});
			const modelInfo = info?.model_info;
			if (!modelInfo) return undefined;
			for (const key of OLLAMA_CONTEXT_KEYS) {
				const value = modelInfo[key];
				if (typeof value === "number" && value > 0) return value;
			}
			return undefined;
		}),
	);

	return names.map((name, index) => toDiscoveredModel(endpoint, name, contextWindows[index]));
}

export function dedupeEndpoints(endpoints: LocalEndpoint[]): LocalEndpoint[] {
	const seen = new Set<string>();
	return endpoints.filter((endpoint) => {
		if (seen.has(endpoint.baseUrl)) return false;
		seen.add(endpoint.baseUrl);
		return true;
	});
}

export async function probeEndpoints(endpoints: LocalEndpoint[], timeoutMs: number): Promise<DiscoveredModel[]> {
	const unique = dedupeEndpoints(endpoints);
	const results = await Promise.all(
		unique.map(async (endpoint) => {
			const modelsPath = endpoint.modelsPath ?? "/v1/models";
			const data = await fetchJson<unknown>(`${endpoint.baseUrl}${modelsPath}`, timeoutMs, {
				headers: { Accept: "application/json" },
			});
			if (!data) return [];
			if (endpoint.format === "ollama") {
				return await parseOllamaResponse(endpoint, data as OllamaTagsResponse, timeoutMs);
			}
			return parseOpenAIResponse(endpoint, data as OpenAIModelsResponse);
		}),
	);
	return results.flat();
}
