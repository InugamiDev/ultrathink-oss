import { neon } from "@neondatabase/serverless";
export declare function getClient(): import("@neondatabase/serverless").NeonQueryFunction<boolean, boolean>;
export type SqlClient = ReturnType<typeof neon>;
