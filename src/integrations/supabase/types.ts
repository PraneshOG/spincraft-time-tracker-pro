export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          details: string
          id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          admin_id: string
          details: string
          id?: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          details?: string
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          gender: string
          id: string
          is_active: boolean | null
          joining_date: string
          name: string
          salary_per_hour: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gender: string
          id?: string
          is_active?: boolean | null
          joining_date: string
          name: string
          salary_per_hour?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: string
          id?: string
          is_active?: boolean | null
          joining_date?: string
          name?: string
          salary_per_hour?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_calculations: {
        Row: {
          calculation_date: string
          created_at: string | null
          employee_id: string
          end_date: string
          hourly_rate: number
          id: string
          start_date: string
          status: string | null
          total_hours: number
          total_salary: number
          updated_at: string | null
        }
        Insert: {
          calculation_date: string
          created_at?: string | null
          employee_id: string
          end_date: string
          hourly_rate?: number
          id?: string
          start_date: string
          status?: string | null
          total_hours?: number
          total_salary?: number
          updated_at?: string | null
        }
        Update: {
          calculation_date?: string
          created_at?: string | null
          employee_id?: string
          end_date?: string
          hourly_rate?: number
          id?: string
          start_date?: string
          status?: string | null
          total_hours?: number
          total_salary?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_calculations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_logs: {
        Row: {
          created_at: string | null
          created_by: string
          date: string
          employee_id: string | null
          end_time: string | null
          id: string
          notes: string | null
          start_time: string | null
          status: string | null
          total_hours: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          date: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          status?: string | null
          total_hours?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          date?: string
          employee_id?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string | null
          status?: string | null
          total_hours?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
