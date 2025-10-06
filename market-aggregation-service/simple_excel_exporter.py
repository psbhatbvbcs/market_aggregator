"""
Simple Excel Exporter for Market Comparisons

Appends data to a single Excel file with one row per market per timestamp.
"""

import pandas as pd
from datetime import datetime
from typing import Dict, Any
import os


class SimpleMarketExporter:
    """Exports market comparison data to separate Excel files (one per market)"""
    
    def __init__(self, base_folder: str = "market_tracking"):
        """
        Initialize exporter
        
        Args:
            base_folder: Folder to store market Excel files
        """
        self.base_folder = base_folder
        self.data_rows = []
        
        # Create folder if it doesn't exist
        if not os.path.exists(base_folder):
            os.makedirs(base_folder)
            print(f"📁 Created folder: {base_folder}")
    
    def add_comparison(
        self,
        market_title: str,
        poly_id: str,
        kalshi_id: str,
        poly_data: Dict[str, Any],
        kalshi_data: Dict[str, Any],
        price_spread: float = None
    ):
        """
        Add a market comparison row
        
        Args:
            market_title: Market title/description
            poly_id: Polymarket condition ID
            kalshi_id: Kalshi event ticker
            poly_data: Polymarket market data (UnifiedMarket.to_dict())
            kalshi_data: Kalshi market data (UnifiedMarket.to_dict())
            price_spread: Optional pre-calculated price spread (if None, will auto-calculate)
        """
        # Extract outcome prices (handle both Yes/No and team names)
        poly_outcomes = poly_data.get('outcomes', [])
        kalshi_outcomes = kalshi_data.get('outcomes', [])
        
        poly_outcome1 = None
        poly_outcome2 = None
        kalshi_outcome1 = None
        kalshi_outcome2 = None
        
        # For Polymarket - try Yes/No first, then use first two outcomes
        for outcome in poly_outcomes:
            if 'yes' in outcome.get('name', '').lower():
                poly_outcome1 = outcome.get('price', 0) * 100
            elif 'no' in outcome.get('name', '').lower():
                poly_outcome2 = outcome.get('price', 0) * 100
        
        if poly_outcome1 is None and len(poly_outcomes) >= 2:
            poly_outcome1 = poly_outcomes[0].get('price', 0) * 100
            poly_outcome2 = poly_outcomes[1].get('price', 0) * 100
        
        # For Kalshi - try Yes/No first, then use first two outcomes
        for outcome in kalshi_outcomes:
            if 'yes' in outcome.get('name', '').lower():
                kalshi_outcome1 = outcome.get('price', 0) * 100
            elif 'no' in outcome.get('name', '').lower():
                kalshi_outcome2 = outcome.get('price', 0) * 100
        
        if kalshi_outcome1 is None and len(kalshi_outcomes) >= 2:
            kalshi_outcome1 = kalshi_outcomes[0].get('price', 0) * 100
            kalshi_outcome2 = kalshi_outcomes[1].get('price', 0) * 100
        
        # Get outcome names for headers
        poly_name1 = poly_outcomes[0].get('name', 'Option 1') if len(poly_outcomes) >= 1 else 'Yes'
        poly_name2 = poly_outcomes[1].get('name', 'Option 2') if len(poly_outcomes) >= 2 else 'No'
        kalshi_name1 = kalshi_outcomes[0].get('name', 'Option 1') if len(kalshi_outcomes) >= 1 else 'Yes'
        kalshi_name2 = kalshi_outcomes[1].get('name', 'Option 2') if len(kalshi_outcomes) >= 2 else 'No'
        
        # Create row
        row = {
            'Timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Market Title': market_title,
            
            # IDs
            'Polymarket ID': poly_id,
            'Kalshi ID': kalshi_id,
            
            # Polymarket Prices (use consistent column names)
            'Poly Outcome 1 (%)': f"{poly_outcome1:.2f}" if poly_outcome1 else 'N/A',
            'Poly Outcome 1 Name': poly_name1,
            'Poly Outcome 2 (%)': f"{poly_outcome2:.2f}" if poly_outcome2 else 'N/A',
            'Poly Outcome 2 Name': poly_name2,
            
            # Kalshi Prices (use consistent column names)
            'Kalshi Outcome 1 (%)': f"{kalshi_outcome1:.2f}" if kalshi_outcome1 else 'N/A',
            'Kalshi Outcome 1 Name': kalshi_name1,
            'Kalshi Outcome 2 (%)': f"{kalshi_outcome2:.2f}" if kalshi_outcome2 else 'N/A',
            'Kalshi Outcome 2 Name': kalshi_name2,
            
            # Polymarket Volume & Liquidity
            'Poly Volume': poly_data.get('total_volume', 0) or 0,
            'Poly Liquidity': poly_data.get('liquidity', 0) or 0,
            
            # Kalshi Volume & Liquidity
            'Kalshi Volume': kalshi_data.get('total_volume', 0) or 0,
            'Kalshi Liquidity': kalshi_data.get('liquidity', 0) or 0,
            
            # Price Spread (use pre-calculated if provided, otherwise auto-calculate)
            'Price Spread (%)': (
                f"{price_spread:.2f}" if price_spread is not None 
                else f"{abs((poly_outcome1 or 0) - (kalshi_outcome1 or 0)):.2f}" if poly_outcome1 and kalshi_outcome1 
                else 'N/A'
            ),
        }
        
        # Store poly_id with the row for grouping
        row['_poly_id'] = poly_id
        row['_market_title'] = market_title
        self.data_rows.append(row)
    
    def export(self) -> list:
        """
        Export data to separate Excel files (one per market)
        
        Returns:
            List of created file paths
        """
        if not self.data_rows:
            print("⚠️  No data to export")
            return []
        
        # Group rows by market (poly_id)
        markets_data = {}
        for row in self.data_rows:
            poly_id = row['_poly_id']
            market_title = row['_market_title']
            
            if poly_id not in markets_data:
                markets_data[poly_id] = {
                    'title': market_title,
                    'rows': []
                }
            
            # Remove internal fields before adding
            clean_row = {k: v for k, v in row.items() if not k.startswith('_')}
            markets_data[poly_id]['rows'].append(clean_row)
        
        # Export each market to its own file
        created_files = []
        
        for poly_id, data in markets_data.items():
            # Create safe filename from market title
            safe_title = data['title'][:50].replace('/', '-').replace('\\', '-').replace('?', '').replace('*', '').replace(':', '')
            filename = f"{self.base_folder}/{safe_title}.xlsx"
            
            # Create DataFrame from rows for this market
            new_df = pd.DataFrame(data['rows'])
            
            # Check if file exists for this market
            if os.path.exists(filename):
                # Read existing data
                try:
                    existing_df = pd.read_excel(filename)
                    # Remove any existing separator rows
                    existing_df = existing_df[existing_df['Market Title'] != '---']
                    # Remove any blank rows
                    existing_df = existing_df.dropna(how='all')
                    # Append new data
                    combined_df = pd.concat([existing_df, new_df], ignore_index=True)
                except Exception as e:
                    combined_df = new_df
            else:
                combined_df = new_df
            
            # Add ONE separator row at the very end
            separator_row = {}
            for col in combined_df.columns:
                if col in ['Timestamp', 'Market Title', 'Polymarket ID', 'Kalshi ID']:
                    separator_row[col] = '---'
                elif '(%)' in col or 'Name' in col:
                    separator_row[col] = '---'
                else:
                    separator_row[col] = 0
            combined_df = pd.concat([combined_df, pd.DataFrame([separator_row])], ignore_index=True)
            
            # Write to Excel
            combined_df.to_excel(filename, index=False, engine='openpyxl')
            
            created_files.append(filename)
        
        # Print summary
        print(f"✅ Exported {len(markets_data)} market(s) to separate Excel files")
        for filename in created_files:
            print(f"   📁 {filename}")
        
        # Clear rows after export
        self.data_rows = []
        
        return created_files


if __name__ == "__main__":
    # Test the exporter
    print("Testing Simple Excel Exporter...\n")
    
    # Create test file
    test_file = "test_tracking.xlsx"
    
    exporter = SimpleMarketExporter(test_file)
    
    # Test data
    poly_data = {
        "outcomes": [
            {"name": "Yes", "price": 0.054},
            {"name": "No", "price": 0.946}
        ],
        "total_volume": 2275,
        "liquidity": 1555,
    }
    
    kalshi_data = {
        "outcomes": [
            {"name": "Yes", "price": 0.02},
            {"name": "No", "price": 0.98}
        ],
        "total_volume": 5559,
        "liquidity": 2877,
    }
    
    # Add first entry
    exporter.add_comparison(
        "Test Market - Will something happen?",
        "0xtest123",
        "KXTEST-26JAN01",
        poly_data,
        kalshi_data
    )
    
    exporter.export()
    
    print("\n--- Adding another entry (should append) ---\n")
    
    # Add second entry (simulate next iteration)
    exporter2 = SimpleMarketExporter(test_file)
    
    poly_data2 = {
        "outcomes": [
            {"name": "Yes", "price": 0.055},  # Price changed
            {"name": "No", "price": 0.945}
        ],
        "total_volume": 2280,  # Volume increased
        "liquidity": 1560,
    }
    
    exporter2.add_comparison(
        "Test Market - Will something happen?",
        "0xtest123",
        "KXTEST-26JAN01",
        poly_data2,
        kalshi_data
    )
    
    exporter2.export()
    
    # Read and display
    print("\n--- Final file content ---\n")
    df = pd.read_excel(test_file)
    print(df.to_string())
    
    # Cleanup
    if os.path.exists(test_file):
        os.remove(test_file)
        print("\n✅ Test complete and cleaned up!")

