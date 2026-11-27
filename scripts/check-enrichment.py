#!/usr/bin/env python3
"""第三步：资料检查。检查空字段、词性、翻译、重复词义和数据质量。"""
import json, re, sys, collections, io

PATH = 'data/enrichment/enriched-all.json'
words = json.load(io.open(PATH, encoding='utf-8'))
FIELDS = ['word', 'phonetic', 'partOfSpeech', 'meaning', 'englishDefinition',
          'example', 'exampleTranslation', 'mnemonic']
VALID_POS = {'noun', 'verb', 'adjective', 'adverb', 'numeral',
             'pronoun', 'preposition', 'conjunction', 'article'}

issues = collections.defaultdict(list)

for i, w in enumerate(words):
    tag = f"#{i+1} {w.get('word','?')}"
    # 空字段
    for f in FIELDS:
        v = w.get(f)
        if v is None or (isinstance(v, str) and not v.strip()):
            issues['空字段'].append(f'{tag} {f}')
    # 词性
    if w.get('partOfSpeech') not in VALID_POS:
        issues['词性非法'].append(f"{tag} {w.get('partOfSpeech')}")
    # 音标格式
    ph = w.get('phonetic', '')
    if not (ph.startswith('/') and ph.endswith('/')):
        issues['音标格式'].append(f'{tag} {ph[:40]}')
    # 例句是否含目标词（含简单词形变化）
    word = w.get('word', '').lower()
    ex = w.get('example', '').lower()
    if word and len(word) > 2 and word not in ex:
        stem = word[:-1] if word.endswith('s') else word
        if stem not in ex:
            issues['例句不含目标词'].append(f'{tag}: {w.get("example","")[:60]}')
    # 英文释义词数
    ed = w.get('englishDefinition', '')
    n = len(ed.split())
    if n > 18:
        issues['英文释义过长'].append(f'{tag} {n}词')
    # 中文翻译是否含中文
    if not re.search(r'[\u4e00-\u9fff]', w.get('exampleTranslation', '')):
        issues['翻译非中文'].append(tag)
    if not re.search(r'[\u4e00-\u9fff]', w.get('meaning', '')):
        issues['释义非中文'].append(tag)
    if not re.search(r'[\u4e00-\u9fff]', w.get('mnemonic', '')):
        issues['记忆技巧非中文'].append(tag)

# 重复词 / 重复词义
names = [w['word'].lower() for w in words]
for name, cnt in collections.Counter(names).items():
    if cnt > 1:
        issues['重复单词'].append(f'{name} x{cnt}')
pairs = [(w['word'].lower(), w['meaning'].strip()) for w in words]
for pair, cnt in collections.Counter(pairs).items():
    if cnt > 1:
        issues['重复词义'].append(f'{pair[0]}:{pair[1]} x{cnt}')

# 源词一致性
src = json.load(io.open('apps/server/prisma/pdf-words.json', encoding='utf-8'))
src_names = [w['word'].lower() for w in src]
if sorted(names) != sorted(src_names):
    missing = set(src_names) - set(names)
    extra = set(names) - set(src_names)
    issues['源词不一致'].append(f'缺{sorted(missing)[:5]} 多{sorted(extra)[:5]}')

print(f'检查 {len(words)} 条记录')
print('=' * 50)
if not issues:
    print('全部通过，无问题')
for k, v in sorted(issues.items(), key=lambda x: -len(x[1])):
    print(f'{k}: {len(v)}')
    for item in v[:6]:
        print('   ', item)

# 完整率
print('=' * 50)
for f in FIELDS:
    filled = sum(1 for w in words if w.get(f) and str(w[f]).strip())
    print(f'{f}: {filled}/{len(words)} ({filled/len(words)*100:.1f}%)')

sys.exit(1 if issues else 0)
