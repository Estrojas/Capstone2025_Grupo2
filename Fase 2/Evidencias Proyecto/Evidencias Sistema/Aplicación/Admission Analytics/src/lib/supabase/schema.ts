import { z } from "zod"; // permite definir el tipo esperado de los datos y validarlos

// Helpers
// Recibe cualquier valor, si este viene vacio retorna undefined, si no, devuelve el mismo valor
const emptyToUndefined = (v: unknown) => (v === "" || v === null ? undefined : v);

// Custom Preprocess para IDs que pueden venir como string vacío o null y deben ser numeros
const safeNumber = z
    .preprocess(emptyToUndefined, z.coerce.number().int().positive())
    .optional();


// Enums de dominio

export const RoleEnum = z.enum(["user", "manager", "admin"]); // roles validos de usuario
export const StatusEnum = z.enum(["active", "inactive", "pending"]); // estados posibles de la cuenta


// Esquema de usuarios

// Esquema de validacion para el perfil base del usuario
export const baseUserSchema = z
    .object({
        user_id: z.string().uuid("ID invalido").optional(),
        names: z.string().trim().min(2, "Nombre demasiado corto").max(100, "Nombre muy largo"),
        last_name_1: z.string().trim().min(2, "Apellido demasiado corto").max(100),
        
        // Uso z.string().nullable().transform() que es la forma canónica de Zod
        // para manejar strings vacíos/nulos en campos opcionales.
        last_name_2: z.string().trim().max(100).optional().nullable().transform((v) => v === null || v === "" ? undefined : v),

        email: z.string().trim().toLowerCase().email("Email inválido"),
        
        // Los campos de IDs ahora usan el helper `safeNumber`
        area_id: safeNumber, 
        campus_id: safeNumber, 

        role: RoleEnum.default("user"),
        status: StatusEnum.default("active"),
        
        // logs
        created_at: z.string().datetime().optional(),
        updated_at: z.string().datetime().optional(),
    })
    .strict(); // prohibe propiedades adicionales
    
export type BaseUser = z.infer<typeof baseUserSchema>;


// Esquema de validaciones


// Registrar nuevo usuario (Requiere contraseña)
export const createUserSchema = baseUserSchema.omit({
    user_id: true,
    created_at: true,
    updated_at: true,
}).extend({
    password: z.string().min(6, "Mínimo 6 caracteres").max(128, "Contraseña muy larga"),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;


// Edición propia de usuario 
export const editProfileSchema = baseUserSchema.partial({ // Hacemos todos los campos opcionales
    names: true,
    last_name_1: true,
    email: true,
    area_id: true,
    campus_id: true,
}).omit({
    user_id: true,
    role: true,
    status: true,
    created_at: true,
    updated_at: true,
}).extend({
    // Permite actualizar la contraseña, pero es opcional
    password: z.string().min(6,"Mínimo 6 caracteres").max(128).optional(), 
});
export type EditProfileInput = z.infer<typeof editProfileSchema>;


// Edición de usuario para Admin 
export const editUserAdminSchema = baseUserSchema.partial().omit({ // Hacemos todo opcional
    created_at: true,
    updated_at: true,
}).extend({
    // Si el administrador edita, hacemos estos campos obligatorios de nuevo para el formulario
    names: z.string().trim().min(1, "El nombre es obligatorio").optional(), 
    last_name_1: z.string().trim().min(1, "El apellido paterno es obligatorio").optional(),
    
    // El administrador puede cambiar la contraseña
    password: z.string().min(6,"Mínimo 6 caracteres").max(128).optional(),
});
export type EditUserAdminInput = z.infer<typeof editUserAdminSchema>;


// Eliminar usuario
export const deleteUserSchema = z.object({
    user_id: z.string().uuid("ID inválido"),
});
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;


// Login 
export const loginSchema = z
    .object({
        // normalizaciones y validaciones del formato
        email: z.string().trim().toLowerCase().email("Email inválido"),
        password: z.string().min(6, "Mínimo 6 caracteres"),
    })
    .strict();
export type LoginInput = z.infer<typeof loginSchema>;


// Esquema de las otras tablas


// Areas
export const areaSchema = z
    .object({
        area_id: z.number().int().positive().optional(),
        area_name: z.string().trim().min(1, "El nombre del área es obligatorio"),
        description: z.string().trim().optional().default("")
    })
    .strict();
export type Area = z.infer<typeof areaSchema>;


// Campus
export const campusSchema = z
    .object({
        campus_id: z.number().int().positive().optional(),
        campus_name: z.string().trim().min(1, "El nombre del campus es obligatorio"),
        region: z.string().trim().optional().default(""),
        address: z.string().trim().optional().default(""),
        phone: z.string().trim().optional().default("")
    })
    .strict();
export type Campus = z.infer<typeof campusSchema>;


// Logs
export const logSchema = z
    .object({
        log_id: z.number().int().positive().nullable().optional(),
        user_id: z.string().trim().nullable().optional(),
        action: z.string().trim().nullable().optional(),
        ip_address: z.string().trim().nullable().optional(), 
        user_agent: z.string().trim().nullable().optional(),
        created_at: z.string().optional(),
        user_email: z.string().trim().email().nullable().optional(), 
        user_full_name: z.string().trim().nullable().optional(),
        performed_by: z.string().trim().uuid().nullable().optional(),
        performed_by_email: z.string().trim().email().nullable().optional(), 
        details: z.string().optional().nullable(),
    })
    .strict();
export type Log = z.infer<typeof logSchema>;

