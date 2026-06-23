// SENDISTRI star logo — green rounded square with a white 5-point star,
// extracted from the client maquette.
interface BrandStarProps {
  size?: number;
  radius?: number;
}

export function BrandStar({ size = 38, radius = 11 }: BrandStarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'linear-gradient(135deg,#0E8A4F,#0A6B3D)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 100 100">
        <polygon
          points="50,8 61,38 93,40 68,60 76,92 50,73 24,92 32,60 7,40 39,38"
          fill="#fff"
        />
      </svg>
    </div>
  );
}

export function BrandStarLg() {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 15,
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={30} height={30} viewBox="0 0 100 100">
        <polygon
          points="50,8 61,38 93,40 68,60 76,92 50,73 24,92 32,60 7,40 39,38"
          fill="#fff"
        />
      </svg>
    </div>
  );
}
