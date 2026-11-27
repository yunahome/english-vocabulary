#!/usr/bin/env python3
"""清洗《小学英语词汇_两份资料整合版.xlsx》导出的数据。

规则：
1. 词性统一为标准英文（noun/verb/adjective/adverb...），多词性分号分隔
2. 音标统一为 /.../ 标准格式（方括号转斜杠），保留英美拼写差异
3. definition 列改名为 meaning，剥离音标与词性缩写，只保留中文释义
4. example 中的中文翻译迁移到 exampleTranslation（替换原值）
5. 英文释义由 AI 分批补齐（本脚本只标记缺失，见 enrich 阶段）
6. 中文释义合并重复/相近（本脚本做规范化归一，语义合并见 AI 阶段）
"""
import json, io, re, sys, collections

SRC = 'data/integration/source-rows.json'
OUT = 'data/integration/cleaned-rows.json'

# 词性中文缩写 → 标准英文
POS_MAP = {
    '名': 'noun', '动': 'verb', '形': 'adjective', '副': 'adverb',
    '介': 'preposition', '连': 'conjunction', '代': 'pronoun',
    '数': 'numeral', '冠': 'article', '限定词': 'determiner',
    '感叹词': 'interjection', 'int': 'interjection',
}
# 已经是英文的标准化（兼容复数/缩写）
POS_EN = {
    'n': 'noun', 'v': 'verb', 'vt': 'verb', 'vi': 'verb',
    'a': 'adjective', 'adj': 'adjective', 'adv': 'adverb',
    'prep': 'preposition', 'pron': 'pronoun', 'conj': 'conjunction',
    'art': 'article', 'num': 'numeral', 'det': 'determiner',
    'noun': 'noun', 'verb': 'verb', 'adjective': 'adjective',
    'adverb': 'adverb', 'preposition': 'preposition',
    'pronoun': 'pronoun', 'conjunction': 'conjunction',
    'article': 'article', 'numeral': 'numeral',
    'determiner': 'determiner', 'interjection': 'interjection',
}

# definition 中的词性缩写 token（用于剥离）
POS_TOKENS = set(POS_MAP.keys()) | set(POS_EN.keys())

IPA_RE = re.compile(r'\[[^\]]*\]|/[^/]+/')
CN_RE = re.compile(r'[\u4e00-\u9fff]')


def normalize_pos(raw):
    """词性标准化：返回 'noun; verb' 形式，未知保留原文。"""
    if not raw:
        return ''
    parts = [p.strip() for p in re.split(r'[；;]', str(raw)) if p.strip()]
    out = []
    for p in parts:
        low = p.lower()
        if low in POS_EN:
            out.append(POS_EN[low])
        elif p in POS_MAP:
            out.append(POS_MAP[p])
        else:
            out.append(p)  # 保留未知，后续人工看
    # 去重保持顺序
    seen = set()
    uniq = []
    for p in out:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return '; '.join(uniq)


def normalize_ipa(raw):
    """音标统一为 /.../ 格式；[ə] / [æn] → /ə/ / /æn/。"""
    if not raw:
        return ''
    s = str(raw).strip()
    # 已是斜杠格式
    if s.startswith('/') and s.endswith('/'):
        return s
    # 方括号格式：[ə] / [æn] → /ə/ / /æn/
    def repl(m):
        t = m.group(0)
        if t.startswith('['):
            return '/' + t[1:-1].strip() + '/'
        return t
    s = re.sub(r'\[[^\]]*\]', repl, s)
    # 清理多余空格
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def strip_ipa_and_pos(defn, pos_raw):
    """从 definition 剥离音标与词性缩写，保留中文释义（多词义用；分隔）。"""
    if not defn:
        return ''
    s = str(defn).strip()
    # 1. 去音标块
    s = IPA_RE.sub(' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    # 2. 去词性缩写 token，并在此处插入分号分隔（保留多词义边界）
    #    形如 "介 关于 副 大约" → "关于; 大约"
    #    形如 "形 能；聪明能干的" → "能; 聪明能干的"
    tokens = re.split(r'(\s+|[；;，,。])', s)
    kept = []
    for t in tokens:
        t2 = t.strip()
        if t2 in POS_TOKENS and t == t2:
            kept.append(' ; ')  # 词性位置转成词义分隔
        else:
            kept.append(t)
    s = ''.join(kept)
    # 3. 去掉开头的孤立斜杠（音标 [ə]/[æn] 剥离后残留的 /）
    s = re.sub(r'^\s*/\s*', '', s)
    s = re.sub(r'\s+', ' ', s).strip()
    # 4. 统一分号、清理连续/首尾分号
    s = s.replace('；', ';').replace('，', ',')
    s = re.sub(r';\s*;', ';', s)       # 连续分号合并
    s = re.sub(r';\s*', '; ', s)
    s = s.strip(' ;')
    return s


def split_example_cn(ex, trans):
    """把 example 中的中文迁移到 exampleTranslation（替换原值）。
    返回 (英文例句, 中文翻译)。"""
    if not ex:
        return '', trans
    s = str(ex)
    # 清理引用标记如 [1]
    s = re.sub(r'\[\d+\]', '', s)
    # 找出中文片段（含中文标点）
    cn_parts = []
    def grab(m):
        cn_parts.append(m.group(0))
        return ' '
    s_en = re.sub(r'[\u4e00-\u9fff][\u4e00-\u9fff\u3000-\u303f，。！？；：、（）\s]*', grab, s)
    s_en = re.sub(r'\s+', ' ', s_en).strip()
    cn = ''.join(cn_parts).strip()
    cn = re.sub(r'\s+', '', cn)
    if cn:
        # 用户要求：替换掉 exampleTranslation 原内容
        return s_en, cn
    return s_en, trans


def main():
    data = json.load(io.open(SRC, encoding='utf-8'))
    stats = collections.Counter()
    for d in data:
        # 1. 词性
        old_pos = d.get('partOfSpeech', '')
        new_pos = normalize_pos(old_pos)
        if old_pos != new_pos:
            stats['pos_changed'] += 1
        if not new_pos:
            stats['pos_empty'] += 1
        d['partOfSpeech'] = new_pos

        # 2. 音标
        old_ipa = d.get('phonetic', '')
        new_ipa = normalize_ipa(old_ipa)
        if old_ipa != new_ipa:
            stats['ipa_changed'] += 1
        d['phonetic'] = new_ipa

        # 3. definition → meaning（剥离音标+词性）
        old_def = d.get('definition', '')
        new_meaning = strip_ipa_and_pos(old_def, old_pos)
        if IPA_RE.search(str(old_def)):
            stats['def_had_ipa'] += 1
        d['meaning'] = new_meaning
        # 保留 definition 键名兼容？用户要求改名，删除旧键
        if 'definition' in d:
            del d['definition']

        # 4. example 中文迁移
        old_ex = d.get('example', '')
        old_trans = d.get('exampleTranslation', '')
        new_ex, new_trans = split_example_cn(old_ex, old_trans)
        if CN_RE.search(str(old_ex)):
            stats['ex_had_cn'] += 1
            if old_trans:
                stats['ex_cn_replaced_trans'] += 1
        d['example'] = new_ex
        d['exampleTranslation'] = new_trans

        # 5. 标记英文释义缺失
        if not str(d.get('englishDefinition', '')).strip():
            stats['en_def_missing'] += 1

    json.dump(data, io.open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('清洗完成:', OUT, len(data))
    print('统计:', dict(stats))
    # 抽样
    print('\n=== 抽样前 8 ===')
    for d in data[:8]:
        print(f"  {d['word']:12} | pos={d['partOfSpeech']:20} | ipa={d['phonetic']:18} | meaning={d['meaning'][:30]}")
    print('\n=== 抽样后块 5 ===')
    for d in data[1071:1076]:
        print(f"  {d['word']:12} | pos={d['partOfSpeech']:20} | ipa={d['phonetic']:18} | meaning={d['meaning'][:30]}")
    print('\n=== 例句迁移抽样 ===')
    n = 0
    for d in data:
        if d.get('exampleTranslation') and CN_RE.search(str(d['example'])) is None:
            print(f"  {d['word']:10} | ex={d['example'][:45]!r} | trans={d['exampleTranslation'][:35]!r}")
            n += 1
            if n >= 6: break


if __name__ == '__main__':
    main()
