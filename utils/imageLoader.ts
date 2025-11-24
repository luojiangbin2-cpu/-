
export const loadedImages: Record<string, HTMLImageElement> = {};

export const preloadImages = (assets: Record<string, string>): Promise<void> => {
  const promises = Object.entries(assets).map(([key, src]) => {
    if (!src) return Promise.resolve(); // Skip empty URLs
    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedImages[key] = img;
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load image for key: ${key}`);
        resolve(); // Resolve anyway to let game start without this image
      };
    });
  });

  return Promise.all(promises).then(() => {});
};

export const getImage = (key: string): HTMLImageElement | undefined => {
  return loadedImages[key];
};
