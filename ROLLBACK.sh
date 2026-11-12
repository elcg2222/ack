#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec "${PYTHON:-python}" "$HERE/rollback.py" "${1:?source or rollback fixture required}"
