/**
 * Types de la base Supabase (supabase/migrations).
 * Écrits à la main au format de `supabase gen types typescript` : à régénérer une fois le projet lié
 * (`npx supabase gen types typescript --linked > src/lib/database.types.ts`).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'username' | 'display_name'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      friendships: {
        Row: { requester_id: string; addressee_id: string; status: string; created_at: string; accepted_at: string | null };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      games: {
        Row: {
          id: string;
          owner_id: string;
          team_a_name: string;
          team_b_name: string;
          target_score: number;
          rounds: Json;
          score_a: number;
          score_b: number;
          winner: string | null;
          visibility: string;
          note: string | null;
          location_name: string | null;
          photo_path: string | null;
          rated_at: string | null;
          group_id: string | null;
          ranked: boolean;
          simple: boolean;
          created_at: string;
          updated_at: string;
          finished_at: string | null;
        };
        Insert: {
          id: string;
          owner_id: string;
          team_a_name: string;
          team_b_name: string;
          target_score: number;
          rounds?: Json;
          score_a?: number;
          score_b?: number;
          winner?: string | null;
          visibility?: string;
          note?: string | null;
          location_name?: string | null;
          photo_path?: string | null;
          group_id?: string | null;
          ranked?: boolean;
          simple?: boolean;
          created_at: string;
          updated_at: string;
          finished_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['games']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'games_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      guest_players: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          claimed_by: string | null;
          claimed_at: string | null;
          created_at: string;
        };
        Insert: { id: string; owner_id: string; name: string };
        Update: { name?: string };
        Relationships: [];
      };
      game_players: {
        Row: {
          game_id: string;
          seat: number;
          team: string;
          profile_id: string | null;
          guest_id: string | null;
          guest_name: string | null;
          status: string;
          responded_at: string | null;
          created_at: string;
        };
        Insert: {
          game_id: string;
          seat: number;
          team: string;
          profile_id?: string | null;
          guest_id?: string | null;
          guest_name?: string | null;
        };
        Update: Partial<Database['public']['Tables']['game_players']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'game_players_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_players_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      kudos: {
        Row: { game_id: string; profile_id: string; created_at: string };
        Insert: { game_id: string; profile_id: string };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'kudos_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kudos_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: { id: string; game_id: string; author_id: string; body: string; created_at: string };
        Insert: { game_id: string; author_id: string; body: string };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'comments_game_id_fkey';
            columns: ['game_id'];
            isOneToOne: false;
            referencedRelation: 'games';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: { target_type: string; target_id: string; reason?: string | null };
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          type: string;
          game_id: string | null;
          comment_id: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: Record<string, never>;
        Update: { read_at?: string | null };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          city: string | null;
          invite_code: string;
          created_by: string;
          created_at: string;
        };
        Insert: { name: string; description?: string | null; city?: string | null; created_by: string };
        Update: { name?: string; description?: string | null; city?: string | null };
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; profile_id: string; role: string; joined_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ratings: {
        Row: {
          profile_id: string;
          elo: number;
          games: number;
          wins: number;
          best_elo: number;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      elo_history: {
        Row: { profile_id: string; game_id: string; elo_before: number; elo_after: number; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      push_tokens: {
        Row: { token: string; profile_id: string; platform: string; updated_at: string };
        Insert: { token: string; profile_id: string; platform: string; updated_at?: string };
        Update: { profile_id?: string; platform?: string; updated_at?: string };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      respond_to_game: { Args: { gid: string; accept: boolean }; Returns: undefined };
      add_friend: { Args: { target: string }; Returns: string };
      guest_invite: {
        Args: { gid: string };
        Returns: { guest_name: string; owner_name: string; owner_username: string; games: number; claimed: boolean }[];
      };
      claim_guest: { Args: { gid: string }; Returns: number };
      search_profiles: { Args: { q: string }; Returns: ProfileRow[] };
      is_username_free: { Args: { name: string }; Returns: boolean };
      login_email: { Args: { login: string }; Returns: string | null };
      friend_suggestions: {
        Args: { lim?: number };
        Returns: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          city: string | null;
          mutual: number;
          mutual_names: string[];
        }[];
      };
      delete_my_account: { Args: Record<PropertyKey, never>; Returns: undefined };
      leaderboard: {
        Args: { scope: string; since?: string | null };
        Returns: {
          profile_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          city: string | null;
          elo: number;
          rated_games: number;
          games: number;
          wins: number;
        }[];
      };
      group_preview: {
        Args: { code: string };
        Returns: {
          id: string;
          name: string;
          description: string | null;
          city: string | null;
          members: number;
          already_member: boolean;
        }[];
      };
      join_group: { Args: { code: string }; Returns: string };
      group_leaderboard: {
        Args: { gid: string; since?: string | null };
        Returns: Database['public']['Functions']['leaderboard']['Returns'];
      };
      group_feed: {
        Args: { gid: string; before?: string | null; lim?: number };
        Returns: Database['public']['Tables']['games']['Row'][];
        SetofOptions: { from: '*'; to: 'games'; isOneToOne: false; isSetofReturn: true };
      };
      feed: {
        Args: { before?: string | null; lim?: number };
        Returns: Database['public']['Tables']['games']['Row'][];
        SetofOptions: { from: '*'; to: 'games'; isOneToOne: false; isSetofReturn: true };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = ProfileRow;
