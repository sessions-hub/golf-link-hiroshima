'use client'
import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import type { Gender } from '@/lib/avatars'

interface MatchUser { nickname: string; gender: Gender; avatarUrl?: string | null; characterId?: string | null }

function toGender(g?: string | null): Gender {
  if (g === 'female') return 'female'
  return 'male'
}

export function MatchSuccessModal({
  me, partner, points = 20, onMessage, onClose,
}: { me: MatchUser; partner: MatchUser; points?: number; onMessage: () => void; onClose: () => void }) {
  const [show, setShow] = useState(false)
  useEffect(() => { const r = requestAnimationFrame(() => setShow(true)); return () => cancelAnimationFrame(r) }, [])

  const confetti = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    left: Math.random() * 100, color: ['#c9a227','#e3cd82','#f3ecd9','#f6c9da'][i % 4],
    dur: 1.8 + Math.random() * 1.4, del: 1.0 + Math.random() * 0.8, round: Math.random() > .5,
  })), [])
  const sparks = useMemo(() => [[18,22],[78,26],[26,40],[72,42],[15,55],[82,58],[40,16],[60,18]]
    .map(p => ({ left: p[0], top: p[1], del: 0.9 + Math.random() * 0.9, size: 10 + Math.random() * 10 })), [])

  return (
    <div className={`mmodal ${show ? 'play' : ''}`} role="dialog" aria-modal="true">
      <div className="glow" />
      <div className="fx">
        {confetti.map((c, i) => (
          <span key={i} className="confetti"
            style={{ left:`${c.left}%`, background:c.color, borderRadius:c.round?'50%':'1px', ['--dur' as any]:`${c.dur}s`, ['--del' as any]:`${c.del}s` }} />
        ))}
        {sparks.map((s, i) => (
          <span key={i} className="spark"
            style={{ left:`${s.left}%`, top:`${s.top}%`, fontSize:`${s.size}px`, ['--del' as any]:`${s.del}s` }}>✦</span>
        ))}
      </div>

      <div className="stage">
        <div className="aw left">
          <Avatar size={128} nickname={partner.nickname} gender={toGender(partner.gender)} avatarUrl={partner.avatarUrl} characterId={partner.characterId} />
        </div>
        <div className="aw right">
          <Avatar size={128} nickname={me.nickname} gender={toGender(me.gender)} avatarUrl={me.avatarUrl} characterId={me.characterId} />
        </div>
      </div>
      <div className="heart">♥</div>

      <div className="txt">
        <div className="mh">It&apos;s a Match!</div>
        <div className="sub">{partner.nickname}さんとフレンドになりました</div>
        <div><span className="pts">+{points} pt</span></div>
      </div>

      <div className="btns">
        <button className="btn p" onClick={onMessage}>メッセージを送る</button>
        <button className="btn s" onClick={onClose}>あとで</button>
      </div>

      <style jsx>{`
        .mmodal{position:fixed;inset:0;z-index:1000;overflow:hidden;
          background:radial-gradient(120% 80% at 50% 0%,#123a26 0%,#0a1f14 55%);
          display:flex;align-items:center;justify-content:center}
        .glow{position:absolute;left:50%;top:34%;width:340px;height:340px;transform:translate(-50%,-50%) scale(.4);
          background:radial-gradient(circle,rgba(201,162,39,.30),transparent 65%);opacity:0}
        .fx{position:absolute;inset:0;pointer-events:none}
        .confetti{position:absolute;width:8px;height:12px;top:-20px;opacity:0}
        .spark{position:absolute;color:#e3cd82;opacity:0}
        .stage{position:absolute;left:0;right:0;top:34%;transform:translateY(-50%);display:flex;justify-content:center;align-items:center;gap:40px}
        .aw{border-radius:50%;border:2.5px solid #c9a227;line-height:0;box-shadow:0 12px 34px rgba(0,0,0,.45);opacity:0}
        .heart{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%) scale(0);
          font-size:44px;line-height:1;color:#c9a227;filter:drop-shadow(0 4px 14px rgba(201,162,39,.7))}
        .txt{position:absolute;left:0;right:0;top:56%;text-align:center;padding:0 28px}
        .mh{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:40px;color:#c9a227;opacity:0;transform:scale(.6)}
        .sub{font-size:14px;color:#f3f1e9;margin-top:10px;opacity:0;transform:translateY(8px)}
        .pts{display:inline-block;margin-top:12px;font-family:monospace;font-size:13px;color:#10271a;font-weight:600;
          background:linear-gradient(145deg,#f0d985,#c9a227);padding:5px 16px;border-radius:20px;opacity:0;transform:translateY(8px)}
        .btns{position:absolute;left:24px;right:24px;bottom:48px;display:flex;flex-direction:column;gap:10px;max-width:420px;margin:0 auto}
        .btn{border:none;border-radius:14px;padding:14px 0;font-weight:700;font-size:14px;opacity:0;transform:translateY(12px);cursor:pointer}
        .btn.p{background:linear-gradient(145deg,#e3cd82,#c9a227);color:#10271a}
        .btn.s{background:transparent;border:1px solid rgba(255,255,255,.22);color:#f3f1e9}

        .play .glow{animation:glow 1.6s ease-out .15s forwards}
        .play .aw.left{animation:inL .8s cubic-bezier(.2,1.3,.4,1) .15s forwards}
        .play .aw.right{animation:inR .8s cubic-bezier(.2,1.3,.4,1) .15s forwards}
        .play .heart{animation:pop .5s cubic-bezier(.2,1.6,.4,1) .85s forwards}
        .play .mh{animation:popH .6s cubic-bezier(.2,1.5,.4,1) 1.0s forwards}
        .play .sub{animation:rise .5s ease-out 1.35s forwards}
        .play .pts{animation:rise .5s ease-out 1.55s forwards}
        .play .btn.p{animation:rise .5s ease-out 1.8s forwards}
        .play .btn.s{animation:rise .5s ease-out 1.95s forwards}
        .play .confetti{animation:fall var(--dur) linear var(--del) forwards}
        .play .spark{animation:twinkle 1.1s ease-out var(--del) forwards}

        @keyframes glow{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}40%{opacity:1}100%{opacity:.7;transform:translate(-50%,-50%) scale(1.1)}}
        @keyframes inL{0%{opacity:0;transform:translateX(-140px) rotate(-14deg) scale(.7)}100%{opacity:1;transform:translateX(0) rotate(-5deg) scale(1)}}
        @keyframes inR{0%{opacity:0;transform:translateX(140px) rotate(14deg) scale(.7)}100%{opacity:1;transform:translateX(0) rotate(5deg) scale(1)}}
        @keyframes pop{0%{transform:translate(-50%,-50%) scale(0)}100%{transform:translate(-50%,-50%) scale(1)}}
        @keyframes popH{0%{opacity:0;transform:scale(.6)}100%{opacity:1;transform:scale(1)}}
        @keyframes rise{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes fall{0%{opacity:0;transform:translateY(-20px) rotate(0)}10%{opacity:1}100%{opacity:1;transform:translateY(110vh) rotate(540deg)}}
        @keyframes twinkle{0%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1.3)}100%{opacity:0;transform:scale(.6)}}

        @media (prefers-reduced-motion: reduce){
          .glow,.aw.left,.aw.right,.heart,.mh,.sub,.pts,.btn,.confetti,.spark{animation:none!important;opacity:1!important;transform:none!important}
          .heart{transform:translate(-50%,-50%)!important}
          .glow{transform:translate(-50%,-50%)!important}
        }
      `}</style>
    </div>
  )
}
