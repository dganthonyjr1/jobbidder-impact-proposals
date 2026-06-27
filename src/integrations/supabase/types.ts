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
          pricing_settings: Json | null
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
          pricing_settings?: Json | null
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
          pricing_settings?: Json | null
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
      contractor_applications: {
        Row: {
          id: string
          ghl_contact_id: string | null
          name: string
          phone: string
          email: string | null
          trade_type: string | null
          years_experience: string | null
          service_area: string | null
          license_number: string | null
          license_url: string | null
          insurance_url: string | null
          additional_doc_urls: Json
          agrees_to_terms: boolean
          status: string
          qualification_status: string | null
          qualification_score: number | null
          qualification_percentage: number | null
          years_in_operation: number | null
          commercial_glazing_experience: number | null
          average_project_size: string | null
          window_film_experience: number | null
          crew_size: number | null
          states_licensed: string[]
          osha_record: string | null
          availability: string | null
          surety_bond: string | null
          workers_comp: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ghl_contact_id?: string | null
          name: string
          phone: string
          email?: string | null
          trade_type?: string | null
          years_experience?: string | null
          service_area?: string | null
          license_number?: string | null
          license_url?: string | null
          insurance_url?: string | null
          additional_doc_urls?: Json
          agrees_to_terms?: boolean
          status?: string
          qualification_status?: string | null
          qualification_score?: number | null
          qualification_percentage?: number | null
          years_in_operation?: number | null
          commercial_glazing_experience?: number | null
          average_project_size?: string | null
          window_film_experience?: number | null
          crew_size?: number | null
          states_licensed?: string[]
          osha_record?: string | null
          availability?: string | null
          surety_bond?: string | null
          workers_comp?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ghl_contact_id?: string | null
          name?: string
          phone?: string
          email?: string | null
          trade_type?: string | null
          years_experience?: string | null
          service_area?: string | null
          license_number?: string | null
          license_url?: string | null
          insurance_url?: string | null
          additional_doc_urls?: Json
          agrees_to_terms?: boolean
          status?: string
          qualification_status?: string | null
          qualification_score?: number | null
          qualification_percentage?: number | null
          years_in_operation?: number | null
          commercial_glazing_experience?: number | null
          average_project_size?: string | null
          window_film_experience?: number | null
          crew_size?: number | null
          states_licensed?: string[]
          osha_record?: string | null
          availability?: string | null
          surety_bond?: string | null
          workers_comp?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contractor_survey_responses: {
        Row: {
          id: string
          contractor_id: string
          years_in_operation: number | null
          commercial_glazing_experience: number | null
          average_project_size: string | null
          window_film_experience: number | null
          crew_size: number | null
          states_licensed: string[]
          osha_record: string | null
          availability: string | null
          surety_bond: string | null
          workers_comp: string | null
          total_score: number | null
          percentage: number | null
          status: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          years_in_operation?: number | null
          commercial_glazing_experience?: number | null
          average_project_size?: string | null
          window_film_experience?: number | null
          crew_size?: number | null
          states_licensed?: string[]
          osha_record?: string | null
          availability?: string | null
          surety_bond?: string | null
          workers_comp?: string | null
          total_score?: number | null
          percentage?: number | null
          status?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          years_in_operation?: number | null
          commercial_glazing_experience?: number | null
          average_project_size?: string | null
          window_film_experience?: number | null
          crew_size?: number | null
          states_licensed?: string[]
          osha_record?: string | null
          availability?: string | null
          surety_bond?: string | null
          workers_comp?: string | null
          total_score?: number | null
          percentage?: number | null
          status?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contractor_recruits: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          trade_type: string | null
          service_niche: string | null
          service_state: string | null
          source: string
          source_ref: string | null
          ghl_contact_id: string | null
          invite_sent_at: string | null
          invite_method: string | null
          application_id: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          email?: string | null
          trade_type?: string | null
          service_niche?: string | null
          service_state?: string | null
          source?: string
          source_ref?: string | null
          ghl_contact_id?: string | null
          invite_sent_at?: string | null
          invite_method?: string | null
          application_id?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          email?: string | null
          trade_type?: string | null
          service_niche?: string | null
          service_state?: string | null
          source?: string
          source_ref?: string | null
          ghl_contact_id?: string | null
          invite_sent_at?: string | null
          invite_method?: string | null
          application_id?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      contractor_documents: {
        Row: {
          id: string
          contractor_id: string
          document_type: string
          file_url: string
          file_name: string
          file_mime: string | null
          status: string
          extracted_data: Json
          ai_confidence: number | null
          expiration_date: string | null
          coverage_amount: number | null
          license_number: string | null
          issuer_name: string | null
          holder_name: string | null
          state_code: string | null
          verified_at: string | null
          verified_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          document_type: string
          file_url: string
          file_name: string
          file_mime?: string | null
          status?: string
          extracted_data?: Json
          ai_confidence?: number | null
          expiration_date?: string | null
          coverage_amount?: number | null
          license_number?: string | null
          issuer_name?: string | null
          holder_name?: string | null
          state_code?: string | null
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          document_type?: string
          file_url?: string
          file_name?: string
          file_mime?: string | null
          status?: string
          extracted_data?: Json
          ai_confidence?: number | null
          expiration_date?: string | null
          coverage_amount?: number | null
          license_number?: string | null
          issuer_name?: string | null
          holder_name?: string | null
          state_code?: string | null
          verified_at?: string | null
          verified_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_prequal_calls: {
        Row: {
          id: string
          contractor_id: string | null
          phone: string
          ghl_contact_id: string | null
          call_disposition: string
          years_in_business: string | null
          has_gc_license: string | null
          has_liability_ins: string | null
          has_workers_comp: string | null
          has_surety_bond: string | null
          states_licensed: string | null
          crew_size: string | null
          raw_payload: Json
          sms_upload_link_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          contractor_id?: string | null
          phone: string
          ghl_contact_id?: string | null
          call_disposition?: string
          years_in_business?: string | null
          has_gc_license?: string | null
          has_liability_ins?: string | null
          has_workers_comp?: string | null
          has_surety_bond?: string | null
          states_licensed?: string | null
          crew_size?: string | null
          raw_payload?: Json
          sms_upload_link_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string | null
          phone?: string
          ghl_contact_id?: string | null
          call_disposition?: string
          years_in_business?: string | null
          has_gc_license?: string | null
          has_liability_ins?: string | null
          has_workers_comp?: string | null
          has_surety_bond?: string | null
          states_licensed?: string | null
          crew_size?: string | null
          raw_payload?: Json
          sms_upload_link_sent?: boolean
          created_at?: string
        }
        Relationships: []
      }
      client_deals: {
        Row: {
          id: string
          company_name: string
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          deal_value: number | null
          stage: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_name: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          deal_value?: number | null
          stage?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string
          contact_name?: string | null
          contact_phone?: string | null
          contact_email?: string | null
          deal_value?: number | null
          stage?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jessica_followup_queue: {
        Row: {
          id: string
          contact_id: string
          phone: string | null
          name: string | null
          location_id: string | null
          status: string
          error: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          contact_id: string
          phone?: string | null
          name?: string | null
          location_id?: string | null
          status?: string
          error?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          contact_id?: string
          phone?: string | null
          name?: string | null
          location_id?: string | null
          status?: string
          error?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          id: string
          contractor_id: string
          action_type: string
          credits_used: number
          is_overage: boolean
          billing_period: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          action_type: string
          credits_used?: number
          is_overage?: boolean
          billing_period: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          action_type?: string
          credits_used?: number
          is_overage?: boolean
          billing_period?: string
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      credit_pack_purchases: {
        Row: {
          id: string
          contractor_id: string
          pack_name: string
          credits_total: number
          credits_remaining: number
          purchased_at: string
        }
        Insert: {
          id?: string
          contractor_id: string
          pack_name: string
          credits_total: number
          credits_remaining: number
          purchased_at?: string
        }
        Update: {
          id?: string
          contractor_id?: string
          pack_name?: string
          credits_total?: number
          credits_remaining?: number
          purchased_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          id: string
          user_id: string
          company_name: string
          code: string
          payout_preference: "credit" | "payout"
          payout_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          code: string
          payout_preference?: "credit" | "payout"
          payout_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          code?: string
          payout_preference?: "credit" | "payout"
          payout_email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          id: string
          referrer_code: string
          referred_company: string
          referred_email: string | null
          plan_name: string
          plan_amount_cents: number
          commission_rate: number
          status: "pending" | "active" | "churned"
          activated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          referrer_code: string
          referred_company: string
          referred_email?: string | null
          plan_name?: string
          plan_amount_cents?: number
          commission_rate?: number
          status?: "pending" | "active" | "churned"
          activated_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          referrer_code?: string
          referred_company?: string
          referred_email?: string | null
          plan_name?: string
          plan_amount_cents?: number
          commission_rate?: number
          status?: "pending" | "active" | "churned"
          activated_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      affiliate_transactions: {
        Row: {
          id: string
          referrer_code: string
          referral_id: string | null
          transaction_type: string
          amount_cents: number
          description: string | null
          billing_period: string | null
          status: "pending" | "processed" | "failed"
          created_at: string
        }
        Insert: {
          id?: string
          referrer_code: string
          referral_id?: string | null
          transaction_type: string
          amount_cents: number
          description?: string | null
          billing_period?: string | null
          status?: "pending" | "processed" | "failed"
          created_at?: string
        }
        Update: {
          id?: string
          referrer_code?: string
          referral_id?: string | null
          transaction_type?: string
          amount_cents?: number
          description?: string | null
          billing_period?: string | null
          status?: "pending" | "processed" | "failed"
          created_at?: string
        }
        Relationships: []
      }
      audit_access_links: {
        Row: {
          id: string
          user_id: string
          token: string
          label: string | null
          access_level: string
          expires_at: string | null
          last_accessed_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          label?: string | null
          access_level?: string
          expires_at?: string | null
          last_accessed_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          label?: string | null
          access_level?: string
          expires_at?: string | null
          last_accessed_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      photos_videos: {
        Row: {
          id: string
          user_id: string
          proposal_id: string | null
          contractor_id: string | null
          file_name: string
          file_type: "photo" | "video"
          mime_type: string
          file_size: number
          duration_seconds: number | null
          storage_path: string
          storage_url: string
          thumbnail_url: string | null
          ai_analysis: Json | null
          is_damage_photo: boolean
          damage_type: string | null
          title: string | null
          description: string | null
          tags: string[]
          location_name: string | null
          latitude: number | null
          longitude: number | null
          display_order: number
          is_public: boolean
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          proposal_id?: string | null
          contractor_id?: string | null
          file_name: string
          file_type: string
          mime_type: string
          file_size: number
          duration_seconds?: number | null
          storage_path: string
          storage_url: string
          thumbnail_url?: string | null
          ai_analysis?: Json | null
          is_damage_photo?: boolean
          damage_type?: string | null
          title?: string | null
          description?: string | null
          tags?: string[]
          location_name?: string | null
          latitude?: number | null
          longitude?: number | null
          display_order?: number
          is_public?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          proposal_id?: string | null
          contractor_id?: string | null
          file_name?: string
          file_type?: string
          mime_type?: string
          file_size?: number
          duration_seconds?: number | null
          storage_path?: string
          storage_url?: string
          thumbnail_url?: string | null
          ai_analysis?: Json | null
          is_damage_photo?: boolean
          damage_type?: string | null
          title?: string | null
          description?: string | null
          tags?: string[]
          location_name?: string | null
          latitude?: number | null
          longitude?: number | null
          display_order?: number
          is_public?: boolean
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_galleries: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          gallery_type: string
          proposal_id: string | null
          contractor_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          gallery_type: string
          proposal_id?: string | null
          contractor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          gallery_type?: string
          proposal_id?: string | null
          contractor_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_media: {
        Row: {
          id: string
          gallery_id: string
          media_id: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          gallery_id: string
          media_id: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          gallery_id?: string
          media_id?: string
          display_order?: number
          created_at?: string
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
