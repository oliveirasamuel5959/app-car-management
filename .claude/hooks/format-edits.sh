#!/usr/bin/env bash
jq -r '.tool_input.file_path' | xargs ruff format