import { ReactNode, useEffect, useState } from 'react';
import { BorderBeam } from 'border-beam';
import { Liquid } from 'liquid-gooey';
import { ThinkingOrb } from 'thinking-orbs';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Atmosphere() {
  const [drift, setDrift] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => setDrift((on) => !on), 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="atmosphere" aria-hidden>
      <div className="goo-wrap">
      <Liquid
        className="goo"
        style={{ width: '100%', height: '100%' }}
        blur={20}
        contrast={16}
        fill="#ffffff"
        waviness={10}
        filterPadding={90}
      >
        <Liquid.Item className="blob-slot blob-a" x={drift ? 36 : 0} y={drift ? 28 : 0} transition="smooth">
          <div className="blob blob-lg" />
        </Liquid.Item>
        <Liquid.Item className="blob-slot blob-b" x={drift ? -28 : 8} y={drift ? -22 : 0} transition="smooth" delay={90}>
          <div className="blob blob-xl" />
        </Liquid.Item>
        <Liquid.Item className="blob-slot blob-c" x={drift ? 22 : -10} y={drift ? -18 : 12} transition="smooth" delay={180}>
          <div className="blob blob-sm" />
        </Liquid.Item>
      </Liquid>
      </div>
      <div className="orb orb-tl">
        <ThinkingOrb state="breathing" size={64} theme="dark" speed={0.7} />
      </div>
      <div className="orb orb-tr">
        <ThinkingOrb state="searching" size={64} theme="dark" speed={0.8} />
      </div>
      <div className="orb orb-br">
        <ThinkingOrb state="weaving" size={64} theme="dark" speed={0.75} />
      </div>
    </div>
  );
}

export function Beam({
  children,
  size = 'md',
  radius,
  className,
}: {
  children: ReactNode;
  size?: 'sm' | 'md';
  radius?: number;
  className?: string;
}) {
  return (
    <BorderBeam
      size={size}
      colorVariant="ocean"
      theme="dark"
      strength={size === 'md' ? 0.86 : 0.7}
      brightness={1.45}
      duration={size === 'md' ? 4.4 : 3.4}
      borderRadius={radius}
      className={className}
    >
      {children}
    </BorderBeam>
  );
}

export function Page({ children }: { children?: ReactNode }) {
  return (
    <main className="page">
      <Atmosphere />
      <h1 className="mark enter">crea</h1>
      {children}
    </main>
  );
}
