export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ItemRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  total_quantity: number;
  available_quantity: number;
  barcode: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemInsert = {
  name: string;
  description?: string | null;
  category?: string | null;
  total_quantity: number;
  available_quantity: number;
  barcode?: string | null;
  location?: string | null;
};

export type ItemUpdate = Partial<ItemInsert>;

export type CheckoutRow = {
  id: string;
  item_id: string;
  checked_out_by: string;
  quantity: number;
  checked_out_at: string;
  due_date: string | null;
  returned_at: string | null;
  notes: string | null;
};

export type CheckoutInsert = {
  item_id: string;
  checked_out_by: string;
  quantity: number;
  due_date?: string | null;
  returned_at?: string | null;
  notes?: string | null;
};

export type CheckoutUpdate = {
  item_id?: string;
  checked_out_by?: string;
  quantity?: number;
  due_date?: string | null;
  returned_at?: string | null;
  notes?: string | null;
};

export interface Database {
  public: {
    Tables: {
      items: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
        Relationships: [];
      };
      checkouts: {
        Row: CheckoutRow;
        Insert: CheckoutInsert;
        Update: CheckoutUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Item = ItemRow;
export type Checkout = CheckoutRow;
