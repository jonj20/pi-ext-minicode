import type { Api, Model } from "@earendil-works/pi-ai";
import { getProviders } from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI, ProviderModelConfig } from "@earendil-works/pi-coding-agent";
import { loadLocalModelsConfig, type ServiceConfig } from "./config.ts";
import {
	DEFAULT_ENDPOINTS,
	type DiscoveredModel,
	dedupeEndpoints,
	type LocalEndpoint,
	probeEndpoints,
} from "./probe.ts";
import { serviceManager } from "./process.ts";

const ownedProviders = new Set<string>();
const BUILTIN_LLAMA_NAMES = ["llama-cpp", "llama.cpp", "llamacpp"] as const;
const builtInProviders = new Set<string>(getProviders());
const builtInLlamaCpp = BUILTIN_LLAMA_NAMES.some((name) => builtInProviders.has(name));

function shouldSkipProvider(name: string): boolean {
	if (builtInProviders.has(name)) return true;
	return builtInLlamaCpp && (BUILTIN_LLAMA_NAMES as readonly string[]).includes(name);
}

function groupByProvider(models: DiscoveredModel[]): Map<string, DiscoveredModel[]> {
	const grouped = new Map<string, DiscoveredModel[]>();
	for (const model of models) {
		const list = grouped.get(model.provider);
		if (list) {
			list.push(model);
		} else {
			grouped.set(model.provider, [model]);
		}
	}
	return grouped;
}

function toProviderModel(model: DiscoveredModel): ProviderModelConfig {
	return {
		id: model.id,
		name: model.id,
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
	};
}

async function probeAndRegister(pi: ExtensionAPI, endpoints: LocalEndpoint[], timeoutMs: number): Promise<number> {
	const models = await probeEndpoints(endpoints, timeoutMs);
	const grouped = groupByProvider(models);

	for (const [provider, providerModels] of grouped) {
		if (shouldSkipProvider(provider)) continue;
		try {
			pi.registerProvider(provider, {
				name: provider,
				baseUrl: providerModels[0].baseUrl,
				apiKey: "unused",
				api: "openai-completions",
				models: providerModels.map(toProviderModel),
			});
			ownedProviders.add(provider);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`[local-models] Failed to register ${provider}: ${message}`);
		}
	}

	return models.length;
}

function modelLabel(model: Model<Api>): string {
	return `${model.provider}/${model.id} (ctx ${model.contextWindow})`;
}

export default async function localModelsExtension(pi: ExtensionAPI): Promise<void> {
	const { config, providerEndpoints } = loadLocalModelsConfig(process.cwd());
	const usingDefaultEndpoints = config.endpoints === undefined;
	const defaults = builtInLlamaCpp
		? DEFAULT_ENDPOINTS.filter((endpoint) => endpoint.name !== "llamacpp")
		: DEFAULT_ENDPOINTS;
	const endpoints = dedupeEndpoints([...(config.endpoints ?? defaults), ...providerEndpoints]);
	const startupTimeoutMs = Math.max(100, config.startupTimeoutMs ?? 1000);
	const timeoutMs = Math.max(100, config.timeoutMs ?? 2000);

	if (config.enabled !== false) {
		for (const svc of config.services ?? []) {
			try {
				await serviceManager.start(svc);
				const serviceEndpoint: LocalEndpoint = {
					name: svc.name,
					baseUrl: `http://localhost:${svc.port}`,
				};
				await probeAndRegister(pi, [serviceEndpoint], timeoutMs);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				console.error(`[local-models] Failed to start service ${svc.name}: ${message}`);
			}
		}

		if (config.probeOnStartup !== false) {
			await probeAndRegister(pi, endpoints, startupTimeoutMs);
		}
	}

	pi.on("session_start", (_event, ctx) => {
		if (!usingDefaultEndpoints || !ownedProviders.has("llamacpp")) return;
		const hasBuiltinCommand = pi.getCommands().some((command) => command.name === "llama");
		const hasBuiltinProvider = ctx.modelRegistry
			.getAll()
			.some((model) => (BUILTIN_LLAMA_NAMES as readonly string[]).includes(model.provider));
		if (!hasBuiltinCommand && !hasBuiltinProvider) return;
		if (ctx.model?.provider === "llamacpp") return;
		pi.unregisterProvider("llamacpp");
		ownedProviders.delete("llamacpp");
	});

	pi.registerCommand("local-models", {
		description: "Discover local LLM models and switch to one",
		handler: async (_args, ctx) => {
			const count = await probeAndRegister(pi, endpoints, timeoutMs);
			if (count === 0) {
				ctx.ui.notify("No local models found", "warning");
				return;
			}

			const local = ctx.modelRegistry
				.getAll()
				.filter((model) => ownedProviders.has(model.provider))
				.sort((a, b) => `${a.provider}/${a.id}`.localeCompare(`${b.provider}/${b.id}`));

			if (local.length === 0) {
				ctx.ui.notify("No local models found", "warning");
				return;
			}

			if (!ctx.hasUI) {
				ctx.ui.notify(`Found ${local.length} local model(s)`, "info");
				return;
			}

			const labels = local.map(modelLabel);
			const selected = await ctx.ui.select("Local models", labels);
			if (!selected) return;

			const index = labels.indexOf(selected);
			if (index < 0) return;

			const model = local[index];
			const ok = await pi.setModel(model);
			if (!ok) {
				ctx.ui.notify(`Could not select ${model.provider}/${model.id}`, "error");
			}
		},
	});

	pi.registerCommand("local-models-start", {
		description: "Start a configured local model service",
		handler: async (args, ctx) => {
			const name = args[0];
			if (!name) {
				ctx.ui.notify("Usage: /local-models-start <name>", "warning");
				return;
			}
			const svc = config.services?.find((s) => s.name === name);
			if (!svc) {
				ctx.ui.notify(`Service "${name}" not configured`, "warning");
				return;
			}
			try {
				await serviceManager.start(svc);
				const serviceEndpoint: LocalEndpoint = {
					name: svc.name,
					baseUrl: `http://localhost:${svc.port}`,
				};
				await probeAndRegister(pi, [serviceEndpoint], timeoutMs);
				ctx.ui.notify(`Service "${name}" started`, "info");
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				ctx.ui.notify(`Failed to start "${name}": ${message}`, "error");
			}
		},
	});

	pi.registerCommand("local-models-stop", {
		description: "Stop a running local model service",
		handler: async (args, ctx) => {
			const name = args[0];
			if (!name) {
				ctx.ui.notify("Usage: /local-models-stop <name>", "warning");
				return;
			}
			const ok = await serviceManager.stop(name);
			if (ok) {
				pi.unregisterProvider(name);
				ownedProviders.delete(name);
				ctx.ui.notify(`Service "${name}" stopped`, "info");
			} else {
				ctx.ui.notify(`Service "${name}" is not running`, "warning");
			}
		},
	});

	pi.registerCommand("local-models-list", {
		description: "List local model services and their status",
		handler: async (_args, ctx) => {
			const instances = serviceManager.getAll();
			if (instances.length === 0) {
				ctx.ui.notify("No local model services", "info");
				return;
			}
			const lines = instances.map(
				(i) => `${i.name}: ${i.status} (pid ${i.pid}${i.port ? ", port " + i.port : ""})`,
			);
			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
