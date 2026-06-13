'use client'
export function EmptyState({
  message, subText, ctaLabel, onCta,
}: { message: string; subText?: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <div className="empty">
      <div className="bw"><span className="halo" /><img src="/avatars/bear-black.png" alt="" /></div>
      <div className="msg">{message}</div>
      {subText && <div className="sub">{subText}</div>}
      {ctaLabel && onCta && <button className="cta" onClick={onCta}>{ctaLabel}</button>}
      <style jsx>{`
        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 30px;gap:4px;min-height:340px}
        .bw{position:relative;width:140px;height:140px;display:flex;align-items:center;justify-content:center;margin-bottom:8px}
        .halo{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,rgba(201,162,39,.14),transparent 68%)}
        .bw img{height:120px;position:relative;z-index:1;filter:drop-shadow(0 8px 16px rgba(0,0,0,.18))}
        .msg{font-size:15px;font-weight:600;color:#1f2d24;margin-top:4px}
        .sub{font-size:12px;color:#6b7a70;line-height:1.7;margin-top:6px}
        .cta{margin-top:18px;background:linear-gradient(145deg,#e3cd82,#c9a227);color:#10271a;font-weight:700;font-size:13px;border:none;padding:11px 22px;border-radius:12px;cursor:pointer}
      `}</style>
    </div>
  )
}
