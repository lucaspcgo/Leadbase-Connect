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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          credits_used: number | null
          empresa_cnpj: string
          empresa_razao_social: string | null
          id: string
          used_extra_credit: boolean | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          credits_used?: number | null
          empresa_cnpj: string
          empresa_razao_social?: string | null
          id?: string
          used_extra_credit?: boolean | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          credits_used?: number | null
          empresa_cnpj?: string
          empresa_razao_social?: string | null
          id?: string
          used_extra_credit?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          paid_at: string | null
          payment_id: string | null
          referral_id: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          referral_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          referral_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          paid_earnings: number
          pending_earnings: number
          referral_code: string
          status: string
          total_earnings: number
          total_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          paid_earnings?: number
          pending_earnings?: number
          referral_code: string
          status?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          paid_earnings?: number
          pending_earnings?: number
          referral_code?: string
          status?: string
          total_earnings?: number
          total_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[]
          rate_limit: number
          total_requests: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[]
          rate_limit?: number
          total_requests?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[]
          rate_limit?: number
          total_requests?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number | null
          user_id: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_id: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usages: {
        Row: {
          coupon_code: string
          coupon_id: string
          created_at: string
          discount_amount: number
          discount_type: string
          discount_value: number
          id: string
          original_amount: number
          payment_id: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          coupon_code: string
          coupon_id: string
          created_at?: string
          discount_amount?: number
          discount_type: string
          discount_value: number
          id?: string
          original_amount?: number
          payment_id?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          coupon_code?: string
          coupon_id?: string
          created_at?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          id?: string
          original_amount?: number
          payment_id?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usages_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_plans: string[] | null
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          id: string
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          id?: string
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      empresa_audit_logs: {
        Row: {
          admin_id: string
          admin_name: string
          campo_alterado: string
          created_at: string
          empresa_cnpj: string
          id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          admin_id: string
          admin_name: string
          campo_alterado: string
          created_at?: string
          empresa_cnpj: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          admin_id?: string
          admin_name?: string
          campo_alterado?: string
          created_at?: string
          empresa_cnpj?: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      empresas: {
        Row: {
          bairro: string | null
          capital_social_empresa: number | null
          categoria_id: string | null
          cep: string | null
          cnae_codigo: string | null
          cnae_fiscal: string | null
          cnaes_secundarios: string | null
          cnpj: string
          cod_municipio: string | null
          cod_natureza_juridica: string | null
          cod_pais: string | null
          complemento: string | null
          correio_eletronico: string | null
          created_at: string
          data_exclusao_simples: string | null
          data_inicio_atividade: string | null
          data_opcao_simples: string | null
          data_sit_cadastral: string | null
          data_sit_especial: string | null
          ddd_fax: string | null
          ddd_telefone_1: string | null
          ddd_telefone_2: string | null
          desc_tipo_logradouro: string | null
          email: string | null
          id: number
          logradouro: string | null
          matriz_filial: string | null
          motivo_sit_cadastral: string | null
          municipio: string | null
          needs_enrichment: boolean
          nome_cidade_exterior: string | null
          nome_fantasia: string | null
          nome_pais: string | null
          numero: string | null
          opcao_mei: string | null
          opcao_simples: string | null
          porte_empresa: string | null
          qualif_responsavel: string | null
          razao_social: string | null
          sit_cadastral: string | null
          sit_especial: string | null
          socios: string | null
          socios_raw: string | null
          tags: string[] | null
          telefone1_celular: boolean | null
          telefone2_celular: boolean | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          capital_social_empresa?: number | null
          categoria_id?: string | null
          cep?: string | null
          cnae_codigo?: string | null
          cnae_fiscal?: string | null
          cnaes_secundarios?: string | null
          cnpj: string
          cod_municipio?: string | null
          cod_natureza_juridica?: string | null
          cod_pais?: string | null
          complemento?: string | null
          correio_eletronico?: string | null
          created_at?: string
          data_exclusao_simples?: string | null
          data_inicio_atividade?: string | null
          data_opcao_simples?: string | null
          data_sit_cadastral?: string | null
          data_sit_especial?: string | null
          ddd_fax?: string | null
          ddd_telefone_1?: string | null
          ddd_telefone_2?: string | null
          desc_tipo_logradouro?: string | null
          email?: string | null
          id?: number
          logradouro?: string | null
          matriz_filial?: string | null
          motivo_sit_cadastral?: string | null
          municipio?: string | null
          needs_enrichment?: boolean
          nome_cidade_exterior?: string | null
          nome_fantasia?: string | null
          nome_pais?: string | null
          numero?: string | null
          opcao_mei?: string | null
          opcao_simples?: string | null
          porte_empresa?: string | null
          qualif_responsavel?: string | null
          razao_social?: string | null
          sit_cadastral?: string | null
          sit_especial?: string | null
          socios?: string | null
          socios_raw?: string | null
          tags?: string[] | null
          telefone1_celular?: boolean | null
          telefone2_celular?: boolean | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          capital_social_empresa?: number | null
          categoria_id?: string | null
          cep?: string | null
          cnae_codigo?: string | null
          cnae_fiscal?: string | null
          cnaes_secundarios?: string | null
          cnpj?: string
          cod_municipio?: string | null
          cod_natureza_juridica?: string | null
          cod_pais?: string | null
          complemento?: string | null
          correio_eletronico?: string | null
          created_at?: string
          data_exclusao_simples?: string | null
          data_inicio_atividade?: string | null
          data_opcao_simples?: string | null
          data_sit_cadastral?: string | null
          data_sit_especial?: string | null
          ddd_fax?: string | null
          ddd_telefone_1?: string | null
          ddd_telefone_2?: string | null
          desc_tipo_logradouro?: string | null
          email?: string | null
          id?: number
          logradouro?: string | null
          matriz_filial?: string | null
          motivo_sit_cadastral?: string | null
          municipio?: string | null
          needs_enrichment?: boolean
          nome_cidade_exterior?: string | null
          nome_fantasia?: string | null
          nome_pais?: string | null
          numero?: string | null
          opcao_mei?: string | null
          opcao_simples?: string | null
          porte_empresa?: string | null
          qualif_responsavel?: string | null
          razao_social?: string | null
          sit_cadastral?: string | null
          sit_especial?: string | null
          socios?: string | null
          socios_raw?: string | null
          tags?: string[] | null
          telefone1_celular?: boolean | null
          telefone2_celular?: boolean | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      enrichment_logs: {
        Row: {
          admin_id: string
          admin_name: string
          completed_at: string | null
          control: string
          created_at: string
          enriched: number
          failed: number
          id: string
          skipped: number
          source: string
          started_at: string
          status: string
          total_cnpjs: number
        }
        Insert: {
          admin_id: string
          admin_name: string
          completed_at?: string | null
          control?: string
          created_at?: string
          enriched?: number
          failed?: number
          id?: string
          skipped?: number
          source?: string
          started_at?: string
          status?: string
          total_cnpjs?: number
        }
        Update: {
          admin_id?: string
          admin_name?: string
          completed_at?: string | null
          control?: string
          created_at?: string
          enriched?: number
          failed?: number
          id?: string
          skipped?: number
          source?: string
          started_at?: string
          status?: string
          total_cnpjs?: number
        }
        Relationships: []
      }
      enrichment_results: {
        Row: {
          cnpj: string
          created_at: string
          error_message: string | null
          fields_changed: string[] | null
          fields_updated: number | null
          id: string
          log_id: string
          razao_social: string | null
          source: string | null
          status: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          error_message?: string | null
          fields_changed?: string[] | null
          fields_updated?: number | null
          id?: string
          log_id: string
          razao_social?: string | null
          source?: string | null
          status?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          error_message?: string | null
          fields_changed?: string[] | null
          fields_updated?: number | null
          id?: string
          log_id?: string
          razao_social?: string | null
          source?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_results_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "enrichment_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_logs: {
        Row: {
          action: string
          admin_id: string
          admin_name: string
          after_value: string | null
          before_value: string | null
          created_at: string
          details: string
          entity_id: string | null
          entity_type: string
          id: string
          target_user_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          admin_name: string
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          details: string
          entity_id?: string | null
          entity_type: string
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          details?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      ga4_configs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          measurement_id: string | null
          track_conversions: boolean
          track_login: boolean
          track_pageviews: boolean
          track_signup: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          measurement_id?: string | null
          track_conversions?: boolean
          track_login?: boolean
          track_pageviews?: boolean
          track_signup?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          measurement_id?: string | null
          track_conversions?: boolean
          track_login?: boolean
          track_pageviews?: boolean
          track_signup?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ga4_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          page_path: string | null
          page_title: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          page_title?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          page_title?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          admin_id: string
          admin_name: string
          created_at: string
          duplicate_mode: string
          errors_count: number
          filename: string | null
          id: string
          inserted: number
          skipped: number
          source: string
          total_rows: number
          ufs_imported: string[] | null
          updated: number
        }
        Insert: {
          admin_id: string
          admin_name: string
          created_at?: string
          duplicate_mode?: string
          errors_count?: number
          filename?: string | null
          id?: string
          inserted?: number
          skipped?: number
          source?: string
          total_rows?: number
          ufs_imported?: string[] | null
          updated?: number
        }
        Update: {
          admin_id?: string
          admin_name?: string
          created_at?: string
          duplicate_mode?: string
          errors_count?: number
          filename?: string | null
          id?: string
          inserted?: number
          skipped?: number
          source?: string
          total_rows?: number
          ufs_imported?: string[] | null
          updated?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          billing_cycle: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          paid_at: string | null
          plan_id: string
          plan_name: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          plan_id: string
          plan_name: string
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          plan_id?: string
          plan_name?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      job_positions: {
        Row: {
          created_at: string
          department: string | null
          description: string
          id: string
          is_active: boolean
          location: string | null
          requirements: string[] | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description: string
          id?: string
          is_active?: boolean
          location?: string | null
          requirements?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          is_active?: boolean
          location?: string | null
          requirements?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_pixel_audit_logs: {
        Row: {
          admin_id: string
          admin_name: string
          campo_alterado: string
          created_at: string
          id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          admin_id: string
          admin_name?: string
          campo_alterado: string
          created_at?: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          admin_id?: string
          admin_name?: string
          campo_alterado?: string
          created_at?: string
          id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      meta_pixel_configs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          pixel_id: string | null
          track_complete_registration: boolean
          track_lead: boolean
          track_pageviews: boolean
          track_purchase: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          pixel_id?: string | null
          track_complete_registration?: boolean
          track_lead?: boolean
          track_pageviews?: boolean
          track_purchase?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          pixel_id?: string | null
          track_complete_registration?: boolean
          track_lead?: boolean
          track_pageviews?: boolean
          track_purchase?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          template_key: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          template_key: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          template_key?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      page_contents: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          page_slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          page_slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          page_slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_configs: {
        Row: {
          created_at: string | null
          id: string
          mercado_pago_access_token: string | null
          mercado_pago_enabled: boolean | null
          mercado_pago_public_key: string | null
          mercado_pago_sandbox_mode: boolean | null
          mercado_pago_webhook_secret: string | null
          paypal_client_id: string | null
          paypal_client_secret: string | null
          paypal_enabled: boolean | null
          paypal_sandbox_mode: boolean | null
          paypal_webhook_id: string | null
          pix_beneficiario: string | null
          pix_chave: string | null
          pix_cidade: string | null
          pix_enabled: boolean | null
          pix_instrucoes: string | null
          pix_tipo_chave: string | null
          smtp_enabled: boolean | null
          smtp_from_email: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          smtp_user: string | null
          stripe_enabled: boolean | null
          stripe_publishable_key: string | null
          stripe_sandbox_mode: boolean | null
          stripe_secret_key: string | null
          stripe_webhook_secret: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_enabled?: boolean | null
          mercado_pago_public_key?: string | null
          mercado_pago_sandbox_mode?: boolean | null
          mercado_pago_webhook_secret?: string | null
          paypal_client_id?: string | null
          paypal_client_secret?: string | null
          paypal_enabled?: boolean | null
          paypal_sandbox_mode?: boolean | null
          paypal_webhook_id?: string | null
          pix_beneficiario?: string | null
          pix_chave?: string | null
          pix_cidade?: string | null
          pix_enabled?: boolean | null
          pix_instrucoes?: string | null
          pix_tipo_chave?: string | null
          smtp_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          stripe_enabled?: boolean | null
          stripe_publishable_key?: string | null
          stripe_sandbox_mode?: boolean | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mercado_pago_access_token?: string | null
          mercado_pago_enabled?: boolean | null
          mercado_pago_public_key?: string | null
          mercado_pago_sandbox_mode?: boolean | null
          mercado_pago_webhook_secret?: string | null
          paypal_client_id?: string | null
          paypal_client_secret?: string | null
          paypal_enabled?: boolean | null
          paypal_sandbox_mode?: boolean | null
          paypal_webhook_id?: string | null
          pix_beneficiario?: string | null
          pix_chave?: string | null
          pix_cidade?: string | null
          pix_enabled?: boolean | null
          pix_instrucoes?: string | null
          pix_tipo_chave?: string | null
          smtp_enabled?: boolean | null
          smtp_from_email?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          smtp_user?: string | null
          stripe_enabled?: boolean | null
          stripe_publishable_key?: string | null
          stripe_sandbox_mode?: boolean | null
          stripe_secret_key?: string | null
          stripe_webhook_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          external_id: string | null
          id: string
          invoice_id: string | null
          metadata: Json | null
          method: string
          paid_at: string | null
          pix_code: string | null
          pix_qrcode: string | null
          status: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          external_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          method: string
          paid_at?: string | null
          pix_code?: string | null
          pix_qrcode?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          external_id?: string | null
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          method?: string
          paid_at?: string | null
          pix_code?: string | null
          pix_qrcode?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          can_export: boolean
          created_at: string
          description: string | null
          display_order: number
          features: string[]
          id: string
          is_active: boolean
          is_popular: boolean
          max_users: number | null
          monthly_company_limit: number
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          can_export?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          features?: string[]
          id: string
          is_active?: boolean
          is_popular?: boolean
          max_users?: number | null
          monthly_company_limit?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          can_export?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          features?: string[]
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_users?: number | null
          monthly_company_limit?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          extra_credits: number
          id: string
          monthly_limit_override: number | null
          name: string | null
          plan_id: string
          plan_start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extra_credits?: number
          id?: string
          monthly_limit_override?: number | null
          name?: string | null
          plan_id?: string
          plan_start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extra_credits?: number
          id?: string
          monthly_limit_override?: number | null
          name?: string | null
          plan_id?: string
          plan_start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          affiliate_id: string
          converted_at: string | null
          created_at: string
          id: string
          referred_user_email: string
          referred_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referred_user_email: string
          referred_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          referred_user_email?: string
          referred_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          filtros: Json
          id: string
          is_admin: boolean
          nome: string
          notify_new_matches: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filtros?: Json
          id?: string
          is_admin?: boolean
          nome: string
          notify_new_matches?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filtros?: Json
          id?: string
          is_admin?: boolean
          nome?: string
          notify_new_matches?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          processed_at: string | null
          sent_at: string | null
          status: string
          target_user_id: string | null
          template_key: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          sent_at?: string | null
          status?: string
          target_user_id?: string | null
          template_key: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          sent_at?: string | null
          status?: string
          target_user_id?: string | null
          template_key?: string
        }
        Relationships: []
      }
      search_performance_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number
          filters: Json | null
          id: string
          results_count: number
          search_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms: number
          filters?: Json | null
          id?: string
          results_count: number
          search_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number
          filters?: Json | null
          id?: string
          results_count?: number
          search_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      socios: {
        Row: {
          created_at: string
          empresa_cnpj: string
          fonte: string
          id: string
          nome_socio: string
          qualificacao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_cnpj: string
          fonte?: string
          id?: string
          nome_socio: string
          qualificacao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_cnpj?: string
          fonte?: string
          id?: string
          nome_socio?: string
          qualificacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          plan_name: string
          price: number
          start_at: string | null
          status: string
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          billing_cycle: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          plan_name: string
          price: number
          start_at?: string | null
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          plan_name?: string
          price?: number
          start_at?: string | null
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          member_email: string
          member_name: string | null
          member_user_id: string
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_email: string
          member_name?: string | null
          member_user_id: string
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_email?: string
          member_name?: string | null
          member_user_id?: string
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      unlocked_companies: {
        Row: {
          billing_cycle_end: string
          billing_cycle_start: string
          empresa_cnpj: string
          empresa_id: number | null
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          empresa_cnpj: string
          empresa_id?: number | null
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          billing_cycle_end?: string
          billing_cycle_start?: string
          empresa_cnpj?: string
          empresa_id?: number | null
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          success: boolean
          webhook_id: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          success?: boolean
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          failed_deliveries: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret: string | null
          total_deliveries: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failed_deliveries?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          total_deliveries?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failed_deliveries?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          total_deliveries?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      empresas_filter_options: {
        Row: {
          contagem: number | null
          tipo: string | null
          uf: string | null
          valor: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_referral_code: { Args: never; Returns: string }
      get_affiliate_by_code: {
        Args: { p_code: string }
        Returns: {
          affiliate_id: string
          commission_rate: number
          status: string
          user_id: string
        }[]
      }
      get_cnaes_grouped: {
        Args: never
        Returns: {
          cnae_codigo: string
          cnae_fiscal: string
          count: number
        }[]
      }
      get_empresa_for_unlock: {
        Args: { p_empresa_id: number }
        Returns: {
          bairro: string
          capital_social_empresa: number
          categoria_id: string
          cep: string
          cnae_codigo: string
          cnae_fiscal: string
          cnaes_secundarios: string
          cnpj: string
          cod_municipio: string
          cod_natureza_juridica: string
          cod_pais: string
          complemento: string
          correio_eletronico: string
          created_at: string
          data_exclusao_simples: string
          data_inicio_atividade: string
          data_opcao_simples: string
          data_sit_cadastral: string
          data_sit_especial: string
          ddd_fax: string
          ddd_telefone_1: string
          ddd_telefone_2: string
          desc_tipo_logradouro: string
          email: string
          id: number
          is_unlocked: boolean
          logradouro: string
          matriz_filial: string
          motivo_sit_cadastral: string
          municipio: string
          nome_cidade_exterior: string
          nome_fantasia: string
          nome_pais: string
          numero: string
          opcao_mei: string
          opcao_simples: string
          porte_empresa: string
          qualif_responsavel: string
          razao_social: string
          sit_cadastral: string
          sit_especial: string
          socios: string
          socios_raw: string
          tags: string[]
          telefone1_celular: boolean
          telefone2_celular: boolean
          uf: string
          updated_at: string
        }[]
      }
      get_empresa_stats: {
        Args: never
        Returns: {
          stat_name: string
          stat_type: string
          stat_value: number
        }[]
      }
      get_empresas_public: {
        Args: {
          p_busca_socio?: string
          p_categoria_id?: string
          p_cnae?: string
          p_data_abertura_fim?: string
          p_data_abertura_inicio?: string
          p_has_email?: boolean
          p_has_phone?: boolean
          p_has_socios?: boolean
          p_limit?: number
          p_matriz_filial?: string
          p_mei?: string
          p_municipio?: string
          p_offset?: number
          p_porte?: string
          p_search?: string
          p_simples?: string
          p_sit_cadastral?: string
          p_tags?: string[]
          p_uf?: string
        }
        Returns: {
          capital_social_empresa: number
          categoria_id: string
          cnae_codigo: string
          cnae_fiscal: string
          cnaes_secundarios: string
          cod_municipio: string
          cod_natureza_juridica: string
          cod_pais: string
          created_at: string
          data_exclusao_simples: string
          data_inicio_atividade: string
          data_opcao_simples: string
          data_sit_cadastral: string
          data_sit_especial: string
          has_email: boolean
          has_phone: boolean
          has_socios: boolean
          id: number
          matriz_filial: string
          motivo_sit_cadastral: string
          municipio: string
          nome_cidade_exterior: string
          nome_pais: string
          opcao_mei: string
          opcao_simples: string
          porte_empresa: string
          qualif_responsavel: string
          sit_cadastral: string
          sit_especial: string
          tags: string[]
          total_count: number
          uf: string
          updated_at: string
        }[]
      }
      get_filter_options: {
        Args: never
        Returns: {
          contagem: number
          tipo: string
          uf: string
          valor: string
        }[]
      }
      get_ga4_public_config: {
        Args: never
        Returns: {
          enabled: boolean
          measurement_id: string
          track_conversions: boolean
          track_login: boolean
          track_pageviews: boolean
          track_signup: boolean
        }[]
      }
      get_meta_pixel_public_config: {
        Args: never
        Returns: {
          enabled: boolean
          pixel_id: string
          track_complete_registration: boolean
          track_lead: boolean
          track_pageviews: boolean
          track_purchase: boolean
        }[]
      }
      get_pix_checkout_config: {
        Args: never
        Returns: {
          pix_beneficiario: string
          pix_chave: string
          pix_cidade: string
          pix_enabled: boolean
          pix_tipo_chave: string
        }[]
      }
      get_public_payment_config: {
        Args: never
        Returns: {
          mercado_pago_enabled: boolean
          paypal_enabled: boolean
          pix_beneficiario: string
          pix_cidade: string
          pix_enabled: boolean
          stripe_enabled: boolean
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      log_search_performance: {
        Args: {
          p_error_message?: string
          p_execution_time_ms: number
          p_filters?: Json
          p_results_count: number
          p_search_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      refresh_filter_options: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      validate_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          api_key_id: string
          permissions: string[]
          rate_limit: number
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin" | "master_admin"
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
    Enums: {
      app_role: ["user", "admin", "master_admin"],
    },
  },
} as const
