import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import "./LogoBar.css";

const LogoBar = () => {
  const location = useLocation();
  const [showBar, setShowBar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const logoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollY) {
        setShowBar(false);
      } else {
        setShowBar(true);
      }
      setLastScrollY(currentScroll);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Logo animation avec GSAP (effet liquide style rebond)
  useEffect(() => {
    if (logoRef.current) {
      gsap.to(logoRef.current, {
        scaleY: 1.4,
        scaleX: 0.9,
        y: 5,
        duration: 0.6,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      });
    }
  }, []);

  const shouldHide = location.pathname.startsWith("/profile");
  if (shouldHide) return null;

  return (
    <div className={`logo-bar-container ${showBar ? "visible" : "hidden"}`}>
      <div className="logo-wrapper">
        <div className="logo-liquid" ref={logoRef}>
          O
        </div>
      </div>
    </div>
  );
};

export default LogoBar;
