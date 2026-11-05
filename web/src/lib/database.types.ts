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
      bid_rounds: {
        Row: {
          bid_id: string
          created_at: string
          created_by: string
          id: string
          note: string
          price_usd: number
          side: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          price_usd: number
          side: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          price_usd?: number
          side?: string
        }
        Relationships: [
          {
            foreignKeyName: "bid_rounds_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          days: number
          discount_pct: number
          follow_up_on: string | null
          id: string
          order_id: string
          price_usd: number
          scope: string
          status: Database["public"]["Enums"]["bid_status"]
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string
          days: number
          discount_pct?: number
          follow_up_on?: string | null
          id?: string
          order_id: string
          price_usd: number
          scope?: string
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          days?: number
          discount_pct?: number
          follow_up_on?: string | null
          id?: string
          order_id?: string
          price_usd?: number
          scope?: string
          status?: Database["public"]["Enums"]["bid_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bids_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          company_id: string
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          issued_on: string
          issued_to: string
          number: string
          order_id: string | null
          revoked_reason: string | null
          sha256: string | null
          status: Database["public"]["Enums"]["cert_status"]
          type: string
          valid_until: string | null
          verify_code: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          issued_on?: string
          issued_to: string
          number: string
          order_id?: string | null
          revoked_reason?: string | null
          sha256?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          type: string
          valid_until?: string | null
          verify_code?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          issued_on?: string
          issued_to?: string
          number?: string
          order_id?: string | null
          revoked_reason?: string | null
          sha256?: string | null
          status?: Database["public"]["Enums"]["cert_status"]
          type?: string
          valid_until?: string | null
          verify_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          created_at: string
          created_by: string
          email: string
          gstin: string | null
          id: string
          name: string
          pan: string | null
          phone: string
        }
        Insert: {
          address?: string
          created_at?: string
          created_by?: string
          email?: string
          gstin?: string | null
          id?: string
          name: string
          pan?: string | null
          phone?: string
        }
        Update: {
          address?: string
          created_at?: string
          created_by?: string
          email?: string
          gstin?: string | null
          id?: string
          name?: string
          pan?: string | null
          phone?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          email: string | null
          id: string
          invited_at: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string | null
        }
        Insert: {
          company_id: string
          email?: string | null
          id?: string
          invited_at?: string
          name: string
          phone?: string | null
          role: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
        }
        Update: {
          company_id?: string
          email?: string | null
          id?: string
          invited_at?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_items: {
        Row: {
          company_id: string
          covers: string[]
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          issued_by: string
          name: string
          reference: string
          valid_until: string
        }
        Insert: {
          company_id: string
          covers?: string[]
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          issued_by: string
          name: string
          reference?: string
          valid_until: string
        }
        Update: {
          company_id?: string
          covers?: string[]
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          issued_by?: string
          name?: string
          reference?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: Database["public"]["Enums"]["chat_role"]
          caption: string
          captured_at: string
          file_name: string
          file_path: string
          gps_accuracy: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          mime: string
          order_id: string
          sha256: string
          uploaded_at: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          author_role?: Database["public"]["Enums"]["chat_role"]
          caption?: string
          captured_at: string
          file_name: string
          file_path: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          kind: Database["public"]["Enums"]["evidence_kind"]
          mime: string
          order_id: string
          sha256: string
          uploaded_at?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: Database["public"]["Enums"]["chat_role"]
          caption?: string
          captured_at?: string
          file_name?: string
          file_path?: string
          gps_accuracy?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["evidence_kind"]
          mime?: string
          order_id?: string
          sha256?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_usd: number
          created_at: string
          discount_pct: number
          due_on: string
          id: string
          issued_on: string
          number: string
          order_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          discount_pct?: number
          due_on: string
          id?: string
          issued_on?: string
          number: string
          order_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          discount_pct?: number
          due_on?: string
          id?: string
          issued_on?: string
          number?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_docs: {
        Row: {
          company_id: string
          file_name: string
          file_path: string
          id: string
          note: string | null
          sha256: string
          status: Database["public"]["Enums"]["kyc_doc_status"]
          type: string
          uploaded_at: string
        }
        Insert: {
          company_id: string
          file_name: string
          file_path: string
          id?: string
          note?: string | null
          sha256: string
          status?: Database["public"]["Enums"]["kyc_doc_status"]
          type: string
          uploaded_at?: string
        }
        Update: {
          company_id?: string
          file_name?: string
          file_path?: string
          id?: string
          note?: string | null
          sha256?: string
          status?: Database["public"]["Enums"]["kyc_doc_status"]
          type?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_docs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string | null
          author_name: string
          author_role: Database["public"]["Enums"]["chat_role"]
          created_at: string
          dispatch: Json | null
          evidence_id: string | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          order_id: string
          readings: Json | null
          severity: string | null
          text: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          author_role?: Database["public"]["Enums"]["chat_role"]
          created_at?: string
          dispatch?: Json | null
          evidence_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          order_id: string
          readings?: Json | null
          severity?: string | null
          text?: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          author_role?: Database["public"]["Enums"]["chat_role"]
          created_at?: string
          dispatch?: Json | null
          evidence_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          order_id?: string
          readings?: Json | null
          severity?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_gstin: string | null
          buyer_iec: string | null
          buyer_name: string
          buyer_verification: Database["public"]["Enums"]["party_verification"]
          commodity: string
          completed_at: string | null
          created_at: string
          customer_id: string
          id: string
          inspection_company_id: string | null
          inspection_date: string
          listing_id: string | null
          location: string
          mode: Database["public"]["Enums"]["order_mode"]
          price_usd: number | null
          seller_gstin: string | null
          seller_iec: string | null
          seller_name: string
          seller_verification: Database["public"]["Enums"]["party_verification"]
          service: string
          spec: Json | null
          spec_label: string | null
          status: Database["public"]["Enums"]["order_status"]
          volume_tons: number
        }
        Insert: {
          buyer_gstin?: string | null
          buyer_iec?: string | null
          buyer_name: string
          buyer_verification?: Database["public"]["Enums"]["party_verification"]
          commodity: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          inspection_company_id?: string | null
          inspection_date: string
          listing_id?: string | null
          location: string
          mode: Database["public"]["Enums"]["order_mode"]
          price_usd?: number | null
          seller_gstin?: string | null
          seller_iec?: string | null
          seller_name: string
          seller_verification?: Database["public"]["Enums"]["party_verification"]
          service: string
          spec?: Json | null
          spec_label?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          volume_tons: number
        }
        Update: {
          buyer_gstin?: string | null
          buyer_iec?: string | null
          buyer_name?: string
          buyer_verification?: Database["public"]["Enums"]["party_verification"]
          commodity?: string
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          inspection_company_id?: string | null
          inspection_date?: string
          listing_id?: string | null
          location?: string
          mode?: Database["public"]["Enums"]["order_mode"]
          price_usd?: number | null
          seller_gstin?: string | null
          seller_iec?: string | null
          seller_name?: string
          seller_verification?: Database["public"]["Enums"]["party_verification"]
          service?: string
          spec?: Json | null
          spec_label?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          volume_tons?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_inspection_company_id_fkey"
            columns: ["inspection_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "service_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          received_on: string
          reference: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          received_on: string
          reference?: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          received_on?: string
          reference?: string
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
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_specs: {
        Row: {
          buyer_name: string
          created_at: string
          id: string
          owner_id: string
          params: Json
          reference: string
        }
        Insert: {
          buyer_name: string
          created_at?: string
          id?: string
          owner_id?: string
          params: Json
          reference?: string
        }
        Update: {
          buyer_name?: string
          created_at?: string
          id?: string
          owner_id?: string
          params?: Json
          reference?: string
        }
        Relationships: []
      }
      service_listings: {
        Row: {
          active: boolean
          available_from: string
          available_to: string
          commodities: string[]
          company_id: string
          created_at: string
          discount_pct: number
          id: string
          location: string
          price_usd: number
          service: string
          surveyors: number
          turnaround_days: number
        }
        Insert: {
          active?: boolean
          available_from: string
          available_to: string
          commodities?: string[]
          company_id: string
          created_at?: string
          discount_pct?: number
          id?: string
          location: string
          price_usd: number
          service: string
          surveyors?: number
          turnaround_days: number
        }
        Update: {
          active?: boolean
          available_from?: string
          available_to?: string
          commodities?: string[]
          company_id?: string
          created_at?: string
          discount_pct?: number
          id?: string
          location?: string
          price_usd?: number
          service?: string
          surveyors?: number
          turnaround_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_bid: { Args: { bid: string }; Returns: undefined }
      can_bid: { Args: never; Returns: boolean }
      chat_role_for: {
        Args: { oid: string }
        Returns: Database["public"]["Enums"]["chat_role"]
      }
      claim_invites: { Args: never; Returns: number }
      decline_bid: { Args: { bid: string }; Returns: undefined }
      has_company_role: {
        Args: {
          cid: string
          roles?: Database["public"]["Enums"]["team_role"][]
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_company_user: { Args: never; Returns: boolean }
      is_order_customer: { Args: { oid: string }; Returns: boolean }
      is_order_member: { Args: { oid: string }; Returns: boolean }
      net_price: { Args: { discount: number; price: number }; Returns: number }
      set_order_status: {
        Args: { next: Database["public"]["Enums"]["order_status"]; oid: string }
        Returns: undefined
      }
      set_party_verification: {
        Args: {
          oid: string
          side: string
          state: Database["public"]["Enums"]["party_verification"]
        }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target: string
        }
        Returns: undefined
      }
      try_uuid: { Args: { t: string }; Returns: string }
      verify_certificate: {
        Args: { code: string }
        Returns: {
          company_name: string
          issued_on: string
          issued_to: string
          number: string
          revoked_reason: string
          status: Database["public"]["Enums"]["cert_status"]
          type: string
          valid_until: string
        }[]
      }
      withdraw_bid: { Args: { bid: string }; Returns: undefined }
    }
    Enums: {
      app_role: "customer" | "company" | "inspector" | "admin"
      bid_status: "open" | "accepted" | "declined" | "withdrawn"
      cert_status: "issued" | "revoked"
      chat_role: "customer" | "company" | "inspector" | "admin" | "system"
      evidence_kind: "photo" | "video" | "report"
      kyc_doc_status: "submitted" | "verified" | "rejected"
      member_status: "invited" | "active"
      message_kind:
        | "text"
        | "system"
        | "observation"
        | "dispatch"
        | "flag"
        | "media"
        | "summary"
      order_mode: "quick" | "inquiry"
      order_status: "enquiry" | "booked" | "in-progress" | "completed"
      party_verification: "unverified" | "format-checked" | "verified"
      payment_method:
        | "Bank transfer"
        | "UPI"
        | "Card"
        | "Letter of credit"
        | "Other"
      team_role: "owner" | "sales" | "ops" | "finance" | "inspector"
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
      app_role: ["customer", "company", "inspector", "admin"],
      bid_status: ["open", "accepted", "declined", "withdrawn"],
      cert_status: ["issued", "revoked"],
      chat_role: ["customer", "company", "inspector", "admin", "system"],
      evidence_kind: ["photo", "video", "report"],
      kyc_doc_status: ["submitted", "verified", "rejected"],
      member_status: ["invited", "active"],
      message_kind: [
        "text",
        "system",
        "observation",
        "dispatch",
        "flag",
        "media",
        "summary",
      ],
      order_mode: ["quick", "inquiry"],
      order_status: ["enquiry", "booked", "in-progress", "completed"],
      party_verification: ["unverified", "format-checked", "verified"],
      payment_method: [
        "Bank transfer",
        "UPI",
        "Card",
        "Letter of credit",
        "Other",
      ],
      team_role: ["owner", "sales", "ops", "finance", "inspector"],
    },
  },
} as const
