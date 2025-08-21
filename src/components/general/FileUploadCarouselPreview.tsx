import React, { useEffect, useState,type ChangeEvent } from 'react';
import { Box, Button, IconButton, Typography, useTheme } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {type DocumentW } from '../../config/types';
import { getSignedUrl } from '../../config/hooks/useUtilsFunctions';

interface FileUploadCarouselProps {
  value?: DocumentW | DocumentW[];
  onChange: (file: File | File[]) => void;
  onDelete?: (doc: DocumentW) => void;
  multiple?: boolean;
  accept?: string;
  width?: number;
  height?: number;
  disabled?: boolean;
}

const FileUploadCarouselPreview: React.FC<FileUploadCarouselProps> = ({
  value,
  onChange,
  onDelete,
  accept = 'image/*,.pdf',
  width = 200,
  height = 150,
  multiple = false,
  disabled = false,
}) => {
  const theme = useTheme();
  const [items, setItems] = useState<DocumentW[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Normalize value to array
  useEffect(() => {
    const arr = Array.isArray(value) ? value : value ? [value] : [];
    setItems(arr);
    setCurrentIndex(0);
  }, [value]);

  // Fetch signed URLs for remote docs
  useEffect(() => {
    items.forEach((val) => {
      if (val.path && val.bucket && !(val.file instanceof File)) {
        getSignedUrl(val.path, val.bucket)
          .then(url => {
            if (url) setSignedUrls(prev => ({ ...prev, [val.id]: url }));
          })
      }
    });
  }, [items]);

  const handlePrev = () => {
    setCurrentIndex(i => (i - 1 + items.length) % items.length);
  };
  const handleNext = () => {
    setCurrentIndex(i => (i + 1) % items.length);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = e.target.files;
    if (files) onChange(multiple ? Array.from(files) : files[0]);
  };

  const current = items[currentIndex];
  const localUrl = current?.file instanceof File ? URL.createObjectURL(current.file) : '';
  const previewUrl = localUrl || (current && signedUrls[current.id]) || '';
  const isPDF = current?.nombre.toLowerCase().endsWith('.pdf');

  return (
    <Box>
      <Button
        variant="outlined"
        component="label"
        startIcon={<CloudUploadIcon />}
        disabled={disabled}
        sx={{
          textTransform: 'none',
          borderColor: theme.palette.primary.main,
          color: theme.palette.primary.main,
          mb: 1,
        }}
      >
        Subir archivo{multiple ? 's' : ''}
        <input
          type="file"
          hidden
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={handleFileSelect}
        />
      </Button>

      {items.length > 0 ? (
        <Box position="relative" width={width} height={height}>
          {/* Carousel controls */}
          {items.length > 1 && (
            <>
              <IconButton
                size="small"
                onClick={handlePrev}
                sx={{ position: 'absolute', top: '50%', left: 0, transform: 'translateY(-50%)', zIndex: 1 }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleNext}
                sx={{ position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)', zIndex: 1 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          )}

          {/* Delete icon */}
          {onDelete && current && (
            <IconButton
              size="small"
              onClick={() => onDelete(current)}
              sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(255,255,255,0.7)', zIndex: 2, p: 0.5 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          )}

          {/* Preview content */}
          {previewUrl ? (
            isPDF ? (
              <object data={previewUrl} type="application/pdf" width={width} height={height}>
                <Typography variant="caption">PDF no compatible</Typography>
              </object>
            ) : (
              <Box component="img" src={previewUrl} alt={current?.nombre} sx={{ width, height, objectFit: 'cover', borderRadius: 2 }} />
            )
          ) : (
            <Typography variant="caption" sx={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Cargando...
            </Typography>
          )}

          {/* Indicators */}
          {items.length > 1 && (
            <Box position="absolute" bottom={4} left="50%" sx={{ transform: 'translateX(-50%)' }} display="flex" gap={0.5}>
              {items.map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: idx === currentIndex ? theme.palette.primary.main : theme.palette.action.disabled,
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

export default FileUploadCarouselPreview;
