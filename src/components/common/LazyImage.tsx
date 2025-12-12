import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
}

/**
 * ✅ Composant d'image avec lazy loading pour optimiser les performances mobile
 * Charge l'image uniquement quand elle est visible à l'écran
 */
export function LazyImage({
  src,
  alt,
  className = "",
  placeholder,
  onLoad,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: "50px" // Commencer à charger 50px avant que l'image soit visible
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
  };

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isInView && (
        // Placeholder pendant le chargement
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          {placeholder || <span className="text-4xl">⚽</span>}
        </div>
      )}
      
      {isInView && (
        <>
          {!isLoaded && !hasError && (
            // Skeleton pendant le chargement
            <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
              {placeholder || <span className="text-4xl">⚽</span>}
            </div>
          )}
          
          <motion.img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoaded ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            className={`w-full h-full object-cover ${className} ${isLoaded ? '' : 'invisible'}`}
            loading="lazy"
          />
          
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-4xl">❌</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

