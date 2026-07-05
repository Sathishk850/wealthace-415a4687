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
      feedback: {
        Row: {
          attachment_url: string | null
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["feedback_status"]
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string
          downloaded_at: string | null
          email_status: string
          formats: string[]
          frequency: string | null
          generated_at: string
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          report_keys: string[]
          schedule_id: string | null
          snapshot: Json
          status: string
          summary: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          downloaded_at?: string | null
          email_status?: string
          formats?: string[]
          frequency?: string | null
          generated_at?: string
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          report_keys?: string[]
          schedule_id?: string | null
          snapshot?: Json
          status?: string
          summary?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          downloaded_at?: string | null
          email_status?: string
          formats?: string[]
          frequency?: string | null
          generated_at?: string
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          report_keys?: string[]
          schedule_id?: string | null
          snapshot?: Json
          status?: string
          summary?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      money_budgets: {
        Row: {
          amount_limit: number
          category_id: string
          created_at: string
          id: string
          period_month: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_limit: number
          category_id: string
          created_at?: string
          id?: string
          period_month: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_limit?: number
          category_id?: string
          created_at?: string
          id?: string
          period_month?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "money_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      money_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          kind: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      money_transactions: {
        Row: {
          account: string | null
          amount: number
          category_id: string | null
          created_at: string
          id: string
          kind: string
          merchant: string
          note: string | null
          occurred_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          id?: string
          kind: string
          merchant: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          merchant?: string
          note?: string | null
          occurred_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "money_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "money_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          recipient: string | null
          related_id: string | null
          related_kind: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          recipient?: string | null
          related_id?: string | null
          related_kind?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          recipient?: string | null
          related_id?: string | null
          related_kind?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channels: Json
          created_at: string
          per_type: Json
          quiet_hours: Json
          reports: Json
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channels?: Json
          created_at?: string
          per_type?: Json
          quiet_hours?: Json
          reports?: Json
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channels?: Json
          created_at?: string
          per_type?: Json
          quiet_hours?: Json
          reports?: Json
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          metadata: Json
          priority: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          priority?: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          priority?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_fire_plans: {
        Row: {
          created_at: string
          current_age: number
          current_corpus: number
          inflation_pct: number
          monthly_expense: number
          monthly_sip: number
          pre_return_pct: number
          updated_at: string
          user_id: string
          withdrawal_rate_pct: number
        }
        Insert: {
          created_at?: string
          current_age: number
          current_corpus: number
          inflation_pct?: number
          monthly_expense: number
          monthly_sip: number
          pre_return_pct: number
          updated_at?: string
          user_id: string
          withdrawal_rate_pct: number
        }
        Update: {
          created_at?: string
          current_age?: number
          current_corpus?: number
          inflation_pct?: number
          monthly_expense?: number
          monthly_sip?: number
          pre_return_pct?: number
          updated_at?: string
          user_id?: string
          withdrawal_rate_pct?: number
        }
        Relationships: []
      }
      planner_goals: {
        Row: {
          created_at: string
          goal_type: string
          id: string
          monthly_contribution: number
          name: string
          notes: string | null
          saved_amount: number
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_type?: string
          id?: string
          monthly_contribution?: number
          name: string
          notes?: string | null
          saved_amount?: number
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_type?: string
          id?: string
          monthly_contribution?: number
          name?: string
          notes?: string | null
          saved_amount?: number
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_retirement_plans: {
        Row: {
          created_at: string
          current_age: number
          current_corpus: number
          inflation_pct: number
          life_expectancy: number
          monthly_expense: number
          monthly_sip: number
          post_return_pct: number
          pre_return_pct: number
          retirement_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_age: number
          current_corpus: number
          inflation_pct: number
          life_expectancy: number
          monthly_expense: number
          monthly_sip: number
          post_return_pct: number
          pre_return_pct: number
          retirement_age: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_age?: number
          current_corpus?: number
          inflation_pct?: number
          life_expectancy?: number
          monthly_expense?: number
          monthly_sip?: number
          post_return_pct?: number
          pre_return_pct?: number
          retirement_age?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planner_settings: {
        Row: {
          created_at: string
          current_age: number
          current_corpus: number
          fire_plan_saved: boolean
          inflation_pct: number
          life_expectancy: number
          monthly_expense: number
          monthly_sip: number
          post_return_pct: number
          pre_return_pct: number
          retirement_age: number
          retirement_plan_saved: boolean
          updated_at: string
          user_id: string
          withdrawal_rate_pct: number
        }
        Insert: {
          created_at?: string
          current_age: number
          current_corpus: number
          fire_plan_saved?: boolean
          inflation_pct: number
          life_expectancy: number
          monthly_expense: number
          monthly_sip: number
          post_return_pct: number
          pre_return_pct: number
          retirement_age: number
          retirement_plan_saved?: boolean
          updated_at?: string
          user_id: string
          withdrawal_rate_pct: number
        }
        Update: {
          created_at?: string
          current_age?: number
          current_corpus?: number
          fire_plan_saved?: boolean
          inflation_pct?: number
          life_expectancy?: number
          monthly_expense?: number
          monthly_sip?: number
          post_return_pct?: number
          pre_return_pct?: number
          retirement_age?: number
          retirement_plan_saved?: boolean
          updated_at?: string
          user_id?: string
          withdrawal_rate_pct?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          chart_animations: boolean
          compact_mode: boolean
          created_at: string
          currency: string
          date_format: string
          default_chart_range: string
          full_name: string | null
          language: string
          number_format: string
          phone: string | null
          theme: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          chart_animations?: boolean
          compact_mode?: boolean
          created_at?: string
          currency?: string
          date_format?: string
          default_chart_range?: string
          full_name?: string | null
          language?: string
          number_format?: string
          phone?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          chart_animations?: boolean
          compact_mode?: boolean
          created_at?: string
          currency?: string
          date_format?: string
          default_chart_range?: string
          full_name?: string | null
          language?: string
          number_format?: string
          phone?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          active: boolean
          bcc: string[]
          cc: string[]
          channels: Json
          created_at: string
          cron_expr: string | null
          date_range: string
          formats: string[]
          frequency: string
          id: string
          include_ai_insights: boolean
          last_run_at: string | null
          last_status: string | null
          name: string
          next_run_at: string
          recipients: string[]
          report_keys: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          bcc?: string[]
          cc?: string[]
          channels?: Json
          created_at?: string
          cron_expr?: string | null
          date_range?: string
          formats?: string[]
          frequency?: string
          id?: string
          include_ai_insights?: boolean
          last_run_at?: string | null
          last_status?: string | null
          name: string
          next_run_at?: string
          recipients?: string[]
          report_keys?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          bcc?: string[]
          cc?: string[]
          channels?: Json
          created_at?: string
          cron_expr?: string | null
          date_range?: string
          formats?: string[]
          frequency?: string
          id?: string
          include_ai_insights?: boolean
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          next_run_at?: string
          recipients?: string[]
          report_keys?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tools_activity: {
        Row: {
          created_at: string
          id: string
          item_label: string
          item_slug: string
          item_type: string
          last_used_at: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_label: string
          item_slug: string
          item_type: string
          last_used_at?: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_label?: string
          item_slug?: string
          item_type?: string
          last_used_at?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      tools_reminders: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          due_date: string
          id: string
          kind: string
          notes: string | null
          notify_days_before: number
          notify_enabled: boolean
          recurrence: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          due_date: string
          id?: string
          kind?: string
          notes?: string | null
          notify_days_before?: number
          notify_enabled?: boolean
          recurrence?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          due_date?: string
          id?: string
          kind?: string
          notes?: string | null
          notify_days_before?: number
          notify_enabled?: boolean
          recurrence?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tools_saved_calculations: {
        Row: {
          calc_type: string
          created_at: string
          id: string
          inputs: Json
          label: string
          outputs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          calc_type: string
          created_at?: string
          id?: string
          inputs?: Json
          label: string
          outputs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          calc_type?: string
          created_at?: string
          id?: string
          inputs?: Json
          label?: string
          outputs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pins: {
        Row: {
          created_at: string
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_accounts: {
        Row: {
          account_number_masked: string | null
          account_type: string
          balance: number
          created_at: string
          currency: string
          id: string
          ifsc: string | null
          name: string
          notes: string | null
          owner_member_id: string | null
          provider: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number_masked?: string | null
          account_type: string
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          ifsc?: string | null
          name: string
          notes?: string | null
          owner_member_id?: string | null
          provider?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number_masked?: string | null
          account_type?: string
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          ifsc?: string | null
          name?: string
          notes?: string | null
          owner_member_id?: string | null
          provider?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_assets: {
        Row: {
          category: string
          created_at: string
          current_value: number
          id: string
          last_updated: string
          location: string | null
          name: string
          notes: string | null
          owner_member_id: string | null
          purchase_date: string | null
          purchase_value: number | null
          quantity: number | null
          status: string
          sub_category: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          location?: string | null
          name: string
          notes?: string | null
          owner_member_id?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          quantity?: number | null
          status?: string
          sub_category?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_value?: number
          id?: string
          last_updated?: string
          location?: string | null
          name?: string
          notes?: string | null
          owner_member_id?: string | null
          purchase_date?: string | null
          purchase_value?: number | null
          quantity?: number | null
          status?: string
          sub_category?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_family_members: {
        Row: {
          aadhaar_masked: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          gender: string | null
          id: string
          is_dependent: boolean
          is_nominee: boolean
          name: string
          notes: string | null
          pan: string | null
          phone: string | null
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_masked?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_dependent?: boolean
          is_nominee?: boolean
          name: string
          notes?: string | null
          pan?: string | null
          phone?: string | null
          relationship: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_masked?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          is_dependent?: boolean
          is_nominee?: boolean
          name?: string
          notes?: string | null
          pan?: string | null
          phone?: string | null
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_insurance: {
        Row: {
          claim_status: string | null
          coverage_amount: number
          created_at: string
          end_date: string | null
          id: string
          insured_member_id: string | null
          nominee_member_id: string | null
          notes: string | null
          policy_name: string
          policy_number: string | null
          policy_type: string
          premium_amount: number | null
          premium_frequency: string | null
          provider: string | null
          renewal_date: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          claim_status?: string | null
          coverage_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          insured_member_id?: string | null
          nominee_member_id?: string | null
          notes?: string | null
          policy_name: string
          policy_number?: string | null
          policy_type: string
          premium_amount?: number | null
          premium_frequency?: string | null
          provider?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          claim_status?: string | null
          coverage_amount?: number
          created_at?: string
          end_date?: string | null
          id?: string
          insured_member_id?: string | null
          nominee_member_id?: string | null
          notes?: string | null
          policy_name?: string
          policy_number?: string | null
          policy_type?: string
          premium_amount?: number | null
          premium_frequency?: string | null
          provider?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_investment_txns: {
        Row: {
          amount: number
          created_at: string
          id: string
          investment_id: string
          notes: string | null
          occurred_on: string
          price: number
          quantity: number
          txn_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investment_id: string
          notes?: string | null
          occurred_on?: string
          price: number
          quantity: number
          txn_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investment_id?: string
          notes?: string | null
          occurred_on?: string
          price?: number
          quantity?: number
          txn_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wealth_investment_txns_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "wealth_investments"
            referencedColumns: ["id"]
          },
        ]
      }
      wealth_investments: {
        Row: {
          account_id: string | null
          avg_price: number
          category: string
          created_at: string
          current_price: number
          current_value: number | null
          id: string
          invested_value: number | null
          is_sip: boolean
          last_updated: string
          name: string
          notes: string | null
          owner_member_id: string | null
          purchase_date: string | null
          quantity: number
          sip_active: boolean | null
          sip_amount: number | null
          sip_frequency: string | null
          sip_next_date: string | null
          sip_start_date: string | null
          status: string
          sub_category: string | null
          symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          avg_price?: number
          category: string
          created_at?: string
          current_price?: number
          current_value?: number | null
          id?: string
          invested_value?: number | null
          is_sip?: boolean
          last_updated?: string
          name: string
          notes?: string | null
          owner_member_id?: string | null
          purchase_date?: string | null
          quantity?: number
          sip_active?: boolean | null
          sip_amount?: number | null
          sip_frequency?: string | null
          sip_next_date?: string | null
          sip_start_date?: string | null
          status?: string
          sub_category?: string | null
          symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          avg_price?: number
          category?: string
          created_at?: string
          current_price?: number
          current_value?: number | null
          id?: string
          invested_value?: number | null
          is_sip?: boolean
          last_updated?: string
          name?: string
          notes?: string | null
          owner_member_id?: string | null
          purchase_date?: string | null
          quantity?: number
          sip_active?: boolean | null
          sip_amount?: number | null
          sip_frequency?: string | null
          sip_next_date?: string | null
          sip_start_date?: string | null
          status?: string
          sub_category?: string | null
          symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_liabilities: {
        Row: {
          category: string
          created_at: string
          due_date: string | null
          emi: number | null
          end_date: string | null
          id: string
          interest_rate: number | null
          lender: string | null
          name: string
          notes: string | null
          outstanding: number
          owner_member_id: string | null
          principal: number | null
          start_date: string | null
          status: string
          tenure_months: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          due_date?: string | null
          emi?: number | null
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          lender?: string | null
          name: string
          notes?: string | null
          outstanding?: number
          owner_member_id?: string | null
          principal?: number | null
          start_date?: string | null
          status?: string
          tenure_months?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          due_date?: string | null
          emi?: number | null
          end_date?: string | null
          id?: string
          interest_rate?: number | null
          lender?: string | null
          name?: string
          notes?: string | null
          outstanding?: number
          owner_member_id?: string | null
          principal?: number | null
          start_date?: string | null
          status?: string
          tenure_months?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_snapshots: {
        Row: {
          assets_total: number
          created_at: string
          id: string
          investments_total: number
          liabilities_total: number
          net_worth: number
          savings_total: number
          snapshot_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assets_total?: number
          created_at?: string
          id?: string
          investments_total?: number
          liabilities_total?: number
          net_worth?: number
          savings_total?: number
          snapshot_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assets_total?: number
          created_at?: string
          id?: string
          investments_total?: number
          liabilities_total?: number
          net_worth?: number
          savings_total?: number
          snapshot_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      feedback_status: "open" | "in_progress" | "resolved"
      feedback_type: "bug" | "feature" | "other"
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
      feedback_status: ["open", "in_progress", "resolved"],
      feedback_type: ["bug", "feature", "other"],
    },
  },
} as const
