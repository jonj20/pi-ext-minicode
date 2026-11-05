import { spawn, ChildProcess } from "node:child_process";

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

export interface ServiceInstance {
	name: string;
	port?: number;
	pid: number;
	status: "starting" | "running" | "stopped" | "error";
	startTime?: number;
}

export class ServiceManager {
	private instances = new Map<string, { inst: ServiceInstance; proc: ChildProcess }>();

	isRunning(name: string): boolean {
		const entry = this.instances.get(name);
		return !!entry && entry.inst.status === "running" && !entry.proc.killed;
	}

	getAll(): ServiceInstance[] {
		return Array.from(this.instances.values(), (entry) => entry.inst);
	}

	async start(config: ServiceConfig): Promise<ServiceInstance> {
		if (this.isRunning(config.name)) {
			return this.instances.get(config.name)!.inst;
		}

		const env = { ...process.env, ...config.env };
		const proc = spawn(config.executable, config.args ?? [], {
			env,
			cwd: config.cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});

		const inst: ServiceInstance = {
			name: config.name,
			port: config.port,
			pid: proc.pid!,
			status: "starting",
			startTime: Date.now(),
		};

		this.instances.set(config.name, { inst, proc });

		proc.stdout?.on("data", (data) => {
			console.log(`[local-models:${config.name}] ${data}`);
		});
		proc.stderr?.on("data", (data) => {
			console.error(`[local-models:${config.name}] ${data}`);
		});

		proc.on("exit", () => {
			inst.status = "stopped";
			this.instances.delete(config.name);
		});

		const timeoutMs = config.startupTimeoutMs ?? 10000;
		const intervalMs = config.healthCheckIntervalMs ?? 500;
		const deadline = Date.now() + timeoutMs;
		const path = config.healthCheckPath ?? "/v1/models";
		const url = `http://localhost:${config.port}${path}`;

		while (Date.now() < deadline) {
			if (proc.exitCode !== null || proc.signalCode !== null) {
				inst.status = "error";
				throw new Error(`Service ${config.name} exited during startup`);
			}
			try {
				const res = await fetch(url, { signal: AbortSignal.timeout(800) });
				if (res.ok) {
					inst.status = "running";
					return inst;
				}
			} catch {
				// retry
			}
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}

		inst.status = "error";
		throw new Error(`Service ${config.name} did not become healthy within ${timeoutMs}ms`);
	}

	async stop(name: string): Promise<boolean> {
		const entry = this.instances.get(name);
		if (!entry) return false;

		await this.killTree(entry.proc.pid!);
		entry.proc.kill();
		entry.inst.status = "stopped";
		this.instances.delete(name);
		return true;
	}

	stopAll(): void {
		for (const name of this.instances.keys()) {
			void this.stop(name);
		}
	}

	private async killTree(pid: number): Promise<void> {
		if (process.platform === "win32") {
			await new Promise<void>((resolve) => {
				const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
					stdio: "ignore",
				});
				child.on("exit", () => resolve());
				child.on("error", () => resolve());
			});
		} else {
			try {
				const stdout = await new Promise<string>((resolve, reject) => {
					const child = spawn("ps", ["-o", "pid=", "--ppid", String(pid)], {
						stdio: ["ignore", "pipe", "ignore"],
					});
					let out = "";
					child.stdout?.on("data", (data) => {
						out += data;
					});
					child.on("exit", () => resolve(out));
					child.on("error", reject);
				});
				const children = stdout.split(/\s+/).filter(Boolean).map(Number);
				for (const cpid of children) {
					await this.killTree(cpid);
				}
				process.kill(pid);
			} catch {
				process.kill(pid);
			}
		}
	}
}

export const serviceManager = new ServiceManager();
