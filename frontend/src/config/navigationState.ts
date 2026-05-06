/** state ที่ส่งผ่าน react-router `Navigate` / `<Link state={…}>` */
export type AppLocationState = {
  /** true เมื่อถูก PermissionGate ส่งกลับจากหน้าที่ต้องการสิทธิ์พิเศษ */
  accessDenied?: boolean;
  /** เส้นทางที่พยายามเข้า (ใช้แสดงบนหน้า /error/403) */
  deniedPath?: string;
};
