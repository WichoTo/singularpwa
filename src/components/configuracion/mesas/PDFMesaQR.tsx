// src/components/mesas/PDFMesaQR.tsx
import React from 'react'
import { Document, Page, Text, Image, StyleSheet } from '@react-pdf/renderer'
import type { Mesa, Sucursal } from '../../../config/types'

// Tipado de props
interface PDFMesaQRProps {
  mesas: Mesa[]
  sucursal: Sucursal
  qrImgs: Record<string, string>         // mesa.id -> QR en base64
  barcodeImgs?: Record<string, string>   // opcional
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: 'Helvetica',
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    textAlign: 'center'
  },
  qr: {
    width: 120,
    height: 120,
    marginBottom: 12
  },
  mesa: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    color: '#2360a9',
    letterSpacing: 1.5,
    textAlign: 'center'
  },
  info: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
    textAlign: 'center'
  },
  barcode: {
    width: 180,
    height: 32,
    marginBottom: 4,
    marginTop: 6
  },
  url: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4
  }
})

const PDFMesaQR: React.FC<PDFMesaQRProps> = ({
  mesas,
  sucursal,
  qrImgs,
  barcodeImgs = {},
}) => (
  <Document>
    {mesas.map((mesa) => (
      <Page size="A6" style={styles.page} key={mesa.id}>
        <Text style={styles.header}>{sucursal.nombre}</Text>
        <Text style={styles.info}>Área: {mesa.area || '-'}</Text>
        <Text style={styles.mesa}>{mesa.nomesa}</Text>
        {qrImgs[mesa.id] && <Image src={qrImgs[mesa.id]} style={styles.qr} />}
        <Text style={styles.url}>{`${window.location.origin}/pedido/${mesa.id}`}</Text>
        {barcodeImgs[mesa.id] && <Image src={barcodeImgs[mesa.id]} style={styles.barcode} />}
        <Text style={styles.info}>Comensales: {mesa.comensales}</Text>
      </Page>
    ))}
  </Document>
)

export default PDFMesaQR
