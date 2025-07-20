import { Length } from "class-validator";

export class RegistrationDTO {
    @Length(3, 100)
    email: string;

    @Length(5, 100)
    password: string;
}