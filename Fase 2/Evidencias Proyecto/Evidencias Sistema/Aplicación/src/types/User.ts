export interface Campus {
  campus_id: number;
  campus_name: string;
}

export interface Area {
  area_id: number;
  area_name: string;
}

export interface User {
  user_id: string;
  names: string;
  last_name_1: string;
  last_name_2: string;
  email: string;
  role: string;
  status: string;
  area_id?: number | null;
  campus_id?: number | null;
  campus?: { campus_name: string } | null;
  area?: { area_name: string } | null;
}
