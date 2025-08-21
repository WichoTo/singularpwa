import React, { useEffect, useState } from 'react';
import { Typography, Box } from '@mui/material';
import { type DocumentW } from '../../config/types';
import { getSignedUrl } from '../../config/hooks/useUtilsFunctions';

interface FileUploadPreviewProps {
  value?: DocumentW | DocumentW[];
  onChange: (file: File | File[]) => void;
  multiple?: boolean;
  accept?: string;
  width?: number;
  height?: number;
  disabled?: boolean; // ✅ nuevo
}
const FileUploadPreview: React.FC<FileUploadPreviewProps> = ({
  value,
  onChange,
  accept = 'image/*,.pdf',
  width = 100,
  height = 100,
  multiple = false,
  disabled,
}) => {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const values = Array.isArray(value) ? value : value ? [value] : [];
    values.forEach((val) => {
      if (val && val.path && val.bucket && !(val.file instanceof File)) {
        getSignedUrl(val.path, val.bucket)
          .then((url) => {
            if (url) {
              setSignedUrls((prev) => ({ ...prev, [val.id]: url }));
            } else {
            }
          });
      } 
    });
  }, [value]);

  const values = Array.isArray(value) ? value : value ? [value] : [];

  return (
    <Box>
      {onChange && (
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled} // ✅ aquí
          onChange={(e) => {
            if (disabled) return; // evita cambios si está deshabilitado
            const files = e.target.files;
            if (files) {
              onChange(multiple ? Array.from(files) : files[0]);
            }
          }}
        />
      )}

      {values.map((val) => {
        const localUrl = val.file instanceof File ? URL.createObjectURL(val.file) : '';
        const previewUrl = localUrl || signedUrls[val.id];
        const isPDF = val.nombre.toLowerCase().endsWith('.pdf');

        return previewUrl ? (
          isPDF ? (
            <object
              key={val.id}
              data={previewUrl}
              type="application/pdf"
              width={width}
              height={height}
            >
              <Typography variant="caption">PDF no compatible</Typography>
            </object>
          ) : (
            <img
              key={val.id}
              src={previewUrl}
              alt={val.nombre || 'preview'}
              width={width}
              height={height}
            />
          )
        ) : (
          val.path && (
            <Typography key={val.id} variant="caption">
              Cargando...
            </Typography>
          )
        );
      })}
    </Box>
  );
};

export default FileUploadPreview;