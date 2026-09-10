#!/usr/bin/env sh

# Minimal Maven wrapper entrypoint.
# If Maven Wrapper is not bootstrapped, fall back to `mvn` when available.
if command -v mvn >/dev/null 2>&1; then
  exec mvn "$@"
fi

echo "mvn not found on PATH. Install Maven or generate the official Maven Wrapper files."
exit 1
