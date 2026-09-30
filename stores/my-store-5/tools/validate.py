#!/usr/bin/env python3
"""Verifie les schemas des sections sf- contre les regles Shopify (a lancer avant chaque envoi)."""
import json, re, glob, sys, os
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'theme')
ok = True
def err(*a):
    global ok; ok = False; print('  ***', *a)
for f in sorted(glob.glob(os.path.join(root, 'sections', '*.liquid'))):
    s = open(f, encoding='utf-8').read()
    for a, b in [('if', 'endif'), ('for', 'endfor'), ('case', 'endcase'), ('comment', 'endcomment'), ('unless', 'endunless')]:
        ca = len(re.findall(r'{%-?\s*' + a + r'(?=[\s%])', s)); cb = len(re.findall(r'{%-?\s*' + b + r'(?=[\s%])', s))
        if ca != cb: err(os.path.basename(f), 'balises', a, ca, '/', cb)
    sch = json.loads(re.search(r'{%\s*schema\s*%}(.*?){%\s*endschema\s*%}', s, re.S).group(1))
    if len(sch['name']) > 25: err(f, 'nom de section > 25 car.')
    for st in re.findall(r'{%\s*stylesheet\s*%}(.*?){%\s*endstylesheet\s*%}', s, re.S):
        if '{{' in st or '{%' in st: err(f, 'Liquid dans {% stylesheet %}')
    groups = [('section', sch.get('settings', []))] + [('bloc ' + b['type'], b.get('settings', [])) for b in sch.get('blocks', [])]
    for b in sch.get('blocks', []):
        if len(b['name']) > 25: err(f, 'nom de bloc > 25')
    for where, sets in groups:
        ids = [x['id'] for x in sets if 'id' in x]
        if len(ids) != len(set(ids)): err(f, where, 'ids en double')
        for x in sets:
            t = x['type']
            if x.get('default') == '': err(f, where, x.get('id'), 'default vide')
            if len(x.get('label', '')) > 70: err(f, where, x.get('id'), 'label > 70 car.')
            if len(x.get('info', '')) > 300: err(f, where, x.get('id'), 'info trop long')
            if t == 'header' and len(x['content']) > 50: err(f, where, 'header > 50')
            if t == 'range' and (x['max'] - x['min']) / x['step'] > 101: err(f, x['id'], 'range > 101 pas')
            if t == 'select' and x.get('default') not in [o['value'] for o in x['options']]: err(f, x['id'], 'select')
            if t == 'inline_richtext' and '<br' in str(x.get('default', '')): err(f, x['id'], '<br> en inline_richtext')
    for p in sch.get('presets', []):
        if len(p['name']) > 25: err(f, 'preset > 25')
for j in glob.glob(os.path.join(root, 'templates', '*.json')) + glob.glob(os.path.join(root, 'sections', '*.json')):
    json.load(open(j, encoding='utf-8'))
print('validation :', 'OK' if ok else 'ERREURS'); sys.exit(0 if ok else 1)
