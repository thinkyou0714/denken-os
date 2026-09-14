import type { Bucket, Database } from "../lib/service/runtime-types.js";
import type { TutorEnvironment } from "./tutor.js";
export interface Env extends TutorEnvironment {
  DB: Database;
  BUCKET?: Bucket;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  AUTOMATION_KEY?: string;
  REQUIRE_TUTOR_ENTITLEMENT?: string;
}
