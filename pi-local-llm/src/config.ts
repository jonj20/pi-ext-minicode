import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProviders } from "@earendil-works/pi-ai/compat";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { stripJsonComments } from "./json.ts";
import type { LocalEndpoint } from "./probe.ts";

export interface ServiceConfig {
	name: string;
	executable: string;
	args?: string[];
	port?: number;
	env?: Record<string, string>;
	cwd?: string;
	startupTimeoutMs?: number;
	healthCheckPath?: string;
	healthCheckIntervalMs?: number;
}

export interface LocalModelsConfig {
	enabled?: boolean;
	probeOnStartup?: boolean;
	startupTimeoutMs?: number;
	timeoutMs?: number;
	endpoints?: LocalEndpoint[];
	services?: ServiceConfig[];
}

interface ProviderFileConfig {
	baseUrl?: string;
	models?: unknown[];
}

interface ModelsFile {
	providers?: Record<string, ProviderFileConfig>;
	localModels?: LocalModelsConfig;
}

export interface ProviderEndpoint {
	name: string;
	baseUrl: string;
}

export interface LoadedLocalModelsConfig {
	config: LocalModelsConfig;
	providerEndpoints: ProviderEndpoint[];
}

function readJsonFile<T>(path: string): T | undefined {
	if (!existsSync(path)) return undefined;
	try {
		const content = readFileSync(path, "utf-8").replace(/^\uFEFF/, "");
		return JSON.parse(stripJsonComments(content)) as T;
	} catch {
		return undefined;
	}
}

function isLocalUrl(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
	} catch {
		return false;
	}
}

function collectProviderEndpoints(files: Array<ModelsFile | undefined>): ProviderEndpoint[] {
	const builtIn = new Set<string>(getProviders());
	const endpoints: ProviderEndpoint[] = [];
	const seen = new Set<string>();

	for (const file of files) {
		for (const [name, provider] of Object.entries(file?.providers ?? {})) {
			if (!provider.baseUrl || !isLocalUrl(provider.baseUrl)) continue;
			if (provider.models && provider.models.length > 0) continue;
			if (builtIn.has(name)) continue;
			const baseUrl = provider.baseUrl.replace(/\/v1\/?$/, "");
			if (seen.has(baseUrl)) continue;
			seen.add(baseUrl);
			endpoints.push({ name, baseUrl });
		}
	}

	return endpoints;
}

function pick<T>(...values: Array<T | undefined>): T | undefined {
	for (const value of values) {
		if (value !== undefined) return value;
	}
	return undefined;
}

function readDedicatedConfig(path: string): LocalModelsConfig | undefined {
	const file = readJsonFile<ModelsFile & LocalModelsConfig>(path);
	return file?.localModels ?? file;
}

export function loadLocalModelsConfig(cwd: string): LoadedLocalModelsConfig {
	const globalModelsFile = readJsonFile<ModelsFile>(join(getAgentDir(), "models.json"));
	const projectModelsFile = readJsonFile<ModelsFile>(join(cwd, CONFIG_DIR_NAME, "models.json"));
	const globalDedicated = readDedicatedConfig(join(getAgentDir(), "local-models.json"));
	const projectDedicated = readDedicatedConfig(join(cwd, CONFIG_DIR_NAME, "local-models.json"));
	const globalModelsConfig = globalModelsFile?.localModels;
	const projectModelsConfig = projectModelsFile?.localModels;

	const config: LocalModelsConfig = {
		enabled: pick(
			projectDedicated?.enabled,
			globalDedicated?.enabled,
			projectModelsConfig?.enabled,
			globalModelsConfig?.enabled,
		),
		probeOnStartup: pick(
			projectDedicated?.probeOnStartup,
			globalDedicated?.probeOnStartup,
			projectModelsConfig?.probeOnStartup,
			globalModelsConfig?.probeOnStartup,
		),
		startupTimeoutMs: pick(
			projectDedicated?.startupTimeoutMs,
			globalDedicated?.startupTimeoutMs,
			projectModelsConfig?.startupTimeoutMs,
			globalModelsConfig?.startupTimeoutMs,
		),
		timeoutMs: pick(
			projectDedicated?.timeoutMs,
			globalDedicated?.timeoutMs,
			projectModelsConfig?.timeoutMs,
			globalModelsConfig?.timeoutMs,
		),
		endpoints: pick(
			projectDedicated?.endpoints,
			globalDedicated?.endpoints,
			projectModelsConfig?.endpoints,
			globalModelsConfig?.endpoints,
		),
		services: pick(
			projectDedicated?.services,
			globalDedicated?.services,
			projectModelsConfig?.services,
			globalModelsConfig?.services,
		),
	};

	return {
		config,
		providerEndpoints: collectProviderEndpoints([projectModelsFile, globalModelsFile]),
	};
}
