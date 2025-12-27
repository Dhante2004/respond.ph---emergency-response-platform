import React, { useState } from "react";

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  const ONLINE_LOGO =
    "https://raw.githubusercontent.com/Dhante2004/respond-ph-assets/main/logo.png";

  const LOCAL_LOGO = "/logo-local.png";

  const [src, setSrc] = useState(ONLINE_LOGO);

  return (
    <div
      className={`${className} flex items-center justify-center overflow-hidden rounded-xl shadow-lg bg-rose-600`}
    >
      <img
        src={src}
        alt="RESPOND.PH Logo"
        className="w-full h-full object-contain"
        onError={() => setSrc(LOCAL_LOGO)}
      />
    </div>
  );
};

export default Logo;
