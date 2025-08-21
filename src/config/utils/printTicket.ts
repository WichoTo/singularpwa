// utils/printTicket.ts
export type TicketItem = { nombre: string; qty: number; unit: number; total: number }
export type TicketData = {
  negocio?: { nombre?: string; direccion?: string; telefono?: string }
  titulo?: string
  folio?: string
  mesa?: string | null
  comensal?: string | null
  fecha?: string
  lineas: TicketItem[]
  subtotal: number
  propina?: number
  total: number
  footer?: string
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function printTicketHTML(
  data: TicketData,
  opts?: { width?: 58 | 80 } // 58mm o 80mm
) {
  const width = opts?.width ?? 58
  const fecha = data.fecha ?? new Date().toLocaleString()
  const w = window.open('', '_blank', 'width=420,height=700')!

  const logoMax = width === 58 ? 120 : 170
  const title = data.titulo ?? 'Ticket'

  const rows = data.lineas.map(l => `
    <div class="item">
      <div class="left">
        <div class="name">${l.nombre}</div>
        <div class="meta">${l.qty} × $ ${money(l.unit)}</div>
      </div>
      <div class="right">$ ${money(l.total)}</div>
    </div>
  `).join('')

  const html = `
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light only">
    <style>
      /* ===== Tamaño de página / márgenes de impresión ===== */
      @media print {
        @page { margin: 0; size: ${width}mm auto; }
        body { margin: 0; }
      }

      /* ===== Reseteo y base ===== */
      * { box-sizing: border-box; }
      body {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        margin: 0;
        background: #fff;
      }

      .ticket {
        width: ${width}mm;
        padding: 10px 10px 14px;
        margin: 0 auto;
        font-size: 12px;
        line-height: 1.25;
      }
      .center { text-align: center; }
      .muted { color: #000; opacity: .75; }
      .bold { font-weight: 700; }
      .big  { font-size: 14px; }
      .hr   { border-top: 1px dashed #000; margin: 8px 0; }

      /* ===== Encabezado ===== */
      .brand {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        margin-bottom: 6px;
      }
      .brand img {
        display: block;
        max-width: ${logoMax}px;
        height: auto;
        margin: 2px auto 4px;
      }
      .title {
        font-size: 16px;
        font-weight: 900;
        margin: 2px 0 4px;
      }

      /* ===== Cabecera de datos ===== */
      .kv { display:flex; justify-content:space-between; gap: 10px; }
      .kv span:first-child { white-space: nowrap; }
      .kv span:last-child { text-align: right; }

      /* ===== Items ===== */
      .items { display: grid; gap: 6px; }
      .item {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: start;
        gap: 8px;
      }
      .name { font-weight: 700; word-break: break-word; white-space: pre-wrap; }
      .meta { font-size: 11px; opacity: .8; }
      .right { font-weight: 700; white-space: nowrap; }

      /* ===== Totales ===== */
      .totals { display: grid; gap: 4px; margin-top: 6px; }
      .row { display:flex; justify-content:space-between; }
      .row.total { font-size: 14px; font-weight: 900; }

      /* ===== Footer ===== */
      .foot { margin-top: 8px; }
      .cut  { text-align:center; margin-top: 8px; font-size: 11px; opacity:.7; }
    </style>
  </head>
  <body>
    <div class="ticket">
      <!-- Logo (intenta 512 y cae a 192; si falla, se oculta) -->
      <div class="brand">
        <img src="/logo512.png"
             alt="logo"
             onerror="if(!this.dataset.alt){this.dataset.alt='1';this.src='/logo192.png'}else{this.style.display='none'}" />
        ${data.negocio?.nombre ? `<div class="big bold center">${data.negocio.nombre}</div>` : ''}
        ${data.negocio?.direccion ? `<div class="center muted">${data.negocio.direccion}</div>` : ''}
        ${data.negocio?.telefono ? `<div class="center muted">Tel: ${data.negocio.telefono}</div>` : ''}
      </div>

      <div class="title center">${title}</div>
      <div class="hr"></div>

      <div class="kv"><span>Folio</span><span>${data.folio ?? '-'}</span></div>
      <div class="kv"><span>Fecha</span><span>${fecha}</span></div>
      ${data.mesa ? `<div class="kv"><span>Mesa</span><span>${data.mesa}</span></div>` : ''}
      ${data.comensal ? `<div class="kv"><span>Comensal</span><span>${data.comensal}</span></div>` : ''}

      <div class="hr"></div>

      <div class="items">
        ${rows}
      </div>

      <div class="hr"></div>

      <div class="totals">
        <div class="row bold"><span>SUBTOTAL</span><span>$ ${money(data.subtotal)}</span></div>
        ${Number(data.propina||0) ? `<div class="row"><span>Propina</span><span>$ ${money(data.propina!)}</span></div>` : ''}
        <div class="row total"><span>TOTAL</span><span>$ ${money(data.total)}</span></div>
      </div>

      <div class="hr"></div>
      <div class="foot center">${data.footer ?? '¡Gracias por su visita!'}</div>
      <div class="cut">— — — — — — — — — — — —</div>
    </div>

    <script>
      // Dispara impresión y cierra la ventana emergente
      setTimeout(() => { window.print(); setTimeout(() => window.close(), 250); }, 150);
    </script>
  </body>
  </html>
  `
  w.document.open()
  w.document.write(html)
  w.document.close()
}
