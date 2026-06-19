import * as jose from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "pensieve_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
