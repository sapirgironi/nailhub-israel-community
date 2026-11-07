import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { useQuery } from "@tanstack/react-query";
import { photoUrl } from "@/lib/media";

type PhotoImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
};

export function PhotoImage({ src, alt, loading = "lazy", ...props }: PhotoImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(loading === "eager");
  const needsAuthenticatedRead =
    src?.startsWith("https://res.cloudinary.com/") || src?.startsWith("community-work/");

  useEffect(() => {
    if (!src || loading === "eager") {
      setVisible(true);
      return;
    }

    const image = imageRef.current;
    if (!image || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [loading, src]);

  const resolved = useQuery({
    queryKey: ["authenticated-photo", src],
    enabled: Boolean(src && needsAuthenticatedRead && visible),
    queryFn: async () => {
      if (!src) throw new Error("כתובת התמונה חסרה");
      const url = await photoUrl(src);
      if (!url) throw new Error("טעינת התמונה נכשלה");
      return url;
    },
    staleTime: 5 * 60_000,
    gcTime: 60_000,
    retry: 1,
  });

  const imageSource = src ? (needsAuthenticatedRead ? resolved.data : src) : undefined;

  return (
    <img
      {...props}
      ref={imageRef}
      src={imageSource}
      alt={resolved.isError ? `${alt} — טעינת התמונה נכשלה` : alt}
      loading={loading}
      decoding="async"
      draggable={false}
    />
  );
}
