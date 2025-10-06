"""
Sports Configuration - Platform-specific filters for different sports

Add your sport configurations here to easily compare across platforms.
"""

# Sport configurations for each platform
SPORTS_CONFIG = {
    "NFL": {
        "polymarket": {
            "tag_id": 450,
            "start_date_min": "2025-08-07T00:00:00Z",  # 2025 NFL season
            "enabled": True
        },
        "kalshi": {
            "series_ticker": "KXNFLGAME",
            "enabled": True
        },
        "limitless": {
            "enabled": False  # Not available for NFL
        }
    },
    
    # Add more sports below as you discover their filters
    "NBA": {
        "polymarket": {
            "tag_id": None,  # Fill in when you know it
            "enabled": True
        },
        "kalshi": {
            "series_ticker": None,  # Fill in when you know it
            "enabled": False
        },
        "limitless": {
            "enabled": False
        }
    },
    
    "MLB": {
        "polymarket": {
            "tag_id": None,  # Fill in when you know it
            "enabled": True
        },
        "kalshi": {
            "series_ticker": None,  # Fill in when you know it
            "enabled": False
        },
        "limitless": {
            "enabled": False
        }
    },
    
    "POLITICS": {
        "polymarket": {
            "tag_id": None,  # Fill in when you know it
            "enabled": True
        },
        "kalshi": {
            "series_ticker": None,  # Fill in when you know it
            "enabled": True
        },
        "limitless": {
            "chain_id": 2,  # Base chain
            "enabled": True
        }
    }
}


def get_sport_config(sport_name: str) -> dict:
    """Get configuration for a specific sport"""
    return SPORTS_CONFIG.get(sport_name.upper(), {})


def list_available_sports():
    """List all configured sports"""
    return list(SPORTS_CONFIG.keys())


def is_platform_enabled(sport_name: str, platform: str) -> bool:
    """Check if a platform is enabled for a sport"""
    config = get_sport_config(sport_name)
    if not config:
        return False
    
    platform_config = config.get(platform.lower(), {})
    return platform_config.get("enabled", False)

