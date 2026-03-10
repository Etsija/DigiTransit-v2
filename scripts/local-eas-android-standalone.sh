#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

detect_total_memory_mb() {
  awk '/MemTotal/ { print int($2 / 1024) }' /proc/meminfo
}

append_opt() {
  local current="${1:-}"
  local addition="${2}"

  if [[ -z "${current}" ]]; then
    printf '%s' "${addition}"
  else
    printf '%s %s' "${current}" "${addition}"
  fi
}

TOTAL_MEMORY_MB="${ANDROID_STANDALONE_TOTAL_MEMORY_MB:-$(detect_total_memory_mb)}"
CPU_COUNT="${ANDROID_STANDALONE_CPU_COUNT:-$(nproc)}"

if (( CPU_COUNT < 1 )); then
  CPU_COUNT=1
fi

if (( TOTAL_MEMORY_MB <= 4096 )); then
  DEFAULT_NODE_HEAP_MB=1024
  DEFAULT_GRADLE_HEAP_MB=1024
  DEFAULT_GRADLE_METASPACE_MB=256
  DEFAULT_GRADLE_WORKERS=1
elif (( TOTAL_MEMORY_MB <= 8192 )); then
  DEFAULT_NODE_HEAP_MB=1536
  DEFAULT_GRADLE_HEAP_MB=1536
  DEFAULT_GRADLE_METASPACE_MB=384
  DEFAULT_GRADLE_WORKERS=1
else
  DEFAULT_NODE_HEAP_MB=2048
  DEFAULT_GRADLE_HEAP_MB=2048
  DEFAULT_GRADLE_METASPACE_MB=512
  DEFAULT_GRADLE_WORKERS=2
fi

if (( CPU_COUNT <= 2 && DEFAULT_GRADLE_WORKERS > CPU_COUNT )); then
  DEFAULT_GRADLE_WORKERS="${CPU_COUNT}"
fi

export NODE_OPTIONS="$(append_opt "${NODE_OPTIONS:-}" "--max-old-space-size=${ANDROID_STANDALONE_NODE_HEAP_MB:-$DEFAULT_NODE_HEAP_MB}")"
export JAVA_TOOL_OPTIONS="$(append_opt "${JAVA_TOOL_OPTIONS:-}" "-Xmx${ANDROID_STANDALONE_GRADLE_HEAP_MB:-$DEFAULT_GRADLE_HEAP_MB}m")"
export JAVA_TOOL_OPTIONS="$(append_opt "${JAVA_TOOL_OPTIONS}" "-XX:MaxMetaspaceSize=${ANDROID_STANDALONE_GRADLE_METASPACE_MB:-$DEFAULT_GRADLE_METASPACE_MB}m")"
export JAVA_TOOL_OPTIONS="$(append_opt "${JAVA_TOOL_OPTIONS}" "-Dfile.encoding=UTF-8")"
export GRADLE_OPTS="$(append_opt "${GRADLE_OPTS:-}" "-Dorg.gradle.workers.max=${ANDROID_STANDALONE_GRADLE_WORKERS:-$DEFAULT_GRADLE_WORKERS}")"
export GRADLE_OPTS="$(append_opt "${GRADLE_OPTS}" "-Dorg.gradle.parallel=false -Dorg.gradle.daemon=false -Dkotlin.compiler.execution.strategy=in-process")"

cd "${ROOT_DIR}"

echo "android:standalone local tuning"
echo "  total memory: ${TOTAL_MEMORY_MB} MB"
echo "  cpu count: ${CPU_COUNT}"
echo "  node heap: ${ANDROID_STANDALONE_NODE_HEAP_MB:-$DEFAULT_NODE_HEAP_MB} MB"
echo "  gradle heap: ${ANDROID_STANDALONE_GRADLE_HEAP_MB:-$DEFAULT_GRADLE_HEAP_MB} MB"
echo "  gradle metaspace: ${ANDROID_STANDALONE_GRADLE_METASPACE_MB:-$DEFAULT_GRADLE_METASPACE_MB} MB"
echo "  gradle workers: ${ANDROID_STANDALONE_GRADLE_WORKERS:-$DEFAULT_GRADLE_WORKERS}"

exec eas build --platform android --profile preview --local
