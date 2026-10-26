import { ReactNode } from 'react';
import { BorderBeam } from 'border-beam';
import { ThinkingOrb } from 'thinking-orbs';

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
      <div className="brand enter">
        <div className="orb" aria-hidden>
          <ThinkingOrb state="searching" size={32} theme="dark" />
        </div>
        <h1 className="mark">crea</h1>
      </div>
      {children}
    </main>
  );
}
