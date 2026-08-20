import { PrismaClient } from '@prisma/client'
const db=new PrismaClient()
async function main(){
  const departmentNames=['IT','Marketing','Kinh doanh','Hành chính','Kế toán']
  const departments=[]
  for(const [i,name] of departmentNames.entries())departments.push(await db.department.upsert({where:{code:`D${i+1}`},update:{name},create:{code:`D${i+1}`,name}}))
  const locationNames=['VP Hà Nội','Tầng 2','Tầng 3','Phòng Server','VP Hồ Chí Minh']
  const locations=[]
  for(const [i,name] of locationNames.entries())locations.push(await db.location.upsert({where:{code:`L${i+1}`},update:{name},create:{code:`L${i+1}`,name,type:i===0||i===4?'SITE':name.startsWith('Tầng')?'FLOOR':'ROOM',address:i===0?'Hà Nội':i===4?'TP. Hồ Chí Minh':undefined}}))
  const warehouses=[await db.warehouse.upsert({where:{code:'KHO-HN'},update:{},create:{code:'KHO-HN',name:'Kho Tổng Hà Nội',locationId:locations[0].id}}),await db.warehouse.upsert({where:{code:'KHO-HCM'},update:{},create:{code:'KHO-HCM',name:'Kho Tổng Hồ Chí Minh',locationId:locations[4].id}})]
  const users=[]
  for(let i=0;i<10;i++)users.push(await db.user.upsert({where:{employeeCode:`NV-${String(i+1).padStart(3,'0')}`},update:{},create:{employeeCode:`NV-${String(i+1).padStart(3,'0')}`,username:`nhanvien${i+1}`,fullName:['Nguyễn Minh Anh','Trần Đức Long','Lê Hoàng Nam','Phạm Thu Hà','Nguyễn Thu Hương','Vũ Thanh Mai','Hoàng Anh Tuấn','Nguyễn Văn Hùng','Trần Thu Linh','Lê Minh Quân'][i],email:`nhanvien${i+1}@company.vn`,departmentId:departments[i%5].id}}))
  const categoryNames=['Laptop','Desktop','Server','Màn hình','Switch','Firewall','Máy in','Mobile','Phụ kiện','Thiết bị lưu trữ']
  const categories=[]
  for(const [i,name] of categoryNames.entries())categories.push(await db.assetCategory.upsert({where:{code:`CAT-${i+1}`},update:{name},create:{code:`CAT-${i+1}`,name}}))
  const manufacturerNames=['Dell','HP','Lenovo','Apple','Cisco','Fortinet','Logitech','Samsung','Microsoft','APC']
  const manufacturers=[]
  for(const name of manufacturerNames)manufacturers.push(await db.manufacturer.upsert({where:{name},update:{},create:{name}}))
  const models=[]
  for(let i=0;i<15;i++)models.push(await db.assetModel.upsert({where:{manufacturerId_name:{manufacturerId:manufacturers[i%10].id,name:`Model ${String(i+1).padStart(2,'0')}`}},update:{},create:{name:`Model ${String(i+1).padStart(2,'0')}`,modelNumber:`M-${i+1}`,manufacturerId:manufacturers[i%10].id,categoryId:categories[i%10].id}}))
  const statusDefs=[['READY','Sẵn sàng','#64748b',true,true,false],['IN_USE','Đang sử dụng','#16803c',false,true,false],['ON_LOAN','Đang mượn','#2563eb',false,true,false],['RETURNED','Đã thu hồi','#64748b',false,false,false],['RESERVED','Đã giữ chỗ','#a16207',false,false,false],['MAINTENANCE','Bảo trì','#c56a00',false,false,false],['LOST','Mất','#c62828',false,false,false],['BROKEN','Hỏng','#dc2626',false,false,false],['DISPOSED','Thanh lý','#475569',false,false,true]] as const
  const statuses=[]
  for(const [i,s] of statusDefs.entries())statuses.push(await db.assetStatus.upsert({where:{code:s[0]},update:{},create:{code:s[0],name:s[1],color:s[2],isAssignable:s[3],isDeployable:s[4],isArchived:s[5],sortOrder:i+1}}))
  const featured=['Dell Latitude 7450','MacBook Pro 14 M4','Logitech MX Keys S','Cisco Catalyst 9200L']
  for(let i=0;i<30;i++){const name=featured[i]||`${manufacturerNames[i%10]} ${categoryNames[i%10]} ${i+1}`;const prefix=i===2?'PK':i===3?'NET':'TS';const tag=`${prefix}-2026-${String(i+1).padStart(3,'0')}`;const inUse=i%3!==0;const asset=await db.asset.upsert({where:{assetTag:tag},update:{},create:{assetTag:tag,name,serialNumber:`SN${20260000+i+1}`,barcode:tag,categoryId:categories[i%10].id,modelId:models[i%15].id,manufacturerId:manufacturers[i%10].id,statusId:statuses[inUse?1:0].id,assignedUserId:inUse?users[i%10].id:undefined,departmentId:inUse?departments[i%5].id:undefined,locationId:locations[i%5].id,warehouseId:inUse?undefined:warehouses[i%2].id,purchaseCost:10000000+i*500000}});await db.assetHistory.upsert({where:{id:asset.id},update:{},create:{id:asset.id,assetId:asset.id,action:'CREATED',description:'Tạo tài sản từ seed Sprint 02',performedBy:users[0].id}})}
}
main().finally(()=>db.$disconnect())
