export interface ILoginPayload {
  email: string;
  sub: number;
  is_confirmed?: boolean;
  twofa_token?: string;
}
