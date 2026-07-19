# Deferred issue: split generated asset bundles

Split generated unit sprite libraries by unit or chapter. Preserve a single-file offline export as an optional packaging target, but make the development runtime load only the assets required for the current chapter/party.

Do not attempt asset splitting in the v0.48 settlement-remediation branch. The current standalone export remains intentionally offline and self-contained; this issue is the next infrastructure tranche before another major art wave.
