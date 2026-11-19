import { ImageResponse } from 'next/og';

export const alt =
  'Tamim Hossen — Full-Stack Engineer and Creative Developer';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '76px',
          backgroundColor: '#080b10',
          color: '#f4f4f6',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            letterSpacing: '0.24em',
            color: '#b8bac8',
          }}
        >
          PORTFOLIO / DIGITAL PRODUCTS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 78,
              fontWeight: 600,
              letterSpacing: '-0.05em',
            }}
          >
            Tamim Hossen
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: '#b8bac8' }}>
            Full-Stack Engineer &amp; Creative Developer
          </div>
        </div>
      </div>
    ),
    size,
  );
}
