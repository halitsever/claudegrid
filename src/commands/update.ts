import { spawnSync } from "node:child_process";
import { accessSync, constants, realpathSync } from "node:fs";
import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run, which } from "../exec.js";
import { CliError, style, tildify } from "../ui.js";

const PACKAGE = "@halitsever/claudegrid";

/** Compares x.y.z versions, ignoring any prerelease suffix. */
export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.replace(/^v/, "").replace(/-.*$/, "").split(".").map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}

/** The npm prefix this copy was installed into, or undefined when it runs from a source checkout. */
function installPrefix(): string | undefined {
  const root = dirname(dirname(dirname(realpathSync(fileURLToPath(import.meta.url)))));
  const modules = dirname(dirname(root));
  if (basename(dirname(root)) !== "@halitsever" || basename(modules) !== "node_modules") return undefined;
  const parent = dirname(modules);
  return basename(parent) === "lib" ? dirname(parent) : parent;
}

function writable(dir: string): boolean {
  try {
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function update(version: string, options: { check: boolean }): number {
  if (!which("npm")) throw new CliError("npm is not installed", `install it, then run: npm install -g ${PACKAGE}`);
  const view = run("npm", ["view", PACKAGE, "version"], { timeout: 30_000 });
  if (!view.ok || !view.stdout) throw new CliError("could not ask npm for the latest version", view.stderr || undefined);
  const latest = view.stdout.split("\n").pop()!.trim();

  if (compareVersions(latest, version) <= 0) {
    process.stdout.write(`${style.green("✔")} claudegrid v${version} is the latest version\n`);
    return 0;
  }
  process.stdout.write(`${style.brand("▦")} v${version} ${style.dim("->")} ${style.bold(`v${latest}`)}\n`);
  if (options.check) return 0;

  const prefix = installPrefix();
  if (!prefix) throw new CliError("this claudegrid runs from a source checkout", "update it with: git pull && npm install && npm run build");
  // Deb and AUR packages install into /usr, where npm would fight the package manager.
  if (prefix === "/usr") throw new CliError("claudegrid was installed by your package manager", "update it with apt or your AUR helper");

  const args = ["install", "-g", "--no-audit", "--no-fund", "--prefix", prefix, `${PACKAGE}@${latest}`];
  process.stdout.write(style.dim(`  npm ${args.join(" ")}\n`));
  const result = spawnSync("npm", args, { stdio: "inherit" });
  if (result.status !== 0) {
    const command = `${writable(prefix) ? "" : "sudo "}npm ${args.join(" ")}`;
    throw new CliError(`npm could not install v${latest} into ${tildify(prefix)}`, `run it yourself: ${command}`);
  }
  process.stdout.write(`${style.green("✔")} updated claudegrid to v${latest}\n`);
  return 0;
}
