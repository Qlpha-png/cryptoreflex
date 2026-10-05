"""
scripts/build-nnbsp-font.py — micro-police « Cryptoreflex NNBSP » : un seul caractère, l'espace fine insécable U+202F.

Pourquoi (audit du 05/10/2026) : le format français des nombres (Intl, toLocaleString("fr-FR")) sépare les milliers par
U+202F, qu'Inter dessine avec 1 à 2 pixels de large. On lisait « 20000 € », « 16000 € », et le « € » passait à la ligne.
Cette police, placée en tête des piles de polices avec unicode-range U+202F (app/globals.css), donne à ce caractère la
largeur d'une espace normale d'Inter (0,25 em) partout sur le site, sans toucher aux 63 fichiers qui formatent des nombres.

Usage : python scripts/build-nnbsp-font.py  → public/fonts/cr-nnbsp.woff2 (quelques centaines d'octets)
Dépendances : pip install fonttools brotli
"""
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM = 1000
WIDTH = 250  # 0,25 em ≈ espace normale d'Inter

fb = FontBuilder(UPM, isTTF=True)
glyphs = [".notdef", "nnbsp"]
fb.setupGlyphOrder(glyphs)
fb.setupCharacterMap({0x202F: "nnbsp"})
empty = TTGlyphPen(None).glyph()
# .notdef avec un vrai contour (petit carré) : une table glyf entièrement vide est rejetée par les navigateurs
# (Chrome/OTS : « glyf: zero-length table », police ignorée — constaté le 05/10/2026).
pen = TTGlyphPen(None)
pen.moveTo((50, 0))
pen.lineTo((50, 700))
pen.lineTo((200, 700))
pen.lineTo((200, 0))
pen.closePath()
fb.setupGlyf({".notdef": pen.glyph(), "nnbsp": empty})
fb.setupHorizontalMetrics({".notdef": (WIDTH, 0), "nnbsp": (WIDTH, 0)})
fb.setupHorizontalHeader(ascent=800, descent=-200)
fb.setupNameTable({"familyName": "Cryptoreflex NNBSP", "styleName": "Regular"})
fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
fb.setupPost()
fb.font.flavor = "woff2"
fb.save("public/fonts/cr-nnbsp.woff2")
print("ok public/fonts/cr-nnbsp.woff2")
