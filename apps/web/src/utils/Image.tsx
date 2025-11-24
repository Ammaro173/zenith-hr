import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & { fallback: string };

export const Image = ({ src, loading, alt, fallback, ...props }: Props) => {
  const handleBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.target as HTMLImageElement;
    target.src = fallback;
  };

  if (!src) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: <wrapped>
    // biome-ignore lint/nursery/useImageSize: <wrapped>
    // biome-ignore lint/performance/noImgElement: <wrapped>
    <img
      alt={alt}
      loading={loading}
      onError={handleBrokenImage}
      src={src}
      {...props}
    />
  );
};
