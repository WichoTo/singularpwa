import React, { useEffect, useState } from 'react'
import { Box, CircularProgress } from '@mui/material'
import { getSignedUrl } from '../../config/hooks/useUtilsFunctions'

interface SignedImageProps {
  /** Path en el bucket, o URL absoluta (signed URL) */
  path: string
  /** Nombre del bucket en Supabase */
  bucket: string
  /** Texto alternativo para la imagen */
  alt: string
  /** Estilos a aplicar al Box */
  sx?: any
  /** Callback al hacer click */
  onClick?: () => void
}

/**
 * Componente reutilizable que muestra una imagen privada de Supabase.
 * - Si `path` es una signed URL, extrae el key interno y genera una nueva URL.
 * - Si `path` es un key relativo, genera la URL firmada.
 */
const SignedImage: React.FC<SignedImageProps> = ({ path, bucket, alt, sx, onClick }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!path) {
      setUrl(null)
      return
    }

    // Definir key interno: si recibimos URL completa, extraemos path tras /{bucket}/
    let internalKey = path
    if (path.startsWith('http')) {
      try {
        const u = new URL(path)
        const segments = u.pathname.split('/')
        const idx = segments.findIndex(seg => seg === bucket)
        if (idx >= 0) {
          // todo lo que viene después del bucket
          internalKey = segments.slice(idx + 1).join('/')
        }
      } catch (e) {
        console.warn('SignedImage: error al parsear URL', e)
      }
    }

    setLoading(true)
    getSignedUrl(internalKey, bucket)
      .then(signed => {
        if (mounted && signed) {
          setUrl(signed)
        }
      })
      .catch(err => console.error('Error generando URL firmada en SignedImage:', err))
      .finally(() => mounted && setLoading(false))

    return () => { mounted = false }
  }, [path, bucket])

  if (loading) return <CircularProgress size={24} />
  if (!url) return null

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      sx={sx}
      onClick={onClick}
    />
  )
}

export default SignedImage
