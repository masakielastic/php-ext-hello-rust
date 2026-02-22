# php-ext-hello-rust

Educational sample of a **PHP extension written in Rust** using **ext-php-rs**, packaged to be installable with **PIE (PHP Installer for Extensions)**.

This repository intentionally focuses **less on Rust tricks** and **more on the practical mechanics** of:
- how PIE discovers an extension in a repo,
- how `composer.json` must be shaped for PIE/Packagist,
- how to structure a repository using `build-path`,
- how `config.m4` + `Makefile.frag` can delegate the build to `cargo`,
- how to **register**, **build**, **install**, and **remove** the repository with PIE.

> Target audience: people who already know basic PHP extension concepts (`phpize`, `config.m4`) and want a minimal Rust-based example that works with PIE.

---

## What is PIE?

**PIE (PHP Installer for Extensions)** is a modern extension installer designed to make PHP extensions installable in a Composer-like workflow (sourced from Packagist or other repositories). PIE runs on PHP 8.1+ and performs the typical `phpize → configure → make → make install` flow on non-Windows platforms. See the upstream PIE docs for details.

---

## Package metadata (composer.json)

PIE uses `composer.json` as the package manifest. This project declares:

- `type: "php-ext"` — a PHP module installable by PIE
- `php-ext.extension-name: "hello_rust"` — the extension name as loaded by PHP
- `php-ext.build-path: "pie"` — tells PIE that build files live under `./pie/`

This layout keeps the repo root clean while still using standard PHP extension build tooling.

---

## Repository layout

Minimal structure (conceptual):

```text
.
├── composer.json
├── Cargo.toml
├── src/                # Rust code (ext-php-rs)
└── pie/
    ├── config.m4       # PHP extension build entrypoint (autoconf)
    └── Makefile.frag   # hooks "make" into Cargo build

```

---

## Why `build-path:` pie?

PIE expects a buildable PHP extension directory: `config.m4` (and optionally `Makefile.frag`, headers, etc.).
If your Rust project lives at the repo root, you can keep Cargo files in the root and put the PHP build wiring under `pie/`.

Upstream PIE explicitly supports this pattern via `php-ext.build-path`.

---

## How the build works (high level)
**1) `pie/config.m4` finds Rust tooling**

`config.m4` checks that `cargo` and `rustc` exist. It also prefers `rustup which cargo` / `rustup which rustc` when available, which helps avoid failures when `sudo` has a different PATH than your user shell.

**2) pie/Makefile.frag calls Cargo and exports a PHP .so**

The Makefile fragment runs:

`cargo build --release` in the Rust project directory

then copies Cargo’s output:

from `target/release/libhello_rust.so`

to PHP’s expected build artifact path: `modules/hello_rust.so`

That way, a standard PHP extension build flow (“make builds into `modules/`”) still works, even though the implementation is Rust.

---

## Prerequisites (Linux)

You need:

PHP (the target PHP you want to install into) and dev tooling (`phpize`, `php-config`)

build chain for PHP extensions (autoconf, make, gcc, etc.)

Rust toolchain (`rustc`, `cargo`) — via rustup or distro packages

PIE itself

The upstream PIE README and docs list typical Debian/Ubuntu packages (`gcc`, `make`, `autoconf`, `libtool`, `php-dev`, etc.) and installation methods for PIE.

---

## Using PIE with this repository

**A) Install directly from VCS (recommended for learning)**

Register the repository as a PIE source, then build/install by Composer package name.


```
# Add this Git repository as a PIE repository for your target PHP
pie repository:add vcs https://github.com/masakielastic/php-ext-hello-rust

# Build only (compiles into PIE's working directory)
pie build masakielastic/php-ext-hello-rust

# Install (downloads/builds if needed, then installs into your PHP)
pie install masakielastic/php-ext-hello-rust
```

Remove the repository registration later:

```
pie repository:remove https://github.com/masakielastic/php-ext-hello-rust
```

**B) Install from a local checkout (fast iteration)**

Clone and work locally:

```
git clone https://github.com/masakielastic/php-ext-hello-rust
cd php-ext-hello-rust

# Register local path as a PIE repository
pie repository:add path "$PWD"

# Then build/install by package name
pie build masakielastic/php-ext-hello-rust
pie install masakielastic/php-ext-hello-rust
```

---


## Enabling / verifying the extension

PIE will try to enable the extension automatically by updating the appropriate INI configuration, but environments differ.

Verify that PHP sees it:

```
php --ri hello_rust || true
php -m | grep -i hello_rust || true
```

If PIE cannot enable automatically, create an INI entry manually (exact path depends on your PHP distribution):

```
extension=hello_rust
```

---

## Uninstalling / removing the extension


Depending on your PIE version, you may be able to uninstall with:

```
pie uninstall masakielastic/php-ext-hello-rust
```

If your PIE build does not support `uninstall`, remove it manually:

  1. remove the INI entry that enables the extension
  2. delete the installed `hello_rust.so` from PHP’s extension dir (as reported by `php -i | grep extension_dir`)

> Note: even if you remove the extension, you may still want to remove the repository registration with `pie repository:remove ....`

---

## Development notes
### Build without PIE (Cargo only)

This builds the Rust dynamic library:

```
cargo build --release
```

Cargo will produce a file like:

  * `target/release/libhello_rust.so` (Linux)

PIE’s PHP build wiring copies this into:

  * `modules/hello_rust.so`

---

### Why does the filename change?

On Linux, Cargo’s `cdylib` naming convention often prefixes libraries with `lib...` (e.g., `libhello_rust.so`).
PHP extensions conventionally load as `hello_rust.so`. This repository normalizes that by copying/renaming during the build step.

---

## Publishing plan (Packagist / extensions list)

This repository is intended to become a PIE-compatible package discoverable via Packagist “extensions”.

Release flow (typical):

  1. ensure `composer.json` metadata is valid
  2. push a Git tag (e.g., `v0.1.0`)
  3. register the repo on Packagist

Upstream PIE maintainer docs explain how tags/archives are used for releases.

---


## Troubleshooting: PIE Repository State and Cache Issues

In some cases, running:

    pie repository:remove <repository>

may not be sufficient to fully reset the internal state of PIE.

You might observe symptoms such as:

- The removed repository still appears as an active repository
- An old version of the extension is still selected during dependency resolution
- `pie build` or `pie install` fails due to conflicts with a previously installed version
- Composer dependency resolution errors referencing unexpected package versions
- Git tokens being requested for repositories you already removed

These issues typically occur because PIE maintains per-target PHP configuration and Composer metadata under:

    ~/.config/pie

---

### How PIE Stores State

PIE maintains internal state per PHP target version. You may see directories such as:

    ~/.config/pie/php8.5_xxxxxxxxxxxxxxxx/

Inside these directories:

- `pie.json`
- `composer.json`
- `composer.lock`
- cached repository metadata
- build artifacts and dependency resolution state

If a repository was added, built, or partially installed, remnants of that state may remain here even after `repository:remove`.

---

## When Manual Cleanup Is Appropriate

Manual inspection/cleanup may be necessary if:

- You renamed your repository
- You changed the Composer package name
- You changed `minimum-stability`
- You changed the extension name
- You previously installed from a local path repository
- Dependency resolution continues to reference a package version that no longer exists remotely

---

## Safe Cleanup Procedure

### 1️⃣ Inspect current PIE state

```bash
ls ~/.config/pie
```

---


Check subdirectories corresponding to your PHP target (e.g., `php8.5_*`).

You may also search for stale references:

```
grep -RIn 'your-package-name' ~/.config/pie || true
```

### 2️⃣ Minimal cleanup (recommended first)

Instead of deleting everything, remove only the relevant PHP target directory:

```
rm -rf ~/.config/pie/php8.5_*
```

(Replace with the exact directory shown in your environment.)

### 3️⃣ Full reset (last resort)

If repository state becomes inconsistent and troubleshooting is taking too long, you can completely reset PIE’s configuration:

```
mv ~/.config/pie ~/.config/pie.bak.$(date +%Y%m%d-%H%M%S)
mkdir -p ~/.config/pie
```

This forces PIE to regenerate all configuration and dependency state cleanly.

---

## After Cleanup

Re-register your repository:

```
pie repository:add vcs https://github.com/your/repo
```

Then retry:

```
pie build vendor/package-name
pie install vendor/package-name
```

----

## Why This Happens

PIE internally leverages Composer for dependency resolution and repository handling.
Composer uses lock files and repository metadata that persist across runs.

If:

 * a package version was removed,
 * a Git tag was rewritten,
 * a repository URL changed,
 * or the extension name was modified,

Composer may continue resolving to outdated metadata stored in PIE’s config directory.

 * Manual cleanup ensures that:
 * Composer resolves against fresh remote metadata
 * Old lock state is discarded
 * Target PHP configuration is rebuilt from scratch

---

## Best Practices to Avoid This Situation

 * Always push a proper Git tag before testing via PIE
 * Avoid rewriting tags already used by PIE
 * Keep Composer package names stable
 * Remove unused local path repositories explicitly
 * Run `pie repository:list` to verify active repositories

If you encounter strange dependency resolution behavior, checking ~/.config/pie should be one of the first debugging steps.

---

## License

MIT