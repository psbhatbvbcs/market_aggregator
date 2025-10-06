"""
NFL Team Name Normalization

Maps team names between different formats:
- Mascot names (Chiefs, Jaguars)
- City names (Kansas City, Jacksonville)
- Full names (Kansas City Chiefs)
"""

# NFL team mappings: city -> mascot
NFL_TEAMS = {
    # AFC East
    "buffalo": "bills",
    "miami": "dolphins",
    "new england": "patriots",
    "new york j": "jets",  # Jets (to distinguish from Giants)
    
    # AFC North
    "baltimore": "ravens",
    "cincinnati": "bengals",
    "cleveland": "browns",
    "pittsburgh": "steelers",
    
    # AFC South
    "houston": "texans",
    "indianapolis": "colts",
    "jacksonville": "jaguars",
    "tennessee": "titans",
    
    # AFC West
    "denver": "broncos",
    "kansas city": "chiefs",
    "las vegas": "raiders",
    "los angeles c": "chargers",  # Chargers (to distinguish from Rams)
    
    # NFC East
    "dallas": "cowboys",
    "new york g": "giants",  # Giants (to distinguish from Jets)
    "philadelphia": "eagles",
    "washington": "commanders",
    
    # NFC North
    "chicago": "bears",
    "detroit": "lions",
    "green bay": "packers",
    "minnesota": "vikings",
    
    # NFC South
    "atlanta": "falcons",
    "carolina": "panthers",
    "new orleans": "saints",
    "tampa bay": "buccaneers",
    
    # NFC West
    "arizona": "cardinals",
    "los angeles r": "rams",  # Rams (to distinguish from Chargers)
    "san francisco": "49ers",
    "seattle": "seahawks",
}

# Reverse mapping: mascot -> city
MASCOT_TO_CITY = {mascot: city for city, mascot in NFL_TEAMS.items()}

# Alternative mascot spellings
MASCOT_ALIASES = {
    "bucs": "buccaneers",
    "niners": "49ers",
    "football team": "commanders",  # Old name
}

def normalize_nfl_team_name(team_name: str) -> str:
    """
    Normalize an NFL team name to its canonical mascot form.
    
    Examples:
        "Kansas City" -> "chiefs"
        "Chiefs" -> "chiefs"
        "Kansas City Chiefs" -> "chiefs"
        "Jacksonville" -> "jaguars"
    """
    team_lower = team_name.lower().strip()
    
    # Remove common words
    team_lower = team_lower.replace(" at ", " ")
    team_lower = team_lower.replace(" vs ", " ")
    team_lower = team_lower.replace(" vs. ", " ")
    
    # Check if it's already a mascot name
    if team_lower in MASCOT_TO_CITY:
        return team_lower
    
    # Check aliases
    if team_lower in MASCOT_ALIASES:
        return MASCOT_ALIASES[team_lower]
    
    # Check if it's a city name
    for city, mascot in NFL_TEAMS.items():
        if city in team_lower or team_lower in city:
            return mascot
    
    # Check if mascot is in the string
    for mascot in MASCOT_TO_CITY.keys():
        if mascot in team_lower:
            return mascot
    
    # Return as-is if no match found
    return team_lower

def extract_nfl_teams(title: str) -> list:
    """
    Extract NFL team names from a market title.
    
    Returns normalized mascot names.
    
    Examples:
        "Chiefs vs. Jaguars" -> ["chiefs", "jaguars"]
        "Kansas City at Jacksonville Winner?" -> ["chiefs", "jaguars"]
        "Spread: Jaguars (-3.5)" -> ["jaguars"]
    """
    teams = []
    title_lower = title.lower()
    
    # Try to split by common separators
    if " vs. " in title_lower:
        parts = title_lower.split(" vs. ")
    elif " vs " in title_lower:
        parts = title_lower.split(" vs ")
    elif " at " in title_lower:
        parts = title_lower.split(" at ")
    elif " @ " in title_lower:
        parts = title_lower.split(" @ ")
    else:
        parts = [title_lower]
    
    # Extract team from each part
    for part in parts:
        # Clean up common phrases
        part = part.replace("winner?", "")
        part = part.replace("winner", "")
        part = part.replace("spread:", "")
        part = part.replace("o/u", "")
        part = part.replace("over/under", "")
        part = part.strip()
        
        # Check for city names
        for city, mascot in NFL_TEAMS.items():
            if city in part:
                if mascot not in teams:
                    teams.append(mascot)
                break
        else:
            # Check for mascot names
            for mascot in MASCOT_TO_CITY.keys():
                if mascot in part:
                    if mascot not in teams:
                        teams.append(mascot)
                    break
    
    return teams

def are_same_nfl_teams(teams1: list, teams2: list) -> bool:
    """
    Check if two lists of team names represent the same teams.
    
    Handles different naming formats.
    
    Examples:
        ["chiefs", "jaguars"] vs ["chiefs", "jaguars"] -> True
        ["kansas city", "jacksonville"] vs ["chiefs", "jaguars"] -> True
        ["chiefs", "jaguars"] vs ["bills", "dolphins"] -> False
    """
    if not teams1 or not teams2:
        return False
    
    # Normalize all team names
    normalized1 = {normalize_nfl_team_name(t) for t in teams1}
    normalized2 = {normalize_nfl_team_name(t) for t in teams2}
    
    # Check if sets match
    return normalized1 == normalized2


if __name__ == "__main__":
    # Test the functions
    print("Testing NFL team name normalization:\n")
    
    test_cases = [
        ("Chiefs vs. Jaguars", "Kansas City at Jacksonville Winner?"),
        ("Spread: Jaguars (-3.5)", "Kansas City at Jacksonville Winner?"),
        ("Chiefs vs. Jaguars: O/U 44.5", "Kansas City at Jacksonville Winner?"),
        ("Buffalo at Atlanta Winner?", "Bills vs Falcons"),
    ]
    
    for poly_title, kalshi_title in test_cases:
        poly_teams = extract_nfl_teams(poly_title)
        kalshi_teams = extract_nfl_teams(kalshi_title)
        match = are_same_nfl_teams(poly_teams, kalshi_teams)
        
        print(f"Polymarket: '{poly_title}'")
        print(f"  Teams: {poly_teams}")
        print(f"Kalshi: '{kalshi_title}'")
        print(f"  Teams: {kalshi_teams}")
        print(f"  Match: {'✅ YES' if match else '❌ NO'}")
        print()

