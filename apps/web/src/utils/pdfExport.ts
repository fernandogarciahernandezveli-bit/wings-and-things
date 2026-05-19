import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const generateOrderPDF = (order: any, user: any, week: any) => {
  const doc = new jsPDF()
  const now = new Date()
  
  // Header
  doc.setFontSize(20)
  doc.setTextColor(40)
  doc.text('WINGS & THINGS — LISTA DE PEDIDO', 105, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`Fecha: ${format(now, 'dd/MM/yyyy HH:mm')}`, 15, 25)
  doc.text(`Semana: ${format(new Date(week.startDate), 'dd/MM/yyyy')} - ${format(new Date(week.endDate), 'dd/MM/yyyy')}`, 15, 30)
  doc.text(`Confirmado por: ${user.name} (${user.role})`, 15, 35)
  
  if (order.isExtraordinary || order.reason) {
    doc.setTextColor(220, 50, 50)
    doc.setFont('helvetica', 'bold')
    doc.text('PEDIDO EXTRAORDINARIO', 15, 45)
    doc.setTextColor(40)
    doc.setFont('helvetica', 'normal')
    doc.text(`Motivo: ${order.reason || 'No especificado'}`, 15, 50)
  }

  // Table
  const items = order.items || order.OrderItem || []
  const tableData = items
    .filter((i: any) => i.quantity > 0)
    .map((item: any) => [
      item.product?.name || item.productName || 'N/A',
      item.product?.category || '',
      item.recommended || 0,
      item.quantity
    ])

  autoTable(doc, {
    startY: (order.isExtraordinary || order.reason) ? 55 : 45,
    head: [['Producto', 'Categoría', 'Recomendado', 'CANTIDAD']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [232, 168, 56], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  // Footer
  const total = items.reduce((sum: number, i: any) => sum + i.quantity, 0)
  const finalY = (doc as any).lastAutoTable?.finalY || 150
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total de piezas: ${total}`, 195, finalY + 10, { align: 'right' })

  const dateStr = format(now, 'yyyy-MM-dd-HHmm')
  doc.save(`pedido-${dateStr}.pdf`)
}
