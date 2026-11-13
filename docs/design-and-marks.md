# Dashboard visual system and airline marks

The dashboard uses a white canvas, compact information hierarchy and large condensed headlines. The user's SkyUp 2020 reference supplied the typographic direction: its guide names Euclid Square for the main face and Bebas Neue for the secondary display face. Bebas Neue is used for the dashboard's large headings and figures. Plus Jakarta Sans is a web-available geometric substitute for Euclid Square; the proprietary Euclid font is not bundled.

The user's AirAsia 2017 reference informed the clear space, white/black contrast, and restrained red accents. The dashboard uses its own coral-red tone (`#F02C26`) for navigation and highlights. SkyUp's light periwinkle inspired the QSI comparison bars (`#7A89C2`). Flightpath has its own wordmark and is not presented as either airline's product.

## Airline identity

Each of the 93 reporting operators in the loaded data has a local PNG mark and a stable chart color in `dashboard/brands.js`. Sixty marks came from the pinned [airline PNG collection](https://github.com/spydogenesis/airlines-logo/tree/8c5f1ae3d25538bd1b649a7ad85b902528c612b6). Generic missing-logo images and carriers without a two-character logo are represented by clearly labelled operator-code badges (33). The badge is an identifier, not a claim to be an official airline logo. Carrier names and codes come from BTS, and several operators fly under another airline's marketing brand; they remain separate in the analysis.

Colors for recognizable carriers were curated for legibility on white. Other logo colors are approximated from the dominant saturated hue. Badges without a reliable logo use a neutral identifier color unless an operator color was curated. The palette is a visual aid, not an official color specification for every airline.

Airline names and logos are trademarks of their respective owners. The marks are used to identify reporting carriers in this data visualization. To regenerate the assets, install Pillow alongside `requirements.txt` and run `python src/build_airline_marks.py` after the gold airline dimension exists.
