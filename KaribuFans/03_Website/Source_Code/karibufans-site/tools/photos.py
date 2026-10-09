#!/usr/bin/env python3
"""Build the KaribuFans photo set from the Unsplash masters.

Reads the masters in KaribuFans/03_Website/Photos/unsplash/, crops them
according to the CROPS table below, and writes:

  static/img/photos/<id>-<w>.webp       landscape / tile crop
  static/img/photos/<id>-m-<w>.webp     4:5 phone crop (heroes only)
  static/img/photos/share-1200x630.jpg  social share card
  static/img/photos/ex-<type>-<n>-<w>.webp  example photos of a TYPE of place
                                        (2:1, the listing card's drawing band)
  data/photos.json                      manifest used by the templates

Example photos (EXAMPLES below, masters in Photos/examples/) are a trial the
owner asked for: an unclaimed listing card may show a stock photo of its type
of place, always labelled "Example photo, not of this place". They are
credited by hand (Pexels or Unsplash), never Nairobi unless they visibly are.

Run from anywhere:  python3 tools/photos.py
Needs Pillow (with WebP). Output is deterministic: the same masters and the
same table give byte-identical files. All metadata (EXIF, GPS, XMP, ICC) is
dropped; pixels are converted to sRGB first.

Crop notation (all values are fractions of the master's width/height):
  ("box", x0, y0, x1)   left, top, right edge; the bottom follows from the
                        output ratio. Used where a brand or sign must stay out.
  ("fit", cx, cy)       the largest crop of the output ratio, centred as near
                        to (cx, cy) as the frame allows.
  ("fit", cx, cy, z)    as above, zoomed in by z (z=1.25 keeps 80% of the size).
Optional "redact": list of (x0, y0, x1, y1) boxes blurred before cropping
(small signs, logos and number plates that a crop cannot avoid). The blur
is feathered so it reads as soft focus rather than a box.
"""
import io
import json
import os
import sys

from PIL import Image, ImageCms, ImageDraw, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = None

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
MASTERS = os.path.normpath(os.path.join(SITE, "..", "..", "Photos", "unsplash"))
EX_MASTERS = os.path.normpath(os.path.join(SITE, "..", "..", "Photos", "examples"))
OUT_DIR = os.path.join(SITE, "static", "img", "photos")
MANIFEST = os.path.join(SITE, "data", "photos.json")

HERO_W = [800, 1400, 2200]
HERO_M_W = [600, 1000]
TILE_W = [600, 1200]
EX_W = [400, 800]
HERO_Q = 78
TILE_Q = 74
BUDGET = {"hero": 450 * 1024, "tile": 250 * 1024}

RATIOS = {"16:9": 16 / 9, "3:2": 3 / 2, "4:5": 4 / 5, "1:1": 1.0, "2:1": 2.0}

# id: master, kind, ratio + crop (landscape/tile), m crop (hero phone 4:5),
#     focus (object-position for the main crop), alt, optional q / m_q / redact.
CROPS = {
    # ---------------------------------------------------------------- heroes
    "home-skyline": dict(
        src="amani-nation-LTh5pGyvKAM-unsplash.jpg", kind="hero",
        # Softened (a crop above them leaves the towers floating in sky): two
        # bank logos at the foot of the towers, a building-name sign, a sale
        # banner and three roadside billboards. Each is under ~50px at 2200w.
        ratio="16:9", crop=("fit", 0.5, 0.42), m=("fit", 0.5, 0.5),
        redact=[(0.4900, 0.6100, 0.5010, 0.6310), (0.598, 0.656, 0.607, 0.667),
                (0.219, 0.620, 0.246, 0.631), (0.4205, 0.7105, 0.4405, 0.7220),
                (0.606, 0.700, 0.622, 0.712), (0.829, 0.779, 0.852, 0.832),
                (0.887, 0.846, 0.911, 0.890)],
        focus="50% 55%",
        alt="Nairobi skyline at golden hour, tall towers rising above a band of green trees"),
    "kicc-rooftops": dict(
        src="joecalih-1Uwcoo-ttjY-unsplash.jpg", kind="hero",
        # keeps out a supermarket sign (right), a billboard (bottom right)
        # and a shop sign (left); three small wall signs painted out. Not KICC: the tower is a striped office block.
        ratio="16:9", crop=("box", 0.15, 0.10, 0.765), m=("box", 0.27, 0.02, 0.765),
        redact=[(0.314, 0.531, 0.331, 0.546), (0.243, 0.598, 0.264, 0.610),
                (0.329, 0.600, 0.346, 0.616)],
        focus="55% 60%",
        alt="A striped, twin-towered office building with a tall red mast above the rooftops of a sprawling city"),
    "sunset-rooftops": dict(
        src="stephen-berenju-UtH04tBFzTo-unsplash.jpg", kind="hero",
        ratio="16:9", crop=("fit", 0.5, 0.48), m=("fit", 0.5, 0.5),
        focus="50% 55%",
        alt="An orange sun setting over the silhouetted rooftops and trees of a city suburb"),
    "shared-table": dict(
        src="stefan-vladimirov-Q_Moi2xjieU-unsplash.jpg", kind="hero",
        ratio="16:9", crop=("fit", 0.5, 0.45), m=("fit", 0.62, 0.5),
        focus="60% 50%",
        alt="Overhead view of a wooden table set with plates of roast meat, potatoes, salads and bread shared by friends"),
    "light-trails": dict(
        src="richard-horne-AwkDru_0tQw-unsplash.jpg", kind="hero",
        # left edge at 22% keeps the motorway direction sign out of frame
        ratio="16:9", crop=("box", 0.22, 0.19, 1.0), m=("fit", 0.57, 0.6),
        focus="55% 60%",
        alt="Long-exposure light trails of traffic curving along a highway towards a city at night"),
    "fans-flags": dict(
        src="justin-lagat-7e16OcueiNs-unsplash.jpg", kind="hero",
        # softened: a kit maker's name on a red shirt and a print on a T-shirt
        ratio="16:9", crop=("fit", 0.5, 0.5), m=("fit", 0.7, 0.5),
        redact=[(0.413, 0.606, 0.450, 0.630), (0.578, 0.824, 0.612, 0.866, "dark"), (0.575, 0.862, 0.610, 0.916, "dark")],
        focus="65% 40%",
        alt="Cheering football fans in a stand waving Kenyan flags, one wearing a God Bless Kenya sash"),
    "kicc-night": dict(
        src="mustafa-omar-Zkao_QBEjk8-unsplash.jpg", kind="hero",
        ratio="16:9", crop=("fit", 0.5, 0.45), m=("fit", 0.56, 0.5),
        focus="56% 45%",
        alt="The KICC tower lit purple at night behind palm trees, reflected in a still lake in central Nairobi"),
    "cinema-seats": dict(
        src="felix-mooneeram-evlkOfkQ5rE-unsplash.jpg", kind="hero",
        ratio="16:9", crop=("fit", 0.5, 0.55), m=("fit", 0.5, 0.65),
        focus="50% 70%",
        alt="Rows of empty red cinema seats either side of softly lit steps in a dark auditorium"),
    "stadium-fan": dict(
        src="salim-jEOqeVcnCE4-unsplash.jpg", kind="hero",
        ratio="16:9", crop=("fit", 0.5, 0.545), m=("fit", 0.5, 0.52),
        focus="50% 50%",
        alt="A fan silhouetted against a packed, smoky stadium stand, arm raised high"),
    "plate-hands": dict(
        src="victor-birai-4J1WZkXde-w-unsplash.jpg", kind="hero",
        ratio="16:9", crop=("fit", 0.5, 0.52), m=("fit", 0.48, 0.5),
        focus="45% 55%",
        alt="Hands eating from a plate of ugali and a vegetable stew on a weathered wooden table"),
    # ------------------------------------------------------- area tiles
    "kicc-tower": dict(
        src="stanley-g-mathu-oZGaBqNCm5w-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.44), focus="40% 35%",
        alt="The KICC tower in Nairobi at dusk, its windows lit, framed by trees"),
    "giraffe-skyline": dict(
        src="grace-nandi-7XA8SJ5ODq4-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="70% 55%",
        alt="A giraffe in Nairobi National Park with the city skyline on the horizon"),
    # ------------------------------------------------------- gallery tiles
    "skyline-towers": dict(
        src="reggie-b-aUKfubmaU4o-unsplash.jpg", kind="tile",
        # the three left-hand towers only: keeps out the name lettering on the
        # crown of the faceted tower, a building-name sign and a branded hoarding
        ratio="3:2", crop=("box", 0.05, 0.20, 0.47), focus="50% 50%",
        alt="City towers glowing at golden hour above a dark line of trees"),
    "cbd-aerial": dict(
        src="joecalih-dGUXKJZGDSg-unsplash.jpg", kind="tile",
        # between the bank logo on the tall tower (above) and a shop sign at
        # street level (below); the left edge drops a rooftop sign
        ratio="1:1", crop=("box", 0.17, 0.355, 0.83), focus="50% 50%",
        # fine window grid and grain: denoise so the 600w tile stays under ~45 KB
        q=62, denoise=(3, 0.4),
        alt="Looking down on tightly packed office towers and a street in a city centre"),
    "jacaranda-street": dict(
        src="justine-Ls2Pxm_3jLI-unsplash.jpg", kind="tile",
        # upper part only: the street level below is crowded with bank, phone
        # and finance signs, a billboard with a phone number and number plates
        ratio="4:5", crop=("box", 0.02, 0.0, 0.79), focus="50% 40%",
        # dense blossom and grain: denoise so the 600w tile stays under ~45 KB
        q=60, denoise=(5, 0.5),
        alt="A purple jacaranda in bloom in front of a round, honeycomb-windowed office tower at dusk"),
    "suburb-sunset": dict(
        src="michael-muli-fmux-h7xg8I-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.6), focus="60% 60%",
        alt="Apartment blocks among dense green trees as the sun sets in a hazy sky"),
    "acacia-avenue": dict(
        src="abhijeet-parmar-dcGNHL8lUdA-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.6), focus="55% 50%",
        alt="A row of yellow-barked acacia trees along a quiet road under a clear blue sky"),
    "sunset-apartments": dict(
        src="joseph-ndungu-JXAj1vKla_E-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.48), focus="50% 50%",
        alt="The sun setting between apartment buildings against an orange sky"),
    "cbd-minarets": dict(
        src="dwayne-joe-zbuqEEHJSks-unsplash.jpg", kind="tile",
        # lower centre only: keeps out the bank logos on the tower top, the
        # billboards, a wall sign and the shop signs at bottom left
        ratio="4:5", crop=("box", 0.20, 0.60, 0.58), focus="60% 60%",
        alt="A white minaret with a green dome in front of a dark glass tower and older office blocks"),
    "football-pitch": dict(
        src="maingi-mutiso-TqQGHKQtCGs-unsplash.jpg", kind="tile",
        ratio="16:9", crop=("fit", 0.5, 0.55), focus="50% 70%",
        alt="Players on a grass football pitch in front of new apartment towers"),
    "shared-platter": dict(
        src="amaan-abid-UbPIijt8A8A-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.45, 0.5), focus="40% 45%",
        alt="Hands reaching for a large platter of rice and grilled meat on the grass"),
    "skewers-table": dict(
        src="febrian-zakaria-yLUv5e18CI0-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.5), focus="50% 50%",
        alt="Overhead view of a round table with skewers, grilled chicken, rice and colourful drinks"),
    "clay-dishes": dict(
        src="louis-hansel-W7x1gJtFZwM-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="45% 50%",
        alt="Clay dishes of rice with lamb, a salad and a stew on a wooden board"),
    "roast-spread": dict(
        src="rumman-amin-LNn6O_Mt730-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="55% 50%",
        alt="A roast with rosemary on a board, surrounded by roast chicken, potatoes and vegetables"),
    "ribs-fries": dict(
        src="thato-bole-0ZTbjBscf8s-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="50% 60%",
        alt="Glazed ribs and fries on a wooden board shared between friends outdoors"),
    "pour-over": dict(
        src="adi-nugroho-ODhgIpUVrls-unsplash.jpg", kind="tile",
        # middle section only: keeps out the cup print, the coffee bags,
        # the bottle labels and the boxed product on the right
        ratio="3:2", crop=("box", 0.27, 0.0, 0.915), focus="40% 45%",
        alt="Pour-over coffee dripping into a glass jug on a scale beside a barista in a leather apron"),
    "night-street": dict(
        src="nikolay-dukov-0nxkbdUtZnY-unsplash.jpg", kind="tile",
        # left part of the street: keeps out the lettering on a parked van;
        # the taxi's number plate is softened
        ratio="4:5", crop=("box", 0.0, 0.45, 0.60), focus="40% 60%",
        redact=[(0.360, 0.778, 0.383, 0.786)],
        alt="Cars with headlights on a wet tree-lined street at night under orange street lamps"),
    "avenue-traffic": dict(
        src="ron-john-NMAAZa0guJ4-unsplash.jpg", kind="tile",
        # upper left only: the road below is lined with shop, school and road
        # signs, event posters, a security-company sign and number plates
        ratio="3:2", crop=("box", 0.0, 0.26, 0.42), focus="50% 50%",
        alt="Curved balconies, a red-brick apartment block, a glass tower and an ochre dome on an overcast day"),
    "safari-gazelles": dict(
        src="ron-john-GpqMG6wYdPQ-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="30% 80%",
        alt="Gazelles grazing on open grassland beside a safari vehicle"),
    "stadium-arms": dict(
        src="offtoseetheworld-QOUxCvbuci0-unsplash.jpg", kind="tile",
        # below the pitch-side advertising boards, left of the shirt sponsor
        ratio="3:2", crop=("box", 0.10, 0.44, 0.565), focus="50% 40%",
        alt="Fans' raised arms in the foreground as players in red and black move across a football pitch"),
    "stadium-crowd": dict(
        src="selma-da-silva-YI6yXtYj13g-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.5), focus="50% 50%",
        alt="A packed stadium stand of fans clapping and cheering"),
    "track-sprint": dict(
        src="justin-lagat-3bwHCvM2rbE-unsplash.jpg", kind="tile",
        # owner's choice: legs and track only (no faces, no race bibs, no
        # sponsor banner). The redact boxes above the crop are harmless; the
        # one on the spike still applies.
        ratio="4:5", crop=("box", 0.19, 0.50, 0.456), focus="50% 50%",
        redact=[(0.222, 0.409, 0.292, 0.452, "light"), (0.460, 0.353, 0.528, 0.402, "light"),
                (0.286, 0.392, 0.318, 0.412), (0.265, 0.472, 0.298, 0.508),
                (0.274, 0.850, 0.302, 0.876)],
        alt="A sprinter's legs and pink spikes driving round the bend of a red running track"),
    "flag-dancers": dict(
        src="justin-lagat-JTpy794orEM-unsplash.jpg", kind="tile",
        # right edge at 77% keeps out the branded screen
        ratio="3:2", crop=("box", 0.0, 0.12, 0.77), focus="50% 50%",
        alt="Dancers in headdresses and skirts in the colours of the Kenyan flag, holding spears"),
    "neon-rooftop": dict(
        src="aleksandr-popov-poCJoKaymlU-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="50% 40%",
        alt="Silhouettes of people in a bar lit by red neon, city lights behind the windows"),
    "bar-sunset": dict(
        src="adam-bignell-2lrAn7dY7kI-unsplash.jpg", kind="tile",
        ratio="3:2", crop=("fit", 0.5, 0.5), focus="50% 60%",
        alt="Silhouetted bottles along a bar in front of tall windows and a sunset sky"),
    "singer-stage": dict(
        src="dwayne-joe-Cs2aZkwXM4U-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.55, 0.55), focus="60% 45%",
        alt="A singer in a wide hat and patterned top performing at a microphone against a gold curtain"),
    "window-dining": dict(
        src="polina-kuzovkova-40N4F93__Sk-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.5), focus="50% 50%",
        alt="Two diners silhouetted at a window table high above a hazy city"),
    "cinema-glow": dict(
        src="umanoide-4KCwp7ZveWc-unsplash.jpg", kind="tile",
        ratio="4:5", crop=("fit", 0.5, 0.33), focus="50% 40%",
        alt="Red cinema seats and small aisle lights glowing in a dark auditorium"),
}

# Example photos, one entry per photo, by listing type. Shown only on the cards
# (and in the details drawer) of unclaimed listings of that exact type, with the
# label "Example photo, not of this place". Same crop and redact notation as
# CROPS; ratio is always 2:1 (the .card-photo band). Credit and page are given
# by hand because Pexels file names do not follow the Unsplash pattern.
PEXELS = ("Pexels", "https://www.pexels.com/license/")
UNSPLASH = ("Unsplash", "https://unsplash.com/license")
EXAMPLES = {
    "Apartment": [
        dict(id="ex-apartment-1", src="pexels-artbovich-6265837.jpg",
             credit="Artbovich", page="https://www.pexels.com/photo/6265837/", site=PEXELS,
             # the TV maker's logo and model label, and the oven maker's logo
             crop=("fit", 0.5, 0.52),
             redact=[(0.757, 0.603, 0.775, 0.620), (0.935, 0.634, 0.975, 0.650),
                     (0.290, 0.410, 0.315, 0.428)],
             focus="40% 50%",
             alt="An open-plan apartment with a white kitchen, wooden bar stools and a wood-panelled wall with a large television"),
        dict(id="ex-apartment-2", src="pexels-artbovich-6492396.jpg",
             credit="Artbovich", page="https://www.pexels.com/photo/6492396/", site=PEXELS,
             # right of the television (its screen shows a picture)
             crop=("box", 0.35, 0.25, 1.0),
             focus="50% 55%",
             alt="A grey velvet sofa in front of a long beige kitchen with brass pendant lights and a vase of green branches"),
        dict(id="ex-apartment-3", src="pexels-artbovich-6580381.jpg",
             credit="Artbovich", page="https://www.pexels.com/photo/6580381/", site=PEXELS,
             crop=("fit", 0.5, 0.55),
             focus="50% 60%",
             alt="A studio flat with a green sofa, tall curtained windows and a small kitchen island against a dark stone wall"),
        dict(id="ex-apartment-4", src="pexels-athenea-codjambassis-rossitto-472760075-26571206.jpg",
             credit="Athenea Codjambassis Rossitto", page="https://www.pexels.com/photo/26571206/", site=PEXELS,
             # the microwave maker's logo
             crop=("fit", 0.5, 0.56),
             redact=[(0.466, 0.382, 0.480, 0.398)],
             focus="50% 55%",
             alt="A bright living room with a grey sofa, a round dining table and a compact kitchen behind it"),
    ],
    "Hotel": [
        dict(id="ex-hotel-1", src="pexels-catscoming-707581.jpg",
             credit="Catscoming", page="https://www.pexels.com/photo/707581/", site=PEXELS,
             # bottom-aligned and zoomed so the two round wall prints stay out
             crop=("fit", 0.55, 1.0, 1.15),
             focus="50% 60%",
             alt="A neatly made bed with grey linen and a patterned cushion beside a wooden side table and a floor lamp"),
        dict(id="ex-hotel-2", src="pexels-claudia-schmalz-3928374-13316618.jpg",
             credit="Claudia Schmalz", page="https://www.pexels.com/photo/13316618/", site=PEXELS,
             crop=("fit", 0.5, 0.55),
             focus="50% 50%",
             alt="A large bed with crisp white linen between two softly lit bedside lamps"),
        dict(id="ex-hotel-3", src="pexels-lachlan-ross-6510425.jpg",
             credit="Lachlan Ross", page="https://www.pexels.com/photo/6510425/", site=PEXELS,
             crop=("fit", 0.62, 0.52, 1.3),
             focus="60% 50%",
             alt="A double bed with a flowered quilt and purple pillows in a plain white room with wooden furniture"),
        dict(id="ex-hotel-4", src="pexels-natthanon-chinnasri-1807966-10660270.jpg",
             credit="Natthanon Chinnasri", page="https://www.pexels.com/photo/10660270/", site=PEXELS,
             # the printed face plate of the telephone (it may carry the hotel's
             # name); the booklet and box on the bed are too small to read
             crop=("fit", 0.5, 0.45),
             redact=[(0.649, 0.556, 0.676, 0.650, "light")],
             focus="50% 45%",
             alt="A bed with white linen against a mustard headboard, a woven lamp above a wooden bedside table with a telephone"),
    ],
    "Guesthouse": [
        dict(id="ex-guesthouse-1", src="pexels-enock-ojambo-1365731-33613729.jpg",
             credit="Enock Ojambo", page="https://www.pexels.com/photo/33613729/", site=PEXELS,
             # the fabric maker's name printed along the hem of the bed cover; the fan's badge
             crop=("fit", 0.5, 0.52),
             redact=[(0.330, 0.664, 0.380, 0.676, "light"), (0.393, 0.664, 0.427, 0.675, "light"),
                     (0.512, 0.665, 0.598, 0.678, "light"), (0.636, 0.664, 0.700, 0.676, "light"),
                     (0.828, 0.400, 0.845, 0.420, "light")],
             focus="50% 55%",
             # Taken in Kampala: the alt text never says Nairobi.
             alt="A sunny guest room with two single beds in patterned orange covers, printed curtains, a mosquito net and a standing fan"),
    ],
    "Restaurant": [
        dict(id="ex-restaurant-1", src="roman-mLPNw6L5t5o-unsplash.jpg",
             credit="Roman", page="https://unsplash.com/photos/mLPNw6L5t5o", site=UNSPLASH,
             # portrait master: a band round the lamp and the glasses, above the
             # printed napkin
             crop=("box", 0.0, 0.295, 1.0),
             focus="50% 55%",
             alt="A glowing table lamp and water glasses on a wooden table in a dimly lit dining room"),
    ],
}

SHARE = dict(id="home-skyline", crop=("fit", 0.5, 0.45), size=(1200, 630))

SLOTS = {
    "home": "home-skyline",
    "route": "kicc-rooftops",
    "stays": "sunset-rooftops",
    "food": "shared-table",
    "rides": "light-trails",
    "matchday": "fans-flags",
    "nightlife": "kicc-night",
    "movies-games": "cinema-seats",
    "tickets": "stadium-fan",
    "list-your-business": "plate-hands",
    "share": "home-skyline",
    "area:CBD": "kicc-tower",
    "area:Lang'ata": "giraffe-skyline",
}

GALLERIES = {
    "home": ["giraffe-skyline", "skyline-towers", "cbd-aerial", "kicc-tower",
             "jacaranda-street", "suburb-sunset", "acacia-avenue", "cbd-minarets",
             "sunset-apartments", "football-pitch"],
    "stays": ["suburb-sunset", "sunset-apartments", "sunset-rooftops", "acacia-avenue"],
    "food": ["shared-platter", "skewers-table", "clay-dishes", "roast-spread",
             "ribs-fries", "plate-hands", "pour-over"],
    "rides": ["night-street", "avenue-traffic", "jacaranda-street", "safari-gazelles"],
    "matchday": ["stadium-arms", "stadium-crowd", "track-sprint", "flag-dancers",
                 "football-pitch"],
    "nightlife": ["neon-rooftop", "bar-sunset", "singer-stage", "window-dining"],
    "movies-games": ["cinema-glow", "cinema-seats"],
    "tickets": ["stadium-crowd", "stadium-fan"],
}

SRGB = ImageCms.createProfile("sRGB")


def credit_for(src):
    """'amani-nation-LTh5pGyvKAM-unsplash.jpg' -> ('Amani Nation', 'LTh5pGyvKAM')."""
    stem = src[: -len("-unsplash.jpg")]
    uid = stem[-11:]
    name = stem[:-12]
    return " ".join(p.capitalize() for p in name.split("-")), uid


def load(src, folder=MASTERS):
    im = Image.open(os.path.join(folder, src))
    im = ImageOps.exif_transpose(im)
    icc = im.info.get("icc_profile")
    if icc:
        prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        if "sRGB" not in ImageCms.getProfileDescription(prof):
            im = ImageCms.profileToProfile(im, prof, SRGB, outputMode="RGB")
    return im.convert("RGB")


def box_for(size, ratio, spec):
    W, H = size
    if spec[0] == "box":
        _, x0, y0, x1 = spec
        left, right = round(x0 * W), round(x1 * W)
        h = round((right - left) / ratio)
        top = round(y0 * H)
        if top + h > H:
            raise ValueError(f"box {spec} at ratio {ratio:.3f} runs past the bottom")
        return (left, top, right, top + h)
    _, cx, cy, *z = spec
    z = z[0] if z else 1.0
    w = min(W, H * ratio) / z
    h = w / ratio
    left = min(max(cx * W - w / 2, 0), W - w)
    top = min(max(cy * H - h / 2, 0), H - h)
    return (round(left), round(top), round(left + w), round(top + h))


def redact(im, boxes):
    """Paint small marks out with the surface around them.

    Each box is (x0, y0, x1, y1[, "light" | "dark"]), drawn just around the
    lettering or logo. The box is filled with the median colour of a thin
    ring of pixels just outside it (or, with "light"/"dark", of the brightest
    or darkest quarter of the pixels inside it: the blank of a white race bib
    behind red lettering, a dark T-shirt behind a white print), smoothed so the surface shading carries across, and blended
    in with feathered edges: a sign reads as a blank panel, a bib or shirt
    as plain fabric, with no smudge and no hard rectangle.
    """
    W, H = im.size
    for box in boxes:
        x0, y0, x1, y1 = box[:4]
        b = (round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H))
        bw, bh = b[2] - b[0], b[3] - b[1]
        short = min(bw, bh)
        ring = max(round(short * 0.15), 3)
        p = (max(b[0] - ring, 0), max(b[1] - ring, 0),
             min(b[2] + ring, W), min(b[3] + ring, H))
        region = im.crop(p)
        inner = (b[0] - p[0], b[1] - p[1], b[2] - p[0], b[3] - p[1])
        hole = Image.new("L", region.size, 0)
        ImageDraw.Draw(hole).rectangle((inner[0], inner[1], inner[2] - 1, inner[3] - 1), fill=255)
        rgb, holes = region.tobytes(), hole.tobytes()
        ring_px = [rgb[3 * i:3 * i + 3] for i, m in enumerate(holes) if not m]
        if len(box) > 4:
            inside = im.crop(b).tobytes()
            px = sorted((inside[i:i + 3] for i in range(0, len(inside), 3)), key=sum)
            ring_px = px[len(px) * 3 // 4:] if box[4] == "light" else px[:len(px) // 4]
        fill = tuple(sorted(c[i] for c in ring_px)[len(ring_px) // 2] for i in range(3))
        patched = region.copy()
        patched.paste(fill, inner)
        patched = patched.filter(ImageFilter.GaussianBlur(max(ring, 2)))
        mask = hole.filter(ImageFilter.GaussianBlur(max(ring / 2, 1)))
        im.paste(Image.composite(patched, region, mask), p[:2])
    return im


def save_webp(im, path, q):
    # Fresh image without info dict so no EXIF/XMP/ICC is written.
    clean = Image.frombytes("RGB", im.size, im.tobytes())
    clean.save(path, "WEBP", quality=q, method=6)
    return os.path.getsize(path)


def render(im, box, widths, ratio, prefix, q, budget, denoise=None):
    """Write one crop at each width; lower quality only if over budget.

    denoise=(median, blur): for grainy, high-detail photos, resize to twice
    the width, apply a median filter of that size (removes sensor grain and
    leaf speckle), resize down, then a light Gaussian blur of that radius.
    """
    crop = im.crop(box)
    out = []
    for w in widths:
        if w > crop.width:
            print(f"  skip {prefix}-{w}: crop only {crop.width}px wide", file=sys.stderr)
            continue
        h = round(w / ratio)
        if denoise:
            med, blur = denoise
            frame = crop.resize((w * 2, h * 2), Image.LANCZOS)
            frame = frame.filter(ImageFilter.MedianFilter(med)).resize((w, h), Image.LANCZOS)
            if blur:
                frame = frame.filter(ImageFilter.GaussianBlur(blur))
        else:
            frame = crop.resize((w, h), Image.LANCZOS)
        path = os.path.join(OUT_DIR, f"{prefix}-{w}.webp")
        qq = q
        size = save_webp(frame, path, qq)
        while w == widths[-1] and size > budget and qq > 50:
            qq -= 4
            size = save_webp(frame, path, qq)
        out.append(w)
        print(f"  {os.path.basename(path):34s} {w}x{h}  q{qq}  {size // 1024} KB")
    return out


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for f in os.listdir(OUT_DIR):  # re-runnable: clear old outputs
        if f.endswith((".webp", ".jpg")):
            os.remove(os.path.join(OUT_DIR, f))

    photos = {}
    for pid, c in CROPS.items():
        print(pid)
        im = load(c["src"])
        if c.get("redact"):
            im = redact(im, c["redact"])
        name, uid = credit_for(c["src"])
        ratio = RATIOS[c["ratio"]]
        hero = c["kind"] == "hero"
        q = c.get("q", HERO_Q if hero else TILE_Q)
        widths = render(im, box_for(im.size, ratio, c["crop"]),
                        HERO_W if hero else TILE_W, ratio, pid, q, BUDGET[c["kind"]],
                        c.get("denoise"))
        entry = {
            "src": c["src"],
            "credit": name,
            "credit_url": f"https://unsplash.com/photos/{uid}",
            "alt": c["alt"],
            "kind": c["kind"],
            "w": widths,
            "ratio": c["ratio"],
        }
        if hero:
            mw = render(im, box_for(im.size, RATIOS["4:5"], c["m"]), HERO_M_W,
                        RATIOS["4:5"], f"{pid}-m", c.get("m_q", HERO_Q), BUDGET["tile"])
            entry["m"] = mw
            entry["m_ratio"] = "4:5"
        entry["focus"] = c["focus"]
        photos[pid] = entry

    examples = {}
    for kind, items in EXAMPLES.items():
        examples[kind] = []
        for c in items:
            pid = c["id"]
            print(pid)
            im = load(c["src"], EX_MASTERS)
            if c.get("redact"):
                im = redact(im, c["redact"])
            widths = render(im, box_for(im.size, RATIOS["2:1"], c["crop"]), EX_W, RATIOS["2:1"],
                            pid, c.get("q", TILE_Q), BUDGET["tile"], c.get("denoise"))
            assert widths == EX_W, f"{pid}: master too small for {EX_W}"
            photos[pid] = {
                "src": c["src"],
                "credit": c["credit"],
                "credit_url": c["page"],
                "source": c["site"][0],
                "licence_url": c["site"][1],
                "alt": c["alt"],
                "kind": "example",
                "type": kind,
                "w": widths,
                "ratio": "2:1",
                "focus": c["focus"],
            }
            examples[kind].append(pid)

    # Share card (JPEG, exactly 1200x630, no metadata).
    im = load(CROPS[SHARE["id"]]["src"])
    if CROPS[SHARE["id"]].get("redact"):
        im = redact(im, CROPS[SHARE["id"]]["redact"])
    sw, sh = SHARE["size"]
    card = im.crop(box_for(im.size, sw / sh, SHARE["crop"])).resize((sw, sh), Image.LANCZOS)
    card = Image.frombytes("RGB", card.size, card.tobytes())
    share_path = os.path.join(OUT_DIR, f"share-{sw}x{sh}.jpg")
    card.save(share_path, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"share-{sw}x{sh}.jpg {os.path.getsize(share_path) // 1024} KB")

    for slot, pid in SLOTS.items():
        assert pid in photos, f"slot {slot} -> unknown id {pid}"
    for g, ids in GALLERIES.items():
        for pid in ids:
            assert pid in photos, f"gallery {g} -> unknown id {pid}"

    manifest = {"photos": photos, "slots": SLOTS, "galleries": GALLERIES, "examples": examples}
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    total = sum(os.path.getsize(os.path.join(OUT_DIR, f)) for f in os.listdir(OUT_DIR))
    print(f"total {total / 1024 / 1024:.2f} MB in {len(os.listdir(OUT_DIR))} files")


if __name__ == "__main__":
    main()
