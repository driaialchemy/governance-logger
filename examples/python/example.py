"""Example usage of the Python governance logger."""

from governance_logger import log_success, log_error

AGENT_ID = "example-agent"


def main() -> None:
    print("Starting example agent...")
    try:
        result = {"itemsProcessed": 42, "status": "success"}
        if log_success(AGENT_ID, "Example agent completed successfully", result):
            print("Activity logged successfully")
        else:
            print("Failed to log activity (governor may be offline)")
    except Exception as exc:
        log_error(AGENT_ID, str(exc))
        raise


if __name__ == "__main__":
    main()
