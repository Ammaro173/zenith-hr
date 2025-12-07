import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & { fallback: string };

export const Image = ({
  src,
  loading,
  alt,
  fallback,
  width = 200,
  height = 200,
  ...props
}: Props) => {
  const handleBrokenImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.target as HTMLImageElement;
    target.src = fallback;
  };

  if (!src) {
    return null;
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: allow onError fallback handling
    // biome-ignore lint/performance/noImgElement: //TODO
    <img
      alt={alt}
      height={height}
      loading={loading}
      onError={handleBrokenImage}
      src={src}
      width={width}
      {...props}
    />
  );
};
