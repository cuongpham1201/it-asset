export const pageRoutes: Record<string,string> = {
  'Tổng quan':'/',
  'Sổ tài sản':'/assets',
  'Cấp phát & Thu hồi':'/assignments',
  'Kiểm kê':'/inventory',
  'Lịch sử / Audit':'/audit',
  'Barcode / QR':'/barcode',
  'Nhập kho':'/warehouse/receipts',
  'Xuất kho':'/warehouse/issues',
  'Kho & Vị trí':'/warehouses',
  'Mua sắm & PO':'/procurement',
  'Nhà cung cấp':'/vendors',
  'Bảo trì & Sự cố':'/maintenance',
  'Báo cáo':'/reports',
  'Cấu hình hệ thống':'/settings',
  'Tùy chỉnh thương hiệu':'/settings/branding',
  'Cấu hình email':'/settings/email',
}

const normalizedEntries=Object.entries(pageRoutes).sort((a,b)=>b[1].length-a[1].length)

export const pathForPage=(page:string)=>pageRoutes[page]||`/${encodeURIComponent(page.toLowerCase())}`

export const pageForPath=(path:string)=>{
  if(path.startsWith('/assets/'))return 'Sổ tài sản'
  if(path==='/transfers')return 'Cấp phát & Thu hồi'
  return normalizedEntries.find(([,route])=>route===path)?.[0]||'Tổng quan'
}
