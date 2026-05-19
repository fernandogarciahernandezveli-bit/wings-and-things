import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const exportOrderList = async (recommendations: any[], weekLabel: string) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'WINGS & THINGS'
  workbook.lastModifiedBy = 'WINGS & THINGS'
  workbook.created = new Date()
  
  const sheet = workbook.addWorksheet('Pedido')

  // Styles
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8A838' } },
    alignment: { horizontal: 'center' },
  }

  // Header info
  sheet.mergeCells('A1:E1')
  sheet.getCell('A1').value = `PEDIDO - WINGS & THINGS - ${weekLabel}`
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('A1').alignment = { horizontal: 'center' }

  // Columns
  sheet.columns = [
    { header: 'Producto', key: 'name', width: 30 },
    { header: 'Stock Actual', key: 'stock', width: 15 },
    { header: 'Consumo Sem.', key: 'consumed', width: 15 },
    { header: 'Recomendado', key: 'rec', width: 15 },
    { header: 'PEDIR', key: 'order', width: 15 },
  ]

  sheet.getRow(3).values = ['Producto', 'Stock Actual', 'Consumo Sem.', 'Recomendado', 'PEDIR']
  sheet.getRow(3).eachCell((cell) => { cell.style = headerStyle })

  // Data
  recommendations.forEach((r, i) => {
    const row = sheet.addRow({
      name: r.productName || r.product?.name,
      stock: r.currentStock,
      consumed: r.weeklyAverage || r.consumed,
      rec: r.recommendedOrder || r.recommended,
      order: r.recommendedOrder || r.recommended,
    })
    
    if (r.currentStock < 10) {
      row.getCell('B').font = { color: { argb: 'FFFF0000' }, bold: true }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `pedido-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

export const exportWeeklyAnalytics = async (report: any, type: string, weekLabel: string) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'WINGS & THINGS'
  
  const sheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1))

  if (type === 'productos') {
    sheet.columns = [
      { header: 'Ranking', key: 'rank', width: 10 },
      { header: 'Producto', key: 'name', width: 30 },
      { header: 'Total Consumido', key: 'total', width: 20 },
      { header: 'Promedio Diario', key: 'avg', width: 20 },
    ]

    report.topProducts.forEach((p: any) => {
      sheet.addRow({
        rank: p.rank,
        name: p.productName,
        total: p.totalConsumed,
        avg: p.dailyAverage.toFixed(2),
      })
    })
  } else if (type === 'consumo') {
    sheet.columns = [
      { header: 'Día', key: 'day', width: 20 },
      { header: 'Comandas', key: 'total', width: 15 },
      { header: 'Productos', key: 'items', width: 15 },
    ]

    report.dailySales.forEach((d: any) => {
      sheet.addRow({
        day: format(new Date(d.date), 'EEEE dd/MM', { locale: es }),
        total: d.total,
        items: d.itemsCount,
      })
    })
  } else {
    // Tendencias or default
    sheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 },
    ]
    sheet.addRow({ metric: 'Total Consumido', value: report.totalItems })
    sheet.addRow({ metric: 'Total Comandas', value: report.totalComandas })
    sheet.addRow({ metric: 'Producto más vendido', value: report.topProducts[0]?.productName || 'N/A' })
  }

  sheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `reporte-${type}-${weekLabel}.xlsx`)
}

export const exportInventoryToExcel = async (inventory: any[], weekLabel: string) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'WINGS & THINGS'
  
  const sheet = workbook.addWorksheet('Inventario')

  sheet.columns = [
    { header: 'Producto', key: 'name', width: 30 },
    { header: 'Stock Inicial', key: 'initial', width: 15 },
    { header: 'Entradas', key: 'purchased', width: 15 },
    { header: 'Consumido', key: 'consumed', width: 15 },
    { header: 'Stock Actual', key: 'current', width: 15 },
  ]

  sheet.getRow(1).font = { bold: true }

  inventory.forEach((item) => {
    sheet.addRow({
      name: item.product.name,
      initial: item.initialStock,
      purchased: item.purchasedStock,
      consumed: item.consumed,
      current: item.initialStock + item.purchasedStock - item.consumed,
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `inventario-${weekLabel}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}
