import json
import random

# Real base stars
stars = [
  {
    "id": "sirius-a",
    "name": "Sirius A",
    "constellation": "Alpha Canis Majoris",
    "ra": 101.287,
    "dec": -16.716,
    "apparent_mag": -1.46,
    "absolute_mag": 1.43,
    "distance_ly": 8.60,
    "temp_k": 9940,
    "spectral_class": "A1V"
  },
  {
    "id": "betelgeuse",
    "name": "Betelgeuse",
    "constellation": "Alpha Orionis",
    "ra": 88.793,
    "dec": 7.407,
    "apparent_mag": 0.42,
    "absolute_mag": -5.85,
    "distance_ly": 642.5,
    "temp_k": 3500,
    "spectral_class": "M1-M2Ia-ab"
  },
  {
    "id": "rigel",
    "name": "Rigel",
    "constellation": "Beta Orionis",
    "ra": 78.634,
    "dec": -8.201,
    "apparent_mag": 0.18,
    "absolute_mag": -7.92,
    "distance_ly": 860.0,
    "temp_k": 12100,
    "spectral_class": "B8Iab"
  },
  {
    "id": "procyon",
    "name": "Procyon",
    "constellation": "Alpha Canis Minoris",
    "ra": 114.825,
    "dec": 5.225,
    "apparent_mag": 0.34,
    "absolute_mag": 2.66,
    "distance_ly": 11.40,
    "temp_k": 6530,
    "spectral_class": "F5IV-V"
  },
  {
    "id": "capella",
    "name": "Capella",
    "constellation": "Alpha Aurigae",
    "ra": 79.172,
    "dec": 45.998,
    "apparent_mag": 0.08,
    "absolute_mag": -0.48,
    "distance_ly": 42.9,
    "temp_k": 4970,
    "spectral_class": "G3III"
  }
]

# Generate additional random stars to populate the sky
spectral_classes = ["O5V", "B2V", "A0V", "F2V", "G2V", "K5V", "M4V", "M2I"]
constellations = ["Ursa Major", "Cassiopeia", "Cygnus", "Lyra", "Scorpius", "Centaurus", "Crux", "Carina"]

for i in range(1, 100):
    stars.append({
        "id": f"star-{i}",
        "name": f"HD {random.randint(1000, 99999)}",
        "constellation": random.choice(constellations),
        "ra": random.uniform(0, 360),
        "dec": random.uniform(-90, 90),
        "apparent_mag": round(random.uniform(0.0, 6.0), 2),
        "absolute_mag": round(random.uniform(-5.0, 10.0), 2),
        "distance_ly": round(random.uniform(4.0, 2000.0), 1),
        "temp_k": random.randint(3000, 25000),
        "spectral_class": random.choice(spectral_classes)
    })

with open('src/data/stars.json', 'w') as f:
    json.dump(stars, f, indent=2)

print("Generated 100+ stars.")
