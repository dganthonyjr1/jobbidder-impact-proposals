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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contractors: {
        Row: {
          anthropic_api_key: string | null
          billing_email: string | null
          business_address: string | null
          business_name: string
          created_at: string
          email: string | null
          id: string
          last_payment_at: string | null
          license_number: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          service_states: string[] | null
          slug: string | null
          subscription_status: string
          subscription_tier: string
          trade_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anthropic_api_key?: string | null
          billing_email?: string | null
          business_address?: string | null
          business_name?: string
          created_at?: string
          email?: string | null
          id?: string
          last_payment_at?: string | null
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          service_states?: string[] | null
          slug?: string | null
          subscription_status?: string
          subscription_tier?: string
          trade_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anthropic_api_key?: string | null
          billing_email?: string | null
          business_address?: string | null
          business_name?: string
          created_at?: string
          email?: string | null
          id?: string
          last_payment_at?: string | null
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          service_states?: string[] | null
          slug?: string | null
          subscription_status?: string
          subscription_tier?: string
          trade_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contractor_integrations: {
        Row: {
          contractor_id: string
          contractor_sms_notifications_enabled: boolean
          created_at: string
          ghl_api_token: string | null
          ghl_from_email: string | null
          ghl_from_number: string | null
          ghl_location_id: string | null
          updated_at: string
        }
        Insert: {
          contractor_id: string
          contractor_sms_notifications_enabled?: boolean
          created_at?: string
          ghl_api_token?: string | null
          ghl_from_email?: string | null
          ghl_from_number?: string | null
          ghl_location_id?: string | null
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          contractor_sms_notifications_enabled?: boolean
          created_at?: string
          ghl_api_token?: string | null
          ghl_from_email?: string | null
          ghl_from_number?: string | null
          ghl_location_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_integrations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      estimate_views: {
        Row: {
          estimate_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          estimate_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          estimate_id?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: []
      }
      estimates: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          contractor_id: string | null
          created_at: string
          estimate_number: string
          id: string
          job_address: string | null
          job_state: string | null
          labor_high: number | null
          labor_low: number | null
          language: string
          material_high: number | null
          material_low: number | null
          raw_input: Json | null
          scope_summary: string | null
          source: string | null
          status: string
          timeline_text: string | null
          total_high: number | null
          total_low: number | null
          trade_type: string | null
          updated_at: string
          upgraded_to_proposal_id: string | null
          valid_through: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          contractor_id?: string | null
          created_at?: string
          estimate_number: string
          id?: string
          job_address?: string | null
          job_state?: string | null
          labor_high?: number | null
          labor_low?: number | null
          language?: string
          material_high?: number | null
          material_low?: number | null
          raw_input?: Json | null
          scope_summary?: string | null
          source?: string | null
          status?: string
          timeline_text?: string | null
          total_high?: number | null
          total_low?: number | null
          trade_type?: string | null
          updated_at?: string
          upgraded_to_proposal_id?: string | null
          valid_through?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          contractor_id?: string | null
          created_at?: string
          estimate_number?: string
          id?: string
          job_address?: string | null
          job_state?: string | null
          labor_high?: number | null
          labor_low?: number | null
          language?: string
          material_high?: number | null
          material_low?: number | null
          raw_input?: Json | null
          scope_summary?: string | null
          source?: string | null
          status?: string
          timeline_text?: string | null
          total_high?: number | null
          total_low?: number | null
          trade_type?: string | null
          updated_at?: string
          upgraded_to_proposal_id?: string | null
          valid_through?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          restricted_states: string[] | null
          retail_price: number
          sia_price: number | null
          sia_price_label: string | null
          sort_order: number | null
          unit: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          restricted_states?: string[] | null
          retail_price: number
          sia_price?: number | null
          sia_price_label?: string | null
          sort_order?: number | null
          unit?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          restricted_states?: string[] | null
          retail_price?: number
          sia_price?: number | null
          sia_price_label?: string | null
          sort_order?: number | null
          unit?: string
        }
        Relationships: []
      }
      materials_orders: {
        Row: {
          contractor_id: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          proposal_id: string | null
          status: string
          total_retail: number | null
          total_sia: number | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          proposal_id?: string | null
          status?: string
          total_retail?: number | null
          total_sia?: number | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          proposal_id?: string | null
          status?: string
          total_retail?: number | null
          total_sia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materials_orders_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_acceptances: {
        Row: {
          accepted_at: string
          accepted_tier: string
          id: string
          ip_address: string | null
          proposal_id: string
          signature_email: string | null
          signature_name: string
          total_amount: number | null
        }
        Insert: {
          accepted_at?: string
          accepted_tier: string
          id?: string
          ip_address?: string | null
          proposal_id: string
          signature_email?: string | null
          signature_name: string
          total_amount?: number | null
        }
        Update: {
          accepted_at?: string
          accepted_tier?: string
          id?: string
          ip_address?: string | null
          proposal_id?: string
          signature_email?: string | null
          signature_name?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_acceptances_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_followups: {
        Row: {
          channels: string
          created_at: string
          error: string | null
          id: string
          proposal_id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          step: string
        }
        Insert: {
          channels: string
          created_at?: string
          error?: string | null
          id?: string
          proposal_id: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          step: string
        }
        Update: {
          channels?: string
          created_at?: string
          error?: string | null
          id?: string
          proposal_id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_followups_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_views: {
        Row: {
          id: string
          ip_address: string | null
          proposal_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          proposal_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          proposal_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_views_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          contractor_id: string | null
          created_at: string
          exclusions: Json | null
          expires_at: string | null
          id: string
          job_address: string | null
          job_description: string | null
          job_state: string | null
          labor: Json | null
          language: string
          materials: Json | null
          payment_terms: string | null
          photos: Json
          proposal_number: string
          raw_input: Json | null
          scope_of_work: string | null
          selected_tier: string | null
          source: string | null
          status: string
          tax_rate: number | null
          tiers: Json | null
          timeline: string | null
          trade_type: string | null
          updated_at: string
          valid_through: string | null
          warranty: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          contractor_id?: string | null
          created_at?: string
          exclusions?: Json | null
          expires_at?: string | null
          id?: string
          job_address?: string | null
          job_description?: string | null
          job_state?: string | null
          labor?: Json | null
          language?: string
          materials?: Json | null
          payment_terms?: string | null
          photos?: Json
          proposal_number: string
          raw_input?: Json | null
          scope_of_work?: string | null
          selected_tier?: string | null
          source?: string | null
          status?: string
          tax_rate?: number | null
          tiers?: Json | null
          timeline?: string | null
          trade_type?: string | null
          updated_at?: string
          valid_through?: string | null
          warranty?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          contractor_id?: string | null
          created_at?: string
          exclusions?: Json | null
          expires_at?: string | null
          id?: string
          job_address?: string | null
          job_description?: string | null
          job_state?: string | null
          labor?: Json | null
          language?: string
          materials?: Json | null
          payment_terms?: string | null
          photos?: Json
          proposal_number?: string
          raw_input?: Json | null
          scope_of_work?: string | null
          selected_tier?: string | null
          source?: string | null
          status?: string
          tax_rate?: number | null
          tiers?: Json | null
          timeline?: string | null
          trade_type?: string | null
          updated_at?: string
          valid_through?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
