const fs = require('fs');
let content = fs.readFileSync('packages/supabase/src/types.ts', 'utf8');

const tablesStr = `
      question_categories: {
        Row: {
          id: string;
          name: string;
          subject_area: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject_area: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject_area?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      question_levels: {
        Row: {
          id: string;
          category_id: string;
          level_number: number;
          time_limit_sec: number;
          passing_threshold: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          level_number: number;
          time_limit_sec?: number;
          passing_threshold?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          level_number?: number;
          time_limit_sec?: number;
          passing_threshold?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_levels_category_id_fkey";
            columns: ["category_id"];
            referencedRelation: "question_categories";
            referencedColumns: ["id"];
          }
        ];
      };
`;

content = content.replace(/Tables: \{/, 'Tables: {' + tablesStr);
fs.writeFileSync('packages/supabase/src/types.ts', content);
