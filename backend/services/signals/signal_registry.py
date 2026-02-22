"""
Phase 13 — Signal Registry
---------------------------
Central registry of all allowed signals. Validates category on import.
Extension point: add new SignalDefinition to signal_definitions.py only.
"""
from .signal_definitions import SIGNAL_DEFINITIONS, SIGNAL_IDS_ORDERED
from .signal_schemas     import ALLOWED_CATEGORIES

# Hard validation on import — fails loudly if any definition uses a bad category
for _sid, _defn in SIGNAL_DEFINITIONS.items():
    assert _defn.category in ALLOWED_CATEGORIES, (
        f"Signal '{_sid}' uses forbidden category '{_defn.category}'. "
        f"Allowed: {ALLOWED_CATEGORIES}"
    )


def get_definition(signal_id: str):
    """Returns SignalDefinition or None."""
    return SIGNAL_DEFINITIONS.get(signal_id)


def all_signal_ids() -> list[str]:
    return SIGNAL_IDS_ORDERED


def all_definitions():
    return [SIGNAL_DEFINITIONS[sid] for sid in SIGNAL_IDS_ORDERED]
