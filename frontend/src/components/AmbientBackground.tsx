import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Hyper-vibrant Pop Glow Orbs */}
      <div 
        className="absolute -top-32 -left-32 w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full blur-[140px] opacity-35"
        style={{ background: 'radial-gradient(circle, #ff007f 0%, #b026ff 60%, transparent 100%)' }}
      />
      <div 
        className="absolute -bottom-32 -right-32 w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full blur-[150px] opacity-30"
        style={{ background: 'radial-gradient(circle, #00f0ff 0%, #7c3aed 60%, transparent 100%)' }}
      />
      <div 
        className="absolute top-1/3 right-1/4 w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full blur-[160px] opacity-25"
        style={{ background: 'radial-gradient(circle, #ffe600 0%, #ff007f 70%, transparent 100%)' }}
      />

      {/* Retro Pop Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 0, 127, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

    </div>
  );
};
