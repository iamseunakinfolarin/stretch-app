export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      entries: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          kind: string
          prayer_id: string
          session_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          kind: string
          prayer_id: string
          session_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          kind?: string
          prayer_id?: string
          session_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          prayer_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          prayer_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          prayer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_invites_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: true
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_members: {
        Row: {
          created_at: string
          joined_at: string
          prayer_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          joined_at?: string
          prayer_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          joined_at?: string
          prayer_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_members_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_points: {
        Row: {
          body: string
          created_at: string
          id: string
          position: number
          prayer_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          position?: number
          prayer_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          position?: number
          prayer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_points_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_sessions: {
        Row: {
          check_ins_confirmed: number
          check_ins_shown: number
          created_at: string
          credited_seconds: number
          ended_at: string
          id: string
          prayer_id: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_ins_confirmed?: number
          check_ins_shown?: number
          created_at?: string
          credited_seconds: number
          ended_at: string
          id?: string
          prayer_id: string
          started_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_ins_confirmed?: number
          check_ins_shown?: number
          created_at?: string
          credited_seconds?: number
          ended_at?: string
          id?: string
          prayer_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_sessions_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prayers: {
        Row: {
          answered_at: string | null
          archived_at: string | null
          created_at: string
          details: string | null
          id: string
          kind: string
          owner_id: string
          planned_start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          archived_at?: string | null
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          owner_id: string
          planned_start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          archived_at?: string | null
          created_at?: string
          details?: string | null
          id?: string
          kind?: string
          owner_id?: string
          planned_start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scriptures: {
        Row: {
          created_at: string
          id: string
          position: number
          prayer_id: string
          reference: string
          translation: string | null
          updated_at: string
          verse_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          prayer_id: string
          reference: string
          translation?: string | null
          updated_at?: string
          verse_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          prayer_id?: string
          reference?: string
          translation?: string | null
          updated_at?: string
          verse_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scriptures_prayer_id_fkey"
            columns: ["prayer_id"]
            isOneToOne: false
            referencedRelation: "prayers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_session: {
        Args: {
          check_ins_confirmed?: number
          check_ins_shown?: number
          credited_seconds: number
          ended_at: string
          id: string
          note_body?: string
          note_id?: string
          note_visibility?: string
          prayer_id: string
          started_at: string
        }
        Returns: string
      }
      create_or_reset_invite: { Args: { prayer_id: string }; Returns: string }
      delete_my_account: { Args: never; Returns: undefined }
      generate_invite_code: { Args: never; Returns: string }
      get_my_hours: {
        Args: { since: string }
        Returns: {
          all_time_seconds: number
          since_seconds: number
        }[]
      }
      get_prayer_hours: {
        Args: { prayer_ids: string[] }
        Returns: {
          group_seconds: number
          my_seconds: number
          prayer_id: string
        }[]
      }
      is_prayer_member: { Args: { prayer_id: string }; Returns: boolean }
      is_prayer_owner: { Args: { prayer_id: string }; Returns: boolean }
      join_prayer_by_code: { Args: { code: string }; Returns: string }
      ping: { Args: never; Returns: string }
      shares_prayer_with: { Args: { other_user_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
