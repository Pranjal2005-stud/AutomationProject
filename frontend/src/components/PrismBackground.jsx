import Prism from './Prism'

export default function PrismBackground() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      pointerEvents: 'none',
    }}>
      <Prism
        animationType="3drotate"
        timeScale={0.5}
        height={3.5}
        baseWidth={5.5}
        scale={3.6}
        hueShift={0}
        colorFrequency={1}
        noise={0}
        glow={1}
        bloom={1}
        transparent={true}
      />
    </div>
  )
}
