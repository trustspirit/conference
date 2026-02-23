export enum CheckInStatus {
  CheckedIn = 'checked-in',
  NotCheckedIn = 'not-checked-in'
}

export enum AuditAction {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  CheckIn = 'check_in',
  CheckOut = 'check_out',
  Assign = 'assign',
  Import = 'import'
}

export enum TargetType {
  Participant = 'participant',
  Group = 'group',
  Room = 'room'
}

export enum ViewMode {
  List = 'list',
  Grid = 'grid'
}

export enum RoomStatus {
  Available = 'available',
  AlmostFull = 'almost-full',
  Full = 'full'
}

export enum CapacityStatus {
  Available = 'available',
  AlmostFull = 'almost-full',
  Full = 'full',
  NoLimit = 'no-limit'
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.Create]: 'Created',
  [AuditAction.Update]: 'Updated',
  [AuditAction.Delete]: 'Deleted',
  [AuditAction.CheckIn]: 'Checked In',
  [AuditAction.CheckOut]: 'Checked Out',
  [AuditAction.Assign]: 'Assigned',
  [AuditAction.Import]: 'Imported'
}

export const TARGET_TYPE_LABELS: Record<TargetType, string> = {
  [TargetType.Participant]: 'Participant',
  [TargetType.Group]: 'Group',
  [TargetType.Room]: 'Room'
}
