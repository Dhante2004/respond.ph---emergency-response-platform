import React, { useState } from "react";

interface LogoProps {
  className?: string;
  onlineLogo?: string; // optional prop to override
  localLogo?: string;  // optional prop to override
}

const Logo: React.FC<LogoProps> = ({
  className = "w-10 h-10",
  onlineLogo = "https://raw.githubusercontent.com/Dhante2004/respond-ph-assets/main/logo.png",
  localLogo = "/logo-local.png", // must exist in public/
}) => {
  const [src, setSrc] = useState(onlineLogo);

  // Handler ensures fallback works only once
  const handleError = () => {
    if (src !== localLogo) setSrc(localLogo);
  };

  return (
    <div
      className={`${className} flex items-center justify-center overflow-hidden rounded-xl shadow-lg bg-rose-600`}
    >
      <img
        src={src}
        alt="RESPOND.PH Logo"
        className="w-full h-full object-contain"
        onError={handleError}
      />
    </div>
  );
};

export default Logo;
