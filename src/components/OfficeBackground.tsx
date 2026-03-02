export default function OfficeBackground() {
  return (
    <>
      {/* 云朵 */}
      <div style={{
        position: 'fixed', top: 60, left: 0, right: 0,
        height: 80, pointerEvents: 'none', zIndex: 0,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '0 40px'
      }}>
        {['☁️','☁️','☁️','☁️'].map((c, i) => (
          <span key={i} style={{
            fontSize: i % 2 === 0 ? 28 : 22,
            opacity: i % 2 === 0 ? 0.55 : 0.35,
            animation: `cloud-drift ${14 + i * 3}s linear infinite`,
            animationDelay: `${i * -4}s`
          }}>{c}</span>
        ))}
      </div>

      {/* 装饰物 */}
      <div className="office-decor left">🪴</div>
      <div className="office-decor right">🗄️</div>

      <style>{`
        @keyframes cloud-drift {
          from { transform: translateX(-20px); }
          to   { transform: translateX(20px); }
        }
      `}</style>
    </>
  )
}
