# ===== Rust build wiring =====
RUST_DIR = $(top_srcdir)/..
RUST_TARGET_DIR = $(RUST_DIR)/target

RUST_PROFILE    = release
RUST_CARGO_FLAG = --release

# Cargo output on Linux
RUST_DYLIB      = $(RUST_TARGET_DIR)/$(RUST_PROFILE)/libhello_rust.so

# Where phpize expects extension artifacts
RUST_OUT_SO     = $(top_builddir)/modules/hello_rust.so

# If we are installing, skip rebuilding (GNU make accumulates prerequisites, so install-modules
# may still depend on build-modules even if you override the recipe).
INSTALL_GOAL    = $(filter install install-modules,$(MAKECMDGOALS))
SKIP_RUST_BUILD = $(if $(INSTALL_GOAL),1,0)

# Make sure a plain `make` builds modules (phpize default may be a no-op when there are no C sources)
all: build-modules

# Build Rust into ./modules/hello.so when modules are being built
build-modules: rust-build

rust-build:
	@/bin/bash -lc '\
	  if [ "$(SKIP_RUST_BUILD)" = "1" ]; then \
	    if [ -f "$(RUST_OUT_SO)" ]; then \
	      echo "==> Skipping Rust build (already built): $(RUST_OUT_SO)"; \
	      exit 0; \
	    else \
	      echo "ERROR: $(RUST_OUT_SO) not found."; \
	      echo "Hint: run '\''make'\'' (without sudo) first, then '\''sudo make install'\''."; \
	      exit 1; \
	    fi; \
	  fi; \
	  echo "==> Building Rust extension with cargo ($(RUST_PROFILE))"; \
	  cd "$(RUST_DIR)" && RUSTC="$(RUSTC)" "$(CARGO)" build $(RUST_CARGO_FLAG); \
	  if [ ! -f "$(RUST_DYLIB)" ]; then \
	    echo "ERROR: built library not found: $(RUST_DYLIB)"; \
	    exit 1; \
	  fi; \
	  cp -f "$(RUST_DYLIB)" "$(RUST_OUT_SO)"; \
	  echo "==> Built: $(RUST_OUT_SO)" \
	'
# ===== Optional: keep your overridden install recipe (fine to keep, but not strictly required) =====
check-rust-artifact:
	@if [ ! -f "$(RUST_OUT_SO)" ]; then \
	  echo "ERROR: $(RUST_OUT_SO) not found."; \
	  echo "Hint: run 'make' (without sudo) first, then 'sudo make install'."; \
	  exit 1; \
	fi

install-modules: check-rust-artifact
	@test -d modules && \
	$(mkinstalldirs) $(INSTALL_ROOT)$(EXTENSION_DIR)
	@echo "Installing shared extensions:     $(INSTALL_ROOT)$(EXTENSION_DIR)/"
	@rm -f modules/*.la >/dev/null 2>&1
	@$(INSTALL) modules/* $(INSTALL_ROOT)$(EXTENSION_DIR)

# Important: do NOT depend on 'all' here (avoid rebuild by default install dependency chains)
install: install-modules install-headers
	@echo "Build complete."
	@echo "Don't forget to run 'make test'."
