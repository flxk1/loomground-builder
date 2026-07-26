import { realpathSync, statSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export class AdapterAuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AdapterAuthorizationError";
    this.code = "ERR_ADAPTER_NOT_AUTHORIZED";
  }
}

function containedBy(candidate, root) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`));
}

function localPath(specifier, baseUrl) {
  if (typeof specifier !== "string" || specifier.length === 0) {
    throw new AdapterAuthorizationError("adapter path must be a non-empty string");
  }

  let url;
  try {
    url = new URL(specifier, baseUrl);
  } catch {
    throw new AdapterAuthorizationError(`adapter path is not a valid local file reference: ${JSON.stringify(specifier)}`);
  }
  if (url.protocol !== "file:") {
    throw new AdapterAuthorizationError(`adapter URL scheme '${url.protocol}' is not allowed; adapters must be local files`);
  }
  if (url.username || url.password || url.host) {
    throw new AdapterAuthorizationError("remote or authority-bearing file URLs are not allowed for adapters");
  }
  return fileURLToPath(url);
}

export function authorizeAdapterUrl(specifier, { baseUrl, roots } = {}) {
  if (!baseUrl) throw new TypeError("baseUrl is required");
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new TypeError("at least one authorized adapter root is required");
  }

  const requestedPath = localPath(specifier, baseUrl);
  let candidate;
  try {
    candidate = realpathSync.native(requestedPath);
    if (!statSync(candidate).isFile()) {
      throw new AdapterAuthorizationError("adapter path must resolve to a regular file");
    }
  } catch (error) {
    if (error instanceof AdapterAuthorizationError) throw error;
    throw new AdapterAuthorizationError(`adapter file cannot be resolved: ${requestedPath}`);
  }

  const authorizedRoots = roots.map((root) => {
    const rootPath = root instanceof URL ? fileURLToPath(root) : resolve(root);
    try {
      return realpathSync.native(rootPath);
    } catch {
      throw new AdapterAuthorizationError(`authorized adapter root cannot be resolved: ${rootPath}`);
    }
  });
  if (!authorizedRoots.some((root) => containedBy(candidate, root))) {
    throw new AdapterAuthorizationError(`adapter is outside the authorized local roots: ${candidate}`);
  }
  return pathToFileURL(candidate).href;
}

export async function loadAuthorizedAdapter(specifier, options) {
  return import(authorizeAdapterUrl(specifier, options));
}

export function moduleDirectory(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}
