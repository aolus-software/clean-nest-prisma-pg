import { SetMetadata } from "@nestjs/common";

/* Marks a route (or a whole controller) as reachable without authentication.
   AuthGuard is registered globally, so every route is protected by default and
   a new controller cannot forget its guard. This decorator is the only way out,
   which makes each public surface an explicit, greppable decision. */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
