import { Database as DB } from '@/app/global';

type Domain = DB["public"]["Tables"]["domains"]["Row"];
type Profile = DB["public"]["Tables"]["profiles"]["Row"];
type Page = DB["public"]["Tables"]["pages"]["Row"];

declare global {
    type Database = DB;
}

