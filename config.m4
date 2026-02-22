PHP_ARG_ENABLE([hello], [whether to enable hello],
  [AS_HELP_STRING([--enable-hello], [Enable hello extension (Rust via ext-php-rs)])],
  [no])

if test "$PHP_HELLO" != "no"; then
  AC_PATH_PROG([CARGO], [cargo], [])
  if test -z "$CARGO"; then
    AC_MSG_ERROR([cargo not found. Please install Rust toolchain (cargo).])
  fi

  dnl Prefer real toolchain binaries to avoid sudo/root rustup issues.
  AC_PATH_PROG([RUSTUP], [rustup], [])
  if test -n "$RUSTUP"; then
    CARGO_REAL=`$RUSTUP which cargo 2>/dev/null`
    if test -n "$CARGO_REAL"; then
      CARGO="$CARGO_REAL"
    fi

    RUSTC_REAL=`$RUSTUP which rustc 2>/dev/null`
    if test -n "$RUSTC_REAL"; then
      RUSTC="$RUSTC_REAL"
    fi
  fi

  dnl Fallback: find rustc on PATH (useful if not using rustup)
  if test -z "$RUSTC"; then
    AC_PATH_PROG([RUSTC], [rustc], [])
  fi

  if test -z "$RUSTC"; then
    AC_MSG_ERROR([rustc not found. Please install Rust toolchain (rustc).])
  fi

  PHP_SUBST([CARGO])
  PHP_SUBST([RUSTC])
  PHP_ADD_MAKEFILE_FRAGMENT([$srcdir/Makefile.frag])
fi
