import React from 'react';

interface TokenArtProps {
  src?: string;
  fallback: React.ReactNode;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  fallbackStyle?: React.CSSProperties;
}

export const TokenArt: React.FC<TokenArtProps> = ({
  src,
  fallback,
  alt = '',
  title,
  className,
  style,
  imgStyle,
  fallbackStyle,
}) => {
  const [loaded, setLoaded] = React.useState(Boolean(src));

  React.useEffect(() => {
    setLoaded(Boolean(src));
  }, [src]);

  return (
    <span
      className={className}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style,
      }}
    >
      {src && loaded ? (
        <img
          src={src}
          alt={alt}
          draggable={false}
          onError={() => setLoaded(false)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            ...imgStyle,
          }}
        />
      ) : (
        <span style={fallbackStyle}>{fallback}</span>
      )}
    </span>
  );
};
