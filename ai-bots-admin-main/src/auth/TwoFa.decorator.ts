import { SetMetadata } from "@nestjs/common";
import { JWT_CONFIRMED_ONLY_META } from "./jwt-auth.guard";

export const UseTwoFa = (status = true) => SetMetadata(JWT_CONFIRMED_ONLY_META, status);