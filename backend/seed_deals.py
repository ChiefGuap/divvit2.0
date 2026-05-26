import asyncio
import hashlib
import os
import sys
from datetime import datetime, timezone
from supabase import create_client

# ─── Load Environment Variables ───
url = os.environ.get("EXPO_PUBLIC_SUPABASE_URL", "https://betgivqfeccgjoblxspu.supabase.co")
key = os.environ.get("EXPO_PUBLIC_SUPABASE_ANON_KEY", "")

if not key:
    print("Error: EXPO_PUBLIC_SUPABASE_ANON_KEY is not set.")
    sys.exit(1)

client = create_client(url, key)

# ─── Seed Data ───
DEALS_TO_SEED = [
    {
        "restaurant": "McDonald's",
        "title": "BOGO Free Big Mac",
        "description": "Buy one Big Mac and get another one absolutely free. Exclusive to mobile app orders at participating locations.",
        "badge": "App Only",
        "deal_type": "bogo",
        "source": "https://mcdonalds.com"
    },
    {
        "restaurant": "Taco Bell",
        "title": "Free Chalupa Cravings Box",
        "description": "Get a free Chalupa Cravings Box containing a Chalupa Supreme, Beefy 5-Layer Burrito, Crunchy Taco, Cinnamon Twists, and a medium drink when you join Taco Bell Rewards.",
        "badge": "New Users",
        "deal_type": "free_item",
        "source": "https://tacobell.com"
    },
    {
        "restaurant": "Domino's",
        "title": "50% Off All Pizzas",
        "description": "Get 50% off all menu-priced pizzas ordered online. Works on all crusts and toppings!",
        "badge": "Limited Time",
        "deal_type": "discount",
        "source": "https://dominos.com"
    },
    {
        "restaurant": "Burger King",
        "title": "Free King Jr. Meal with $1+ Purchase",
        "description": "Spend $1 or more on the BK app and get a free Kids Meal (King Jr. Meal) added to your order.",
        "badge": "App Exclusive",
        "deal_type": "free_item",
        "source": "https://bk.com"
    },
    {
        "restaurant": "Starbucks",
        "title": "BOGO Handcrafted Drinks",
        "description": "Buy any handcrafted beverage size Grande or larger, get one of equal or lesser value free between 2 PM and 6 PM.",
        "badge": "Thursday Only",
        "deal_type": "bogo",
        "source": "https://starbucks.com"
    },
    {
        "restaurant": "Subway",
        "title": "Buy 1 Footlong, Get 1 Free",
        "description": "Buy any Footlong sub in the app or online and get one free. Use promo code FREEFL at checkout.",
        "badge": "Promo Code",
        "deal_type": "bogo",
        "source": "https://subway.com"
    },
    {
        "restaurant": "Chipotle",
        "title": "Free Chips & Guacamole",
        "description": "Get free fresh chips and guacamole after your first purchase as a Chipotle Rewards member.",
        "badge": "Rewards",
        "deal_type": "free_item",
        "source": "https://chipotle.com"
    },
    {
        "restaurant": "Wendy's",
        "title": "Free 10pc Nuggets with Order",
        "description": "Get a free 10-piece chicken nuggets (crispy or spicy) with any mobile app purchase.",
        "badge": "App Exclusive",
        "deal_type": "free_item",
        "source": "https://wendys.com"
    },
    {
        "restaurant": "Pizza Hut",
        "title": "Large 1-Topping Pizza for $9.99",
        "description": "Order online to get a large 1-topping Hand-Tossed or Thin 'N Crispy pizza for just $9.99.",
        "badge": "Online Only",
        "deal_type": "discount",
        "source": "https://pizzahut.com"
    },
    {
        "restaurant": "Popeyes",
        "title": "Free 2pc Chicken with $10 Spend",
        "description": "Get 2 pieces of signature bone-in chicken free when you spend $10 or more in the Popeyes app.",
        "badge": "App Exclusive",
        "deal_type": "free_item",
        "source": "https://popeyes.com"
    },
    {
        "restaurant": "Dunkin'",
        "title": "Free Coffee on Wednesdays",
        "description": "Dunkin' Rewards members get a free medium hot or iced coffee with any purchase every Wednesday.",
        "badge": "Rewards",
        "deal_type": "free_item",
        "source": "https://dunkindonuts.com"
    },
    {
        "restaurant": "Sonic",
        "title": "Half-Price Drinks & Slushes",
        "description": "Get half-price drinks and slushes all day when ordering through the Sonic mobile app.",
        "badge": "Happy Hour",
        "deal_type": "discount",
        "source": "https://sonicdrivein.com"
    }
]

async def seed():
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    
    for deal in DEALS_TO_SEED:
        id_seed = f"{deal['restaurant']}-{deal['title']}".lower()
        deal_id = hashlib.md5(id_seed.encode()).hexdigest()[:12]
        
        rows.append({
            "id": deal_id,
            "restaurant_name": deal["restaurant"],
            "title": deal["title"],
            "description": deal["description"],
            "badge_text": deal["badge"],
            "deal_type": deal["deal_type"],
            "source_url": deal["source"],
            "is_national": True,
            "is_active": True,
            "scraped_at": now,
        })
        
    print(f"Upserting {len(rows)} premium food deals to Supabase...")
    try:
        res = client.table("promotions").upsert(rows, on_conflict="id").execute()
        print("Success! seeded database.")
    except Exception as e:
        print(f"Error seeding database: {e}")

if __name__ == "__main__":
    asyncio.run(seed())
