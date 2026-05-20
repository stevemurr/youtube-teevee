import { useEffect, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const useYouTubeLoader = (): boolean => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (window.YT) {
      setIsReady(true);
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = () => setIsReady(true);
  }, []);

  return isReady;
};
