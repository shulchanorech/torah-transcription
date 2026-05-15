# -*- coding: utf-8 -*-
# v9 build sanity check — run AFTER _build_index.py.
# Fails loudly if any file looks truncated/broken, so a silent
# write-truncation never reaches deploy again.
import os, sys

BASE = os.path.dirname(os.path.abspath(__file__))
def rd(name):
    with open(os.path.join(BASE, name), 'r', encoding='utf-8') as f:
        return f.read()

errors = []

# index.html: complete + balanced
try:
    html = rd('index.html')
    if html.count(chr(0)):
        errors.append('index.html: NULL bytes (truncated)')
    if not html.rstrip().endswith('</html>'):
        errors.append('index.html: missing closing </html> (truncated)')
    o, c = html.count('<div'), html.count('</div>')
    if o != c:
        errors.append('index.html: div imbalance %d open / %d close' % (o, c))
    if html.count('class="tab-panel') != 4:
        errors.append('index.html: expected 4 tab-panels, got %d' % html.count('class="tab-panel'))
except Exception as e:
    errors.append('index.html: cannot read (%s)' % e)

# each JS file: exists, non-empty, ends clean, braces balanced
for s in ['app.js', 'sefaria.js', 'proofing.js', 'publishing.js']:
    p = os.path.join(BASE, s)
    if not os.path.exists(p):
        errors.append('%s: missing' % s); continue
    js = rd(s)
    if len(js) < 200:
        errors.append('%s: suspiciously small (%d bytes)' % (s, len(js)))
    if js.count(chr(0)):
        errors.append('%s: NULL bytes (truncated)' % s)
    st = js.rstrip()
    if st and st[-1] not in '});/':
        errors.append('%s: ends mid-statement -> %r (truncated)' % (s, st[-30:]))
    if js.count('{') != js.count('}'):
        errors.append('%s: brace imbalance %d/%d (truncated)' % (s, js.count('{'), js.count('}')))

# style.css: exists + brace balanced
p = os.path.join(BASE, 'style.css')
if not os.path.exists(p):
    errors.append('style.css: missing')
else:
    css = rd('style.css')
    if css.count('{') != css.count('}'):
        errors.append('style.css: brace imbalance %d/%d' % (css.count('{'), css.count('}')))

if errors:
    print('BUILD SANITY FAILED:')
    for e in errors:
        print('   - ' + e)
    sys.exit(1)
print('build sanity: all checks passed - safe to deploy')
