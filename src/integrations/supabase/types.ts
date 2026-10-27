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
      ai_questionnaires: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          purpose: string
          questions: Json
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          purpose: string
          questions: Json
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          purpose?: string
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_questionnaires_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      blocked_words: {
        Row: {
          created_at: string
          id: string
          word: string
        }
        Insert: {
          created_at?: string
          id?: string
          word: string
        }
        Update: {
          created_at?: string
          id?: string
          word?: string
        }
        Relationships: []
      }
      collab_offers: {
        Row: {
          created_at: string
          id: string
          note: string
          post_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          post_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          post_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_offers_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_offers_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_moderation_events: {
        Row: {
          created_at: string
          id: string
          outcome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          outcome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          outcome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_moderation_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_activity: {
        Row: {
          activity_day: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_day?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          activity_day?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_credit_ledger: {
        Row: {
          actor_id: string
          amount: number
          created_at: string
          id: string
          reason: string
          request_id: string
          user_id: string
        }
        Insert: {
          actor_id?: string
          amount: number
          created_at?: string
          id?: string
          reason: string
          request_id: string
          user_id: string
        }
        Update: {
          actor_id?: string
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_credit_ledger_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_declarations: {
        Row: {
          additional_notes: string | null
          allergies_details: string | null
          birth_date: string | null
          created_at: string
          full_name: string
          has_allergies: boolean | null
          has_diabetes: boolean | null
          has_skin_or_nail_infections: boolean | null
          id: string
          id_number: string
          is_pregnant: boolean | null
          phone: string
          signature_image: string
          takes_blood_thinners: boolean | null
          user_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          allergies_details?: string | null
          birth_date?: string | null
          created_at?: string
          full_name: string
          has_allergies?: boolean | null
          has_diabetes?: boolean | null
          has_skin_or_nail_infections?: boolean | null
          id?: string
          id_number: string
          is_pregnant?: boolean | null
          phone: string
          signature_image: string
          takes_blood_thinners?: boolean | null
          user_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          allergies_details?: string | null
          birth_date?: string | null
          created_at?: string
          full_name?: string
          has_allergies?: boolean | null
          has_diabetes?: boolean | null
          has_skin_or_nail_infections?: boolean | null
          id?: string
          id_number?: string
          is_pregnant?: boolean | null
          phone?: string
          signature_image?: string
          takes_blood_thinners?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      insurance_leads: {
        Row: {
          city_street: string
          clinic_location: string
          created_at: string
          email: string
          employees_count: number | null
          entity_type: string
          equipment_value_nis: number
          existing_insurance: string
          full_name: string
          high_value_machines: string[] | null
          id: string
          id_number: string
          notes: string | null
          phone: string
          requested_coverages: string[]
          staff_status: string
          treatments: string[]
          user_id: string | null
        }
        Insert: {
          city_street: string
          clinic_location: string
          created_at?: string
          email: string
          employees_count?: number | null
          entity_type: string
          equipment_value_nis: number
          existing_insurance: string
          full_name: string
          high_value_machines?: string[] | null
          id?: string
          id_number: string
          notes?: string | null
          phone: string
          requested_coverages: string[]
          staff_status: string
          treatments: string[]
          user_id?: string | null
        }
        Update: {
          city_street?: string
          clinic_location?: string
          created_at?: string
          email?: string
          employees_count?: number | null
          entity_type?: string
          equipment_value_nis?: number
          existing_insurance?: string
          full_name?: string
          high_value_machines?: string[] | null
          id?: string
          id_number?: string
          notes?: string | null
          phone?: string
          requested_coverages?: string[]
          staff_status?: string
          treatments?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          city: string
          created_at: string
          description: string
          id: string
          phone: string
          post_type: string
          studio_name: string
          user_id: string | null
        }
        Insert: {
          city: string
          created_at?: string
          description: string
          id?: string
          phone: string
          post_type: string
          studio_name: string
          user_id?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          description?: string
          id?: string
          phone?: string
          post_type?: string
          studio_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      model_calls: {
        Row: {
          city: string
          contact: string
          cost_amount: string | null
          cost_type: string
          created_at: string
          desired_at: string | null
          id: string
          region: string
          requirements: string | null
          studio_name: string | null
          treatment_type: string
          user_id: string | null
        }
        Insert: {
          city: string
          contact: string
          cost_amount?: string | null
          cost_type?: string
          created_at?: string
          desired_at?: string | null
          id?: string
          region: string
          requirements?: string | null
          studio_name?: string | null
          treatment_type: string
          user_id?: string | null
        }
        Update: {
          city?: string
          contact?: string
          cost_amount?: string | null
          cost_type?: string
          created_at?: string
          desired_at?: string | null
          id?: string
          region?: string
          requirements?: string | null
          studio_name?: string | null
          treatment_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      nail_trade_items: {
        Row: {
          category: string
          city: string
          condition: string
          created_at: string
          delivery_type: string
          description: string
          id: string
          is_flexible: boolean | null
          phone: string
          photos: string[] | null
          price_nis: number
          seller_id: string
          status: string | null
          title: string
        }
        Insert: {
          category: string
          city: string
          condition: string
          created_at?: string
          delivery_type: string
          description: string
          id?: string
          is_flexible?: boolean | null
          phone: string
          photos?: string[] | null
          price_nis: number
          seller_id: string
          status?: string | null
          title: string
        }
        Update: {
          category?: string
          city?: string
          condition?: string
          created_at?: string
          delivery_type?: string
          description?: string
          id?: string
          is_flexible?: boolean | null
          phone?: string
          photos?: string[] | null
          price_nis?: number
          seller_id?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nail_trade_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string
          actor_name: string
          body: string
          created_at: string
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          actor_name: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          actor_name?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          caption: string | null
          created_at: string
          id: string
          image_url: string
          is_pinned: boolean
          likes_count: number | null
          price_nis: number | null
          service_tags: string[] | null
          status: string
          treatment_category: string | null
        }
        Insert: {
          author_id: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_pinned?: boolean
          likes_count?: number | null
          price_nis?: number | null
          service_tags?: string[] | null
          status?: string
          treatment_category?: string | null
        }
        Update: {
          author_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_pinned?: boolean
          likes_count?: number | null
          price_nis?: number | null
          service_tags?: string[] | null
          status?: string
          treatment_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string
          id: string
          price_nis: number
          service_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_nis: number
          service_name: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          price_nis?: number
          service_name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_role: string
          account_status: string | null
          additional_services: string[] | null
          avatar_url: string | null
          business_name: string | null
          city: string | null
          created_at: string
          dark_logo_url: string | null
          default_watermark: string | null
          display_name: string
          hide_address: boolean | null
          hide_phone: boolean | null
          id: string
          instagram: string | null
          is_verified: boolean | null
          light_logo_url: string | null
          phone: string
          specialties: string[] | null
        }
        Insert: {
          account_role?: string
          account_status?: string | null
          additional_services?: string[] | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          dark_logo_url?: string | null
          default_watermark?: string | null
          display_name: string
          hide_address?: boolean | null
          hide_phone?: boolean | null
          id: string
          instagram?: string | null
          is_verified?: boolean | null
          light_logo_url?: string | null
          phone?: string
          specialties?: string[] | null
        }
        Update: {
          account_role?: string
          account_status?: string | null
          additional_services?: string[] | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          dark_logo_url?: string | null
          default_watermark?: string | null
          display_name?: string
          hide_address?: boolean | null
          hide_phone?: boolean | null
          id?: string
          instagram?: string | null
          is_verified?: boolean | null
          light_logo_url?: string | null
          phone?: string
          specialties?: string[] | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id: string
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          created_at: string
          current_role: string
          id: string
          reason: string
          requested_role: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_role: string
          id?: string
          reason: string
          requested_role: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_role?: string
          id?: string
          reason?: string
          requested_role?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          collection_name: string | null
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          collection_name?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          collection_name?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          alt_text: string | null
          background_media_url: string | null
          caption: string | null
          created_at: string
          id: string
          media_url: string
          mentions: Json
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          background_media_url?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          media_url: string
          mentions?: Json
          user_id: string
        }
        Update: {
          alt_text?: string | null
          background_media_url?: string | null
          caption?: string | null
          created_at?: string
          id?: string
          media_url?: string
          mentions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_stickers: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_path: string
          label: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          image_path: string
          label?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string
          label?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
          viewer_name: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
          viewer_name: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
          viewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          body: string
          category: string
          created_at: string
          email: string
          id: string
          phone: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          email?: string
          id?: string
          phone?: string
          status?: string
          subject: string
          user_id?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          daily_limit: number
          unlimited: boolean
          user_id: string
        }
        Insert: {
          daily_limit?: number
          unlimited?: boolean
          user_id: string
        }
        Update: {
          daily_limit?: number
          unlimited?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quotas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sanctions: {
        Row: {
          created_at: string
          id: string
          kind: string
          reason: string
          until: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          reason?: string
          until?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          reason?: string
          until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sanctions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_community_credit: {
        Args: {
          delta: number
          explanation: string
          operation_id: string
          target_user: string
        }
        Returns: string
      }
      community_members: {
        Args: { member_id?: string; search_text?: string }
        Returns: {
          account_role: string
          avatar_url: string
          business_name: string
          city: string
          display_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_banned: { Args: { target_user: string }; Returns: boolean }
      manage_supplier_credits: {
        Args: {
          credit_mode: string
          operation_id: string
          quantity: number
          target_user: string
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
