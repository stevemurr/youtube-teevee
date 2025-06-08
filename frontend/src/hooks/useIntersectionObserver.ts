import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverProps {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
}

export const useIntersectionObserver = <T extends Element>({
  threshold = 0,
  root = null,
  rootMargin = '50px',
}: UseIntersectionObserverProps = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const targetRef = useRef<T>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing to prevent re-renders
          if (targetRef.current) {
            observer.unobserve(targetRef.current);
          }
        }
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    const current = targetRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [threshold, root, rootMargin]);

  return { targetRef, isVisible };
};