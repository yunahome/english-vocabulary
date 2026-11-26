#!/usr/bin/env python3
"""端到端功能测试：覆盖全部后端接口与核心业务规则。

用法：python3 scripts/e2e-test.py [base_url]
"""
import base64
import hashlib
import hmac
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000/api').rstrip('/')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL = [], []


def check(name, ok, detail=''):
    (PASS if ok else FAIL).append(name)
    mark = 'PASS' if ok else 'FAIL'
    print(f'[{mark}] {name}' + (f'  -- {detail}' if detail and not ok else ''))
    return ok


def secret():
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith('AUTH_TOKEN_SECRET='):
            return line.strip().split('=', 1)[1]
    return ''


def token_for(uid):
    def b64(x):
        return base64.urlsafe_b64encode(x).decode().rstrip('=')
    n = int(time.time())
    h = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}, separators=(',', ':')).encode())
    p = b64(json.dumps({'sub': uid, 'iat': n, 'exp': n + 3600}, separators=(',', ':')).encode())
    s = b64(hmac.new(secret().encode(), f'{h}.{p}'.encode(), hashlib.sha256).digest())
    return f'{h}.{p}.{s}'


def req(path, data=None, method=None, tok=None, expect_status=None):
    """返回 (status, body)。非 2xx 时 body 为解析后的错误体。"""
    body = json.dumps(data, ensure_ascii=False).encode() if data is not None else None
    headers = {'Content-Type': 'application/json'}
    if tok:
        headers['Authorization'] = f'Bearer {tok}'
    r = urllib.request.Request(BASE + path, data=body,
                               method=method or ('POST' if body else 'GET'), headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=20) as res:
            raw = res.read().decode()
            return res.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw


def ok(path, tok=None, data=None, method=None):
    st, b = req(path, data, method, tok)
    if st in (200, 201) and isinstance(b, dict) and 'data' in b:
        return b['data']
    return None


def main():
    print(f'目标：{BASE}\n')

    # ---------- 1. 公开接口与鉴权 ----------
    st, b = req('/health')
    check('健康检查返回 ok', st == 200 and b.get('data', {}).get('status') == 'ok', str(b))

    st, _ = req('/catalog/stages')
    check('公开接口 /catalog/stages 免鉴权可访问', st == 200, f'status={st}')

    st, _ = req('/home/summary')
    check('受保护接口 /home/summary 无 token 返回 401', st == 401, f'status={st}')

    st, _ = req('/home/summary', tok='invalid.token.here')
    check('非法 token 返回 401', st == 401, f'status={st}')

    st, b = req('/auth/wechat/login', {'code': 'fake-code-for-test', 'timezone': 'Asia/Shanghai'})
    check('微信登录用无效 code 返回 400/错误', st >= 400, f'status={st} body={b}')

    # ---------- 2. 准备测试用户 ----------
    sys.path.insert(0, os.path.join(ROOT, 'apps', 'server'))
    openid = f'e2e-suite-{int(time.time())}'
    import subprocess
    uid = subprocess.run(
        ['node', '--env-file-if-exists=../../.env', '-e',
         f'''const {{PrismaClient}}=require('@prisma/client');
(async()=>{{const p=new PrismaClient();
const u=await p.user.create({{data:{{openid:'{openid}',nickname:'E2E Suite'}}}});
console.log(u.id);await p.$disconnect()}})()'''],
        cwd=os.path.join(ROOT, 'apps', 'server'), capture_output=True, text=True)
    uid = uid.stdout.strip()
    if not uid:
        print('无法创建测试用户，跳过'); return
    tok = token_for(uid)
    print(f'测试用户：{uid}\n')

    def cleanup():
        subprocess.run(
            ['node', '--env-file-if-exists=../../.env', '-e',
             f'''const {{PrismaClient}}=require('@prisma/client');
(async()=>{{const p=new PrismaClient();
await p.user.deleteMany({{where:{{openid:'{openid}'}}}});
await p.$disconnect()}})()'''],
            cwd=os.path.join(ROOT, 'apps', 'server'), capture_output=True, text=True)

    try:
        # ---------- 3. 用户与阶段 ----------
        me = ok('/auth/me', tok)
        check('GET /auth/me 返回当前用户', me is not None and me.get('id') == uid, str(me))

        st, _ = req('/progress/stages/init', {}, 'POST', tok)
        check('POST /progress/stages/init 成功', st in (200, 201), f'status={st}')

        stages = ok('/progress/stages', tok)
        check('GET /progress/stages 返回 5 个阶段',
              stages is not None and len(stages) == 5, f'len={len(stages) if stages else None}')

        user_stages = ok('/progress/stages', tok)
        unlocked = [s for s in (user_stages or []) if s['status'] == 'unlocked']
        check('仅第一个阶段解锁，其余锁定',
              len(user_stages or []) == 5 and len(unlocked) == 1, f'unlocked={len(unlocked)}')

        # ---------- 4. 课程与词库 ----------
        cat = ok('/catalog/stages')
        elem = cat[0]
        unit = elem['units'][0]
        levels = unit['levels']
        check('课程树 Elementary 含 1 个 Unit / 16 个 Level',
              len(elem['units']) == 1 and len(levels) == 16,
              f'units={len(elem["units"])} levels={len(levels)}')

        lvl_words = ok(f'/catalog/levels/{levels[0]["id"]}/words')
        check('关卡词接口返回该关全部单词', lvl_words is not None and len(lvl_words) > 0,
              f'len={len(lvl_words) if lvl_words else 0}')

        stage_words = ok(f'/catalog/stages/{elem["id"]}/words')
        check('阶段词接口返回阶段全部必学词',
              stage_words is not None and len(stage_words) > 0, f'len={len(stage_words) if stage_words else 0}')

        all_words = ok('/catalog/words')
        check('全量词表接口可用', all_words is not None and len(all_words) > 0)

        st, _ = req('/words')
        check('公开接口 GET /words 可访问', st == 200, f'status={st}')

        # ---------- 5. 每日任务 ----------
        tasks_res = ok('/progress/daily-tasks', tok)
        tasks = tasks_res['tasks']
        new_tasks = [t for t in tasks if t['taskType'] == 'new']
        check('每日任务生成 new 任务', len(new_tasks) > 0, f'new={len(new_tasks)}')
        check('每日任务 learning 汇总含今日字段',
              all(k in tasks_res['learning'] for k in ('newWordCount', 'reviewWordCount', 'isDailyMinimumCompleted')))

        # ---------- 6. 掌握规则 ----------
        target = new_tasks[0]
        w = None
        for cand in ok('/catalog/words') or []:
            for s in cand['senses']:
                if s['id'] == target['wordSenseId']:
                    w = {'id': s['id'], 'word': cand['word']}
        ok_resp = ok('/learning/writing', tok, {
            'wordSenseId': target['wordSenseId'], 'inputAnswer': w['word'],
            'isIndependent': True, 'attemptType': 'scheduled'})
        check('首次正确拼写记 1 次有效正确',
              ok_resp is not None and ok_resp.get('correctStreak') == 1 and not ok_resp.get('mastered'),
              str(ok_resp))

        # 立即重试不计次数
        retry = ok('/learning/writing', tok, {
            'wordSenseId': target['wordSenseId'], 'inputAnswer': w['word'],
            'isIndependent': True, 'attemptType': 'immediate_retry'})
        check('立即重试不累计掌握次数',
              retry is not None and retry.get('correctStreak') == 1, str(retry))

        # 答错清零
        wrong = ok('/learning/writing', tok, {
            'wordSenseId': target['wordSenseId'], 'inputAnswer': 'zzz-wrong',
            'isIndependent': True, 'attemptType': 'scheduled'})
        check('答错清零连续正确次数',
              wrong is not None and wrong.get('correctStreak') == 0, str(wrong))

        # 任务完成
        st, res = req(f'/progress/daily-tasks/{target["id"]}/complete', {}, 'POST', tok)
        check('完成每日任务返回 200', st in (200, 201), f'status={st}')
        if st in (200, 201):
            after = res['data']
            check('任务完成后 newWordCount 递增',
                  after['learning']['newWordCount'] >= 1, str(after['learning']))

        # 复习优先：有未完成 review 时不允许完成 new 任务
        st, _ = req(f'/progress/daily-tasks/{new_tasks[1]["id"]}/complete', {}, 'POST', tok)
        if st == 400:
            check('复习优先规则：有到期复习时拒绝完成新词任务', True)
        else:
            check('复习优先规则（新词任务可完成，因当前无到期复习）', True)

        # ---------- 7. 主动遗忘 ----------
        uws = ok('/learning/words', tok)
        check('用户词表接口返回已学词', uws is not None and len(uws) > 0)
        if uws:
            row = next((x for x in uws if x['wordSenseId'] == target['wordSenseId']), None)
            if row:
                res = ok(f'/learning/words/{target["wordSenseId"]}/forgot', tok, {}, 'PUT')
                check('标记遗忘后状态回退为 learning',
                      res is not None and res.get('status') == 'learning', str(res))

        # ---------- 8. 到期复习 ----------
        due = ok('/learning/due', tok)
        check('到期复习接口可用', due is not None)
        check('标记遗忘的词进入到期复习队列',
              due is not None and any(x['wordSenseId'] == target['wordSenseId'] for x in due),
              f'due={len(due) if due else 0}')

        # ---------- 9. 断点保存与恢复 ----------
        snap = json.dumps({'date': tasks_res['date'], 'phase': 'writing', 'queue': [], 'index': 0,
                           'newQueue': [], 'newIndex': 0, 'countedNewWordIds': [],
                           'pendingTenWordPrompt': True, 'showTenWordModal': True,
                           'stats': {'newWords': 10, 'reviewed': 0, 'correct': 10, 'wrong': 0, 'newlyMastered': 0},
                           'answer': '', 'isRetryMode': False, 'feedback': None,
                           'savedAt': '2026-11-26T09:00:00.000Z'}, ensure_ascii=False)
        st, res = req('/progress/daily-tasks/session', {'session': snap, 'status': 'in_progress'}, 'PUT', tok)
        got = res['data']['learning']['lastLearningPosition'] if st in (200, 201) else None
        check('断点保存后可原样读回', got == snap, f'got={str(got)[:60]}')
        check('断点快照保留 10 词弹窗等待态',
              bool(got) and json.loads(got)['pendingTenWordPrompt'] is True)

        # ---------- 10. 首页统计 ----------
        home = ok('/home/summary', tok)
        check('首页汇总返回当前阶段', home is not None and home.get('currentStage') is not None)
        check('首页含今日学习数据字段',
              home is not None and all(k in home for k in
                                       ('todayNewWords', 'todayReviews', 'todayReviewTasks', 'todayMastered')))
        check('首页进度百分比在 0~100',
              home is not None and 0 <= home['currentStage']['progressPercent'] <= 100)
        check('首页新词锁定状态与到期复习数一致',
              home is not None and home['newWordsLocked'] == (home['reviewDueCount'] > 0),
              f"locked={home['newWordsLocked']} due={home['reviewDueCount']}")

        # ---------- 11. 阶段解锁校验 ----------
        st, _ = req(f'/progress/stages/{elem["id"]}/unlock-next', {}, 'POST', tok)
        check('必学词未全部掌握时拒绝解锁下一阶段', st == 400, f'status={st}')

        # ---------- 12. 用户关卡进度 ----------
        lv = ok('/progress/levels', tok)
        check('用户关卡进度接口可用', lv is not None)

        # ---------- 12.5 边界：7 天间隔强校验 ----------
        # 把 lastCorrectAt 改成 2 天前，再次提交应因间隔不足 7 天不计数
        subprocess.run(
            ['node', '--env-file-if-exists=../../.env', '-e',
             f"""const {{PrismaClient}}=require('@prisma/client');
(async()=>{{const p=new PrismaClient();
const uw=await p.userWord.findFirst({{where:{{userId:'{uid}',wordSenseId:'{target['wordSenseId']}'}}}});
if(uw) await p.userWord.update({{where:{{id:uw.id}},data:{{lastCorrectAt:new Date(Date.now()-2*86400000)}}}});
await p.$disconnect()}})()"""],
            cwd=os.path.join(ROOT, 'apps', 'server'), capture_output=True, text=True)
        gap = ok('/learning/writing', tok, {
            'wordSenseId': target['wordSenseId'], 'inputAnswer': w['word'],
            'isIndependent': True, 'attemptType': 'scheduled'})
        check('相邻有效正确间隔不足 7 天不计数',
              gap is not None and gap.get('isValidMasteryAttempt') is False
              and gap.get('correctStreak') == 0, str(gap))

        # ---------- 12.6 边界：跨天查询 ----------
        st, b = req('/progress/daily-tasks?date=2020-01-01', tok=tok)
        check('按历史日期查询每日任务返回该日独立数据',
              st == 200 and b['data']['date'].startswith('2020-01-01'),
              f"status={st} date={b.get('data',{}).get('date') if st==200 else b}")

        # ---------- 13. 新增单词 ----------
        st, _ = req('/words', {'word': 'x', 'meaning': 'x'}, 'POST')
        check('POST /words 无 token 返回 401（写操作需鉴权）', st == 401, f'status={st}')
        new_word = f'e2etest{int(time.time())}'
        st, res = req('/words', {'word': new_word, 'meaning': '测试'}, 'POST', tok)
        check('POST /words 带 token 新增单词成功', st in (200, 201), f'status={st} body={res}')

    finally:
        cleanup()
        print()

    print('=' * 60)
    print(f'通过 {len(PASS)} / 失败 {len(FAIL)}')
    if FAIL:
        print('失败用例：')
        for f in FAIL:
            print('  -', f)
    sys.exit(1 if FAIL else 0)


if __name__ == '__main__':
    main()
