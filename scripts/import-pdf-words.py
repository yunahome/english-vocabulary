#!/usr/bin/env python3
"""解析墨典小学英语 PDF 提取的 markdown，生成课程词 JSON。

PDF 字体子集映射导致大量汉字被替换成部首/埃塞俄比亚音节等异体字符，
这里用 NFC/NFKC 归一化 + 人工映射表还原。
"""
import re, sys, json, io, unicodedata, collections

# PDF 字体子集映射：异体字符 → 正常汉字（按上下文推断）
CHAR_MAP = {
    # 埃塞俄比亚音节
    'ሁ': '狮', 'አ': '用', 'ኞ': '生', 'ቘ': '理', 'ሿ': '现', 'ቖ': '球', 'ኪ': '电',
    'ሻ': '玩', 'ቄ': '玻', 'ቼ': '璃', 'ቚ': '霾', 'ቛ': '舅', 'ቜ': '叔',
    'ቝ': '伯', 'መ': '拿', 'ሐ': '猎', 'ሑ': '牧', 'ሒ': '副', 'ሓ': '灾',
    'ሔ': '蔬', 'ሕ': '迅', 'ሖ': '蔬', 'ሗ': '援', 'መ': '拿',
    # 拉丁/注音符号等
    'ᴢ': '农', 'ᴡ': '阳', 'ᴬ': 'A', '᲋': '锋',
    'ᳵ': '间', '᳒': '镜', 'ᰦ': '钟', 'ᰂ': '金', 'ᰁ': '量',
    'ᰴ': '票', 'ᱷ': '阴', 'ᲅ': '底', 'Ა': '锐', 'Გ': '东',
    '಑': '打', 'ಠ': '怒', 'ಸ': '报', 'ತ': '肥', 'ನ': '肾', 'ಝ': '演',
    '೉': '船', 'ೊ': '啦', 'ೌ': '拍', 'ೋ': '袋', '೰': '指', 'ೲ': '按',
    'ೳ': '突', '೿': '挤',
    # 其他
    # 终轮残留
    'ᲀ': '批', 'ᲁ': '搅', 'ᱞ': '铜', 'ᴨ': 'otrop', '\u1c4c': '铅', '\u0cd8': '拜',
    '\u1cfc': '闻', '\u0ccf': '弃', '\u1c4a': '铃', '\u0cc5': '担', '\u0cdc': '拥',
    '\u1c38': '材', '\u0ca9': '肥', '\u0cf5': '适', '\u0ce6': '拳',
    # 最后一轮残留（按上下文推断）
    'ኮ': '画', '᱈': '坏', 'ሾ': '环', 'ಭ': '落', 'Კ': '错', 'ኒ': '瓶',
    'ದ': '技', 'ሜ': '猩', 'ᴠ': '防', 'ኴ': '界', '᳢': '激', '೦': '拳',
    '಼': '抱', 'ᴣ': '阵', 'ሉ': '狸', '೭': '拿', 'ሄ': '狱', 'ಈ': '扇',
    'Ს': '钟', 'ᰬ': '钥', 'ሌ': '狼', 'ೠ': '择', '⻁': '虎', 'ሁ': '狮',
    'ሢ': '猴', 'ರ': '折', '೮': '持', 'ቔ': '队', 'ˈ': '',
    # CJK 部首补充（无兼容分解，手动映射）
    '⻋': '车', '⻢': '马', '⻛': '风', '⻄': '西', '⻝': '食', '⻅': '见',
    '⻩': '黄', '⻜': '飞', '⻥': '鱼', '⻰': '龙', '⻆': '角', '⻤': '鬼',
    '⻓': '长', '⻔': '门', '⻘': '青', '⻣': '骨', '⻦': '鸟', '⻨': '麦',
    '⻬': '齐', '⻮': '齿', '⻑': '长', '⻖': '左', '⻗': '雨', '⻙': '韦',
    # 更多埃塞俄比亚/其他映射（按上下文）
    'ᳩ': '新', 'ᰀ': '出', 'ಋ': '观', '೪': '谐', 'ኈ': '到', 'ᴚ': '火',
    'ᳬ': '洲', 'ሴ': '花', 'ኝ': '岁', 'ም': '喝', 'ካ': '卡', 'ᳪ': '累',
    'ᳯ': '甜', 'ቨ': '傲', 'ሞ': '观', 'ಷ': '色', 'ኧ': '主', 'Გ': '东',
    'ᲊ': '锐', '᲋': '锋', '᲌': '东', '᳭': '俗', 'ᳰ': '器', 'ᳱ': '器',
    'ᰁ': '量', 'ᰂ': '金', 'ᰃ': '算', 'ᰄ': '具', 'ᰅ': '具', 'ᰆ': '算',
    'ᰇ': '算', 'ᰈ': '算', 'ᰉ': '算', 'ᰊ': '算', 'ᰋ': '算', 'ᰌ': '算',
    'ᰍ': '算', 'ᰎ': '算', 'ᰏ': '算', 'ᰐ': '算', 'ᰑ': '算', 'ᰒ': '算',
    'ᰓ': '算', 'ᰔ': '算', 'ᰕ': '算', 'ᰖ': '算', 'ᰗ': '算', 'ᰘ': '算',
    'ᰙ': '算', 'ᰚ': '算', 'ᰛ': '算', 'ᰜ': '算', 'ᰝ': '算', 'ᰞ': '算',
    'ᰟ': '算', 'ᰠ': '算', 'ᰡ': '算', 'ᰢ': '算', 'ᰣ': '算', 'ᰤ': '算',
    'ᰥ': '算', 'ᰦ': '钟', 'ᰧ': '算', 'ᰨ': '算', 'ᰩ': '算', 'ᰪ': '算',
    '.Display': '', 'ɒ': 'o', 'ʌ': 'ʌ',
}

# 反斜杠音标中的特殊转义
IPA_FIX = {'\\': '', '\\[': '[', '\\]': ']'}

def clean(text):
    # NFKC 还原康熙部首
    text = unicodedata.normalize('NFKC', text)
    # 人工映射
    for ch, rep in CHAR_MAP.items():
        text = text.replace(ch, rep)
    # 清理页脚
    text = re.sub(r'App Store\s*搜索\s*墨典', '', text)
    # 清理墨典提示长文本（属于记忆法，不属于释义）
    text = re.sub(r'\[墨典提示\].*$', '', text)
    text = re.sub(r'\[(?:化|计|医|法|经|商|宗|生|物|数|理|史|地|音|体)\]', '', text)
    # 清理学科标签
    text = re.sub(r'\[(?:计|医|化|法|经|生|物|数|理|史|地)\]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# 词性映射
POS_MAP = {'n': 'noun', 'v': 'verb', 'vt': 'verb', 'vi': 'verb',
           'a': 'adjective', 'adj': 'adjective', 'adv': 'adverb',
           'num': 'numeral', 'pron': 'pronoun', 'prep': 'preposition',
           'conj': 'conjunction', 'art': 'article', 'int': 'interjection'}

def parse_line(line):
    m = re.match(r'^#?\s*(\d+)\.\s*(.+)$', line.strip())
    if not m: return None
    num = int(m.group(1))
    rest = m.group(2).strip()
    # 音标：\\...\\ 之间
    ipa_match = re.match(r'^(\S+?)\s*\\+(.+?)\\+\s*(.*)$', rest)
    if ipa_match:
        word = ipa_match.group(1).strip()
        phonetic = '\\' + ipa_match.group(2).strip() + '\\'
        after = ipa_match.group(3).strip()
    else:
        # 无音标：单词后直接跟词性或释义
        m2 = re.match(r'^(\S+)\s+(.*)$', rest)
        if not m2: return None
        word = m2.group(1).strip()
        phonetic = ''
        after = m2.group(2).strip()
    # 词性
    pos_match = re.match(r'^(n|vt|vi|v|a|adj|adv|num|pron|prep|conj|art|int)\.\s*(.*)$', after)
    if pos_match:
        pos_raw = pos_match.group(1)
        definition = pos_match.group(2).strip()
    else:
        pos_raw = ''
        definition = after
    # 取第一条中文释义（按逗号/分号切）
    definition = clean(definition)
    defs = re.split(r'[,，;；]', definition)
    definition = defs[0].strip() if defs else definition
    # 去掉残留的词性标记
    definition = re.sub(r'^(n|v|vt|vi|a|adj|adv|num|pron|prep|conj|art|int)\.\s*', '', definition).strip()
    if not word or len(word) > 40: return None
    return {
        'no': num,
        'word': word,
        'phonetic': phonetic,
        'partOfSpeech': POS_MAP.get(pos_raw, 'noun'),
        'definition': definition,
        'raw': clean(rest)[:200],
    }

def main():
    src = sys.argv[1]
    out = sys.argv[2]
    s = io.open(src, encoding='utf-8').read()
    entries = []
    for line in s.split('\n'):
        e = parse_line(line)
        if e: entries.append(e)
    # 去重（按 word 小写）
    seen = set(); unique = []
    for e in entries:
        key = e['word'].lower()
        if key in seen: continue
        seen.add(key)
        unique.append(e)
    io.open(out, 'w', encoding='utf-8').write(json.dumps(unique, ensure_ascii=False, indent=1))
    print(f'解析 {len(entries)} 条 → 去重后 {len(unique)} 条')
    print('词性分布:', dict(collections.Counter(e['partOfSpeech'] for e in unique)))
    print('无释义:', sum(1 for e in unique if not e['definition']))
    print('样例:')
    for e in unique[:8]:
        print(f"  {e['no']}. {e['word']} {e['phonetic']} {e['partOfSpeech']}. {e['definition'][:40]}")

if __name__ == '__main__':
    main()
