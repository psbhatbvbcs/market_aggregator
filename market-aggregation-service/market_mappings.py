"""
Manual Market Mappings Configuration

For markets where algorithmic matching is unreliable (different wording across platforms),
you can manually map them here by market ID.

Format:
{
    "category_name": [
        {
            "polymarket_id": "condition_id_from_polymarket",
            "kalshi_id": "ticker_from_kalshi",  # Optional
            "description": "Human-readable description"
        }
    ]
}
"""

MANUAL_MAPPINGS = {
    # Politics Markets
    "politics": [
        # Add your politics market mappings here
        # Example:
        # {
        #     "polymarket_id": "0x1234abcd...",
        #     "kalshi_id": "KXPRES-2024-ABC",
        #     "description": "2024 Presidential Election Winner"
        # },
        {
            "polymarket_id": "0x576ddfc4a6f4641d33af22a70c5c533f6ff52d1b0bf3bf127ebdc30c7f573b85",
            "kalshi_id": "KXXIVISITUSA-26JAN01",
            "description": "Will XI visit the USA in 2025?"
        },
        # Where will Putin and Zelenskyy meet next? (Multiple location markets)
        {
            "polymarket_id": "0x18f7637335809af5c5fdc9f3158207bc06a63fbb71fe35d8a7e812142f91f701",
            "kalshi_id": "KXPUTINZELENSKYYLOCATION-28-RUS",
            "description": "Putin-Zelenskyy meeting location: Russia"
        },
        {
            "polymarket_id": "0x715eb6357edc59dc38d9f7da929e63be58fa4d3b7bd1415d7950a60bd4317827",
            "kalshi_id": "KXPUTINZELENSKYYLOCATION-28-TUR",
            "description": "Putin-Zelenskyy meeting location: Turkey"
        },
        {
            "polymarket_id": "0x68f3f79ee22ffd2e212bd9f1e1491baf15501e4186782702dfa646c10465720a",
            "kalshi_id": "KXPUTINZELENSKYYLOCATION-28-UKR",
            "description": "Putin-Zelenskyy meeting location: Ukraine"
        },
        {
            "polymarket_id": "0xca1aa5189411c86afb30b84dd76ae8ad3fbdc0b07c74c4180bcae7da1b2d1861",
            "kalshi_id": "KXPUTINZELENSKYYLOCATION-28-CHI",
            "description": "Putin-Zelenskyy meeting location: China"
        },
        {
            "polymarket_id": "0xb4cf7ea4502155f89905021917d22b26b01867582abdc6104995517465c57d91",
            "kalshi_id": "KXPUTINZELENSKYYLOCATION-28-UNI",
            "description": "Putin-Zelenskyy meeting location: United States"
        },
        {
            "polymarket_id": "0xcff999e258f449a28ba7e6985a822abbfbbe07b846b477beaf1f68ea469cec4c",
            "kalshi_id": "KXPUTINZELENSKYYLOCATION-28-HUNG",
            "description": "Putin-Zelenskyy meeting location: Hungary"
        }
    ],
    
    # NFL Markets (if needed for specific games)
    "nfl": [
        # Example:
        # {
        #     "polymarket_id": "0xabcd1234...",
        #     "kalshi_id": "KXNFLGAME-25OCT06KCJAC-KC",
        #     "description": "Chiefs vs Jaguars - Chiefs to Win"
        # },
    ],
    
    # NBA Markets
    "nba": [
        # Add NBA market mappings
    ],
    
    # Other categories as needed
    "crypto": [
        {
            "polymarket_id": "0xf7f69e2e5cd511b21bb295c6deabffbf60da452b8bfbb1fd51c652f1ef5ef1e7",
            "kalshi_id": "KXBTC-100K-31DEC25", # This is still an invalid ID, Kalshi will be null
            "limitless_id": "us-national-solana-reserve-in-2025-1748943996289", # Correct slug
            "description": "US national Solana reserve in 2025?"
        }
    ],
}


def get_manual_mappings(category: str = None) -> dict:
    """
    Get manual market mappings for a specific category or all categories.
    
    Args:
        category: Optional category name. If None, returns all mappings.
    
    Returns:
        Dictionary of manual mappings
    """
    if category:
        return MANUAL_MAPPINGS.get(category.lower(), [])
    return MANUAL_MAPPINGS


def find_matching_market_ids(platform: str, market_id: str, category: str = None) -> dict:
    """
    Find matching market IDs on other platforms for a given market.
    
    Args:
        platform: Source platform ("polymarket" or "kalshi")
        market_id: Market ID on the source platform
        category: Optional category to search in
    
    Returns:
        Dictionary with matching market IDs on other platforms
        Example: {"kalshi_id": "KXPRES-2024-ABC"}
    """
    result = {"polymarket_id": None, "kalshi_id": None}
    
    # Search in specified category or all categories
    categories_to_search = [category] if category else MANUAL_MAPPINGS.keys()
    
    for cat in categories_to_search:
        mappings = MANUAL_MAPPINGS.get(cat, [])
        for mapping in mappings:
            # Check if this mapping contains our market
            if mapping.get(f"{platform}_id") == market_id:
                # Found it! Return all mapped IDs
                result["polymarket_id"] = mapping.get("polymarket_id")
                result["kalshi_id"] = mapping.get("kalshi_id")
                return result
    
    return result


def get_all_mappings_for_category(category: str) -> list:
    """Get all manual mappings for a specific category"""
    return MANUAL_MAPPINGS.get(category.lower(), [])


def add_mapping(category: str, polymarket_id: str = None, kalshi_id: str = None, 
                description: str = ""):
    """
    Helper function to add a new mapping (for interactive use)
    
    Note: This only modifies the in-memory mapping, not the file.
    To persist, you need to manually edit market_mappings.py
    """
    if category not in MANUAL_MAPPINGS:
        MANUAL_MAPPINGS[category] = []
    
    mapping = {
        "polymarket_id": polymarket_id,
        "kalshi_id": kalshi_id,
        "description": description
    }
    
    # Remove None values
    mapping = {k: v for k, v in mapping.items() if v is not None}
    
    MANUAL_MAPPINGS[category].append(mapping)
    
    print(f"✅ Added mapping to category '{category}':")
    print(f"   {mapping}")
    print("\n⚠️  This is only in memory. To persist, add this to market_mappings.py:")
    print(f"   {mapping},")


if __name__ == "__main__":
    # Test the functions
    print("Manual Market Mappings\n")
    
    for category, mappings in MANUAL_MAPPINGS.items():
        print(f"{category.upper()}:")
        if mappings:
            for i, mapping in enumerate(mappings, 1):
                print(f"  {i}. {mapping.get('description', 'No description')}")
                if mapping.get('polymarket_id'):
                    print(f"     Polymarket: {mapping['polymarket_id']}")
                if mapping.get('kalshi_id'):
                    print(f"     Kalshi: {mapping['kalshi_id']}")
                print()
        else:
            print("  (No mappings configured yet)\n")

