from datetime import datetime


def calculate_worked_time(check_in, check_out=None, now=None):
    """
    Calculates total worked time.
    Returns tuple: (formatted string, total seconds)
    """
    if not check_in:
        return "0h 0m", 0

    end_time = check_out or now or datetime.now(check_in.tzinfo)
    total_seconds = int((end_time - check_in).total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    return f"{hours}h {minutes}m", total_seconds


def calculate_effective_time(check_in, break_minutes=0, check_out=None, now=None):
    """
    Calculates effective work time after subtracting break time.
    Returns dict: {'formatted': 'Xh Xm', 'seconds': Y}
    """
    if not check_in:
        return {"formatted": "0h 0m", "seconds": 0}

    end_time = check_out or now or datetime.now(check_in.tzinfo)
    total_seconds = int((end_time - check_in).total_seconds())
    effective_seconds = max(total_seconds - (break_minutes * 60), 0)
    hours = effective_seconds // 3600
    minutes = (effective_seconds % 3600) // 60
    return {
        "formatted": f"{hours}h {minutes}m",
        "seconds": effective_seconds
    }
