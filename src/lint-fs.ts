/**
 * In-memory filesystem for the Vale WASM (design D2 of
 * add-vale-prose-linting). Go's js/wasm runtime routes every file syscall
 * through `globalThis.fs` (a Node-fs-shaped callback API), so this shim is
 * the engine's entire I/O surface — and thereby the structural enforcement
 * of the local-only contract for linting: it serves exactly the seeded tree
 * (config, styles, the document under lint), answers ENOENT elsewhere, and
 * refuses writes except the fd 1/2 output capture.
 *
 * Installed at module-evaluation time: wasm_exec.js installs its own
 * (throwing) stub unless `globalThis.fs` already exists when it evaluates,
 * so importing this module must precede importing wasm_exec.js.
 *
 * Callbacks are deferred with queueMicrotask: the Go runtime parks the
 * calling goroutine and resumes it from the callback, which must therefore
 * run after the syscall's wasm frame has returned to the event loop.
 */

type Callback = (err: Error | null, ...rest: unknown[]) => void;

function errno(code: string, path?: string): Error {
  return Object.assign(new Error(path === undefined ? code : `${code}: ${path}`), { code });
}

function normalize(path: string): string {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return "/" + parts.join("/");
}

const files = new Map<string, Uint8Array>();
const dirs = new Set<string>(["/"]);

/** Seed or replace one file; parent directories materialize implicitly. */
export function setFile(path: string, bytes: Uint8Array): void {
  const normalized = normalize(path);
  files.set(normalized, bytes);
  let dir = normalized;
  for (;;) {
    dir = dir.slice(0, dir.lastIndexOf("/")) || "/";
    if (dirs.has(dir)) break;
    dirs.add(dir);
  }
}

export function removeFile(path: string): void {
  files.delete(normalize(path));
}

let stdoutChunks: Uint8Array[] = [];
let stderrChunks: Uint8Array[] = [];

export function resetOutput(): void {
  stdoutChunks = [];
  stderrChunks = [];
}

function decode(chunks: Uint8Array[]): string {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const joined = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    joined.set(chunk, at);
    at += chunk.length;
  }
  return new TextDecoder().decode(joined);
}

export const takeStdout = (): string => decode(stdoutChunks);
export const takeStderr = (): string => decode(stderrChunks);

interface OpenFile {
  bytes: Uint8Array;
  position: number;
  isDir: boolean;
}

const fds = new Map<number, OpenFile>();
let nextFd = 3;

const S_IFREG = 0o100000;
const S_IFDIR = 0o040000;

function statFor(path: string): Record<string, unknown> | undefined {
  const normalized = normalize(path);
  const file = files.get(normalized);
  if (file === undefined && !dirs.has(normalized)) {
    return undefined;
  }
  const size = file?.length ?? 0;
  return {
    dev: 0,
    ino: 0,
    mode: file === undefined ? S_IFDIR | 0o555 : S_IFREG | 0o444,
    nlink: 1,
    uid: 0,
    gid: 0,
    rdev: 0,
    size,
    blksize: 4096,
    blocks: Math.ceil(size / 512),
    atimeMs: 0,
    mtimeMs: 0,
    ctimeMs: 0,
    isDirectory: () => file === undefined,
  };
}

const defer = (callback: Callback, err: Error | null, ...rest: unknown[]) =>
  queueMicrotask(() => callback(err, ...rest));

// O_* values are only compared against these same constants inside the Go
// runtime, so any distinct values work; these are Linux's.
const O_WRONLY = 1;
const O_RDWR = 2;
const O_CREAT = 64;
const O_TRUNC = 512;
const O_APPEND = 1024;

const lintFs = {
  constants: {
    O_RDONLY: 0,
    O_WRONLY,
    O_RDWR,
    O_CREAT,
    O_TRUNC,
    O_APPEND,
    O_EXCL: 128,
    O_DIRECTORY: 65536,
  },

  open(path: string, flags: number, _mode: number, callback: Callback): void {
    if ((flags & (O_WRONLY | O_RDWR | O_CREAT | O_TRUNC | O_APPEND)) !== 0) {
      defer(callback, errno("EROFS", path));
      return;
    }
    const normalized = normalize(path);
    const bytes = files.get(normalized);
    // Directories open read-only too: Go's os.ReadDir opens the directory
    // for an fd, fstats it, then lists it by path via readdir.
    if (bytes === undefined && !dirs.has(normalized)) {
      defer(callback, errno("ENOENT", path));
      return;
    }
    const fd = nextFd++;
    fds.set(fd, { bytes: bytes ?? new Uint8Array(0), position: 0, isDir: bytes === undefined });
    defer(callback, null, fd);
  },

  close(fd: number, callback: Callback): void {
    fds.delete(fd);
    defer(callback, null);
  },

  read(
    fd: number,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number | null,
    callback: Callback,
  ): void {
    const open = fds.get(fd);
    if (open === undefined) {
      defer(callback, errno("EBADF"));
      return;
    }
    const from = position ?? open.position;
    const count = Math.max(0, Math.min(length, open.bytes.length - from));
    buffer.set(open.bytes.subarray(from, from + count), offset);
    if (position === null) {
      open.position = from + count;
    }
    defer(callback, null, count);
  },

  write(
    fd: number,
    buffer: Uint8Array,
    offset: number,
    length: number,
    position: number | null,
    callback: Callback,
  ): void {
    if ((fd === 1 || fd === 2) && position === null) {
      const chunk = buffer.slice(offset, offset + length);
      (fd === 1 ? stdoutChunks : stderrChunks).push(chunk);
      defer(callback, null, length);
      return;
    }
    defer(callback, errno("EBADF"));
  },

  fstat(fd: number, callback: Callback): void {
    const open = fds.get(fd);
    if (open === undefined) {
      defer(callback, errno("EBADF"));
      return;
    }
    defer(callback, null, {
      dev: 0,
      ino: 0,
      mode: open.isDir ? S_IFDIR | 0o555 : S_IFREG | 0o444,
      nlink: 1,
      uid: 0,
      gid: 0,
      rdev: 0,
      size: open.bytes.length,
      blksize: 4096,
      blocks: Math.ceil(open.bytes.length / 512),
      atimeMs: 0,
      mtimeMs: 0,
      ctimeMs: 0,
      isDirectory: () => open.isDir,
    });
  },

  stat(path: string, callback: Callback): void {
    const stat = statFor(path);
    if (stat === undefined) {
      defer(callback, errno("ENOENT", path));
      return;
    }
    defer(callback, null, stat);
  },

  lstat(path: string, callback: Callback): void {
    lintFs.stat(path, callback);
  },

  readdir(path: string, callback: Callback): void {
    const normalized = normalize(path);
    if (!dirs.has(normalized)) {
      defer(callback, errno(files.has(normalized) ? "ENOTDIR" : "ENOENT", path));
      return;
    }
    const prefix = normalized === "/" ? "/" : normalized + "/";
    const names = new Set<string>();
    for (const candidate of [...files.keys(), ...dirs]) {
      if (candidate !== normalized && candidate.startsWith(prefix)) {
        const name = candidate.slice(prefix.length).split("/", 1)[0];
        if (name !== undefined && name !== "") names.add(name);
      }
    }
    defer(callback, null, [...names]);
  },

  fsync(_fd: number, callback: Callback): void {
    defer(callback, null);
  },

  readlink(path: string, callback: Callback): void {
    defer(callback, errno("EINVAL", path));
  },
};

// Every mutating operation the Go runtime might attempt: refuse read-only.
for (const op of ["mkdir", "rmdir", "unlink", "rename", "truncate", "ftruncate", "chmod", "chown", "fchmod", "fchown", "lchown", "utimes", "link", "symlink"]) {
  (lintFs as Record<string, unknown>)[op] = (...args: unknown[]) => {
    const callback = args[args.length - 1] as Callback;
    defer(callback, errno("EROFS"));
  };
}

globalThis.fs = lintFs;

// wasm_exec.js also installs a `process` stub when none exists — but its
// cwd() throws ENOSYS, and Vale calls Getwd while resolving its config
// ("getwd: not implemented on js"). Provide one rooted at "/" instead.
// Guarded so Node (the check-lint-shim harness) keeps its real process.
if (typeof globalThis.process === "undefined") {
  (globalThis as { process?: unknown }).process = {
    getuid: () => -1,
    getgid: () => -1,
    geteuid: () => -1,
    getegid: () => -1,
    getgroups: () => {
      throw errno("ENOSYS");
    },
    pid: -1,
    ppid: -1,
    umask: () => {
      throw errno("ENOSYS");
    },
    cwd: () => "/",
    chdir: () => {
      throw errno("EROFS");
    },
  };
}
