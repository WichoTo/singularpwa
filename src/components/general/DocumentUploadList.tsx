// src/components/general/DocumentUploadList.tsx
import React, { useRef, useState, type ChangeEvent } from 'react'
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Typography,
  CircularProgress,
  Collapse,
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import {type DocumentW } from '../../config/types'
import { handleVerDocumento } from '../../config/hooks/useUtilsFunctions'

interface DocumentUploadListProps {
  /** Listado actual de documentos */
  documents: DocumentW[]
  /** Función que recibe FileList cuando se suben archivos */
  onUpload: (files: FileList) => Promise<void>
  /** Función opcional para eliminar un documento */
  onDelete?: (doc: DocumentW) => Promise<void>
  /** Máximo de archivos permitidos; p.ej. 1 para uno solo */
  maxFiles?: number
}

const DocumentUploadList: React.FC<DocumentUploadListProps> = ({
  documents,
  onUpload,
  onDelete,
  maxFiles,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState(true)

  // Determina si podemos subir más archivos
  const allowUpload = !uploading && (maxFiles == null || documents.length < maxFiles)
  // Si maxFiles es 1, deshabilitamos la selección múltiple
  const allowMultiple = maxFiles == null || maxFiles > 1

  const handleButtonClick = () => {
    if (inputRef.current) inputRef.current.click()
  }

  const handleFilesSelected = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      let filesToUpload: FileList
      if (allowMultiple) {
        filesToUpload = fileList
      } else {
        const dt = new DataTransfer()
        dt.items.add(fileList[0])
        filesToUpload = dt.files
      }
      await onUpload(filesToUpload)
      e.target.value = '' // permitir re-subir mismo archivo
    } finally {
      setUploading(false)
    }
  }

  const handleView = (doc: DocumentW) => {
    if (doc.file instanceof File || doc.file! instanceof Blob) {
      const url = URL.createObjectURL(doc.file)
      window.open(url, '_blank')
      return
    }
    if (doc.path && doc.bucket) {
      handleVerDocumento(doc.path, doc.bucket)
    }
  }


  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={1}>
        <Tooltip title={expanded ? 'Ocultar archivos' : 'Mostrar archivos'}>
          <IconButton onClick={() => setExpanded(prev => !prev)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Tooltip>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Archivos
        </Typography>
        <Tooltip title="Subir archivos">
          <span>
            <IconButton onClick={handleButtonClick} disabled={!allowUpload}>
              {uploading ? <CircularProgress size={24} /> : <CloudUploadIcon />}
            </IconButton>
          </span>
        </Tooltip>
        <Typography variant="body2" color="textSecondary">
          {documents.length} / {maxFiles ?? '∞'}
        </Typography>
        <input
          ref={inputRef}
          type="file"
          multiple={allowMultiple}
          hidden
          onChange={handleFilesSelected}
        />
      </Box>

      {/* Lista de archivos */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List dense>
          {documents.map(doc => (
            <ListItem key={doc.id} divider>
              <ListItemIcon>
                <IconButton onClick={() => handleView(doc)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </ListItemIcon>
              <ListItemText primary={doc.nombre} />
              {onDelete && (
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => onDelete(doc)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  )
}

export default DocumentUploadList
