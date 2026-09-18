# Decision lineage schema (canonical)

Shared P1 fields for a single decision. New fields are optional; omit or set `null` when unknown. Do not coerce mismatched producer values.

## Shape

| Field | Type | Rules |
| --- | --- | --- |
| `reasoning_path` | `string[]` \| `null` | Ordered steps that produced the decision. Empty array means “no steps recorded”; `null` means “not supplied”. |
| `policy_matched` | `string` \| `null` | Policy id **or** name. One string, not an object. `null` when no policy applied. |
| `confidence` | `number` \| `null` | Float in **0.0–1.0** inclusive. Not `0–100`. Not an integer scale. |

```json
{
  "reasoning_path": ["normalize_category", "lookup_rule", "check_daily_limit"],
  "policy_matched": "meals.daily_limit",
  "confidence": 0.85
}
```

## Consumers

These repos emit the field names above:

- `expense-verification-pipeline` — `src/expense_pipeline/audit.py` (`log_decision`)
- `contractriskreviewpipeline` — `src/orchestrator/state.py` (`RiskFlag`) and `src/agents/risk.py`
- `agentstack` — `governance/audit_logger.py` and `evidence/audit_evidence_report.py`

## Mismatch (not coerced)

Writers in `expense-verification-pipeline`, `contractriskreviewpipeline`, and `agentstack` now emit the policy **id** as a string. Historical object-shaped records are not migrated. Look up display names from the policy/playbook source by that id.
