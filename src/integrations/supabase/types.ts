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
      affiliate_transactions: {
        Row: {
          amount_cents: number
          billing_period: string | null
          created_at: string
          description: string | null
          id: string
          referral_id: string | null
          referrer_code: string
          status: string
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          billing_period?: string | null
          created_at?: string
          description?: string | null
          id?: string
          referral_id?: string | null
          referrer_code: string
          status?: string
          transaction_type: string
        }
        Update: {
          amount_cents?: number
          billing_period?: string | null
          created_at?: string
          description?: string | null
          id?: string
          referral_id?: string | null
          referrer_code?: string
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_transactions_referrer_code_fkey"
            columns: ["referrer_code"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      audit_access_links: {
        Row: {
          access_level: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          last_accessed_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          last_accessed_at?: string | null
          token: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          last_accessed_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          page_url: string | null
          session_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          page_url?: string | null
          session_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          page_url?: string | null
          session_id?: string | null
          status?: string
        }
        Relationships: []
      }
      chat_support_tickets: {
        Row: {
          created_at: string | null
          email: string
          id: string
          issue: string
          name: string
          session_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          issue: string
          name: string
          session_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          issue?: string
          name?: string
          session_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      client_deals: {
        Row: {
          company_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          deal_value: number | null
          id: string
          notes: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_value?: number | null
          id?: string
          notes?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          deal_value?: number | null
          id?: string
          notes?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_alert_log: {
        Row: {
          contractor_id: string
          doc_type: string
          expiration_date: string
          id: string
          sent_at: string
          subcontractor_id: string
          urgency: string
          webhook_status: number | null
        }
        Insert: {
          contractor_id: string
          doc_type: string
          expiration_date: string
          id?: string
          sent_at?: string
          subcontractor_id: string
          urgency: string
          webhook_status?: number | null
        }
        Update: {
          contractor_id?: string
          doc_type?: string
          expiration_date?: string
          id?: string
          sent_at?: string
          subcontractor_id?: string
          urgency?: string
          webhook_status?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_alert_log_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_alert_log_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "expiring_compliance_docs"
            referencedColumns: ["subcontractor_id"]
          },
          {
            foreignKeyName: "compliance_alert_log_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_audit_trail: {
        Row: {
          contractor_id: string
          created_at: string
          created_by: string
          details: Json
          document_type: string | null
          event_type: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          created_by: string
          details?: Json
          document_type?: string | null
          event_type: string
          id?: string
          notes?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          created_by?: string
          details?: Json
          document_type?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_audit_trail_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_tier_templates: {
        Row: {
          additional_insured_required: boolean
          additional_insured_text: string | null
          auto_any_auto_required: boolean
          auto_personal_acceptable: boolean
          certificate_holder_text: string | null
          contractor_id: string | null
          created_at: string
          gl_aggregate_min: number
          gl_each_occurrence_min: number
          id: string
          max_annual_volume: number | null
          tier: number
          tier_label: string
          umbrella_aggregate_min: number
          umbrella_each_occurrence_min: number
          updated_at: string
          wc_required: boolean
          wc_state_exemptions_ok: boolean
        }
        Insert: {
          additional_insured_required?: boolean
          additional_insured_text?: string | null
          auto_any_auto_required?: boolean
          auto_personal_acceptable?: boolean
          certificate_holder_text?: string | null
          contractor_id?: string | null
          created_at?: string
          gl_aggregate_min?: number
          gl_each_occurrence_min?: number
          id?: string
          max_annual_volume?: number | null
          tier: number
          tier_label: string
          umbrella_aggregate_min?: number
          umbrella_each_occurrence_min?: number
          updated_at?: string
          wc_required?: boolean
          wc_state_exemptions_ok?: boolean
        }
        Update: {
          additional_insured_required?: boolean
          additional_insured_text?: string | null
          auto_any_auto_required?: boolean
          auto_personal_acceptable?: boolean
          certificate_holder_text?: string | null
          contractor_id?: string | null
          created_at?: string
          gl_aggregate_min?: number
          gl_each_occurrence_min?: number
          id?: string
          max_annual_volume?: number | null
          tier?: number
          tier_label?: string
          umbrella_aggregate_min?: number
          umbrella_each_occurrence_min?: number
          updated_at?: string
          wc_required?: boolean
          wc_state_exemptions_ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "compliance_tier_templates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_applications: {
        Row: {
          additional_doc_urls: Json
          agrees_to_terms: boolean
          availability: string | null
          average_project_size: string | null
          commercial_glazing_experience: number | null
          created_at: string
          crew_size: number | null
          email: string | null
          ghl_contact_id: string | null
          id: string
          insurance_url: string | null
          license_number: string | null
          license_url: string | null
          name: string
          notes: string | null
          osha_record: string | null
          phone: string
          qualification_percentage: number | null
          qualification_score: number | null
          qualification_status: string | null
          service_area: string | null
          states_licensed: string[] | null
          status: string
          surety_bond: string | null
          trade_type: string | null
          updated_at: string
          window_film_experience: number | null
          workers_comp: string | null
          years_experience: string | null
          years_in_operation: number | null
        }
        Insert: {
          additional_doc_urls?: Json
          agrees_to_terms?: boolean
          availability?: string | null
          average_project_size?: string | null
          commercial_glazing_experience?: number | null
          created_at?: string
          crew_size?: number | null
          email?: string | null
          ghl_contact_id?: string | null
          id?: string
          insurance_url?: string | null
          license_number?: string | null
          license_url?: string | null
          name: string
          notes?: string | null
          osha_record?: string | null
          phone: string
          qualification_percentage?: number | null
          qualification_score?: number | null
          qualification_status?: string | null
          service_area?: string | null
          states_licensed?: string[] | null
          status?: string
          surety_bond?: string | null
          trade_type?: string | null
          updated_at?: string
          window_film_experience?: number | null
          workers_comp?: string | null
          years_experience?: string | null
          years_in_operation?: number | null
        }
        Update: {
          additional_doc_urls?: Json
          agrees_to_terms?: boolean
          availability?: string | null
          average_project_size?: string | null
          commercial_glazing_experience?: number | null
          created_at?: string
          crew_size?: number | null
          email?: string | null
          ghl_contact_id?: string | null
          id?: string
          insurance_url?: string | null
          license_number?: string | null
          license_url?: string | null
          name?: string
          notes?: string | null
          osha_record?: string | null
          phone?: string
          qualification_percentage?: number | null
          qualification_score?: number | null
          qualification_status?: string | null
          service_area?: string | null
          states_licensed?: string[] | null
          status?: string
          surety_bond?: string | null
          trade_type?: string | null
          updated_at?: string
          window_film_experience?: number | null
          workers_comp?: string | null
          years_experience?: string | null
          years_in_operation?: number | null
        }
        Relationships: []
      }
      contractor_documents: {
        Row: {
          ai_confidence: number | null
          contractor_id: string
          coverage_amount: number | null
          created_at: string
          document_type: string
          expiration_date: string | null
          extracted_data: Json | null
          file_mime: string | null
          file_name: string | null
          file_url: string | null
          holder_name: string | null
          id: string
          issuer_name: string | null
          license_number: string | null
          notes: string | null
          state_code: string | null
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          ai_confidence?: number | null
          contractor_id: string
          coverage_amount?: number | null
          created_at?: string
          document_type: string
          expiration_date?: string | null
          extracted_data?: Json | null
          file_mime?: string | null
          file_name?: string | null
          file_url?: string | null
          holder_name?: string | null
          id?: string
          issuer_name?: string | null
          license_number?: string | null
          notes?: string | null
          state_code?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          ai_confidence?: number | null
          contractor_id?: string
          coverage_amount?: number | null
          created_at?: string
          document_type?: string
          expiration_date?: string | null
          extracted_data?: Json | null
          file_mime?: string | null
          file_name?: string | null
          file_url?: string | null
          holder_name?: string | null
          id?: string
          issuer_name?: string | null
          license_number?: string | null
          notes?: string | null
          state_code?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_documents_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
        ]
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
      contractor_performance_events: {
        Row: {
          client_satisfaction: number | null
          completion_date: string | null
          completion_status: string | null
          contractor_id: string
          created_at: string
          event_type: string
          id: string
          notes: string | null
          offer_value: number | null
          project_id: string | null
          quality_score: number | null
          specialty: string | null
          state: string | null
          timestamp: string
        }
        Insert: {
          client_satisfaction?: number | null
          completion_date?: string | null
          completion_status?: string | null
          contractor_id: string
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          offer_value?: number | null
          project_id?: string | null
          quality_score?: number | null
          specialty?: string | null
          state?: string | null
          timestamp?: string
        }
        Update: {
          client_satisfaction?: number | null
          completion_date?: string | null
          completion_status?: string | null
          contractor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          offer_value?: number | null
          project_id?: string | null
          quality_score?: number | null
          specialty?: string | null
          state?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_performance_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_performance_metrics: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          metrics: Json
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          metrics: Json
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          metrics?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_performance_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_survey_responses: {
        Row: {
          availability: string | null
          average_project_size: string | null
          commercial_glazing_experience: number | null
          completed_at: string | null
          contractor_id: string
          created_at: string
          crew_size: number | null
          id: string
          osha_record: string | null
          percentage: number | null
          states_licensed: string[] | null
          status: string
          surety_bond: string | null
          total_score: number | null
          updated_at: string
          window_film_experience: number | null
          workers_comp: string | null
          years_in_operation: number | null
        }
        Insert: {
          availability?: string | null
          average_project_size?: string | null
          commercial_glazing_experience?: number | null
          completed_at?: string | null
          contractor_id: string
          created_at?: string
          crew_size?: number | null
          id?: string
          osha_record?: string | null
          percentage?: number | null
          states_licensed?: string[] | null
          status?: string
          surety_bond?: string | null
          total_score?: number | null
          updated_at?: string
          window_film_experience?: number | null
          workers_comp?: string | null
          years_in_operation?: number | null
        }
        Update: {
          availability?: string | null
          average_project_size?: string | null
          commercial_glazing_experience?: number | null
          completed_at?: string | null
          contractor_id?: string
          created_at?: string
          crew_size?: number | null
          id?: string
          osha_record?: string | null
          percentage?: number | null
          states_licensed?: string[] | null
          status?: string
          surety_bond?: string | null
          total_score?: number | null
          updated_at?: string
          window_film_experience?: number | null
          workers_comp?: string | null
          years_in_operation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_survey_responses_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          account_status: string
          anthropic_api_key: string | null
          billing_email: string | null
          business_address: string | null
          business_name: string
          created_at: string
          email: string | null
          email_from: string | null
          ghl_api_token: string | null
          ghl_location_id: string | null
          id: string
          last_payment_at: string | null
          license_number: string | null
          logo_url: string | null
          phone: string | null
          pricing_settings: Json | null
          primary_color: string | null
          service_states: string[] | null
          slug: string | null
          sms_from_number: string | null
          subscription_status: string
          subscription_tier: string
          trade_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          account_status?: string
          anthropic_api_key?: string | null
          billing_email?: string | null
          business_address?: string | null
          business_name?: string
          created_at?: string
          email?: string | null
          email_from?: string | null
          ghl_api_token?: string | null
          ghl_location_id?: string | null
          id?: string
          last_payment_at?: string | null
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          pricing_settings?: Json | null
          primary_color?: string | null
          service_states?: string[] | null
          slug?: string | null
          sms_from_number?: string | null
          subscription_status?: string
          subscription_tier?: string
          trade_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          account_status?: string
          anthropic_api_key?: string | null
          billing_email?: string | null
          business_address?: string | null
          business_name?: string
          created_at?: string
          email?: string | null
          email_from?: string | null
          ghl_api_token?: string | null
          ghl_location_id?: string | null
          id?: string
          last_payment_at?: string | null
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          pricing_settings?: Json | null
          primary_color?: string | null
          service_states?: string[] | null
          slug?: string | null
          sms_from_number?: string | null
          subscription_status?: string
          subscription_tier?: string
          trade_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          action_type: string
          billing_period: string
          contractor_id: string
          created_at: string
          credits_used: number
          description: string | null
          id: string
          is_overage: boolean
        }
        Insert: {
          action_type: string
          billing_period: string
          contractor_id: string
          created_at?: string
          credits_used?: number
          description?: string | null
          id?: string
          is_overage?: boolean
        }
        Update: {
          action_type?: string
          billing_period?: string
          contractor_id?: string
          created_at?: string
          credits_used?: number
          description?: string | null
          id?: string
          is_overage?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_pack_purchases: {
        Row: {
          contractor_id: string
          credits_remaining: number
          credits_total: number
          id: string
          pack_name: string
          purchased_at: string
        }
        Insert: {
          contractor_id: string
          credits_remaining: number
          credits_total: number
          id?: string
          pack_name: string
          purchased_at?: string
        }
        Update: {
          contractor_id?: string
          credits_remaining?: number
          credits_total?: number
          id?: string
          pack_name?: string
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_pack_purchases_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      document_renewal_requests: {
        Row: {
          contractor_id: string
          created_at: string
          document_id: string
          document_type: string
          id: string
          sms_sent: boolean
        }
        Insert: {
          contractor_id: string
          created_at?: string
          document_id: string
          document_type: string
          id?: string
          sms_sent?: boolean
        }
        Update: {
          contractor_id?: string
          created_at?: string
          document_id?: string
          document_type?: string
          id?: string
          sms_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_renewal_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_renewal_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "contractor_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_traces: {
        Row: {
          account_id: string
          created_at: string
          doc_hash: string
          document_id: string | null
          id: string
          ip_address: string | null
          trace_code: string
          user_agent: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          doc_hash: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
          trace_code: string
          user_agent?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          doc_hash?: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
          trace_code?: string
          user_agent?: string | null
        }
        Relationships: []
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
      gallery_media: {
        Row: {
          created_at: string
          display_order: number
          gallery_id: string
          id: string
          media_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          gallery_id: string
          id?: string
          media_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          gallery_id?: string
          id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_media_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "media_galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "photos_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_events: {
        Row: {
          account_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          account_id: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      jessica_followup_queue: {
        Row: {
          contact_id: string
          created_at: string
          error: string | null
          id: string
          location_id: string | null
          name: string | null
          phone: string | null
          processed_at: string | null
          status: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          error?: string | null
          id?: string
          location_id?: string | null
          name?: string | null
          phone?: string | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          error?: string | null
          id?: string
          location_id?: string | null
          name?: string | null
          phone?: string | null
          processed_at?: string | null
          status?: string
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
      media_galleries: {
        Row: {
          contractor_id: string | null
          created_at: string
          description: string | null
          display_order: number | null
          gallery_type: string
          id: string
          is_archived: boolean | null
          is_public: boolean | null
          name: string
          proposal_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          gallery_type: string
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          name: string
          proposal_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contractor_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          gallery_type?: string
          id?: string
          is_archived?: boolean | null
          is_public?: boolean | null
          name?: string
          proposal_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_galleries_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_galleries_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_enhancements: {
        Row: {
          cost: number | null
          created_at: string
          enhanced_image_url: string | null
          enhancement_type: string
          error_message: string | null
          id: string
          media_id: string
          processing_time_ms: number | null
          provider: string
          result: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          enhanced_image_url?: string | null
          enhancement_type: string
          error_message?: string | null
          id?: string
          media_id: string
          processing_time_ms?: number | null
          provider: string
          result?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          enhanced_image_url?: string | null
          enhancement_type?: string
          error_message?: string | null
          id?: string
          media_id?: string
          processing_time_ms?: number | null
          provider?: string
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_enhancements_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "photos_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos_videos: {
        Row: {
          ai_analysis: Json | null
          contractor_id: string | null
          created_at: string
          damage_type: string | null
          description: string | null
          display_order: number | null
          duration_seconds: number | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          is_archived: boolean | null
          is_damage_photo: boolean | null
          is_public: boolean | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          mime_type: string
          proposal_id: string | null
          storage_path: string
          storage_url: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          contractor_id?: string | null
          created_at?: string
          damage_type?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          is_archived?: boolean | null
          is_damage_photo?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type: string
          proposal_id?: string | null
          storage_path: string
          storage_url: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          contractor_id?: string | null
          created_at?: string
          damage_type?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          is_archived?: boolean | null
          is_damage_photo?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          mime_type?: string
          proposal_id?: string | null
          storage_path?: string
          storage_url?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_videos_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_videos_proposal_id_fkey"
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
          signature_image: string | null
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
          signature_image?: string | null
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
          signature_image?: string | null
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
          client_photos: Json | null
          contractor_id: string | null
          created_at: string
          deposit_amount: number | null
          deposit_invoice_id: string | null
          deposit_status: string | null
          exclusions: Json | null
          expires_at: string | null
          id: string
          job_address: string | null
          job_description: string | null
          job_state: string | null
          job_zip: string | null
          labor: Json | null
          language: string
          materials: Json | null
          overhead_amount: number | null
          overhead_label: string | null
          overhead_percentage: number | null
          overhead_source: string | null
          payment_terms: string | null
          photos: Json
          prevailing_wage_flag: boolean
          prevailing_wage_source: string | null
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
          client_photos?: Json | null
          contractor_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_invoice_id?: string | null
          deposit_status?: string | null
          exclusions?: Json | null
          expires_at?: string | null
          id?: string
          job_address?: string | null
          job_description?: string | null
          job_state?: string | null
          job_zip?: string | null
          labor?: Json | null
          language?: string
          materials?: Json | null
          overhead_amount?: number | null
          overhead_label?: string | null
          overhead_percentage?: number | null
          overhead_source?: string | null
          payment_terms?: string | null
          photos?: Json
          prevailing_wage_flag?: boolean
          prevailing_wage_source?: string | null
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
          client_photos?: Json | null
          contractor_id?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_invoice_id?: string | null
          deposit_status?: string | null
          exclusions?: Json | null
          expires_at?: string | null
          id?: string
          job_address?: string | null
          job_description?: string | null
          job_state?: string | null
          job_zip?: string | null
          labor?: Json | null
          language?: string
          materials?: Json | null
          overhead_amount?: number | null
          overhead_label?: string | null
          overhead_percentage?: number | null
          overhead_source?: string | null
          payment_terms?: string | null
          photos?: Json
          prevailing_wage_flag?: boolean
          prevailing_wage_source?: string | null
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
      referral_codes: {
        Row: {
          code: string
          company_name: string
          created_at: string
          id: string
          payout_email: string | null
          payout_preference: string
          user_id: string
        }
        Insert: {
          code: string
          company_name: string
          created_at?: string
          id?: string
          payout_email?: string | null
          payout_preference?: string
          user_id: string
        }
        Update: {
          code?: string
          company_name?: string
          created_at?: string
          id?: string
          payout_email?: string | null
          payout_preference?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          activated_at: string | null
          commission_rate: number
          created_at: string
          id: string
          plan_amount_cents: number
          plan_name: string
          referred_company: string
          referred_email: string | null
          referrer_code: string
          status: string
        }
        Insert: {
          activated_at?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          plan_amount_cents?: number
          plan_name?: string
          referred_company: string
          referred_email?: string | null
          referrer_code: string
          status?: string
        }
        Update: {
          activated_at?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          plan_amount_cents?: number
          plan_name?: string
          referred_company?: string
          referred_email?: string | null
          referrer_code?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_code_fkey"
            columns: ["referrer_code"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      subcontractors: {
        Row: {
          additional_insured_present: boolean
          auto_any_auto: boolean
          auto_expiration: string | null
          business_license_expiration: string | null
          business_license_on_file: boolean
          certificate_holder_correct: boolean
          coi_document_url: string | null
          coi_on_file: boolean
          company_name: string
          compliance_status: string
          compliance_tier: number | null
          contact_name: string | null
          contractor_id: string
          created_at: string
          email: string | null
          ghl_contact_id: string | null
          gl_aggregate: number | null
          gl_each_occurrence: number | null
          gl_expiration: string | null
          id: string
          msa_date: string | null
          msa_signed: boolean
          notes: string | null
          phone: string | null
          sos_registration_on_file: boolean
          trade_type: string | null
          umbrella_aggregate: number | null
          umbrella_each_occurrence: number | null
          umbrella_expiration: string | null
          updated_at: string
          vendor_type: string
          w9_on_file: boolean
          w9_year: number | null
          wc_expiration: string | null
          wc_present: boolean
        }
        Insert: {
          additional_insured_present?: boolean
          auto_any_auto?: boolean
          auto_expiration?: string | null
          business_license_expiration?: string | null
          business_license_on_file?: boolean
          certificate_holder_correct?: boolean
          coi_document_url?: string | null
          coi_on_file?: boolean
          company_name: string
          compliance_status?: string
          compliance_tier?: number | null
          contact_name?: string | null
          contractor_id: string
          created_at?: string
          email?: string | null
          ghl_contact_id?: string | null
          gl_aggregate?: number | null
          gl_each_occurrence?: number | null
          gl_expiration?: string | null
          id?: string
          msa_date?: string | null
          msa_signed?: boolean
          notes?: string | null
          phone?: string | null
          sos_registration_on_file?: boolean
          trade_type?: string | null
          umbrella_aggregate?: number | null
          umbrella_each_occurrence?: number | null
          umbrella_expiration?: string | null
          updated_at?: string
          vendor_type?: string
          w9_on_file?: boolean
          w9_year?: number | null
          wc_expiration?: string | null
          wc_present?: boolean
        }
        Update: {
          additional_insured_present?: boolean
          auto_any_auto?: boolean
          auto_expiration?: string | null
          business_license_expiration?: string | null
          business_license_on_file?: boolean
          certificate_holder_correct?: boolean
          coi_document_url?: string | null
          coi_on_file?: boolean
          company_name?: string
          compliance_status?: string
          compliance_tier?: number | null
          contact_name?: string | null
          contractor_id?: string
          created_at?: string
          email?: string | null
          ghl_contact_id?: string | null
          gl_aggregate?: number | null
          gl_each_occurrence?: number | null
          gl_expiration?: string | null
          id?: string
          msa_date?: string | null
          msa_signed?: boolean
          notes?: string | null
          phone?: string | null
          sos_registration_on_file?: boolean
          trade_type?: string | null
          umbrella_aggregate?: number | null
          umbrella_each_occurrence?: number | null
          umbrella_expiration?: string | null
          updated_at?: string
          vendor_type?: string
          w9_on_file?: boolean
          w9_year?: number | null
          wc_expiration?: string | null
          wc_present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_contractor_id_fkey"
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
      voice_prequal_calls: {
        Row: {
          call_disposition: string
          contractor_id: string | null
          created_at: string
          crew_size: string | null
          ghl_contact_id: string | null
          has_gc_license: string | null
          has_liability_ins: string | null
          has_surety_bond: string | null
          has_workers_comp: string | null
          id: string
          phone: string | null
          raw_payload: Json | null
          sms_upload_link_sent: boolean
          states_licensed: string | null
          years_in_business: string | null
        }
        Insert: {
          call_disposition?: string
          contractor_id?: string | null
          created_at?: string
          crew_size?: string | null
          ghl_contact_id?: string | null
          has_gc_license?: string | null
          has_liability_ins?: string | null
          has_surety_bond?: string | null
          has_workers_comp?: string | null
          id?: string
          phone?: string | null
          raw_payload?: Json | null
          sms_upload_link_sent?: boolean
          states_licensed?: string | null
          years_in_business?: string | null
        }
        Update: {
          call_disposition?: string
          contractor_id?: string | null
          created_at?: string
          crew_size?: string | null
          ghl_contact_id?: string | null
          has_gc_license?: string | null
          has_liability_ins?: string | null
          has_surety_bond?: string | null
          has_workers_comp?: string | null
          id?: string
          phone?: string | null
          raw_payload?: Json | null
          sms_upload_link_sent?: boolean
          states_licensed?: string | null
          years_in_business?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_prequal_calls_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractor_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      web_call_events: {
        Row: {
          agent_id: string | null
          client_ip: string | null
          created_at: string
          error_message: string | null
          id: string
          status: string | null
          user_agent: string | null
        }
        Insert: {
          agent_id?: string | null
          client_ip?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          agent_id?: string | null
          client_ip?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      expiring_compliance_docs: {
        Row: {
          company_name: string | null
          contractor_id: string | null
          days_until_expiration: number | null
          doc_type: string | null
          email: string | null
          expiration_date: string | null
          phone: string | null
          subcontractor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
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
