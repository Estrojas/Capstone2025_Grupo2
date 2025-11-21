import type { BaseUser, Area, Campus } from "@/lib/supabase/schema"

// perfil de usuario con datos en join
export interface ProfileWithRelations extends Omit<BaseUser, 'user_id' | 'password'> {
    // Campos directos de la tabla
    user_id: string; 
    // Campos obtenidos por join, utilizamos Pick solo para traer el nombre
    campus?: Pick<Campus, 'campus_name'> | null; 
    area?: Pick<Area, 'area_name'> | null;     
}

// perfil de usuario base
export interface Profile extends Omit<BaseUser, 'user_id' | 'password'> {
    user_id: string; 
}

// tipo auxiliar para representar roles
export type UserRole = "user" | "manager" | "admin"

